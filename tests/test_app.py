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


def test_parse_openai_json_plain():
    assert parse_openai_json('{"a": 1}') == {'a': 1}


def test_parse_openai_json_embedded():
    text = 'Here is the result:\n```json\n{"item_name": "x"}\n```'
    assert parse_openai_json(text) == {'item_name': 'x'}


def test_parse_openai_json_invalid():
    assert parse_openai_json('not json at all') is None
