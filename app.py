from flask import Flask, render_template, request, jsonify
import base64
import os
from datetime import datetime
import json
from werkzeug.utils import secure_filename
import tempfile
from dotenv import load_dotenv
import markdown
from pathlib import Path

# Load environment variables
load_dotenv()

# Import OpenAI after clearing any problematic env vars
for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
    if key in os.environ:
        del os.environ[key]

from openai import OpenAI

app = Flask(__name__)
application = app  # For gunicorn
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# OpenAI configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

@app.route('/')
def index():
    # Check if running locally based on debug mode or environment
    is_local = app.debug or os.environ.get('FLASK_ENV') == 'development' or request.host.startswith('localhost') or request.host.startswith('127.0.0.1')
    return render_template('index.html', is_local=is_local)

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        app.logger.info("Received analyze request")
        
        # Get image data and location
        data = request.get_json()
        if not data:
            app.logger.error("No JSON data received")
            return jsonify({'error': 'No data received'}), 400
            
        image_data = data.get('image')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        app.logger.info(f"Image data length: {len(image_data) if image_data else 0}")
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Extract base64 image data
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Prepare location context
        location_context = ""
        local_currency = "USD"
        country_context = ""
        
        if latitude and longitude:
            # Reverse geocode to get country/region
            try:
                import requests
                # Using a free reverse geocoding service
                geo_response = requests.get(
                    f"https://geocode.maps.co/reverse?lat={latitude}&lon={longitude}",
                    headers={"User-Agent": "HowMuchDoesItCost/1.0"}
                )
                if geo_response.status_code == 200:
                    geo_data = geo_response.json()
                    country = geo_data.get('address', {}).get('country', '')
                    city = geo_data.get('address', {}).get('city', '')
                    
                    # Map countries to currencies
                    currency_map = {
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
                        'Denmark': 'DKK'
                    }
                    
                    local_currency = currency_map.get(country, 'USD')
                    country_context = f"Location: {city}, {country}. " if city and country else f"Location: {country}. " if country else ""
                    location_context = f"The user is located in {country_context}Please provide prices in {local_currency} considering local market conditions and pricing."
            except Exception as e:
                app.logger.warning(f"Geocoding failed: {e}")
                location_context = f"The photo was taken at coordinates: {latitude}, {longitude}. Consider regional pricing variations based on this location."
        
        # Create the prompt
        prompt = f"""Analyze this image and provide an estimated price range for the item(s) shown. 
        {location_context}
        
        Please provide:
        1. What the item is, including brand and model if identifiable
        2. Estimated price range in {local_currency} based on local market prices
        3. Factors affecting the price
        4. Where this item might typically be purchased
        5. Additional helpful information about the item
        
        Be cautious and only include information you're confident about. If unsure about specific details, indicate uncertainty.
        
        Format your response as JSON with the following structure:
        {{
            "item_name": "Item name",
            "brand": "Brand name if identifiable, or null if uncertain",
            "model": "Model name/number if identifiable, or null if uncertain",
            "category": "General category (e.g., Electronics, Fashion, Home & Garden)",
            "description": "Brief description of the item and its key features",
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
            "condition_notes": "Notes about condition if used/vintage, or null",
            "alternatives": ["similar item 1", "similar item 2"],
            "buying_tips": ["tip1", "tip2"],
            "confidence": "high/medium/low",
            "search_keywords": ["keyword1", "keyword2", "keyword3"]
        }}"""
        
        # Initialize OpenAI client
        if not OPENAI_API_KEY:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        try:
            # Create client with minimal configuration
            client = OpenAI(api_key=OPENAI_API_KEY)
                
        except TypeError as e:
            # If we get a TypeError about 'proxies', try an alternative approach
            app.logger.error(f"TypeError creating client: {e}")
            try:
                # Try using openai directly without the client
                import openai
                openai.api_key = OPENAI_API_KEY
                
                # Use the completion API directly
                response = openai.ChatCompletion.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_data}"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=500
                )
                
                # Process response
                result = response.choices[0].message.content
                
                # Try to parse as JSON, fallback to raw text if needed
                try:
                    result_json = json.loads(result)
                    return jsonify({
                        'success': True,
                        'data': result_json
                    })
                except json.JSONDecodeError:
                    return jsonify({
                        'success': True,
                        'data': {
                            'raw_response': result
                        }
                    })
                    
            except Exception as e2:
                app.logger.error(f"Alternative approach failed: {e2}")
                return jsonify({'error': f'Both approaches failed: {str(e)}, {str(e2)}'}), 500
                
        except Exception as e:
            app.logger.error(f"Error creating OpenAI client: {str(e)}")
            return jsonify({'error': f'Failed to initialize OpenAI client: {str(e)}'}), 500
        
        # Call OpenAI Vision API with the main client
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500
            )
            
            # Parse the response
            result = response.choices[0].message.content
            app.logger.info(f"OpenAI response: {result[:200]}...")
            
            # Try to parse as JSON, fallback to raw text if needed
            try:
                # First try direct JSON parsing
                result_json = json.loads(result)
                return jsonify({
                    'success': True,
                    'data': result_json
                })
            except json.JSONDecodeError:
                # Try to extract JSON from the response
                import re
                json_pattern = r'\{[\s\S]*\}'
                json_match = re.search(json_pattern, result)
                
                if json_match:
                    try:
                        result_json = json.loads(json_match.group())
                        return jsonify({
                            'success': True,
                            'data': result_json
                        })
                    except json.JSONDecodeError:
                        pass
                
                # If not valid JSON, return as text
                app.logger.warning("Response is not valid JSON")
                return jsonify({
                    'success': True,
                    'data': {
                        'raw_response': result
                    }
                })
                
        except Exception as api_error:
            app.logger.error(f"Error calling OpenAI API: {str(api_error)}")
            return jsonify({'error': f'Error analyzing image: {str(api_error)}'}), 500
        
    except Exception as e:
        app.logger.error(f"Error analyzing image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'}), 200

@app.route('/test', methods=['GET', 'POST'])
def test():
    if request.method == 'POST':
        data = request.get_json()
        return jsonify({'received': True, 'data_size': len(str(data)) if data else 0})
    return jsonify({'status': 'test endpoint working'})

# Use case routes
@app.route('/use-cases/<slug>')
def use_case(slug):
    # Map slugs to files and metadata
    use_cases = {
        'garage-sales': {
            'file': 'garage-sales.md',
            'title': 'Smart Shopping at Garage Sales & Thrift Stores',
            'description': 'Never overpay at a garage sale again. CostCam helps you make informed decisions when hunting for treasures.'
        },
        'insurance-claims': {
            'file': 'insurance-claims.md',
            'title': 'Document Your Valuables for Insurance',
            'description': 'Protect your assets with accurate valuations. CostCam makes it easy to document your belongings.'
        },
        'moving-selling': {
            'file': 'moving-selling.md',
            'title': 'Simplify Moving & Decluttering',
            'description': 'Moving or downsizing? CostCam helps you decide what to keep, sell, or donate.'
        },
        'gift-shopping': {
            'file': 'gift-shopping.md',
            'title': 'Smart Gift Shopping & Budget Management',
            'description': 'Never exceed your gift budget again. CostCam helps you find perfect presents within your price range.'
        },
        'collectors-antiques': {
            'file': 'collectors-antiques.md',
            'title': 'Discover Hidden Treasures: Collectibles & Antiques',
            'description': 'Uncover the true value of vintage finds, antiques, and collectibles.'
        }
    }
    
    if slug not in use_cases:
        return render_template('404.html'), 404
    
    use_case_info = use_cases[slug]
    
    # Read markdown file
    content_path = Path('content/use-cases') / use_case_info['file']
    try:
        with open(content_path, 'r') as f:
            markdown_content = f.read()
        
        # Convert markdown to HTML
        html_content = markdown.markdown(markdown_content, extensions=['extra', 'codehilite'])
        
        # Check if running locally
        is_local = app.debug or os.environ.get('FLASK_ENV') == 'development' or request.host.startswith('localhost') or request.host.startswith('127.0.0.1')
        
        return render_template('use_case.html', 
                             content=html_content,
                             title=use_case_info['title'],
                             description=use_case_info['description'],
                             is_local=is_local)
    except FileNotFoundError:
        return render_template('404.html'), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)