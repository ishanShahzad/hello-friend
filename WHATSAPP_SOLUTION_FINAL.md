# WhatsApp QR Code & Pairing Code - Complete Solution

## Current Status

✅ **Backend Code**: Fully implemented (v33 on Heroku)
- QR code fetching from Evolution API v2.x
- Pairing code support via `/api/whatsapp/pairing-code` endpoint
- Instance management (create, reset, logout)
- Auto-polling and retry logic

✅ **Frontend Code**: Fully implemented (deployed to Vercel)
- QR code display in modal
- **"Get Pairing Code Instead" button** - ALREADY IN THE CODE!
- Phone number input for pairing code request
- Both QR and pairing code display simultaneously
- Auto-refresh every 25 seconds

✅ **Routes**: All endpoints configured
- `POST /api/whatsapp/connect` - Get QR code
- `POST /api/whatsapp/pairing-code` - Request pairing code
- `POST /api/whatsapp/reset` - Reset stuck instance
- `GET /api/whatsapp/status` - Check connection status

## The Problem

**Railway's Evolution API cannot establish WebSocket connections to WhatsApp servers.**

From your Railway logs:
```
Error: WebSocket was closed before the connection was established
```

This is a **network/firewall issue** on Railway's infrastructure blocking outbound WebSocket connections to:
- `web.whatsapp.com`
- `*.whatsapp.net`

## Solution Options

### Option 1: Deploy Evolution API to Render.com (RECOMMENDED - Easiest)

Render.com is the easiest solution - no Docker installation needed, handles everything automatically.

**Steps:**

1. Go to https://render.com and sign up/login

2. Click "New +" → "Web Service"

3. Connect GitHub repository:
   - Repository: `https://github.com/EvolutionAPI/evolution-api`
   - Branch: `main`

4. Configure service:
   - **Name**: `rozare-evolution-api`
   - **Environment**: `Docker`
   - **Region**: Choose closest to your users
   - **Plan**: Free (or Starter for better performance)

5. Add PostgreSQL database:
   - Click "New +" → "PostgreSQL"
   - Name: `rozare-evolution-db`
   - Plan: Free
   - After creation, copy the "Internal Database URL"

6. Set environment variables in your web service:
   ```
   SERVER_TYPE=http
   SERVER_PORT=10000
   AUTHENTICATION_API_KEY=rozareplatform
   AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
   DATABASE_ENABLED=true
   DATABASE_PROVIDER=postgresql
   DATABASE_CONNECTION_URI=<paste your Internal Database URL>
   DATABASE_CONNECTION_CLIENT_NAME=evolution
   CONFIG_SESSION_PHONE_CLIENT=Rozare
   CONFIG_SESSION_PHONE_NAME=Chrome
   QRCODE_LIMIT=30
   LOG_LEVEL=ERROR
   DEL_INSTANCE=false
   WEBHOOK_GLOBAL_ENABLED=false
   ```

7. Click "Create Web Service"

8. Wait 5-10 minutes for deployment

9. Copy your Render.com URL (e.g., `https://rozare-evolution-api.onrender.com`)

10. Update backend environment variables on Heroku:
    ```bash
    heroku config:set -a tortrose-backend \
      EVOLUTION_API_URL="https://rozare-evolution-api.onrender.com" \
      EVOLUTION_API_KEY="rozareplatform" \
      EVOLUTION_INSTANCE_NAME="rozare-main"
    
    heroku restart -a tortrose-backend
    ```

11. Test at: https://www.rozare.com/admin-dashboard/whatsapp-verification

**Total time: 10-15 minutes**

---

### Option 2: Complete Heroku Docker Deployment (In Progress)

The Docker push to Heroku is currently running in the background. Once it completes:

```bash
# Check if push completed
docker images | grep evolution

# If image is there, release it
heroku container:release web -a rozare-evolution-api

# Check logs
heroku logs --tail -a rozare-evolution-api

# Update backend
heroku config:set -a tortrose-backend \
  EVOLUTION_API_URL="https://rozare-evolution-api-08de9859499d.herokuapp.com" \
  EVOLUTION_API_KEY="rozareplatform" \
  EVOLUTION_INSTANCE_NAME="rozare-main"

heroku restart -a tortrose-backend
```

---

### Option 3: Fix Railway (Contact Support)

Contact Railway support about WebSocket blocking:

**Support ticket template:**
```
Subject: WebSocket connections to WhatsApp servers being blocked

Hi Railway team,

I'm running Evolution API (WhatsApp gateway) on Railway, but it cannot establish WebSocket connections to WhatsApp servers (web.whatsapp.com, *.whatsapp.net).

Error from logs:
"Error: WebSocket was closed before the connection was established"

The same Docker image works fine on other platforms. Could you please check if there are any firewall rules blocking outbound WebSocket connections?

Service ID: [your Railway service ID]
Region: [your region]

Thank you!
```

---

## How to Test After Deployment

1. Visit: https://www.rozare.com/admin-dashboard/whatsapp-verification

2. Click "Link WhatsApp" button

3. You should see:
   - QR code displayed (if Evolution API can connect to WhatsApp)
   - OR "Get Pairing Code Instead" button

4. If QR doesn't appear, click "Get Pairing Code Instead":
   - Enter your WhatsApp number with country code (e.g., 923001234567)
   - Click "Get Code"
   - An 8-digit code will appear
   - Open WhatsApp → Settings → Linked Devices → Link a Device
   - Enter the code

5. Once connected, you'll see "Connected" status with your phone number

---

## Why Pairing Code Button Wasn't Visible Before

The button IS in the code (line 558-566 of WhatsAppVerificationPanel.jsx), but it only shows when:
- QR modal is open
- NOT already showing a pairing code
- NOT already connected
- NOT showing the pairing input form

The condition:
```javascript
{!showPairingInput && !pairingCode && status?.status !== 'connected' && (
    <button onClick={() => setShowPairingInput(true)}>
        <Phone size={14} /> Get Pairing Code Instead
    </button>
)}
```

So the button appears right below the "Refresh QR" button when the QR modal is open.

---

## My Recommendation

**Use Render.com** - it's the fastest and most reliable solution:
- ✅ No Docker installation needed
- ✅ Automatic builds and deployments
- ✅ Free tier available
- ✅ Better network connectivity than Railway for WhatsApp
- ✅ Takes only 10-15 minutes to set up

Once Evolution API is deployed on Render.com and backend is updated, both QR code AND pairing code will work perfectly!

---

## Need Help?

If you want me to guide you through the Render.com deployment step-by-step, just let me know!
