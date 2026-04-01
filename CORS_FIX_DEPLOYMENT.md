# CORS Fix Deployment Guide

## Issues Fixed

1. ✅ CORS configuration now properly allows credentials and specific origins
2. ✅ Vercel.json configured with proper CORS headers for all API routes
3. ✅ Explicit OPTIONS handler added for preflight requests
4. ✅ Backend allows www.tortrose.com, tortrose.com, and localhost origins

## Files Changed

### Backend/server.js
- Updated CORS to allow specific origins including www.tortrose.com
- Enabled credentials support (required for authenticated requests)
- Added explicit OPTIONS handler for preflight requests
- Added proper CORS headers configuration

### Backend/vercel.json
- Added CORS headers using Vercel's headers configuration
- Headers apply to all /api/* routes
- Properly handles preflight OPTIONS requests at the edge

## Deployment Steps

### 1. Push Backend Changes to Vercel

```bash
cd Backend
git add server.js vercel.json
git commit -m "Fix CORS configuration for production"
git push
```

The changes will automatically deploy to Vercel.

### 2. Update Vercel Environment Variables

Go to your Vercel dashboard (https://vercel.com) and update these environment variables for your backend project:

**Required Environment Variables:**
- `FRONTEND_URL` = `https://www.tortrose.com`
- `GOOGLE_CALLBACK_URL` = `https://genzwinners-backend.vercel.app/api/auth/google/callback`
- `NODE_ENV` = `production`

**Or use Vercel CLI:**
```bash
vercel env add FRONTEND_URL production
# Enter: https://www.tortrose.com

vercel env add GOOGLE_CALLBACK_URL production
# Enter: https://genzwinners-backend.vercel.app/api/auth/google/callback

vercel env add NODE_ENV production
# Enter: production
```

### 3. Redeploy Backend

After updating environment variables, redeploy:
```bash
vercel --prod
```

### 4. Update Frontend Environment Variable

For production deployment, ensure your frontend build uses:
```
VITE_API_URL=https://genzwinners-backend.vercel.app/
```

If using Vercel for frontend, add this environment variable in the Vercel dashboard.

### 5. Deploy Frontend

```bash
cd Frontend
npm run build
# Deploy the dist folder to your hosting provider
```

## Verification

After deployment:

1. Visit https://www.tortrose.com
2. Open Developer Console (F12) → Network tab
3. Verify:
   - No CORS errors in console
   - API calls return 200 status (not 500)
   - Response headers include `Access-Control-Allow-Origin`
   - Preflight OPTIONS requests return 200

## What the Fix Does

### CORS Configuration
The backend now:
- Accepts requests from www.tortrose.com and tortrose.com
- Allows credentials (cookies, auth tokens)
- Handles preflight OPTIONS requests
- Returns proper CORS headers for all responses

### Vercel Configuration
The vercel.json now:
- Adds CORS headers at the edge level using Vercel's headers config
- Applies headers to all /api/* routes
- Ensures OPTIONS requests are handled before reaching the app
- Provides consistent CORS behavior across all endpoints

## Troubleshooting

### If CORS errors persist:

1. **Clear browser cache** - Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check Vercel deployment** - Ensure latest code is deployed
3. **Verify environment variables** - Check Vercel dashboard
4. **Check backend logs** - Visit Vercel dashboard → Your project → Logs

### If you see 500 errors:

1. **Check Vercel function logs** - Look for error messages
2. **Verify database connection** - Ensure MONGO_URI is correct
3. **Check environment variables** - All required vars must be set
4. **Test endpoints directly** - Use Postman or curl to test API

### Common Issues:

**"Response to preflight request doesn't pass access control check"**
- This means OPTIONS requests are failing
- Verify vercel.json headers configuration is deployed
- Check that the backend is returning 200 for OPTIONS requests

**"Request failed with status code 500"**
- Backend code is crashing
- Check Vercel logs for error details
- Verify all environment variables are set correctly
- Ensure database connection is working

## Local Development

Your local .env files remain unchanged:
- Frontend: `VITE_API_URL=http://localhost:5000/`
- Backend: `FRONTEND_URL=http://localhost:5173`

This allows you to develop locally without issues.

## Important Notes

- The .env files are NOT committed to git (they're in .gitignore)
- You must set environment variables in Vercel dashboard for production
- The CORS configuration allows both development and production origins
- Credentials are enabled for authenticated API requests
- Vercel headers configuration handles CORS at the edge for better performance
