# Evolution API Railway Configuration Issue

## Problem
The Evolution API instance on Railway is stuck in "close" state and not generating QR codes. Even after calling `/instance/connect`, the connectionStatus remains "close".

## Root Cause
Evolution API v2.2.3 requires proper configuration to work. The issue is likely one of:

1. **Missing Database Configuration**: Evolution API needs PostgreSQL to store session data
2. **Wrong API Endpoints**: v2.x changed some endpoint behaviors
3. **Instance Not Starting**: The WhatsApp connection process isn't being triggered

## Solution: Check Railway Configuration

### 1. Verify Environment Variables on Railway

Go to your Evolution API service on Railway and ensure these are set:

```env
# Database (REQUIRED for v2.x)
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=your-api-key-here

# Server
SERVER_TYPE=http
SERVER_PORT=8080

# WhatsApp Settings
QRCODE_LIMIT=30
QRCODE_COLOR=#198754

# Optional but recommended
LOG_LEVEL=ERROR
LOG_BAILEYS=error
```

### 2. Check Database Connection

Evolution API v2.x **REQUIRES** a database. Without it, instances won't persist and connections will fail.

On Railway:
1. Add a PostgreSQL database to your project
2. Link it to your Evolution API service
3. Copy the `DATABASE_URL` from PostgreSQL service
4. Set `DATABASE_PROVIDER=postgresql` in Evolution API

### 3. Restart Evolution API Service

After setting environment variables:
1. Go to Railway dashboard
2. Find your Evolution API service
3. Click "Restart" or redeploy

### 4. Test Evolution API Directly

Test if Evolution API is working:

```bash
# Check if API is responding
curl https://your-evolution-api.railway.app/

# List instances
curl -H "apikey: your-api-key" \
  https://your-evolution-api.railway.app/instance/fetchInstances

# Check specific instance
curl -H "apikey: your-api-key" \
  https://your-evolution-api.railway.app/instance/connectionState/rozare-main
```

## Alternative: Use Evolution API v1.x

If v2.x continues to have issues, you can downgrade to v1.x which has simpler configuration:

1. On Railway, change the Docker image to: `atendai/evolution-api:v1.7.4`
2. Remove `DATABASE_PROVIDER` and `DATABASE_URL` (v1.x doesn't need them)
3. Keep `AUTHENTICATION_API_KEY`
4. Redeploy

v1.x auto-generates QR on instance creation, which is simpler.

## Alternative: Use Different WhatsApp Gateway

If Evolution API continues to be problematic, consider:

1. **Baileys directly**: Use Baileys library directly in your backend
2. **WhatsApp Business API**: Official API (requires Facebook Business account)
3. **Twilio WhatsApp**: Paid service but very reliable
4. **WA-Automate**: Another open-source option

## Quick Fix: Delete and Recreate Instance

Try this from your backend:

```bash
# SSH into Heroku
heroku run bash

# Run node REPL
node

# Delete instance
const axios = require('axios');
const client = axios.create({
  baseURL: 'https://your-evolution-api.railway.app',
  headers: { apikey: 'your-api-key' }
});

await client.delete('/instance/delete/rozare-main');
await client.post('/instance/create', {
  instanceName: 'rozare-main',
  qrcode: true,
  integration: 'WHATSAPP-BAILEYS'
});
```

## Expected Behavior

When working correctly, you should see:

```
POST /instance/create → status: "connecting"
GET /instance/connect → returns QR code or pairing code
GET /instance/fetchInstances → connectionStatus: "connecting" or "open"
```

## Current Behavior (Broken)

What we're seeing:

```
POST /instance/create → status: "connecting" ✓
GET /instance/connect → {"count": 0} ✗
GET /instance/fetchInstances → connectionStatus: "close" ✗
```

This indicates Evolution API is not actually starting the WhatsApp connection process.

## Next Steps

1. Check Railway logs for Evolution API errors
2. Verify DATABASE_URL is set and PostgreSQL is running
3. Try restarting Evolution API service
4. If still broken, consider downgrading to v1.x or using alternative gateway
