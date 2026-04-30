(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CostCamHistory = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    const HISTORY_KEY = 'costcam_history_v1';
    const MAX_HISTORY = 50;

    const LOCALE_BY_CURRENCY = {
        USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP', CNY: 'zh-CN',
        INR: 'en-IN', CAD: 'en-CA', AUD: 'en-AU', BRL: 'pt-BR', MXN: 'es-MX',
        KRW: 'ko-KR', CHF: 'de-CH', SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK',
    };

    function getStorage(opts) {
        if (opts && opts.storage) return opts.storage;
        if (typeof localStorage !== 'undefined') return localStorage;
        return null;
    }

    function loadHistory(opts) {
        const storage = getStorage(opts);
        if (!storage) return [];
        try {
            const raw = storage.getItem(HISTORY_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function persistHistory(items, opts) {
        const storage = getStorage(opts);
        if (!storage) return [];
        const attempts = items.slice();
        while (attempts.length > 0) {
            try {
                storage.setItem(HISTORY_KEY, JSON.stringify(attempts));
                return attempts;
            } catch (e) {
                attempts.pop();
            }
        }
        try { storage.removeItem(HISTORY_KEY); } catch (e) {}
        return [];
    }

    function clearHistory(opts) {
        const storage = getStorage(opts);
        if (!storage) return;
        try { storage.removeItem(HISTORY_KEY); } catch (e) {}
    }

    function addHistoryEntry(entry, opts) {
        const items = loadHistory(opts);
        items.unshift(entry);
        const trimmed = items.slice(0, MAX_HISTORY);
        return persistHistory(trimmed, opts);
    }

    function deleteHistoryItem(id, opts) {
        const items = loadHistory(opts).filter(item => item.id !== id);
        return persistHistory(items, opts);
    }

    function formatHistoryDate(timestamp, nowMs) {
        const now = typeof nowMs === 'number' ? nowMs : Date.now();
        const diff = now - timestamp;
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        if (diff < minute) return 'Just now';
        if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
        if (diff < day) return `${Math.floor(diff / hour)}h ago`;
        if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
        const d = new Date(timestamp);
        const sameYear = d.getFullYear() === new Date(now).getFullYear();
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: sameYear ? undefined : 'numeric',
        });
    }

    function formatHistoryPrice(data, localeMap) {
        if (!data || !data.price_range) return '';
        const map = localeMap || LOCALE_BY_CURRENCY;
        const currency = data.currency || 'USD';
        const locale = map[currency] || 'en-US';
        const fmt = new Intl.NumberFormat(locale, {
            style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
        });
        return `${fmt.format(data.price_range.low)} – ${fmt.format(data.price_range.high)}`;
    }

    return {
        HISTORY_KEY,
        MAX_HISTORY,
        LOCALE_BY_CURRENCY,
        loadHistory,
        persistHistory,
        clearHistory,
        addHistoryEntry,
        deleteHistoryItem,
        formatHistoryDate,
        formatHistoryPrice,
    };
}));
