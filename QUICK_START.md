# ⚡ Quick Start - 2 Minutes to Running

## TL;DR - Just Run These Commands

### Option 1: Mac/Linux (Automatic)
```bash
cd /Volumes/Data\ 1/Shopp
chmod +x start-dev.sh
./start-dev.sh
```

### Option 2: Windows (Automatic)
```bash
cd C:\path\to\Shopp
start-dev.bat
```

### Option 3: Manual (All Platforms)

**Terminal 1:**
```bash
cd /Volumes/Data\ 1/Shopp/Backend
npm start
```

**Terminal 2:**
```bash
cd /Volumes/Data\ 1/Shopp/Frontend
npm run dev
```

---

## Then Open Browser

```
http://localhost:5173
```

---

## What You Should See

✅ Products loading on home page  
✅ No red errors in console (F12)  
✅ Can login/signup  
✅ Can add products to cart  

---

## If Something's Wrong

### Error: "ERR_CONNECTION_REFUSED"
→ Backend not running. Check Terminal 1.

### Error: "Cannot read properties of undefined"
→ Already fixed! Refresh page.

### Error: "Port already in use"
→ Kill process: `lsof -i :5000` then `kill -9 <PID>`

### Error: "Cannot find module"
→ Run: `npm install` in that directory

---

## Useful Commands

```bash
# Kill all node processes
killall node

# Check if port is in use
lsof -i :5000
lsof -i :5173

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## File Locations

| What | Where |
|------|-------|
| Backend | `/Volumes/Data 1/Shopp/Backend` |
| Frontend | `/Volumes/Data 1/Shopp/Frontend` |
| Startup Guide | `STARTUP_GUIDE.md` |
| Troubleshooting | `TROUBLESHOOTING.md` |
| Fixes Applied | `FIXES_APPLIED.md` |

---

## Key URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| MongoDB | Cloud (configured in .env) |

---

## Default Ports

- **Frontend:** 5173 (Vite)
- **Backend:** 5000 (Express)
- **MongoDB:** Cloud (Atlas)

---

## Need Help?

1. Check `TROUBLESHOOTING.md` for detailed solutions
2. Check `STARTUP_GUIDE.md` for complete setup
3. Check browser console (F12) for errors
4. Check backend terminal for errors

---

**Status:** ✅ All systems ready!
