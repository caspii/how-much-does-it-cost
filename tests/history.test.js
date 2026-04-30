const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const History = require(path.join(__dirname, '..', 'static', 'js', 'history.js'));

function memoryStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
        removeItem: (k) => { store.delete(k); },
        _dump: () => Object.fromEntries(store),
        _size: () => store.size,
    };
}

function quotaCappedStorage(maxBytes) {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => {
            const value = String(v);
            if (value.length > maxBytes) {
                const err = new Error('QuotaExceededError');
                err.name = 'QuotaExceededError';
                throw err;
            }
            store.set(k, value);
        },
        removeItem: (k) => { store.delete(k); },
        _dump: () => Object.fromEntries(store),
        _seed: (k, v) => { store.set(k, String(v)); },
    };
}

function makeEntry(id, overrides = {}) {
    return Object.assign({
        id: String(id),
        timestamp: 1700000000000 + Number(String(id).replace(/\D/g, '') || 0),
        image: 'data:image/jpeg;base64,AAAA',
        data: {
            item_name: `Item ${id}`,
            currency: 'USD',
            price_range: { low: 10, high: 20, typical: 15 },
        },
    }, overrides);
}

test('loadHistory returns [] when storage is empty', () => {
    const storage = memoryStorage();
    assert.deepEqual(History.loadHistory({ storage }), []);
});

test('loadHistory tolerates corrupt JSON', () => {
    const storage = memoryStorage();
    storage.setItem(History.HISTORY_KEY, 'not valid json {');
    assert.deepEqual(History.loadHistory({ storage }), []);
});

test('loadHistory tolerates non-array JSON', () => {
    const storage = memoryStorage();
    storage.setItem(History.HISTORY_KEY, JSON.stringify({ not: 'array' }));
    assert.deepEqual(History.loadHistory({ storage }), []);
});

test('persistHistory + loadHistory roundtrip', () => {
    const storage = memoryStorage();
    const items = [makeEntry(1), makeEntry(2)];
    History.persistHistory(items, { storage });
    assert.deepEqual(History.loadHistory({ storage }), items);
});

test('addHistoryEntry prepends newest first', () => {
    const storage = memoryStorage();
    History.addHistoryEntry(makeEntry('a'), { storage });
    History.addHistoryEntry(makeEntry('b'), { storage });
    History.addHistoryEntry(makeEntry('c'), { storage });
    const items = History.loadHistory({ storage });
    assert.equal(items.length, 3);
    assert.deepEqual(items.map(i => i.id), ['c', 'b', 'a']);
});

test('addHistoryEntry caps at MAX_HISTORY', () => {
    const storage = memoryStorage();
    for (let i = 0; i < History.MAX_HISTORY + 5; i++) {
        History.addHistoryEntry(makeEntry(`e${i}`), { storage });
    }
    const items = History.loadHistory({ storage });
    assert.equal(items.length, History.MAX_HISTORY);
    // Newest survive: most recently added "e54" should be first.
    assert.equal(items[0].id, `e${History.MAX_HISTORY + 4}`);
    // Oldest entries (e0..e4) should be evicted.
    assert.ok(!items.find(i => i.id === 'e0'));
    assert.ok(!items.find(i => i.id === 'e4'));
});

test('persistHistory drops oldest items when storage quota is hit', () => {
    // Cap storage so only ~3 entries fit.
    const oneEntry = JSON.stringify([makeEntry('size-probe')]);
    const storage = quotaCappedStorage(oneEntry.length * 3);
    const tooMany = [makeEntry(1), makeEntry(2), makeEntry(3), makeEntry(4), makeEntry(5)];
    const persisted = History.persistHistory(tooMany, { storage });
    assert.ok(persisted.length > 0, 'something should have been persisted');
    assert.ok(persisted.length < tooMany.length, 'some entries should have been dropped');
    // Entries dropped from the END (oldest), so head ids survive.
    assert.equal(persisted[0].id, '1');
    // Reload to confirm what's actually in storage.
    const loaded = History.loadHistory({ storage });
    assert.deepEqual(loaded, persisted);
});

test('persistHistory clears the key when nothing fits', () => {
    const storage = quotaCappedStorage(5); // too small for any entry
    storage._seed(History.HISTORY_KEY, JSON.stringify([{ stale: true }]));
    History.persistHistory([makeEntry(1), makeEntry(2)], { storage });
    assert.equal(storage.getItem(History.HISTORY_KEY), null);
});

test('clearHistory removes the entry', () => {
    const storage = memoryStorage();
    History.addHistoryEntry(makeEntry(1), { storage });
    History.clearHistory({ storage });
    assert.equal(storage.getItem(History.HISTORY_KEY), null);
    assert.deepEqual(History.loadHistory({ storage }), []);
});

test('deleteHistoryItem removes only the targeted item', () => {
    const storage = memoryStorage();
    History.addHistoryEntry(makeEntry('a'), { storage });
    History.addHistoryEntry(makeEntry('b'), { storage });
    History.addHistoryEntry(makeEntry('c'), { storage });
    History.deleteHistoryItem('b', { storage });
    const items = History.loadHistory({ storage });
    assert.deepEqual(items.map(i => i.id), ['c', 'a']);
});

test('deleteHistoryItem on missing id is a no-op', () => {
    const storage = memoryStorage();
    History.addHistoryEntry(makeEntry('a'), { storage });
    History.deleteHistoryItem('does-not-exist', { storage });
    assert.deepEqual(History.loadHistory({ storage }).map(i => i.id), ['a']);
});

test('formatHistoryDate: Just now under a minute', () => {
    const now = 1_700_000_000_000;
    assert.equal(History.formatHistoryDate(now - 30 * 1000, now), 'Just now');
});

test('formatHistoryDate: minutes ago', () => {
    const now = 1_700_000_000_000;
    assert.equal(History.formatHistoryDate(now - 5 * 60 * 1000, now), '5m ago');
});

test('formatHistoryDate: hours ago', () => {
    const now = 1_700_000_000_000;
    assert.equal(History.formatHistoryDate(now - 3 * 60 * 60 * 1000, now), '3h ago');
});

test('formatHistoryDate: days ago (within a week)', () => {
    const now = 1_700_000_000_000;
    assert.equal(History.formatHistoryDate(now - 2 * 24 * 60 * 60 * 1000, now), '2d ago');
});

test('formatHistoryDate: older than a week falls back to a locale date string', () => {
    const now = 1_700_000_000_000;
    const old = now - 30 * 24 * 60 * 60 * 1000;
    const out = History.formatHistoryDate(old, now);
    assert.doesNotMatch(out, /ago/);
    assert.notEqual(out, 'Just now');
    assert.ok(out.length > 0);
});

test('formatHistoryPrice handles missing price_range', () => {
    assert.equal(History.formatHistoryPrice({ item_name: 'x' }), '');
    assert.equal(History.formatHistoryPrice(null), '');
    assert.equal(History.formatHistoryPrice(undefined), '');
});

test('formatHistoryPrice formats USD with en-US locale', () => {
    const out = History.formatHistoryPrice({
        currency: 'USD',
        price_range: { low: 10, high: 25 },
    });
    assert.match(out, /\$10/);
    assert.match(out, /\$25/);
});

test('formatHistoryPrice falls back to USD when currency missing', () => {
    const out = History.formatHistoryPrice({
        price_range: { low: 1, high: 2 },
    });
    assert.match(out, /\$1/);
    assert.match(out, /\$2/);
});

test('formatHistoryPrice respects a custom locale map', () => {
    const out = History.formatHistoryPrice(
        { currency: 'EUR', price_range: { low: 100, high: 200 } },
        { EUR: 'de-DE' },
    );
    // de-DE puts the symbol after and uses different separators; just sanity-check the symbol.
    assert.match(out, /€/);
});

test('module export is a stable object surface', () => {
    const expected = [
        'HISTORY_KEY',
        'MAX_HISTORY',
        'LOCALE_BY_CURRENCY',
        'loadHistory',
        'persistHistory',
        'clearHistory',
        'addHistoryEntry',
        'deleteHistoryItem',
        'formatHistoryDate',
        'formatHistoryPrice',
    ];
    for (const key of expected) {
        assert.ok(key in History, `missing exported key: ${key}`);
    }
});
