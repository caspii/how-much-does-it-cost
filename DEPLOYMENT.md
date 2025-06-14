# Digital Ocean Deployment Guide

## Prerequisites
- Digital Ocean account (get $200 credit: https://try.digitalocean.com/freetrialoffer/)
- Your OpenAI API key

## Step-by-Step Deployment

### 1. Create Digital Ocean App

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Choose "GitHub" as the source
4. Authorize Digital Ocean to access your GitHub account
5. Select the repository: `caspii/how-much-does-it-cost`
6. Choose branch: `main`
7. Click "Next"

### 2. Configure App Settings

1. **Resources**: Keep the default (Basic $5/month plan is sufficient)
2. **Environment Variables**: Click "Edit" and add:
   ```
   OPENAI_API_KEY = your_actual_openai_api_key_here
   SECRET_KEY = generate_a_random_secret_key_here
   ```
3. **Info**: Name your app (e.g., "how-much-does-it-cost")
4. **Region**: Choose the closest to your users

### 3. Deploy

1. Click "Create Resources"
2. Digital Ocean will automatically:
   - Detect Python/Flask app
   - Install dependencies from requirements.txt
   - Run the app using gunicorn

### 4. Access Your App

After deployment (takes 2-5 minutes), you'll get a URL like:
`https://how-much-does-it-cost-xxxxx.ondigitalocean.app`

## Quick Deploy via CLI (Alternative)

If you have Digital Ocean CLI (`doctl`) installed:

```bash
# Authenticate
doctl auth init

# Create app
doctl apps create --spec app.yaml

# Deploy
doctl apps create-deployment <app-id>
```

## Environment Variables to Set

| Variable | Description | Required |
|----------|-------------|----------|
| OPENAI_API_KEY | Your OpenAI API key | Yes |
| SECRET_KEY | Random string for Flask sessions | Yes |
| PORT | Set automatically by DO | No |

## Monitoring

- Check logs: Apps → Your App → Runtime Logs
- Monitor usage: Apps → Your App → Insights
- Set up alerts: Apps → Your App → Settings → Alerts

## Troubleshooting

1. **App won't start**: Check Runtime Logs for errors
2. **500 errors**: Usually means OPENAI_API_KEY is not set
3. **Slow response**: Upgrade to a larger instance size

## Cost Estimate

- Basic plan: $5/month
- Includes: 1 vCPU, 512 MB RAM, 10 GB bandwidth
- Sufficient for personal use/small traffic

## Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed