# WhatsApp Connection Guide - v29

## What Was Fixed

### Root Cause
Evolution API v2.2.3 requires calling `/instance/connect` endpoint to **START** the WhatsApp connection process. The instance was being created but never actually connected, so it stayed in "close" state and never generated QR codes.

### The Fix
1. **Proper Connection Flow**: Now calls `/instance/connect` to start the connection before polling for QR
2. **Extended Polling**: Increased polling time and attempts to wait for QR generation
3. **Pairing Code Support**: Added support for pairing codes as an alternative to QR (more reliable)
4. **Better State Detection**: Improved detection of "connecting" state to keep polling
5. **Enhanced UI**: Better display of both QR codes and pairing codes

## How to Connect WhatsApp (2 Methods)

### Method 1: QR Code (Traditional)
1. Visit https://www.rozare.com/admin-dashboard/whatsapp-verification
2. Click "Link WhatsApp" button
3. Wait 5-10 seconds for QR code to appear
4. Open WhatsApp on your phone
5. Go to Settings → Linked Devices → Link a Device
6. Scan the QR code

### Method 2: Pairing Code (More Reliable)
1. Visit https://www.rozare.com/admin-dashboard/whatsapp-verification
2. Click "Link WhatsApp" button
3. If a pairing code appears (8-digit code), use it instead of QR
4. Open WhatsApp on your phone
5. Go to Settings → Linked Devices → Link a Device
6. When prompted, enter the pairing code shown on screen

## What to Expect (v29)

When you click "Link WhatsApp":

1. **Backend creates instance** (if not exists)
2. **Backend calls `/instance/connect`** to start connection
3. **Backend polls for QR/pairing code** for up to 30 seconds
4. **You'll see either:**
   - A QR code to scan
   - A pairing code to enter (8 digits)
   - Both (you can use either method)

## Troubleshooting

### If QR/Code Still Doesn't Appear

The logs will now show:
```
Evolution instance created: {...}
Connect result: {...}
QR attempt X: state=connecting, hasBase64=true, hasCode=false, connectionStatus=connecting
```

If you see `state=close` repeatedly, it means Evolution API is not starting the connection. This could be due to:

1. **Evolution API Configuration Issue**: Check Railway environment variables
2. **Database Connection**: Evolution API needs PostgreSQL to store session data
3. **Instance Stuck**: Try clicking "Reset instance" button to delete and recreate

### Check Heroku Logs
```bash
heroku logs --tail | grep -i "evolution\|qr\|connect"
```

Look for:
- `Connect result:` - Shows if connection started
- `QR attempt X: state=connecting` - Good! QR is being generated
- `QR attempt X: state=close` - Bad! Connection not starting
- `hasBase64=true` or `hasCode=true` - QR/pairing code found!

## Evolution API Configuration on Railway

Make sure these environment variables are set on Railway:

```
DATABASE_PROVIDER=postgresql
DATABASE_URL=<your-railway-postgres-url>
AUTHENTICATION_API_KEY=<your-api-key>
AUTHENTICATION_TYPE=apikey
```

The Evolution API needs a database to store WhatsApp session data. Without it, connections won't persist.

## Why Pairing Code is Better

Evolution API v2.x prefers pairing codes over QR because:
- More reliable connection
- Works better with newer WhatsApp versions
- Faster to connect
- Less prone to timeout issues

If you see a pairing code, use it! It's actually the recommended method.

## Next Steps

1. Try connecting now at https://www.rozare.com/admin-dashboard/whatsapp-verification
2. If you see a pairing code, enter it in WhatsApp
3. If you see a QR code, scan it
4. If neither appears after 30 seconds, check Heroku logs and share them

## Technical Details

### Evolution API v2.x Connection Flow
```
1. POST /instance/create → Creates instance (state: close)
2. GET /instance/connect → Starts connection (state: connecting)
3. GET /instance/fetchInstances → Poll for QR/pairing code
4. WhatsApp scans QR or enters code → (state: open)
```

### What Changed in v29
- `getQRCode()` now calls `connectInstance()` first
- Increased polling from 12 to 15 attempts
- Added 3-second initial wait after connect
- Better pairing code extraction from response
- Improved UI to show pairing codes prominently
