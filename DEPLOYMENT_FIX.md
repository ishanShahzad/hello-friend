# Deployment Fix Guide 🚀

## Issues Found

1. ❌ Frontend `.env` pointing to localhost
2. ❌ Missing safety checks for undefined data
3. ❌ CORS might not be configured for production

## Step-by-Step Fix

### 1. Update Frontend Environment Variables

**File: `Frontend/.env`**

Change from:
```env
VITE_API_URL=http://localhost:5000/
```

To:
```env
VITE_API_URL=https://your-backend-url.railway.app/
```

**Important:** Replace `your-backend-url` with your actual Railway backend URL!

### 2. Backend CORS Configuration

Make sure your backend allows requests from your frontend domain.

**File: `Backend/server.js`**

Check if CORS is configured:
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://genz-winners.up.railway.app'  // Add your frontend URL
  ],
  credentials: true
}));
```

### 3. Environment Variables on Railway

Make sure these are set in Railway dashboard:

**Backend:**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Your JWT secret key
- `PORT` - Usually 5000 or Railway assigns automatically
- `NODE_ENV` - Set to `production`

**Frontend:**
- `VITE_API_URL` - Your backend URL (e.g., `https://your-backend.railway.app/`)

### 4. Rebuild and Redeploy

After updating `.env`:

```bash
# Frontend
cd Frontend
npm run build

# Push to Railway (if using Git)
git add .
git commit -m "Fix: Update API URL for production"
git push
```

### 5. Check Backend is Running

Visit your backend URL directly:
```
https://your-backend-url.railway.app/
```

You should see a response (not an error page).

### 6. Test API Endpoints

Try accessing:
```
https://your-backend-url.railway.app/api/products/get-products
```

Should return JSON with products.

## Common Deployment Issues

### Issue: "Cannot read properties of undefined"
**Cause:** API calls failing, returning undefined
**Fix:** 
- Check API URL is correct
- Check backend is running
- Check CORS is configured
- Added safety checks (already done ✅)

### Issue: Login not working
**Cause:** CORS or API URL mismatch
**Fix:**
- Update CORS to allow frontend domain
- Check API URL in `.env`
- Check JWT_SECRET is set on backend

### Issue: Products not loading
**Cause:** Database connection or API failure
**Fix:**
- Check MongoDB connection string
- Check backend logs on Railway
- Verify products exist in database

## Verification Checklist

After deployment, verify:

- [ ] Frontend loads without errors
- [ ] Can see products on home page
- [ ] Can login/signup
- [ ] Spin wheel appears
- [ ] Can add products to cart
- [ ] Can checkout
- [ ] No console errors

## Railway Deployment Commands

### View Backend Logs
```bash
railway logs
```

### View Environment Variables
```bash
railway variables
```

### Set Environment Variable
```bash
railway variables set VITE_API_URL=https://your-backend.railway.app/
```

## Quick Fix Summary

1. ✅ Update `Frontend/.env` with production backend URL
2. ✅ Add frontend URL to backend CORS
3. ✅ Set environment variables on Railway
4. ✅ Rebuild and redeploy
5. ✅ Test all features

## Need Help?

Check Railway logs for errors:
- Backend logs: Shows API errors, database issues
- Frontend logs: Shows build errors

Common log locations:
- Railway Dashboard → Your Project → Deployments → View Logs

---

**Status:** Ready to deploy after updating `.env` file
**Priority:** HIGH - Site won't work without correct API URL
