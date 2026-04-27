import pytest

from app import app, parse_openai_json


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.get_json() == {'status': 'healthy'}


def test_index(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b'<html' in response.data.lower()


def test_analyze_no_data(client):
    response = client.post('/analyze', json={})
    assert response.status_code == 400
    assert 'error' in response.get_json()


def test_use_case_not_found(client):
    response = client.get('/use-cases/does-not-exist')
    assert response.status_code == 404


def test_use_case_valid(client):
    response = client.get('/use-cases/garage-sales')
    assert response.status_code == 200
    assert b'How to Price Garage Sale Items' in response.data


def test_homepage_seo_title(client):
    response = client.get('/')
    assert b'How Much Is It Worth?' in response.data
    assert b'application/ld+json' in response.data


def test_robots_txt(client):
    response = client.get('/robots.txt')
    assert response.status_code == 200
    assert response.mimetype == 'text/plain'
    assert b'Sitemap: https://costcam.app/sitemap.xml' in response.data


def test_sitemap_xml(client):
    response = client.get('/sitemap.xml')
    assert response.status_code == 200
    assert response.mimetype == 'application/xml'
    assert b'<loc>https://costcam.app/</loc>' in response.data
    assert b'<loc>https://costcam.app/use-cases/garage-sales</loc>' in response.data
    assert b'<loc>https://costcam.app/use-cases/collectors-antiques</loc>' in response.data


def test_parse_openai_json_plain():
    assert parse_openai_json('{"a": 1}') == {'a': 1}


def test_parse_openai_json_embedded():
    text = 'Here is the result:\n```json\n{"item_name": "x"}\n```'
    assert parse_openai_json(text) == {'item_name': 'x'}


def test_parse_openai_json_invalid():
    assert parse_openai_json('not json at all') is None
