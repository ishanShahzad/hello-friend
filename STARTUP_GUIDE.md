# 🚀 ShopVerse - Complete Startup Guide

## Problem Summary

Your application has the following issues:

1. **Backend Server Not Running** - The main issue causing all `ERR_CONNECTION_REFUSED` errors
2. **Frontend trying to connect to localhost:5000** - But backend isn't listening
3. **Error handling issues** - Some error responses weren't properly handled

## ✅ Fixes Applied

1. **Fixed error handling in GlobalContext.jsx** - Line 158 now safely accesses error response data
2. **Improved error messages** - All API calls now have fallback error messages

## 🔧 How to Start the Application

### Prerequisites
- Node.js installed
- MongoDB connection (already configured in .env)
- Two terminal windows/tabs

### Step 1: Start the Backend Server

Open **Terminal 1** and run:

```bash
cd /Volumes/Data\ 1/Shopp/Backend
npm start
```

**Expected Output:**
```
Server is running on http://localhost:5000
```

⚠️ **IMPORTANT**: Keep this terminal running. The backend must be active for the frontend to work.

### Step 2: Start the Frontend Development Server

Open **Terminal 2** and run:

```bash
cd /Volumes/Data\ 1/Shopp/Frontend
npm run dev
```

**Expected Output:**
```
  VITE v6.3.5  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## 🔍 Troubleshooting

### Issue: "Cannot GET /api/..." or "ERR_CONNECTION_REFUSED"

**Solution:** Make sure the backend server is running in Terminal 1. Check that you see "Server is running on http://localhost:5000"

### Issue: Frontend shows blank page or errors

**Solution:** 
1. Check browser console (F12) for errors
2. Verify both servers are running
3. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
4. Refresh the page

### Issue: Port 5000 already in use

**Solution:** 
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process (replace PID with the actual process ID)
kill -9 <PID>
```

### Issue: Port 5173 already in use

**Solution:**
```bash
# Find process using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>
```

## 📋 API Endpoints Being Used

The frontend makes requests to these backend endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/registerr` - User registration
- `GET /api/user/single` - Get current user

### Products
- `GET /api/products/get-products` - Fetch products with filters
- `GET /api/products/get-filters` - Get available filters
- `GET /api/products/get-wishlist` - Get user's wishlist
- `GET /api/products/add-to-wishlist/:id` - Add to wishlist
- `DELETE /api/products/delete-from-wishlist/:id` - Remove from wishlist

### Cart
- `GET /api/cart/get` - Get user's cart
- `POST /api/cart/add/:id` - Add product to cart
- `PATCH /api/cart/qty-inc/:id` - Increase quantity
- `PATCH /api/cart/qty-dec/:id` - Decrease quantity
- `DELETE /api/cart/remove/:id` - Remove from cart

### Spin Feature
- `GET /api/spin/get-active` - Get active spin result

## 🎯 Features Overview

### ✨ Working Features
- User Authentication (Login/Signup)
- Product Browsing with Filters
- Shopping Cart Management
- Wishlist Management
- Spin to Win Feature
- Product Search

### 🔐 Authentication Flow
1. User signs up or logs in
2. JWT token is stored in localStorage
3. Token is sent with every API request in Authorization header
4. User data is cached in localStorage and context

### 🛒 Cart System
- Add/remove products
- Adjust quantities
- Real-time price calculation
- Spin discount integration

### 🎡 Spin to Win Feature
- Users can spin once per 24 hours
- Win discounts (percentage, fixed, or free)
- Select up to 3 products to apply discount
- Discount persists for 24 hours

## 📝 Environment Configuration

Backend `.env` file is already configured with:
- MongoDB connection
- JWT secret
- Stripe keys
- Cloudinary credentials
- Email configuration

**Note:** Email credentials are empty. To enable email features, add:
```
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## 🚨 Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ERR_CONNECTION_REFUSED` | Backend not running | Start backend with `npm start` |
| `Cannot read properties of undefined` | API error not handled | Already fixed in GlobalContext.jsx |
| `401 Unauthorized` | Invalid/missing JWT token | Login again |
| `404 Not Found` | Wrong API endpoint | Check backend routes |
| `CORS error` | Frontend/backend mismatch | Verify both are running on correct ports |

## 📚 Project Structure

```
/Volumes/Data 1/Shopp/
├── Backend/
│   ├── server.js          # Main server file
│   ├── .env               # Environment variables
│   ├── config/            # Database config
│   ├── controllers/       # Route handlers
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── contexts/      # React contexts (Auth, Global)
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── routes/        # Route definitions
│   │   └── App.jsx        # Main app component
│   ├── package.json
│   └── vite.config.js
└── STARTUP_GUIDE.md       # This file
```

## 🎓 Development Tips

### Hot Reload
- **Frontend:** Changes auto-reload (Vite)
- **Backend:** Changes auto-reload (nodemon)

### Debugging
- Use browser DevTools (F12) for frontend
- Check terminal output for backend logs
- Use `console.log()` in both frontend and backend

### Testing API Endpoints
Use tools like:
- Postman
- Thunder Client (VS Code extension)
- curl commands

Example:
```bash
curl -X GET http://localhost:5000/api/products/get-products
```

## ✅ Verification Checklist

After starting both servers, verify:

- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:5173
- [ ] Can access home page without errors
- [ ] Can see products loading
- [ ] Can login/signup
- [ ] Can add products to cart
- [ ] Can view wishlist
- [ ] No console errors

## 🆘 Still Having Issues?

1. **Check both terminals** - Ensure both servers are running
2. **Check ports** - Verify ports 5000 and 5173 are available
3. **Check network** - Ensure MongoDB connection is working
4. **Clear cache** - Clear browser cache and localStorage
5. **Restart** - Kill both processes and start fresh

## 📞 Support

If you encounter issues:
1. Check the error message in browser console
2. Check the backend terminal for error logs
3. Verify all prerequisites are installed
4. Try restarting both servers
5. Check this guide for common solutions

---

**Happy Shopping! 🛍️**
