# 🚀 Getting Started with Mobile App - 10 Minutes

## 📱 What You're About to Do

You'll run your e-commerce app on your phone in the next 10 minutes!

## ✅ Prerequisites Check

Do you have these? (If not, install them first)

- [ ] **Node.js** installed? Check: `node --version`
- [ ] **npm** installed? Check: `npm --version`
- [ ] **Smartphone** (Android or iPhone)

## 🎯 Step-by-Step (10 Minutes)

### Step 1: Install Expo Go on Your Phone (2 min)

**Android:**
- Open Google Play Store
- Search "Expo Go"
- Install it

**iPhone:**
- Open App Store
- Search "Expo Go"
- Install it

### Step 2: Install Expo CLI on Computer (1 min)

Open terminal and run:
```bash
npm install -g expo-cli
```

### Step 3: Install Mobile App Dependencies (3 min)

```bash
cd MobileApp
npm install
```

This will install all required packages. Wait for it to complete.

### Step 4: Configure Backend URL (1 min)

Open `MobileApp/src/config/api.js` in your code editor.

**If testing on Android Emulator:**
```javascript
export const API_BASE_URL = 'http://10.0.2.2:5000';
```

**If testing on Physical Phone:**

First, find your computer's IP address:

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

Look for something like `192.168.1.X`

Then update the file:
```javascript
export const API_BASE_URL = 'http://192.168.1.X:5000';  // Replace X with your IP
```

### Step 5: Start Backend (1 min)

Open a new terminal window:
```bash
cd Backend
npm start
```

You should see: `Server running on port 5000`

**Keep this terminal running!**

### Step 6: Start Mobile App (1 min)

Open another terminal window:
```bash
cd MobileApp
npm start
```

You'll see:
- A QR code in the terminal
- Expo DevTools opens in browser
- Another QR code in the browser

**Keep this terminal running too!**

### Step 7: Open on Your Phone (1 min)

**Android:**
1. Open Expo Go app
2. Tap "Scan QR code"
3. Scan the QR code from terminal/browser
4. App will load!

**iPhone:**
1. Open Camera app
2. Point at QR code
3. Tap the notification
4. Opens in Expo Go
5. App will load!

### Step 8: Test It! (2 min)

Try these:
1. ✅ Sign up for a new account
2. ✅ Browse products
3. ✅ Tap on a product
4. ✅ Add to cart
5. ✅ View cart
6. ✅ Add to wishlist

**It works! 🎉**

## 🎯 Quick Commands Reference

```bash
# Start everything (run in separate terminals)

# Terminal 1 - Backend
cd Backend
npm start

# Terminal 2 - Mobile App
cd MobileApp
npm start

# Terminal 3 - Web App (optional)
cd Frontend
npm run dev
```

## 🐛 Troubleshooting

### Problem: "Can't connect to backend"

**Solution 1:** Check backend is running
```bash
# Should see "Server running on port 5000"
```

**Solution 2:** Check your IP address
```bash
# Make sure API_BASE_URL matches your computer's IP
```

**Solution 3:** Check same WiFi
- Phone and computer must be on same WiFi network

### Problem: "Module not found"

**Solution:**
```bash
cd MobileApp
rm -rf node_modules
npm install
expo start -c
```

### Problem: "Expo Go crashes"

**Solution:**
1. Update Expo Go app to latest version
2. Clear cache: `expo start -c`
3. Restart phone

### Problem: "QR code won't scan"

**Solution:**
- Make sure phone camera has permission
- Try typing the URL manually (shown in terminal)
- Or use "Enter URL manually" in Expo Go

## 📱 What You Should See

### 1. Login Screen
- Email and password fields
- Login button
- Sign up link

### 2. Home Screen (After Login)
- List of products
- Search bar
- Product cards with images

### 3. Bottom Navigation
- Home tab
- Stores tab
- Cart tab
- Wishlist tab
- Profile tab

### 4. Product Details
- Product image
- Name and price
- Description
- Add to cart button
- Wishlist heart icon

### 5. Cart Screen
- List of cart items
- Quantities
- Total price
- Checkout button

## ✅ Success Checklist

After 10 minutes, you should have:

- [x] Expo Go installed on phone
- [x] Dependencies installed
- [x] Backend running
- [x] Mobile app running
- [x] App loaded on phone
- [x] Can browse products
- [x] Can add to cart
- [x] Can view cart

## 🎯 Next Steps

Now that it's working:

### Today:
1. Play around with the app
2. Test all features
3. Try adding products to cart
4. Test wishlist
5. Browse stores

### This Week:
1. Customize colors (edit `src/styles/theme.js`)
2. Change app name (edit `app.json`)
3. Add your logo
4. Test on multiple devices

### This Month:
1. Implement checkout
2. Add payment integration
3. Complete remaining features
4. Prepare for Play Store

## 📚 Documentation

For more details, check:

- **Quick Start:** `MobileApp/QUICK_START.md`
- **Setup Guide:** `MobileApp/SETUP_GUIDE.md`
- **Full Overview:** `MOBILE_APP_OVERVIEW.md`
- **Deployment:** `MobileApp/PLAY_STORE_DEPLOYMENT.md`

## 💡 Tips

### Development Tips:
- Shake phone to open developer menu
- Enable "Fast Refresh" for instant updates
- Use console.log() - check terminal for logs
- Press `r` in terminal to reload app

### Testing Tips:
- Test on both WiFi and mobile data
- Test with slow internet
- Test with no internet
- Test on different screen sizes

### Performance Tips:
- Images should be optimized
- Use FlatList for long lists
- Avoid unnecessary re-renders
- Use React.memo for components

## 🆘 Need Help?

### Check These First:
1. Is backend running? ✅
2. Is mobile app running? ✅
3. Same WiFi network? ✅
4. Correct IP address? ✅
5. Expo Go updated? ✅

### Still Stuck?
1. Check console logs
2. Clear cache: `expo start -c`
3. Restart everything
4. Check documentation files

## 🎉 Congratulations!

You now have:
- ✅ Mobile app running on your phone
- ✅ Connected to your backend
- ✅ All core features working
- ✅ Ready to customize and deploy

**Time to make it yours! 🚀**

---

## 📞 Quick Reference

```bash
# Start backend
cd Backend && npm start

# Start mobile app
cd MobileApp && npm start

# Clear cache
expo start -c

# Reinstall dependencies
rm -rf node_modules && npm install

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

---

**Enjoy your mobile app! 📱✨**

Next: Read `MobileApp/SETUP_GUIDE.md` for detailed customization options.
