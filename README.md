# How Much Does It Cost?

A web application that analyzes images to estimate the price of items using AI.

## Features

- 📸 Take or upload photos directly from your device
- 🤖 AI-powered price estimation using OpenAI's GPT-4 Vision
- 📍 Geolocation support for regional pricing
- 💰 Detailed price breakdowns with factors affecting cost
- 🛒 Suggestions on where to buy items
- 😄 Entertaining loading messages while analyzing

## Tech Stack

- **Backend**: Python Flask
- **AI**: OpenAI GPT-4 Vision API
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Digital Ocean App Platform ready

## Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/how-much-does-it-cost.git
cd how-much-does-it-cost
```

2. Create a virtual environment and install dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_secret_key_here
```

4. Run the application:
```bash
python app.py
```

5. Open your browser and navigate to `http://localhost:8080`

## Deployment to Digital Ocean

1. Fork this repository to your GitHub account
2. Update `app.yaml` with your repository details
3. Create a new app on Digital Ocean App Platform
4. Connect your GitHub repository
5. Set the environment variables in the app settings
6. Deploy!

## Usage

1. Click the "Take Picture" button on the homepage
2. Either take a new photo or select an existing image
3. Click "Analyze Price" to get an AI-powered price estimate
4. View detailed pricing information including:
   - Price range (low, typical, high)
   - Factors affecting the price
   - Where to buy the item
   - Confidence level of the estimate

## Contributing

Feel free to open issues or submit pull requests if you have suggestions for improvements!

## License

MIT License - feel free to use this project for your own purposes.