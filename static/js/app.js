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
            
            // Calculate new dimensions (max 1200px)
            let width = img.width;
            let height = img.height;
            const maxSize = 1200;
            
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
            
            // Convert to base64 with compression
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
    takePictureBtn.style.display = 'none';
    preview.style.display = 'block';
    results.style.display = 'none';
    error.style.display = 'none';
}

function resetToCapture() {
    takePictureBtn.style.display = 'inline-flex';
    preview.style.display = 'none';
    results.style.display = 'none';
    error.style.display = 'none';
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

function displayResults(data) {
    results.style.display = 'block';
    
    if (data.raw_response) {
        // Handle raw text response
        resultContent.innerHTML = `
            <div class="price-info">
                <p>${data.raw_response}</p>
            </div>
        `;
    } else {
        // Handle structured JSON response
        let html = `
            <div class="price-info">
                <div class="item-name">${data.item_name || 'Unknown Item'}</div>
        `;
        
        if (data.price_range) {
            const formatPrice = (price) => {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: data.currency || 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(price);
            };
            
            html += `
                <div class="price-range">
                    ${formatPrice(data.price_range.low)} - ${formatPrice(data.price_range.high)}
                </div>
                <div class="typical-price">Typical price: <strong>${formatPrice(data.price_range.typical)}</strong></div>
            `;
        }
        
        if (data.confidence) {
            html += `<div class="confidence confidence-${data.confidence}">Confidence: ${data.confidence.toUpperCase()}</div>`;
        }
        
        html += `</div>`;
        
        if (data.factors && data.factors.length > 0) {
            html += `
                <div class="factors">
                    <h3>Price Factors</h3>
                    <ul>
                        ${data.factors.map(factor => `<li>${factor}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (data.where_to_buy && data.where_to_buy.length > 0) {
            html += `
                <div class="where-to-buy">
                    <h3>Where to Buy</h3>
                    <ul>
                        ${data.where_to_buy.map(place => `<li>${place}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        resultContent.innerHTML = html;
    }
}

function showError(message) {
    error.style.display = 'block';
    errorMessage.textContent = message;
}