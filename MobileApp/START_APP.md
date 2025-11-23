# 🚀 How to Start the App

## Quick Start (3 Steps)

### Step 1: Fix File Limit (macOS only)
```bash
ulimit -n 10240
```

### Step 2: Start the App
```bash
npm start
```

### Step 3: Scan QR Code
- Open Expo Go app on your phone
- Scan the QR code shown in terminal
- App will load!

---

## If You See "EMFILE: too many open files"

### Quick Fix:
```bash
# Increase file limit
ulimit -n 10240

# Clear cache and restart
npx expo start -c
```

### Permanent Fix (macOS):
See `TROUBLESHOOTING.md` for permanent solution

---

## Alternative: Use Physical Device IP

If QR code doesn't work:

1. Find your computer's IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

2. Update `src/config/api.js`:
```javascript
export const API_BASE_URL = 'http://YOUR_IP:5000';
```

3. In Expo Go app, manually enter:
```
exp://YOUR_IP:8081
```

---

## Commands Reference

```bash
# Start app
npm start

# Start with cache cleared
npx expo start -c

# Open on Android
npm run android

# Open on iOS (Mac only)
npm run ios

# Open in web browser
npm run web
```

---

## Before Starting

Make sure:
- ✅ Backend is running (`cd Backend && npm start`)
- ✅ Phone and computer on same WiFi
- ✅ Expo Go app installed on phone
- ✅ Dependencies installed (`npm install`)

---

## Success!

When you see:
```
› Metro waiting on exp://192.168.1.X:8081
› Scan the QR code above with Expo Go
```

You're ready! Scan the QR code and your app will load! 🎉

---

## Need Help?

See `TROUBLESHOOTING.md` for common issues and solutions.
