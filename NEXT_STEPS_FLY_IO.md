# Next Steps: Deploy Evolution API to Fly.io

## Summary: Fly.io vs Back4App

**✅ Use Fly.io** - It's better because:
- No sleep on free tier
- Docker support (Evolution API needs this)
- No WebSocket blocking
- Free PostgreSQL included

**❌ Don't use Back4App** - It's not suitable because:
- Sleeps after 30 minutes
- Not designed for Docker apps
- Better for Parse Server, not WhatsApp gateways

---

## What I've Done

✅ Installed Fly CLI on your Mac
✅ Created `fly.toml` configuration file
✅ Created `FLY_IO_SETUP_GUIDE.md` with complete instructions
✅ Opened browser for Fly.io authentication

---

## What You Need to Do Now

### Step 1: Complete Authentication

A browser window should have opened. If not, open this URL:
```
https://fly.io/app/auth/cli/35357777756b6f7132726f6970366d34723564676f356a796878716e7a703266
```

Sign in with your Fly.io account.

### Step 2: Run These Commands in Your Terminal

```bash
# Add Fly CLI to PATH
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Make it permanent
echo 'export FLYCTL_INSTALL="$HOME/.fly"' >> ~/.zshrc
echo 'export PATH="$FLYCTL_INSTALL/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify you're logged in
flyctl auth whoami
```

### Step 3: Create PostgreSQL Database

```bash
# Create database
flyctl postgres create --name rozare-evolution-db --region iad

# When prompted, choose:
# - Configuration: Development (free)
# - Region: iad (Virginia)
```

### Step 4: Launch Evolution API

```bash
# Launch app (don't deploy yet)
flyctl launch --no-deploy

# When prompted:
# - App name: rozare-evolution-api
# - Region: iad (Virginia)
# - PostgreSQL: No (we already created it)
# - Redis: No
```

### Step 5: Attach Database

```bash
# Attach database to app
flyctl postgres attach rozare-evolution-db --app rozare-evolution-api

# This automatically sets DATABASE_URL
```

### Step 6: Set Database Connection URI

```bash
# Get database URL
flyctl postgres db list --app rozare-evolution-db

# Copy the connection string and set it
flyctl secrets set DATABASE_CONNECTION_URI="<paste connection string here>" --app rozare-evolution-api
```

### Step 7: Deploy

```bash
# Deploy Evolution API
flyctl deploy

# This will:
# - Pull the Evolution API Docker image
# - Deploy to Fly.io
# - Start the app
# - Takes 2-3 minutes
```

### Step 8: Check Status

```bash
# Check if it's running
flyctl status --app rozare-evolution-api

# View logs
flyctl logs --app rozare-evolution-api

# Get your URL
flyctl info --app rozare-evolution-api
```

Your URL will be: `https://rozare-evolution-api.fly.dev`

### Step 9: Update Backend

```bash
# Update Heroku backend to use Fly.io
heroku config:set -a tortrose-backend \
  EVOLUTION_API_URL="https://rozare-evolution-api.fly.dev" \
  EVOLUTION_API_KEY="rozareplatform" \
  EVOLUTION_INSTANCE_NAME="rozare-main"

# Restart backend
heroku restart -a tortrose-backend
```

### Step 10: Test WhatsApp

1. Visit: https://www.rozare.com/admin-dashboard/whatsapp-verification
2. Click "Link WhatsApp"
3. You should see QR code or pairing code button
4. Connect your WhatsApp!

---

## If You Get Stuck

### Authentication Issues

```bash
# Try logging in again
flyctl auth login

# Or use token
flyctl auth token
```

### Deployment Issues

```bash
# Check logs
flyctl logs --app rozare-evolution-api

# Restart app
flyctl apps restart rozare-evolution-api

# Check machine status
flyctl machine list --app rozare-evolution-api
```

### Database Issues

```bash
# Check database status
flyctl postgres db list --app rozare-evolution-db

# Connect to database
flyctl postgres connect --app rozare-evolution-db
```

---

## Cost

**Free Tier Includes:**
- 3 VMs (256MB RAM each)
- 3GB storage
- 160GB bandwidth/month

**Your Usage:**
- 1 VM for Evolution API (512MB)
- 1 PostgreSQL database (256MB)

**Expected Cost: $0/month** (within free tier)

---

## Why This Will Work

✅ **No sleep** - App stays running 24/7
✅ **No WebSocket blocking** - Unlike Railway
✅ **Docker support** - Evolution API works perfectly
✅ **Free** - No cost for your usage
✅ **Fast** - Global edge network

---

## Alternative: Heroku Eco ($5/month)

If Fly.io doesn't work for any reason, you can upgrade Heroku:

```bash
# Upgrade to Eco (no sleep)
heroku ps:type eco -a rozare-evolution-api

# Cost: $5/month
# Benefit: Guaranteed to work, no sleep
```

---

## Need Help?

If you get stuck at any step, let me know which step and what error you're seeing!

**Total time: 15-20 minutes**
**Result: Working WhatsApp QR + Pairing Code!**
