# Deploy Evolution API to Fly.io - Complete Guide

## Why Fly.io is Best

✅ **No sleep** on free tier
✅ **Docker support** (perfect for Evolution API)
✅ **No WebSocket blocking** (unlike Railway)
✅ **Free PostgreSQL** included
✅ **3 VMs free** (160GB bandwidth/month)
✅ **Global edge network**

## Step 1: Install Fly CLI

The installation is running in the background. Once it completes, add it to your PATH:

```bash
# Add to PATH (run this in your terminal)
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Add to your shell profile for permanent access
echo 'export FLYCTL_INSTALL="$HOME/.fly"' >> ~/.zshrc
echo 'export PATH="$FLYCTL_INSTALL/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
flyctl version
```

## Step 2: Login to Fly.io

```bash
flyctl auth login
```

This will open your browser to authenticate.

## Step 3: Create fly.toml Configuration

Create a file called `fly.toml` in your project root:

```toml
app = "rozare-evolution-api"
primary_region = "iad"  # Virginia (closest to your users)

[build]
  image = "atendai/evolution-api:v2.2.3"

[env]
  SERVER_TYPE = "http"
  SERVER_PORT = "8080"
  AUTHENTICATION_API_KEY = "rozareplatform"
  AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES = "true"
  DATABASE_ENABLED = "true"
  DATABASE_PROVIDER = "postgresql"
  DATABASE_CONNECTION_CLIENT_NAME = "evolution"
  CONFIG_SESSION_PHONE_CLIENT = "Rozare"
  CONFIG_SESSION_PHONE_NAME = "Chrome"
  QRCODE_LIMIT = "30"
  LOG_LEVEL = "ERROR"
  DEL_INSTANCE = "false"
  WEBHOOK_GLOBAL_ENABLED = "false"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false  # IMPORTANT: Prevents sleeping!
  auto_start_machines = true
  min_machines_running = 1    # IMPORTANT: Always keep 1 running!

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

## Step 4: Create PostgreSQL Database

```bash
# Create a PostgreSQL database
flyctl postgres create --name rozare-evolution-db --region iad

# When prompted:
# - Choose "Development" configuration (free)
# - Select region: iad (Virginia)

# Attach database to your app
flyctl postgres attach rozare-evolution-db --app rozare-evolution-api
```

This will automatically set the `DATABASE_URL` environment variable.

## Step 5: Set Database Connection URI

```bash
# Get the database URL
flyctl postgres db list --app rozare-evolution-db

# Set it as DATABASE_CONNECTION_URI
flyctl secrets set DATABASE_CONNECTION_URI="<your postgres URL>" --app rozare-evolution-api
```

## Step 6: Deploy Evolution API

```bash
# Launch the app
flyctl launch --no-deploy

# When prompted:
# - App name: rozare-evolution-api
# - Region: iad (Virginia)
# - PostgreSQL: No (we already created it)
# - Redis: No

# Deploy
flyctl deploy
```

## Step 7: Check Deployment

```bash
# Check status
flyctl status --app rozare-evolution-api

# View logs
flyctl logs --app rozare-evolution-api

# Open in browser
flyctl open --app rozare-evolution-api
```

## Step 8: Get Your Fly.io URL

```bash
# Get your app URL
flyctl info --app rozare-evolution-api
```

Your URL will be: `https://rozare-evolution-api.fly.dev`

## Step 9: Update Backend Environment Variables

```bash
# Update Heroku backend to use Fly.io Evolution API
heroku config:set -a tortrose-backend \
  EVOLUTION_API_URL="https://rozare-evolution-api.fly.dev" \
  EVOLUTION_API_KEY="rozareplatform" \
  EVOLUTION_INSTANCE_NAME="rozare-main"

# Restart backend
heroku restart -a tortrose-backend
```

## Step 10: Test WhatsApp Connection

1. Visit: https://www.rozare.com/admin-dashboard/whatsapp-verification
2. Click "Link WhatsApp"
3. You should see:
   - QR code displayed
   - OR "Get Pairing Code Instead" button
4. Scan QR or enter pairing code
5. WhatsApp connects!

## Troubleshooting

### If deployment fails:

```bash
# Check logs
flyctl logs --app rozare-evolution-api

# Restart app
flyctl apps restart rozare-evolution-api

# Check machine status
flyctl machine list --app rozare-evolution-api
```

### If app sleeps (shouldn't happen):

Check your `fly.toml` has:
```toml
auto_stop_machines = false
min_machines_running = 1
```

### If database connection fails:

```bash
# Check database status
flyctl postgres db list --app rozare-evolution-db

# Get connection string
flyctl postgres connect --app rozare-evolution-db
```

## Cost Breakdown

**Free Tier Includes:**
- 3 shared-cpu-1x VMs (256MB RAM each)
- 3GB persistent volume storage
- 160GB outbound data transfer/month

**Your Usage:**
- 1 VM for Evolution API (512MB RAM)
- 1 PostgreSQL database (256MB RAM)
- Total: **FREE** (within limits)

**If you exceed free tier:**
- Additional RAM: ~$2/month per 256MB
- Additional bandwidth: $0.02/GB

**Expected cost: $0-2/month** (likely $0)

## Advantages Over Other Platforms

| Feature | Fly.io | Railway | Render | Heroku Free | Heroku Eco |
|---------|--------|---------|--------|-------------|------------|
| **Sleep** | ❌ No | ❌ No | ✅ Yes (15min) | ✅ Yes (30min) | ❌ No |
| **Cost** | Free | Free | Free | Free | $5/month |
| **WebSocket** | ✅ Works | ❌ Blocked | ✅ Works | ✅ Works | ✅ Works |
| **Docker** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **PostgreSQL** | ✅ Free | ✅ Free | ✅ Free | ❌ No | ✅ Paid |

**Winner: Fly.io** - Free, no sleep, no WebSocket blocking!

## Quick Commands Reference

```bash
# Deploy
flyctl deploy

# Logs
flyctl logs

# Status
flyctl status

# Restart
flyctl apps restart rozare-evolution-api

# Scale (if needed)
flyctl scale count 1 --app rozare-evolution-api

# SSH into machine
flyctl ssh console --app rozare-evolution-api

# Delete app (if needed)
flyctl apps destroy rozare-evolution-api
```

## Next Steps After Deployment

1. ✅ Test WhatsApp QR code generation
2. ✅ Test pairing code functionality
3. ✅ Send test order confirmation message
4. ✅ Monitor logs for any issues
5. ✅ Set up monitoring (optional)

## Support

If you have issues:
- Fly.io Community: https://community.fly.io
- Fly.io Docs: https://fly.io/docs
- Evolution API Docs: https://doc.evolution-api.com

---

**Total setup time: 15-20 minutes**
**Cost: FREE**
**Result: Working WhatsApp QR + Pairing Code!**
