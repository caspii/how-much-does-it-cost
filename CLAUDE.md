# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Flask web application that analyzes images to estimate prices using OpenAI's GPT-4 Vision API. The app is deployed on Digital Ocean App Platform and available at costcam.app.

## Key Architecture

- **Backend**: Flask API with OpenAI integration (app.py)
- **Frontend**: Single-page app with vanilla JavaScript (static/js/app.js)
- **Deployment**: Digital Ocean App Platform with GitHub auto-deploy
- **AI Integration**: OpenAI GPT-4 Vision for image analysis and price estimation

## Essential Commands

### Development Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py
```

### Testing & Validation
```bash
# Run the app locally (port 5000)
python app.py

# Production server locally
gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:8080 app:app
```

### Deployment Commands
```bash
# Deploy to Digital Ocean (requires doctl CLI)
doctl apps create --spec app.yaml

# Update existing app
doctl apps update <app-id> --spec app.yaml

# View logs
doctl apps logs <app-id>

# List apps
doctl apps list
```

## Code Structure

### Main Components
- `app.py`: Flask routes and OpenAI integration
  - `/analyze` endpoint handles image analysis
  - Implements location-based pricing
  - Image compression and validation
- `static/js/app.js`: Frontend logic
  - Camera/file upload handling
  - Geolocation integration
  - Results display with animations
- `templates/index.html`: Single-page application UI

### API Endpoints
- `POST /analyze`: Accepts image data and optional location for price analysis
- `GET /`: Serves the main application page
- `GET /health`: Health check endpoint for monitoring

## Environment Configuration

Required environment variables:
- `OPENAI_API_KEY`: OpenAI API key for GPT-4 Vision
- `SECRET_KEY`: Flask secret key for sessions
- `PORT`: Server port (default 8080 in production)

## Important Deployment Notes

1. The app is configured for Digital Ocean App Platform (app.yaml)
2. GitHub integration enables auto-deploy from main branch
3. Gunicorn is used as the production WSGI server
4. Static files are served directly by Flask (suitable for small apps)
5. Environment variables must be set in Digital Ocean dashboard

## When Making Changes

1. Test locally with `python app.py` before committing
2. Ensure requirements.txt is updated if adding dependencies
3. The app auto-deploys on push to main branch
4. Check Digital Ocean logs if deployment issues occur
5. Keep image processing under 5MB limit (handled in frontend)