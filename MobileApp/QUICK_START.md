# ⚡ Quick Start - 5 Minutes to Running App

## 1️⃣ Install Dependencies (2 min)

```bash
cd MobileApp
npm install
```

## 2️⃣ Configure Backend URL (30 sec)

Open `src/config/api.js` and update:

```javascript
// For Android Emulator:
export const API_BASE_URL = 'http://10.0.2.2:5000';

// For Physical Device (replace with your IP):
export const API_BASE_URL = 'http://192.168.1.X:5000';
```

**Find your IP:**
- Mac/Linux: `ifconfig | grep inet`
- Windows: `ipconfig`

## 3️⃣ Start Backend (30 sec)

```bash
cd ../Backend
npm start
```

Should see: `Server running on port 5000`

## 4️⃣ Start Mobile App (1 min)

```bash
cd ../MobileApp
npm start
```

## 5️⃣ Open on Phone (1 min)

1. Install **Expo Go** app on your phone
2. Scan the QR code shown in terminal
3. App will load!

---

## 🎯 Test Credentials

Use your existing web app credentials or create new account in the mobile app.

---

## 🐛 Quick Fixes

**Can't connect to backend?**
```bash
# Make sure backend is running
cd Backend
npm start
```

**App won't load?**
```bash
# Clear cache
expo start -c
```

**Dependencies error?**
```bash
# Reinstall
rm -rf node_modules
npm install
```

---

## 📱 What You'll See

1. **Login Screen** → Login or signup
2. **Home Tab** → Browse products
3. **Stores Tab** → View stores
4. **Cart Tab** → Shopping cart
5. **Wishlist Tab** → Saved items
6. **Profile Tab** → User profile

---

## ✅ Features Working

- ✅ Login/Signup
- ✅ Browse products
- ✅ Product details
- ✅ Add to cart
- ✅ Add to wishlist
- ✅ View stores
- ✅ User profile
- ✅ Currency conversion

---

## 📚 More Info

- Full setup: `SETUP_GUIDE.md`
- Overview: `../MOBILE_APP_OVERVIEW.md`
- README: `README.md`

---

**That's it! You're ready to go! 🚀**
