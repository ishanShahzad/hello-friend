# 📱 React Native Mobile App - Complete Setup Guide

## 🎯 Overview

This React Native app is a mobile version of your MERN e-commerce platform. It reuses your existing backend completely - no backend changes needed!

## 📋 Prerequisites

Before starting, install these:

1. **Node.js** (v14+): https://nodejs.org/
2. **Expo CLI**: 
   ```bash
   npm install -g expo-cli
   ```
3. **Expo Go App** on your phone:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd MobileApp
npm install
```

This will install all required packages including:
- React Native
- React Navigation
- Axios
- AsyncStorage
- Toast notifications
- And more...

### Step 2: Configure Backend URL

Open `src/config/api.js` and update the API URL:

**For Testing on Android Emulator:**
```javascript
export const API_BASE_URL = 'http://10.0.2.2:5000';
```

**For Testing on Physical Device:**
```javascript
export const API_BASE_URL = 'http://192.168.1.X:5000'; // Replace X with your IP
```

To find your local IP:
- **Mac/Linux**: Run `ifconfig | grep inet`
- **Windows**: Run `ipconfig`

**For Production:**
```javascript
export const API_BASE_URL = 'https://your-deployed-backend.com';
```

### Step 3: Start Backend

Make sure your backend is running:
```bash
cd Backend
npm start
```

Backend should be running on `http://localhost:5000`

### Step 4: Start Mobile App

```bash
cd MobileApp
npm start
```

This will open Expo DevTools in your browser.

### Step 5: Run on Device

**Option A: Physical Device (Recommended for testing)**
1. Install "Expo Go" app on your phone
2. Scan the QR code shown in terminal/browser
3. App will load on your phone

**Option B: Android Emulator**
1. Install Android Studio
2. Set up Android Virtual Device (AVD)
3. Press `a` in the terminal

**Option C: iOS Simulator (Mac only)**
1. Install Xcode
2. Press `i` in the terminal

## 🔧 Configuration

### Update App Name & Package

Edit `app.json`:
```json
{
  "expo": {
    "name": "YourStoreName",
    "slug": "your-store-mobile",
    "android": {
      "package": "com.yourcompany.yourstore"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourstore"
    }
  }
}
```

### Customize Theme

Edit `src/styles/theme.js` to change colors, spacing, fonts.

## 📱 Testing the App

### Test User Flow:
1. **Sign Up** → Create new account
2. **Login** → Login with credentials
3. **Browse Products** → View product list
4. **Product Details** → Tap on a product
5. **Add to Cart** → Add items to cart
6. **Wishlist** → Add items to wishlist
7. **Cart** → View cart items
8. **Profile** → View user profile

### Test Backend Connection:
- If products don't load, check:
  - Backend is running
  - API_BASE_URL is correct
  - Phone/emulator can reach backend

## 🏗️ Building for Production

### Android APK (for testing)

```bash
expo build:android -t apk
```

### Android AAB (for Play Store)

```bash
expo build:android -t app-bundle
```

### iOS IPA (for App Store)

```bash
expo build:ios
```

## 🚀 Play Store Deployment

### 1. Create EAS Account
```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS
```bash
eas build:configure
```

### 3. Build Production APK/AAB
```bash
eas build --platform android --profile production
```

### 4. Google Play Console Setup
1. Go to https://play.google.com/console
2. Create Developer Account ($25 one-time fee)
3. Create New App
4. Upload AAB file
5. Fill in:
   - App name
   - Description
   - Screenshots (use Android emulator)
   - Privacy policy
   - Content rating
6. Submit for Review

### 5. App Screenshots
Use Android emulator to capture screenshots:
- Home screen
- Product details
- Cart
- Profile
- Login/Signup

Required sizes:
- Phone: 1080 x 1920 (minimum 2 screenshots)
- Tablet: 1920 x 1080 (optional)

## 🐛 Common Issues & Solutions

### Issue: "Unable to resolve module"
```bash
rm -rf node_modules
npm install
expo start -c
```

### Issue: "Network request failed"
- Check backend is running
- Verify API_BASE_URL
- For physical device, ensure phone and computer are on same WiFi
- For Android emulator, use `10.0.2.2` instead of `localhost`

### Issue: "Expo Go app crashes"
- Update Expo Go app to latest version
- Clear Expo cache: `expo start -c`
- Check console for errors

### Issue: "Can't connect to backend from phone"
- Make sure phone and computer are on same WiFi
- Check firewall settings
- Use your computer's local IP address

## 📦 What's Included

### ✅ Implemented Features:
- User Authentication (Login, Signup, Forgot Password)
- Product Browsing with Search
- Product Details
- Shopping Cart
- Wishlist
- Store Listings
- Store Details
- User Profile
- Currency Conversion
- Toast Notifications

### 🔄 To Be Implemented:
- Checkout Flow
- Payment Integration (Stripe)
- Order Management
- Order Tracking
- Admin Dashboard
- Seller Dashboard
- Push Notifications
- Image Upload from Camera

## 🎨 Customization Guide

### Change Primary Color
Edit `src/styles/theme.js`:
```javascript
export const colors = {
  primary: '#YOUR_COLOR', // Change this
  // ...
};
```

### Add New Screen
1. Create screen file in `src/screens/`
2. Add route in `src/navigation/AppNavigator.js`
3. Add navigation call from other screens

### Modify Navigation
Edit `src/navigation/AppNavigator.js` to:
- Add new tabs
- Change tab icons
- Modify navigation structure

## 📞 Support

If you encounter issues:
1. Check console logs
2. Verify backend is running
3. Check API configuration
4. Clear cache and reinstall
5. Check Expo documentation: https://docs.expo.dev/

## 🎯 Next Steps

1. Test all features thoroughly
2. Implement remaining features (Checkout, Orders, etc.)
3. Add app icons and splash screen
4. Test on multiple devices
5. Build production version
6. Submit to Play Store
7. (Optional) Submit to App Store

## 📝 Important Notes

- Backend requires NO changes - it works as-is
- All API calls are reused from web app
- AsyncStorage replaces localStorage
- React Navigation replaces React Router
- Toast messages replace react-toastify
- Expo makes deployment much easier

Good luck with your mobile app! 🚀
