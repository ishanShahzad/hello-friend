# Deploy Evolution API to Heroku - Manual Steps

## I've Already Created:

✅ Heroku app: `rozare-evolution-api`
✅ PostgreSQL database: Added and configured
✅ Environment variables: All set

**App URL**: https://rozare-evolution-api-08de9859499d.herokuapp.com/

## The Issue

Evolution API build is failing because it needs Prisma client generated before TypeScript compilation. This requires a custom build process.

## Solution: Use Docker Deployment

### Option 1: Deploy Using Heroku CLI (Recommended)

1. **Install Docker Desktop** (if not installed):
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start Docker

2. **Login to Heroku Container Registry**:
   ```bash
   heroku container:login
   ```

3. **Clone Evolution API**:
   ```bash
   git clone https://github.com/EvolutionAPI/evolution-api.git
   cd evolution-api
   ```

4. **Build and Push Docker Image**:
   ```bash
   heroku container:push web -a rozare-evolution-api
   ```

5. **Release the Image**:
   ```bash
   heroku container:release web -a rozare-evolution-api
   ```

6. **Check Logs**:
   ```bash
   heroku logs --tail -a rozare-evolution-api
   ```

### Option 2: Use Render.com (Easier, No Docker Needed)

Render.com is easier because it handles Docker automatically:

1. Go to https://render.com
2. Sign up/Login
3. Click "New +" → "Web Service"
4. Connect GitHub: `https://github.com/EvolutionAPI/evolution-api`
5. Configure:
   - **Name**: `rozare-evolution-api`
   - **Environment**: `Docker`
   - **Plan**: Free
6. Add PostgreSQL database (click "New +" → "PostgreSQL")
7. Set environment variables (same as below)
8. Click "Create Web Service"

### Option 3: Use Railway (But Fix Network)

Since you already have Railway configured, you could:
1. Contact Railway support about WebSocket blocking
2. Or try deploying to a different Railway region

## Environment Variables (Already Set on Heroku)

```
SERVER_TYPE=http
SERVER_PORT=8080
AUTHENTICATION_API_KEY=rozareplatform
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=<your Heroku PostgreSQL URL from Heroku dashboard>
DATABASE_CONNECTION_CLIENT_NAME=evolution
CONFIG_SESSION_PHONE_CLIENT=Rozare
CONFIG_SESSION_PHONE_NAME=Chrome
QRCODE_LIMIT=30
LOG_LEVEL=ERROR
DEL_INSTANCE=false
WEBHOOK_GLOBAL_ENABLED=false
```

## After Evolution API is Deployed

Update your backend environment variables:

```bash
heroku config:set -a tortrose-backend \
  EVOLUTION_API_URL="https://rozare-evolution-api-08de9859499d.herokuapp.com" \
  EVOLUTION_API_KEY="rozareplatform" \
  EVOLUTION_INSTANCE_NAME="rozare-main"
```

Then restart backend:
```bash
heroku restart -a tortrose-backend
```

## Quick Test After Deployment

1. Visit: https://rozare-evolution-api-08de9859499d.herokuapp.com
2. You should see Evolution API welcome page
3. Visit: https://www.rozare.com/admin-dashboard/whatsapp-verification
4. Click "Link WhatsApp"
5. QR code should appear!

## My Recommendation

**Use Render.com** - it's the easiest:
- No Docker installation needed
- Handles everything automatically
- Free tier available
- Better than Railway for WhatsApp

Takes 5-10 minutes to set up!

## Need Help?

If you want me to guide you through Render.com deployment, just let me know!
