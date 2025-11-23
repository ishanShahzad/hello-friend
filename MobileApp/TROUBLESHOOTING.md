# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### 1. "EMFILE: too many open files" Error

This is a macOS issue with file watchers. Here are the solutions:

#### Solution A: Increase File Limit (Recommended)
```bash
# Check current limit
ulimit -n

# Increase limit temporarily (for current terminal session)
ulimit -n 10240

# Then restart Expo
npm start
```

#### Solution B: Permanent Fix (macOS)
```bash
# Create/edit limit file
sudo nano /Library/LaunchDaemons/limit.maxfiles.plist
```

Add this content:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>limit.maxfiles</string>
    <key>ProgramArguments</key>
    <array>
      <string>launchctl</string>
      <string>limit</string>
      <string>maxfiles</string>
      <string>65536</string>
      <string>200000</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>ServiceIPC</key>
    <false/>
  </dict>
</plist>
```

Then:
```bash
# Set permissions
sudo chown root:wheel /Library/LaunchDaemons/limit.maxfiles.plist
sudo chmod 644 /Library/LaunchDaemons/limit.maxfiles.plist

# Load the file
sudo launchctl load -w /Library/LaunchDaemons/limit.maxfiles.plist

# Restart your Mac
```

#### Solution C: Quick Fix
```bash
# Close other applications
# Restart terminal
# Clear Expo cache
npx expo start -c
```

### 2. Package Version Warnings

If you see package version warnings:

```bash
# Update specific package
npm install expo-image-picker@~15.1.0

# Or update all packages
npx expo install --fix
```

### 3. Metro Bundler Issues

#### Clear Cache:
```bash
npx expo start -c
```

#### Reset Everything:
```bash
rm -rf node_modules
npm install
npx expo start -c
```

### 4. Can't Connect to Backend

#### Check API URL:
Edit `src/config/api.js`:

```javascript
// For Android Emulator
export const API_BASE_URL = 'http://10.0.2.2:5000';

// For Physical Device (use your computer's IP)
export const API_BASE_URL = 'http://192.168.1.X:5000';
```

#### Find Your IP:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

#### Check Backend is Running:
```bash
cd Backend
npm start
# Should see: "Server running on port 5000"
```

### 5. App Crashes on Startup

#### Check Console Logs:
Look for error messages in the terminal

#### Common Fixes:
```bash
# Clear cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install

# Check for syntax errors
npm run lint
```

### 6. "Network request failed"

#### Solutions:
1. Check backend is running
2. Verify API_BASE_URL is correct
3. Ensure phone and computer are on same WiFi
4. Check firewall settings
5. Try using your computer's IP address

### 7. Images Not Loading

#### Check:
1. Image URLs are valid
2. Backend is serving images correctly
3. Network connection is stable
4. Image URLs use http:// or https://

### 8. Build Fails

#### For Android:
```bash
# Update EAS CLI
npm install -g eas-cli

# Login
eas login

# Try building again
eas build --platform android --clear-cache
```

#### For iOS:
```bash
# Make sure you're on macOS
# Update EAS CLI
npm install -g eas-cli

# Build
eas build --platform ios
```

### 9. Expo Go App Issues

#### Solutions:
1. Update Expo Go to latest version
2. Clear Expo Go cache (in app settings)
3. Restart Expo Go app
4. Restart your phone

### 10. TypeScript/ESLint Errors

#### Disable if not needed:
```bash
# Remove TypeScript
npm uninstall typescript @types/react @types/react-native

# Or ignore errors
# Add to package.json:
"eslint": {
  "extends": [],
  "rules": {}
}
```

## Quick Fixes Checklist

When something goes wrong, try these in order:

1. ✅ Clear cache: `npx expo start -c`
2. ✅ Restart terminal
3. ✅ Restart Expo Go app
4. ✅ Check backend is running
5. ✅ Verify API_BASE_URL
6. ✅ Check WiFi connection
7. ✅ Reinstall dependencies: `rm -rf node_modules && npm install`
8. ✅ Restart computer

## Getting Help

### Check Logs:
- Terminal output
- Expo Go app logs
- Backend console logs

### Useful Commands:
```bash
# Check Expo version
npx expo --version

# Check Node version
node --version

# Check npm version
npm --version

# View all Expo commands
npx expo --help
```

### Resources:
- Expo Docs: https://docs.expo.dev/
- React Native Docs: https://reactnative.dev/
- Stack Overflow: https://stackoverflow.com/questions/tagged/expo

## Platform-Specific Issues

### macOS:
- File limit issues (see Solution A above)
- Xcode required for iOS builds
- Command Line Tools required

### Windows:
- Use PowerShell or CMD
- Android Studio for Android emulator
- WSL2 for better performance

### Linux:
- Install Android Studio for emulator
- May need to install additional dependencies

## Performance Issues

### App is Slow:
1. Optimize images (compress, resize)
2. Use FlatList for long lists
3. Implement pagination
4. Use React.memo for components
5. Avoid unnecessary re-renders

### Build is Slow:
1. Use `--clear-cache` flag
2. Close other applications
3. Check internet connection
4. Use faster computer if possible

## Still Having Issues?

1. Check the error message carefully
2. Search for the error on Google
3. Check Expo documentation
4. Ask on Expo forums
5. Check GitHub issues

---

**Most issues can be solved by clearing cache and restarting! 🔄**
