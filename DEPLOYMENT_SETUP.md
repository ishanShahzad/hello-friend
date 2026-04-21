# Deployment Setup Guide

## Issue Identified
Your frontend on `www.rozare.com` is trying to reach `genzwinners-backend.vercel.app` which is either:
- An old/incorrect backend URL
- Not configured with proper CORS
- Returning 500 errors

## Solution

### 1. Configure Frontend Environment Variables in Vercel

Go to your Vercel project for the Frontend (shop):
1. Navigate to: Project Settings → Environment Variables
2. Add the following variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://YOUR-ACTUAL-BACKEND-URL.vercel.app/`
   - **Environments**: Production, Preview, Development

**Important**: 
- Replace `YOUR-ACTUAL-BACKEND-URL` with your actual backend Vercel deployment URL
- Make sure to include the trailing slash `/`
- The backend URL should be from your `shop-backend` Vercel project

### 2. Verify Backend Deployment

Check that your backend (shop-backend) is:
- Successfully deployed on Vercel
- Accessible at its Vercel URL
- Has CORS configured (already set to allow all origins in server.js)

### 3. Redeploy Frontend

After setting the environment variable:
1. Go to Vercel Dashboard → Your Frontend Project → Deployments
2. Click on the latest deployment
3. Click "Redeploy" button
4. This will rebuild with the correct `VITE_API_URL`

### 4. Test the Deployment

After redeployment:
1. Visit `www.rozare.com`
2. Open browser DevTools → Network tab
3. Verify API calls are going to the correct backend URL
4. Check that CORS errors are resolved

## Current CORS Configuration

Your backend already has CORS configured to allow all origins:
```javascript
app.use(cors({
  origin: '*',
  credentials: false,
}));
```

This should work once the frontend is pointing to the correct backend URL.

## Alternative: Use Environment-Specific Files

If you prefer to commit environment configs, you can create:
- `Frontend/.env.production` - for production builds
- `Frontend/.env.development` - for local development

But Vercel environment variables override these files and are more secure.
