"""Frontend wiring tests for the price-history feature.

The history feature lives in static/js/history.js (pure logic, unit-tested in
tests/history.test.js) and static/js/app.js (DOM glue). These tests verify the
HTML and JS surface that the two scripts depend on, so a renamed ID or a missing
script tag fails CI loudly.
"""

import os
import shutil
import subprocess

import pytest

from app import app

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_JS = os.path.join(REPO_ROOT, 'static', 'js', 'app.js')
HISTORY_JS = os.path.join(REPO_ROOT, 'static', 'js', 'history.js')
HISTORY_TEST_JS = os.path.join(REPO_ROOT, 'tests', 'history.test.js')


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


# ---- HTML wiring ----

REQUIRED_HISTORY_IDS = [
    'historyBtn',
    'historyCount',
    'historySection',
    'historyGrid',
    'historyEmpty',
    'historyBackBtn',
    'historyClearBtn',
    'backToHistoryBtn',
    'resultImage',
]


def test_index_includes_all_history_element_ids(client):
    response = client.get('/')
    assert response.status_code == 200
    body = response.data.decode('utf-8')
    for element_id in REQUIRED_HISTORY_IDS:
        assert f'id="{element_id}"' in body, f'missing id="{element_id}" in index'


def test_index_loads_history_js_before_app_js(client):
    response = client.get('/')
    body = response.data.decode('utf-8')
    history_idx = body.find('js/history.js')
    app_idx = body.find('js/app.js')
    assert history_idx != -1, 'history.js script tag not found'
    assert app_idx != -1, 'app.js script tag not found'
    assert history_idx < app_idx, 'history.js must load before app.js'


def test_history_js_is_served(client):
    response = client.get('/static/js/history.js')
    assert response.status_code == 200
    assert b'CostCamHistory' in response.data


# ---- JS source surface (cheap regression checks) ----

def _read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def test_history_module_exposes_expected_api():
    src = _read(HISTORY_JS)
    for symbol in [
        'HISTORY_KEY',
        'MAX_HISTORY',
        'loadHistory',
        'persistHistory',
        'clearHistory',
        'addHistoryEntry',
        'deleteHistoryItem',
        'formatHistoryDate',
        'formatHistoryPrice',
    ]:
        assert symbol in src, f'history.js missing symbol: {symbol}'


def test_history_module_supports_browser_and_node():
    src = _read(HISTORY_JS)
    assert 'module.exports' in src, 'history.js must export for Node tests'
    assert 'CostCamHistory' in src, 'history.js must attach to window for the browser'


def test_app_js_uses_the_history_module():
    src = _read(APP_JS)
    # app.js must call into the module rather than redefining the helpers itself.
    assert 'CostCamHistory.addHistoryEntry' in src
    assert 'CostCamHistory.loadHistory' in src
    assert 'CostCamHistory.clearHistory' in src
    assert 'CostCamHistory.deleteHistoryItem' in src
    # And it must not redeclare the constants the module owns.
    assert "const HISTORY_KEY" not in src
    assert "const MAX_HISTORY" not in src


def test_app_js_saves_to_history_after_successful_analysis():
    src = _read(APP_JS)
    # Save call must happen alongside the existing displayResults call inside analyzeImage.
    assert 'saveToHistory(currentImageData, result.data)' in src
    assert 'displayResults(result.data)' in src


# ---- Run the Node-based unit test suite from pytest ----

@pytest.mark.skipif(shutil.which('node') is None, reason='node not available')
def test_history_js_unit_tests_pass():
    result = subprocess.run(
        ['node', '--test', HISTORY_TEST_JS],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.fail(
            f'node --test failed (exit {result.returncode})\n'
            f'STDOUT:\n{result.stdout}\n'
            f'STDERR:\n{result.stderr}'
        )
