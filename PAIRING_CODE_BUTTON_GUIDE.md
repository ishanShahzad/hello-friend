# Pairing Code Button - How to Use (v32)

## New Feature Added ✓

I've added a **"Get Pairing Code Instead"** button that lets you manually request a pairing code to connect WhatsApp.

## How to Use

### Step 1: Visit WhatsApp Verification Page
```
https://www.rozare.com/admin-dashboard/whatsapp-verification
```

### Step 2: Click "Link WhatsApp"
This opens the QR code modal.

### Step 3: Click "Get Pairing Code Instead"
You'll see a button below the QR code area that says **"Get Pairing Code Instead"**.

### Step 4: Enter Your WhatsApp Number
- Enter your WhatsApp number with country code
- Format: `923001234567` (no + or spaces)
- Example for Pakistan: `923001234567`
- Example for USA: `12025551234`
- Example for UK: `447700900123`

### Step 5: Click "Get Code"
The system will request a pairing code from Evolution API.

### Step 6: Enter Code in WhatsApp
1. Open WhatsApp on your phone
2. Go to **Settings** → **Linked Devices**
3. Tap **Link a Device**
4. When prompted, enter the 8-digit code shown on screen

## What to Expect

### If Evolution API is Working:
- You'll see an 8-digit pairing code (e.g., `12345678`)
- Enter this code in WhatsApp
- WhatsApp will connect within seconds

### If Evolution API is Still Broken:
- You'll see an error message
- This means Evolution API on Railway still cannot connect to WhatsApp servers
- The pairing code request will fail with the same network issue

## Why This Might Not Work

The pairing code feature **also requires Evolution API to connect to WhatsApp servers**. If Railway is blocking WhatsApp connections (which it appears to be), the pairing code request will also fail.

## Alternative: Use Evolution API Manager

If the button doesn't work, try accessing Evolution API directly:

1. Visit: `https://evolution-api-production-c578.up.railway.app`
2. Log in with API key: `rozareplatform`
3. Create instance through the UI
4. Get QR/pairing code directly from the manager

## Technical Details

### Backend Endpoint
```
POST /api/whatsapp/pairing-code
Body: { "phoneNumber": "923001234567" }
```

### Evolution API Call
```
POST /instance/fetchInstances/{instanceName}/pairing-code
Body: { "phoneNumber": "923001234567" }
```

### Response Format
```json
{
  "code": "12345678",
  "msg": "Pairing code generated"
}
```

## Troubleshooting

### "Failed to request pairing code"
- Evolution API cannot connect to WhatsApp servers
- Same issue as QR code not generating
- Railway is blocking WhatsApp connections

### "Invalid phone number format"
- Make sure to include country code
- Remove all spaces, dashes, and + symbol
- Use only digits

### Code doesn't appear
- Check Heroku logs: `heroku logs --tail`
- Look for "Evolution pairing code response"
- If you see errors, Evolution API is not responding

## Summary

✅ **Button added** - "Get Pairing Code Instead"
✅ **Phone number input** - Enter your WhatsApp number
✅ **Backend endpoint** - `/api/whatsapp/pairing-code`
✅ **Deployed** - Heroku v32

❌ **Will only work if** Evolution API can connect to WhatsApp servers
❌ **Railway issue** - Still blocking WhatsApp connections

The feature is ready, but Evolution API on Railway needs to be fixed first.
