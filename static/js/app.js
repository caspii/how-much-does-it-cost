let currentImageData = null;
let userLocation = null;

// DOM elements
const takePictureBtn = document.getElementById('takePictureBtn');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const retakeBtn = document.getElementById('retakeBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const resultContent = document.getElementById('resultContent');
const newPictureBtn = document.getElementById('newPictureBtn');
const error = document.getElementById('error');
const errorMessage = document.querySelector('.error-message');
const retryBtn = document.getElementById('retryBtn');
const mainContainer = document.getElementById('mainContainer');
const heroSection = document.getElementById('heroSection');
const cameraSection = document.querySelector('.camera-section');

// Get user's location
navigator.geolocation.getCurrentPosition(
    (position) => {
        userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
    },
    (err) => {
        console.log('Location permission denied or unavailable');
    }
);

// Event listeners
takePictureBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        // Compress image before sending
        compressImage(file, (compressedDataUrl) => {
            currentImageData = compressedDataUrl;
            previewImage.src = compressedDataUrl;
            showPreview();
        });
    }
});

function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Preserve resolution for OpenAI vision (high-detail tiles up to 2048×768).
            let width = img.width;
            let height = img.height;
            const maxSize = 1568;

            if (width > height && width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            } else if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            callback(compressedDataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

analyzeBtn.addEventListener('click', analyzeImage);
retakeBtn.addEventListener('click', resetToCapture);
newPictureBtn.addEventListener('click', resetToCapture);
retryBtn.addEventListener('click', resetToCapture);

// Functions
function showPreview() {
    mainContainer.classList.remove('initial-view');
    mainContainer.classList.add('results-view');
    document.body.classList.add('preview-active');
    heroSection.style.display = 'none';
    takePictureBtn.style.display = 'none';
    preview.style.display = 'block';
    results.style.display = 'none';
    error.style.display = 'none';
}

function resetToCapture() {
    mainContainer.classList.add('initial-view');
    mainContainer.classList.remove('results-view');
    document.body.classList.remove('preview-active');
    heroSection.style.display = 'block';
    takePictureBtn.style.display = 'inline-flex';
    preview.style.display = 'none';
    results.style.display = 'none';
    error.style.display = 'none';
    if (cameraSection) cameraSection.style.display = 'block';
    loading.style.display = 'none';
    fileInput.value = '';
    currentImageData = null;
}

// Dry and humorous loading messages
const loadingMessages = [
    "Consulting the price oracle...",
    "Asking my cousin who knows a guy...",
    "Checking under the couch cushions...",
    "Converting to bananas for scale...",
    "Googling 'how much does thing cost'...",
    "Calling the Antiques Roadshow...",
    "Bribing the mall security for intel...",
    "Performing complex napkin math...",
    "Asking my neighbor's dog...",
    "Consulting ancient pricing scrolls...",
    "Checking if it's on sale somewhere...",
    "Calculating in bottle caps...",
    "Running it by the council of elders...",
    "Checking my crystal ball...",
    "Asking the Magic 8-Ball...",
    "Counting on my fingers...",
    "Dusting off the abacus...",
    "Checking the black market rates...",
    "Converting from Monopoly money...",
    "Asking that guy from Craigslist...",
    "Checking eBay completed listings...",
    "Haggling with invisible shopkeepers...",
    "Consulting the Pawn Stars experts...",
    "Reading tea leaves for pricing...",
    "Checking my horoscope for deals...",
    "Asking random strangers on the street...",
    "Converting from Chuck E. Cheese tokens...",
    "Measuring in cups of coffee...",
    "Calling my accountant's psychic...",
    "Checking the price in parallel universes...",
    "Asking Siri's unemployed cousin...",
    "Consulting Wikipedia's citation needed sections...",
    "Checking if it fell off a truck...",
    "Converting from Reddit karma...",
    "Asking my rubber duck for advice...",
    "Checking the garage sale prophecies...",
    "Calculating in expired coupons...",
    "Consulting my collection of fortune cookies...",
    "Asking the pigeons in the parking lot...",
    "Checking if your mom has one..."
];

let messageInterval;
let messageIndex = 0;

function startLoadingMessages() {
    const loadingMessage = document.getElementById('loadingMessage');
    messageIndex = Math.floor(Math.random() * loadingMessages.length);
    loadingMessage.textContent = loadingMessages[messageIndex];
    
    messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        loadingMessage.style.opacity = '0';
        setTimeout(() => {
            loadingMessage.textContent = loadingMessages[messageIndex];
            loadingMessage.style.opacity = '1';
        }, 300);
    }, 2500);
}

function stopLoadingMessages() {
    if (messageInterval) {
        clearInterval(messageInterval);
        messageInterval = null;
    }
}

async function analyzeImage() {
    if (!currentImageData) return;
    
    console.log('Starting image analysis...');
    
    // Show loading with humor
    document.body.classList.remove('preview-active');
    preview.style.display = 'none';
    loading.style.display = 'block';
    error.style.display = 'none';
    startLoadingMessages();
    
    try {
        const requestData = {
            image: currentImageData
        };
        
        if (userLocation) {
            requestData.latitude = userLocation.latitude;
            requestData.longitude = userLocation.longitude;
        }
        
        console.log('Request data size:', JSON.stringify(requestData).length);
        console.log('Sending request to /analyze...');
        
        // Add timeout to fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Track successful analysis
            if (window.fathom) {
                window.fathom.trackEvent('photo_analyzed', {
                    item: result.data.item_name || 'unknown',
                    category: result.data.category || 'unknown',
                    confidence: result.data.confidence || 'unknown'
                });
            }
            displayResults(result.data);
        } else {
            showError(result.error || 'Failed to analyze image');
        }
    } catch (err) {
        console.error('Error:', err);
        showError(`Error: ${err.message || 'Network error. Please try again.'}`);
    } finally {
        stopLoadingMessages();
        loading.style.display = 'none';
    }
}

const AMAZON_TAG = 'keepthescor0a-20';
const EBAY_CAMPAIGN_ID = '';

const LOCALE_BY_CURRENCY = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP', CNY: 'zh-CN',
    INR: 'en-IN', CAD: 'en-CA', AUD: 'en-AU', BRL: 'pt-BR', MXN: 'es-MX',
    KRW: 'ko-KR', CHF: 'de-CH', SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK',
};

const EBAY_FIRST_CATEGORIES = [
    'antique', 'collectible', 'vintage', 'jewelry', 'jewellery',
    'coin', 'stamp', 'card', 'memorabilia', 'art',
];

function buildSearchQuery(data) {
    const parts = [data.brand, data.model, data.item_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    if (Array.isArray(data.search_keywords) && data.search_keywords.length > 0) {
        return data.search_keywords.join(' ');
    }
    return data.item_name || '';
}

function pickPrimaryMarketplace(data) {
    const cond = (data.condition || '').toLowerCase();
    if (cond === 'good' || cond === 'fair' || cond === 'poor') return 'ebay';
    const cat = (data.category || '').toLowerCase();
    if (EBAY_FIRST_CATEGORIES.some(k => cat.includes(k))) return 'ebay';
    return 'amazon';
}

function amazonURL(query) {
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;
}

function ebayURL(query) {
    const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
    return EBAY_CAMPAIGN_ID
        ? `${base}&mkcid=1&mkrid=711-53200-19255-0&campid=${EBAY_CAMPAIGN_ID}`
        : base;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

function displayResults(data) {
    results.style.display = 'block';
    if (cameraSection) cameraSection.style.display = 'none';

    if (data.raw_response) {
        resultContent.innerHTML = `<div class="price-info"><p>${escapeHtml(data.raw_response)}</p></div>`;
        return;
    }

    const currency = data.currency || 'USD';
    const locale = LOCALE_BY_CURRENCY[currency] || 'en-US';
    const formatPrice = (price) => new Intl.NumberFormat(locale, {
        style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(price);

    const itemName = escapeHtml(data.item_name || 'Unknown Item');
    const brandModel = [data.brand, data.model].filter(Boolean).map(escapeHtml).join(' · ');

    let priceBlock = '';
    if (data.price_range) {
        priceBlock = `
            <div class="price-range">${formatPrice(data.price_range.low)} – ${formatPrice(data.price_range.high)}</div>
            <div class="typical-price">Typical: <strong>${formatPrice(data.price_range.typical)}</strong></div>
        `;
    }

    const chips = [];
    if (data.condition) chips.push(`<span class="result-chip">${escapeHtml(data.condition.replace('_', ' '))}</span>`);
    if (data.confidence) chips.push(`<span class="result-chip confidence-${escapeHtml(data.confidence)}">${escapeHtml(data.confidence)} confidence</span>`);

    const query = buildSearchQuery(data);
    const primary = pickPrimaryMarketplace(data);
    const aURL = amazonURL(query);
    const eURL = ebayURL(query);

    const amazonBtn = `<a href="${aURL}" target="_blank" rel="noopener noreferrer sponsored" class="btn-primary marketplace-cta" onclick="window.fathom && window.fathom.trackEvent('amazon_click')">Check current price on Amazon →</a>`;
    const ebayBtn = `<a href="${eURL}" target="_blank" rel="noopener noreferrer sponsored" class="btn-primary marketplace-cta" onclick="window.fathom && window.fathom.trackEvent('ebay_click')">See similar on eBay →</a>`;
    const amazonBtnSm = `<a href="${aURL}" target="_blank" rel="noopener noreferrer sponsored" class="btn-secondary marketplace-cta-sm" onclick="window.fathom && window.fathom.trackEvent('amazon_click')">Check on Amazon</a>`;
    const ebayBtnSm = `<a href="${eURL}" target="_blank" rel="noopener noreferrer sponsored" class="btn-secondary marketplace-cta-sm" onclick="window.fathom && window.fathom.trackEvent('ebay_click')">Compare on eBay</a>`;

    const ctaBlock = primary === 'ebay'
        ? `${ebayBtn}${amazonBtnSm}`
        : `${amazonBtn}${ebayBtnSm}`;

    resultContent.innerHTML = `
        <div class="price-info">
            <div class="item-name">${itemName}</div>
            ${brandModel ? `<div class="item-details">${brandModel}</div>` : ''}
            ${priceBlock}
            ${chips.length ? `<div class="result-chips">${chips.join('')}</div>` : ''}
        </div>
        <div class="marketplace-ctas">${ctaBlock}</div>
        <p class="affiliate-disclosure">We earn a small commission on purchases through these links. It doesn't affect the estimate above.</p>
    `;
}

function showError(message) {
    error.style.display = 'block';
    errorMessage.textContent = message;
    
    // Track error event
    if (window.fathom) {
        window.fathom.trackEvent('analysis_error', {
            error_message: message.substring(0, 100) // Limit message length
        });
    }
}