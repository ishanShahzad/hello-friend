# 🚀 Quick Setup Instructions

## The Problem

Your backend is showing:
```
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

This means environment variables aren't set on Vercel.

## The Solution (3 Steps)

### Step 1: Open Your Backend .env File

The file `Backend/.env` contains all the values you need.

### Step 2: Set Environment Variables on Vercel

1. Go to: https://vercel.com/dashboard
2. Click on your backend project (genzwinners-backend)
3. Click **Settings** → **Environment Variables**
4. For each variable in `Backend/.env`, add it to Vercel:
   - Click "Add New"
   - Copy the KEY from .env (e.g., `MONGO_URI`)
   - Copy the VALUE from .env
   - Select "Production" environment
   - Click "Save"

**Required Variables:**
- `NODE_ENV` = production
- `MONGO_URI` (from .env)
- `JWT_SECRET` (from .env)
- `FRONTEND_URL` = https://www.tortrose.com
- `CLOUDINARY_CLOUD_NAME` (from .env)
- `CLOUDINARY_API_KEY` (from .env)
- `CLOUDINARY_API_SECRET` (from .env)
- `STRIPE_SECRET_KEY` (from .env)
- `STRIPE_WEBHOOK_SECRET` (from .env)
- `clientID` (from .env)
- `clientSecret` (from .env)
- `GOOGLE_CALLBACK_URL` = https://genzwinners-backend.vercel.app/api/auth/google/callback
- `BREVO_API_KEY` (from .env)
- `BREVO_SENDER_NAME` (from .env)
- `BREVO_SENDER_EMAIL` (from .env)

### Step 3: Redeploy

After adding ALL variables:
1. Go to **Deployments** tab
2. Click the three dots (•••) on the latest deployment
3. Click **"Redeploy"**
4. Wait 1-2 minutes

### Step 4: Test

Visit: https://genzwinners-backend.vercel.app/health

Should see:
```json
{"status":"ok","mongoConnected":true}
```

Then visit: https://www.tortrose.com - Products should load! ✅

## MongoDB Atlas Setup

If database connection fails:

1. Go to: https://cloud.mongodb.com
2. Click **Network Access**
3. Click **Add IP Address**
4. Select **Allow Access from Anywhere** (0.0.0.0/0)
5. Click **Confirm**

## Files Changed

- `Backend/vercel.json` - Fixed CORS configuration
- `Backend/server.js` - Added health check endpoint
- `Backend/verify-env.js` - Script to verify environment variables

## Test Your Setup

Run locally:
```bash
cd Backend
node verify-env.js
```

This will check if all required variables are set.

## Need Help?

Check the detailed guides:
- `VERCEL_ENV_SETUP.md` - Detailed Vercel setup
- `DEPLOYMENT_CHECKLIST.md` - Complete checklist
- `CORS_ISSUE_EXPLAINED.md` - Visual explanation

## Why This Happens

```
Missing env vars → Backend can't connect to DB → Crashes with 500 → No CORS headers → Browser blocks
```

## After Fix

```
Env vars set → Backend connects to DB → Returns 200 OK → CORS headers sent → Browser allows ✅
```

---

**That's it!** Just copy the values from `Backend/.env` to Vercel dashboard and redeploy.
