# 🚨 QUICK FIX - CORS & 500 Errors

## The Problem
Backend is crashing (500 error) → No CORS headers sent → Browser shows CORS error

## The Solution (3 Steps)

### 1️⃣ Set Environment Variables on Vercel

**Go to:** https://vercel.com/dashboard → Backend Project → Settings → Environment Variables

**Copy-paste these** (select "Production" environment):

```
# Copy these values from your Backend/.env file
NODE_ENV=production
MONGO_URI=[Copy from Backend/.env]
JWT_SECRET=[Copy from Backend/.env]
FRONTEND_URL=https://www.rozare.com
CLOUDINARY_CLOUD_NAME=[Copy from Backend/.env]
CLOUDINARY_API_KEY=[Copy from Backend/.env]
CLOUDINARY_API_SECRET=[Copy from Backend/.env]
STRIPE_SECRET_KEY=[Copy from Backend/.env]
STRIPE_WEBHOOK_SECRET=[Copy from Backend/.env]
clientID=[Copy from Backend/.env]
clientSecret=[Copy from Backend/.env]
GOOGLE_CALLBACK_URL=https://genzwinners-backend.vercel.app/api/auth/google/callback
BREVO_API_KEY=[Copy from Backend/.env]
BREVO_SENDER_NAME=Rozare
BREVO_SENDER_EMAIL=no-reply@rozare.com
```

**Note:** Open `Backend/.env` file and copy the actual values from there.

### 2️⃣ Redeploy Backend

After adding variables, click **"Redeploy"** button in Vercel dashboard.

Or push code:
```bash
cd Backend
git add .
git commit -m "Fix CORS"
git push
```

### 3️⃣ Test

Visit: https://genzwinners-backend.vercel.app/health

Should see:
```json
{"status":"ok","mongoConnected":true}
```

Then visit: https://www.rozare.com

Products should load! ✅

---

## Current Status

**Backend Test Results:**
```
❌ Health endpoint: 500 error
❌ Products API: 500 error  
❌ CORS headers: Missing
```

**Error:** `FUNCTION_INVOCATION_FAILED`

**Cause:** Environment variables not set on Vercel

**Fix:** Follow steps above ☝️

---

## Why This Happens

```
Missing env vars → Can't connect to DB → Backend crashes → 500 error → No CORS headers → Browser blocks
```

## After Fix

```
Env vars set → DB connects → Backend works → 200 OK → CORS headers sent → Browser allows ✅
```

---

## Need More Help?

See detailed guides:
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step instructions
- `CORS_ERROR_FIX.md` - Troubleshooting guide
- `FIX_SUMMARY.md` - Complete explanation

Run tests:
```bash
./test-backend.sh
```

Check environment variables:
```bash
cd Backend
node verify-env.js
```

---

## ⚠️ Important

1. Set variables in **Vercel dashboard**, not in code
2. Select **"Production"** environment when adding
3. Click **"Redeploy"** after adding variables
4. Wait 1-2 minutes for deployment to complete
5. Hard refresh browser (Ctrl+Shift+R) after deployment

---

## MongoDB Atlas Setup

If database connection still fails:

1. Go to: https://cloud.mongodb.com
2. Click: Network Access
3. Click: Add IP Address
4. Select: Allow Access from Anywhere (0.0.0.0/0)
5. Click: Confirm

This allows Vercel's servers to connect to your database.

---

## Success Checklist

- [ ] Environment variables added to Vercel
- [ ] Backend redeployed
- [ ] Health endpoint returns 200 OK
- [ ] Products API returns data
- [ ] Frontend loads without errors
- [ ] No CORS errors in console
- [ ] Products display on homepage

---

**That's it! The fix is simple: Set the environment variables on Vercel and redeploy.** 🚀
