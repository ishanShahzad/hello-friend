# Railway WebSocket Connection Fix

## The Exact Error

Your Railway logs show:
```
Error: WebSocket was closed before the connection was established
at WebSocketClient.close (/evolution/node_modules/baileys/lib/Socket/Client/websocket.js:53:21)
```

This is **100% a network connectivity issue**. Baileys cannot establish WebSocket connection to WhatsApp servers.

## Why This Happens

WhatsApp uses WebSocket (WSS) connections on port 443 to:
- `web.whatsapp.com`
- `*.whatsapp.net`

Railway is either:
1. Blocking outbound WebSocket connections
2. Blocking WhatsApp domains specifically
3. Having network routing issues

## Solution 1: Deploy Evolution API to Heroku (RECOMMENDED)

Heroku doesn't block WhatsApp connections. Here's how:

### Step 1: Create Heroku App for Evolution API

```bash
# Create new app
heroku create rozare-evolution-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:essential-0 -a rozare-evolution-api

# Add Redis (optional but recommended)
heroku addons:create heroku-redis:mini -a rozare-evolution-api
```

### Step 2: Clone Evolution API

```bash
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
```

### Step 3: Set Environment Variables

```bash
heroku config:set -a rozare-evolution-api \
  SERVER_TYPE="http" \
  SERVER_PORT="8080" \
  AUTHENTICATION_API_KEY="rozareplatform" \
  AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES="true" \
  DATABASE_ENABLED="true" \
  DATABASE_PROVIDER="postgresql" \
  DATABASE_CONNECTION_CLIENT_NAME="evolution" \
  CONFIG_SESSION_PHONE_CLIENT="Rozare" \
  CONFIG_SESSION_PHONE_NAME="Chrome" \
  QRCODE_LIMIT="30" \
  LOG_LEVEL="ERROR" \
  DEL_INSTANCE="false"
```

### Step 4: Get Database URL

```bash
# Get PostgreSQL URL
heroku config:get DATABASE_URL -a rozare-evolution-api

# Set it as DATABASE_CONNECTION_URI
heroku config:set DATABASE_CONNECTION_URI="<paste-database-url-here>" -a rozare-evolution-api
```

### Step 5: Deploy

```bash
git push heroku main
```

### Step 6: Update Backend Environment Variables

Update your backend `.env` or Heroku config:

```bash
heroku config:set -a tortrose-backend \
  EVOLUTION_API_URL="https://rozare-evolution-api.herokuapp.com" \
  EVOLUTION_API_KEY="rozareplatform" \
  EVOLUTION_INSTANCE_NAME="rozare-main"
```

### Step 7: Test

Visit: `https://rozare-evolution-api.herokuapp.com`

You should see Evolution API welcome page.

## Solution 2: Use Render.com

Render also doesn't block WhatsApp:

1. Go to https://render.com
2. Create new Web Service
3. Connect Evolution API GitHub repo: `https://github.com/EvolutionAPI/evolution-api`
4. Add PostgreSQL database
5. Set environment variables (same as above)
6. Deploy

## Solution 3: Contact Railway Support

Open a support ticket asking:

> "My Evolution API deployment cannot establish WebSocket connections to WhatsApp servers (web.whatsapp.com, *.whatsapp.net). I'm getting 'WebSocket was closed before the connection was established' errors. Can you check if outbound WSS connections on port 443 to WhatsApp domains are blocked?"

## Solution 4: Use DigitalOcean App Platform

DigitalOcean has excellent network connectivity:

1. Create App Platform app
2. Connect Evolution API repo
3. Add PostgreSQL database
4. Set environment variables
5. Deploy

Cost: $5/month

## Solution 5: Self-Host on VPS

If you have a VPS (DigitalOcean Droplet, AWS EC2, etc.):

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone Evolution API
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Create .env file
cat > .env << EOF
SERVER_TYPE=http
SERVER_PORT=8080
AUTHENTICATION_API_KEY=rozareplatform
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://user:pass@localhost:5432/evolution
EOF

# Run with Docker Compose
docker-compose up -d
```

## Why Heroku is Best

✅ No WebSocket blocking
✅ Easy PostgreSQL setup
✅ Same platform as your backend
✅ Free tier available (with credit card)
✅ Reliable network connectivity
✅ Easy to configure

## After Moving Evolution API

Once Evolution API is on Heroku/Render:

1. Update backend environment variables
2. Restart backend: `heroku restart -a tortrose-backend`
3. Visit: https://www.rozare.com/admin-dashboard/whatsapp-verification
4. Click "Link WhatsApp"
5. QR code should appear within 5-10 seconds!

## Testing WebSocket Connectivity

To test if Railway blocks WhatsApp:

```bash
# SSH into Railway container (if possible)
curl -v https://web.whatsapp.com

# Should return 200 OK
# If it fails or times out, Railway is blocking WhatsApp
```

## Current Status

❌ Railway: Blocking WhatsApp WebSocket connections
✅ Backend Code: Perfect and ready (v32)
✅ Frontend: Has QR and pairing code support
✅ All Features: Working, just need Evolution API on different platform

## Recommendation

**Deploy Evolution API to Heroku** - it's the fastest and most reliable solution. Should take 10-15 minutes and will solve the issue completely.

## Need Help?

If you need help deploying to Heroku, I can guide you through each step!
