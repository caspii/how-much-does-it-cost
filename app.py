import functools
import ipaddress
import json
import logging
import os
import re
from pathlib import Path

import markdown
import requests
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, Response, url_for
from openai import OpenAI

load_dotenv()

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.logger.setLevel(logging.INFO)
application = app  # For gunicorn
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

IPGEO_TIMEOUT = 3        # seconds
OPENAI_TIMEOUT = 30      # seconds

CURRENCY_BY_COUNTRY = {
    'United States': 'USD',
    'Canada': 'CAD',
    'United Kingdom': 'GBP',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Japan': 'JPY',
    'China': 'CNY',
    'India': 'INR',
    'Australia': 'AUD',
    'Brazil': 'BRL',
    'Mexico': 'MXN',
    'South Korea': 'KRW',
    'Switzerland': 'CHF',
    'Sweden': 'SEK',
    'Norway': 'NOK',
    'Denmark': 'DKK',
}

USE_CASES = {
    'garage-sales': {
        'file': 'garage-sales.md',
        'title': 'How to Price Garage Sale Items: Free Photo Valuation Tool',
        'description': 'Pricing items for a garage sale or shopping at one? Snap a photo and CostCam gives you an instant value estimate so you never overpay or underprice.'
    },
    'insurance-claims': {
        'file': 'insurance-claims.md',
        'title': 'Home Inventory App for Insurance: Document Belongings From Photos',
        'description': 'Free home inventory app for insurance. Photograph your valuables and CostCam captures item details and estimated value for claims and policy documentation.'
    },
    'moving-selling': {
        'file': 'moving-selling.md',
        'title': 'How Much Is My Stuff Worth? Value Items Before Moving or Selling',
        'description': 'Wondering how much your stuff is worth before you move or sell? Snap a photo and CostCam gives you instant resale and donation value estimates.'
    },
    'gift-shopping': {
        'file': 'gift-shopping.md',
        'title': 'Photo Price Checker for Gift Shopping & Budgets · CostCam',
        'description': 'Stay on budget while gift shopping. Snap a photo of any item to instantly check its price range and find the best deal.'
    },
    'collectors-antiques': {
        'file': 'collectors-antiques.md',
        'title': 'Antique Appraisal App: Identify and Value Antiques From a Photo',
        'description': 'Free antique appraisal app. Snap a photo to instantly identify and estimate the value of antiques, vintage items and collectibles.'
    },
    'online-reselling': {
        'file': 'online-reselling.md',
        'title': 'Price Research for eBay & Marketplace Resellers · CostCam',
        'description': 'Pricing research for online resellers. Snap a photo and CostCam returns market value, suggested keywords and comp links for eBay, Poshmark and Facebook Marketplace.'
    },
}


def is_local_request():
    return (
        app.debug
        or os.environ.get('FLASK_ENV') == 'development'
        or request.host.startswith('localhost')
        or request.host.startswith('127.0.0.1')
    )


def get_client_ip(req):
    """Return the originating client IP from X-Forwarded-For, or remote_addr."""
    forwarded = req.headers.get('X-Forwarded-For', '')
    for part in forwarded.split(','):
        candidate = part.strip()
        if candidate:
            return candidate
    return req.remote_addr or ''


def _is_public_ip(ip):
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved or addr.is_unspecified)


@functools.lru_cache(maxsize=1024)
def resolve_location_from_ip(ip):
    """Look up country from IP and return (country_context, currency, location_context).

    Returns a USD-default 3-tuple on private IPs, timeouts, or any API error.
    """
    if not ip or not _is_public_ip(ip):
        return "", "USD", ""

    try:
        geo_response = requests.get(
            f"https://ipapi.co/{ip}/json/",
            headers={"User-Agent": "CostCam/1.0"},
            timeout=IPGEO_TIMEOUT,
        )
    except requests.RequestException as e:
        app.logger.warning(f"IP geolocation failed: {e}")
        return "", "USD", ""

    if geo_response.status_code != 200:
        return "", "USD", ""

    payload = geo_response.json()
    if payload.get('error'):
        return "", "USD", ""

    country = payload.get('country_name', '') or ''
    city = payload.get('city', '') or ''
    currency = CURRENCY_BY_COUNTRY.get(country, 'USD')

    if city and country:
        country_context = f"Location: {city}, {country}. "
    elif country:
        country_context = f"Location: {country}. "
    else:
        country_context = ""

    location_context = (
        f"The user is located in {country_context}"
        f"Please provide prices in {currency} considering local market conditions and pricing."
    ) if country_context else ""

    return country_context, currency, location_context


def parse_openai_json(result):
    """Best-effort extraction of a JSON object from a model response."""
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        pass
    match = re.search(r'\{[\s\S]*\}', result)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None
    return None


@app.route('/')
def index():
    return render_template('index.html', is_local=is_local_request())


@app.route('/analyze', methods=['POST'])
def analyze_image():
    if openai_client is None:
        return jsonify({'error': 'OpenAI API key not configured'}), 500

    try:
        app.logger.info("Received analyze request")

        data = request.get_json()
        if not data:
            app.logger.error("No JSON data received")
            return jsonify({'error': 'No data received'}), 400

        image_data = data.get('image')

        app.logger.info(f"Image data length: {len(image_data) if image_data else 0}")

        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        # Strip data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',', 1)[1]

        country_context, local_currency, location_context = resolve_location_from_ip(get_client_ip(request))

        prompt = f"""Analyze this image and provide an estimated price range for the item(s) shown.
        {location_context}

        Please provide:
        1. What the item is, including brand and model if identifiable
        2. Assessed condition based on visible wear, packaging and completeness
        3. Estimated price range in {local_currency} based on prices typical for 2026
        4. Factors affecting the price
        5. Where this item might typically be purchased
        6. Additional helpful information about the item

        Important rules:
        - If you cannot clearly read a brand or model from the image, set those fields to null. Do not infer brand from style alone.
        - The price range should be for the assessed condition, not for new/mint unless the item clearly is new.
        - If the item is generic and has no meaningful brand (e.g. an unbranded mug), set brand and model to null and price the category.

        Format your response as JSON with the following structure:
        {{
            "item_name": "Item name",
            "brand": "Brand name if clearly identifiable, otherwise null",
            "model": "Model name/number if clearly identifiable, otherwise null",
            "category": "General category (e.g., Electronics, Fashion, Home & Garden)",
            "description": "Brief description of the item and its key features",
            "condition": "new | like_new | good | fair | poor",
            "price_range": {{
                "low": 0.00,
                "high": 0.00,
                "typical": 0.00
            }},
            "currency": "{local_currency}",
            "location": "{country_context.strip()}",
            "factors": ["factor1", "factor2", "factor3"],
            "where_to_buy": ["location1", "location2", "location3"],
            "online_retailers": ["retailer1", "retailer2"],
            "condition_notes": "Notes about condition cues visible in the photo, or null",
            "alternatives": ["similar item 1", "similar item 2"],
            "buying_tips": ["tip1", "tip2"],
            "confidence": "high | medium | low",
            "search_keywords": ["keyword1", "keyword2", "keyword3"]
        }}"""

        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}",
                                    "detail": "high",
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.2,
                response_format={"type": "json_object"},
                timeout=OPENAI_TIMEOUT,
            )
        except Exception as api_error:
            app.logger.error(f"Error calling OpenAI API: {api_error}")
            return jsonify({'error': f'Error analyzing image: {api_error}'}), 500

        result = response.choices[0].message.content
        app.logger.info(f"OpenAI response: {result[:200]}...")

        parsed = parse_openai_json(result)
        if parsed is not None:
            app.logger.info("analysis " + json.dumps({
                "item_name": parsed.get("item_name"),
                "brand": parsed.get("brand"),
                "model": parsed.get("model"),
                "category": parsed.get("category"),
                "confidence": parsed.get("confidence"),
                "currency": local_currency,
                "country": (country_context or "").replace("Location: ", "").rstrip(". ") or None,
            }, ensure_ascii=False))
            return jsonify({'success': True, 'data': parsed})

        app.logger.warning("Response is not valid JSON")
        return jsonify({'success': True, 'data': {'raw_response': result}})

    except Exception as e:
        app.logger.error(f"Error analyzing image: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health():
    return jsonify({'status': 'healthy'}), 200


@app.route('/what-is-it-worth')
def what_is_it_worth():
    return render_template('what_is_it_worth.html', is_local=is_local_request())


@app.route('/robots.txt')
def robots_txt():
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Sitemap: https://costcam.app/sitemap.xml\n"
    )
    return Response(body, mimetype='text/plain')


@app.route('/sitemap.xml')
def sitemap_xml():
    base = 'https://costcam.app'
    urls = [f'{base}/', f'{base}/what-is-it-worth'] + [f'{base}/use-cases/{slug}' for slug in USE_CASES]
    body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    body += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for url in urls:
        body += f'  <url><loc>{url}</loc></url>\n'
    body += '</urlset>\n'
    return Response(body, mimetype='application/xml')


@app.route('/use-cases/<slug>')
def use_case(slug):
    use_case_info = USE_CASES.get(slug)
    if not use_case_info:
        return render_template('404.html'), 404

    content_path = Path('content/use-cases') / use_case_info['file']
    try:
        with open(content_path, 'r') as f:
            markdown_content = f.read()
    except FileNotFoundError:
        return render_template('404.html'), 404

    html_content = markdown.markdown(markdown_content, extensions=['extra', 'codehilite'])

    return render_template(
        'use_case.html',
        content=html_content,
        title=use_case_info['title'],
        description=use_case_info['description'],
        is_local=is_local_request(),
    )


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
