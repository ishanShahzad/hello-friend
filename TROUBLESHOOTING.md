# 🔧 ShopVerse Troubleshooting Guide

## Quick Diagnosis

### Symptom: "Cannot GET /api/..." or "ERR_CONNECTION_REFUSED"

**Root Cause:** Backend server is not running

**Solution:**
```bash
# Terminal 1
cd /Volumes/Data\ 1/Shopp/Backend
npm start
```

Expected output:
```
Server is running on http://localhost:5000
```

---

## Error-by-Error Guide

### 1. Network Errors

#### Error: `GET http://localhost:5000/api/user/single net::ERR_CONNECTION_REFUSED`

**What it means:** Frontend cannot connect to backend

**Checklist:**
- [ ] Is backend running? (Check Terminal 1)
- [ ] Is backend on port 5000? (Check .env: `PORT = 5000`)
- [ ] Is port 5000 available? (Run: `lsof -i :5000`)
- [ ] Is MongoDB connected? (Check backend console)

**Fix:**
```bash
# Terminal 1
cd Backend
npm start
```

---

#### Error: `Cannot read properties of undefined (reading 'data')`

**What it means:** Code tried to access error response data when error object was undefined

**Status:** ✅ **FIXED** in GlobalContext.jsx line 158

**What was changed:**
```javascript
// Before (WRONG)
toast.error(error.response.data.msg)

// After (CORRECT)
toast.error(error.response?.data?.msg || 'Failed to fetch cart')
```

---

### 2. Authentication Errors

#### Error: `401 Unauthorized`

**What it means:** JWT token is invalid or missing

**Checklist:**
- [ ] Are you logged in?
- [ ] Is JWT token in localStorage? (Check DevTools → Application → Local Storage)
- [ ] Has token expired?

**Fix:**
1. Logout (clear localStorage)
2. Login again
3. Check that token is saved

**Debug in browser console:**
```javascript
localStorage.getItem('jwtToken')
```

---

#### Error: `POST http://localhost:5000/api/auth/login net::ERR_CONNECTION_REFUSED`

**What it means:** Backend not running when trying to login

**Fix:** Start backend server first

---

### 3. Product Loading Errors

#### Error: `GET http://localhost:5000/api/products/get-products net::ERR_CONNECTION_REFUSED`

**What it means:** Backend not running when loading products

**Fix:** Start backend server

**Verify products load:**
1. Go to http://localhost:5173
2. Should see products on home page
3. Check browser console for errors

---

#### Error: Products page shows "No products to show"

**Possible causes:**
1. Backend not running
2. MongoDB not connected
3. No products in database
4. Filter parameters too restrictive

**Debug:**
```bash
# Check backend logs for MongoDB connection
# Should see: "Connected to MongoDB"

# Test API directly
curl http://localhost:5000/api/products/get-products
```

---

### 4. Cart Errors

#### Error: `Cannot read properties of undefined (reading 'data')` in fetchCart

**Status:** ✅ **FIXED**

**What was wrong:**
```javascript
// Line 158 - OLD CODE
toast.error(error.response.data.msg)  // ❌ Crashes if error.response is undefined

// NEW CODE
toast.error(error.response?.data?.msg || 'Failed to fetch cart')  // ✅ Safe
```

**Why it happened:** When backend is down, axios error doesn't have a response object

---

#### Error: Cart not updating after adding product

**Checklist:**
- [ ] Are you logged in?
- [ ] Is backend running?
- [ ] Check browser console for errors
- [ ] Check backend console for errors

**Debug:**
```javascript
// In browser console
localStorage.getItem('jwtToken')  // Should exist
```

---

### 5. Port Conflicts

#### Error: `EADDRINUSE: address already in use :::5000`

**What it means:** Another process is using port 5000

**Solution:**

**On Mac/Linux:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process (replace 12345 with actual PID)
kill -9 12345

# Or kill all node processes
killall node
```

**On Windows:**
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace 12345 with actual PID)
taskkill /PID 12345 /F

# Or kill all node processes
taskkill /F /IM node.exe
```

---

#### Error: `EADDRINUSE: address already in use :::5173`

**Solution:**
```bash
# Mac/Linux
lsof -i :5173
kill -9 <PID>

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

### 6. Database Errors

#### Error: `MongooseError: Cannot connect to MongoDB`

**What it means:** Backend cannot connect to MongoDB

**Checklist:**
- [ ] Is MongoDB URI correct in .env?
- [ ] Is internet connection working?
- [ ] Is MongoDB cluster accessible?
- [ ] Are IP whitelist settings correct?

**Current MongoDB URI:**
```
mongodb+srv://salmaniqbal2008_db_user:CfMVAg95SVHBOOEU@cluster0.zlixpxt.mongodb.net/?appName=Cluster0
```

**Fix:**
1. Check MongoDB Atlas dashboard
2. Verify IP whitelist includes your IP
3. Verify credentials are correct
4. Restart backend

---

### 7. Frontend Build Errors

#### Error: `Module not found` or `Cannot find module`

**Solution:**
```bash
cd Frontend
npm install
npm run dev
```

---

#### Error: `Vite error: Failed to resolve`

**Solution:**
```bash
# Clear cache and reinstall
cd Frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### 8. CORS Errors

#### Error: `Access to XMLHttpRequest blocked by CORS policy`

**What it means:** Backend CORS settings don't allow frontend requests

**Status:** Should be fixed - Backend has CORS enabled

**Verify in Backend/server.js:**
```javascript
app.use(cors())  // ✅ Should be present
```

**If still getting CORS error:**
1. Check backend is running
2. Check frontend URL matches FRONTEND_URL in .env
3. Restart both servers

---

## Debugging Checklist

### Before Reporting an Issue

- [ ] Both servers running? (Backend on 5000, Frontend on 5173)
- [ ] Checked browser console? (F12 → Console tab)
- [ ] Checked backend console? (Terminal 1)
- [ ] Cleared browser cache? (Ctrl+Shift+Delete)
- [ ] Tried refreshing page? (Ctrl+R or Cmd+R)
- [ ] Tried restarting both servers?
- [ ] Checked MongoDB connection?
- [ ] Verified JWT token exists? (DevTools → Application → Local Storage)

---

## Browser DevTools Debugging

### Check Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Perform action (login, add to cart, etc.)
4. Look for failed requests (red)
5. Click on request to see details
6. Check Response tab for error message

### Check Console Errors

1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Click on error to see stack trace
5. Note the file and line number

### Check Local Storage

1. Open DevTools (F12)
2. Go to Application tab
3. Click Local Storage
4. Look for:
   - `jwtToken` - Should exist if logged in
   - `currentUser` - Should contain user data
   - `spinResult` - Should exist if spin active

---

## Backend Debugging

### Check Backend Logs

Look for these messages in Terminal 1:

```
✅ Connected to MongoDB
Server is running on http://localhost:5000
```

### Test API Endpoints

```bash
# Get all products
curl http://localhost:5000/api/products/get-products

# Get filters
curl http://localhost:5000/api/products/get-filters

# Get user (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/user/single
```

---

## Performance Issues

### Slow Product Loading

**Checklist:**
- [ ] Is MongoDB connection slow?
- [ ] Are there too many products?
- [ ] Is network connection slow?
- [ ] Are filters too complex?

**Solution:**
1. Check MongoDB performance
2. Reduce number of products returned
3. Add pagination
4. Check network speed

---

### Slow Cart Updates

**Checklist:**
- [ ] Is backend responding slowly?
- [ ] Is network connection slow?
- [ ] Are there too many cart items?

**Solution:**
1. Check backend performance
2. Check network speed
3. Reduce cart items

---

## Common Fixes

### Fix 1: Restart Everything

```bash
# Terminal 1 - Kill backend
Ctrl+C

# Terminal 2 - Kill frontend
Ctrl+C

# Terminal 1 - Restart backend
cd Backend
npm start

# Terminal 2 - Restart frontend
cd Frontend
npm run dev
```

### Fix 2: Clear Cache

```bash
# Browser cache
Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)

# Local storage
# In browser console:
localStorage.clear()
```

### Fix 3: Reinstall Dependencies

```bash
# Backend
cd Backend
rm -rf node_modules package-lock.json
npm install
npm start

# Frontend
cd Frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Fix 4: Check Ports

```bash
# Mac/Linux
lsof -i :5000
lsof -i :5173

# Windows
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```

---

## Still Stuck?

1. **Verify both servers are running**
   - Backend: `Server is running on http://localhost:5000`
   - Frontend: `Local: http://localhost:5173/`

2. **Check browser console** (F12)
   - Look for red error messages
   - Note the exact error

3. **Check backend console** (Terminal 1)
   - Look for error messages
   - Note the exact error

4. **Try the fixes above** in order

5. **Restart both servers** completely

6. **Clear browser cache** and localStorage

---

## Getting Help

When asking for help, provide:

1. **Exact error message** (copy from console)
2. **What you were doing** when error occurred
3. **Which server is running** (backend, frontend, or both)
4. **Browser console errors** (F12 → Console)
5. **Backend console errors** (Terminal 1)
6. **Steps to reproduce** the issue

---

**Last Updated:** 2024
**Status:** All known issues fixed ✅
