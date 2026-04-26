# Response to Fly.io Support (Ticket T-16743)

Hi Sylvain,

Thank you for looking into this! Here are the details you requested:

---

## 1. Specific Errors in Logs

### Redis Connection Errors (Repeated)
```
[Evolution API] v2.2.3 804 - Thu Apr 23 2026 08:22:40 ERROR [Redis] [string] redis disconnected
```

**Note**: These Redis errors are misleading. We have Redis **disabled** in our configuration:
```toml
CACHE_REDIS_ENABLED = "false"
CACHE_REDIS_URI = ""
CACHE_LOCAL_ENABLED = "false"
```

The app is configured to use PostgreSQL only, but Evolution API still tries to connect to Redis and logs these errors even though Redis is disabled.

### Proxy Connection Error
```
error.message="instance refused connection. is your app listening on 0.0.0.0:8080? make sure it is not only listening on 127.0.0.1"
```

This error appeared during v2.2.3 deployment but was resolved in v2.1.0.

---

## 2. What We're Trying to Do

We're running **Evolution API** (WhatsApp Business API) on Fly.io. The API needs to:

1. Create WhatsApp instances
2. Connect to WhatsApp servers via WebSocket
3. Generate QR codes for WhatsApp Web authentication
4. Maintain persistent WebSocket connections to WhatsApp servers

---

## 3. Commands We Ran

### Deployment
```bash
flyctl deploy -a rozare-evolution-api --no-cache
```

### Testing Commands
```bash
# 1. Create WhatsApp instance
curl -X POST https://rozare-evolution-api.fly.dev/instance/create \
  -H "apikey: rozareplatform" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"rozare-test","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'

# Response: ✅ Success - Instance created with status "created"

# 2. Connect instance to generate QR code
curl -X GET https://rozare-evolution-api.fly.dev/instance/connect/rozare-test \
  -H "apikey: rozareplatform"

# Response: ❌ Error - {"error":true,"message":"[object Object]"}

# 3. Check instance status
curl -X GET https://rozare-evolution-api.fly.dev/instance/fetchInstances \
  -H "apikey: rozareplatform"

# Response: Instance status shows "close" (should be "open" or "connecting")
```

---

## 4. The Problem

### What Works ✅
- Evolution API starts successfully
- API responds to HTTP requests (GET / returns welcome message)
- PostgreSQL database connects successfully
- WhatsApp instances can be created
- Data is saved to database

### What Doesn't Work ❌
- **QR code generation fails** - QR count stays at 0
- **WhatsApp connection fails** - Instance status remains "close"
- **WebSocket connections to WhatsApp servers appear to fail silently**

### Expected Behavior
When we call `/instance/connect/{instanceName}`, Evolution API should:
1. Establish WebSocket connection to WhatsApp servers (web.whatsapp.com)
2. Generate a QR code
3. Return QR code data in response
4. Instance status should change to "connecting" or "open"

### Actual Behavior
- No QR code generated (count: 0)
- Instance status stays "close"
- No error messages about WhatsApp connection in logs
- Connection attempt fails silently

---

## 5. Configuration Details

### App: `rozare-evolution-api`
- **Current Version**: Evolution API v2.1.0 (also tested v2.2.3 - same issue)
- **Docker Image**: `atendai/evolution-api:v2.1.0`
- **Database**: PostgreSQL (`rozare-evolution-db`)
- **Region**: iad

### fly.toml Configuration
```toml
app = "rozare-evolution-api"
primary_region = "iad"

[build]
  image = "atendai/evolution-api:v2.1.0"

[env]
  SERVER_TYPE = "http"
  SERVER_PORT = "8080"
  AUTHENTICATION_API_KEY = "rozareplatform"
  AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES = "true"
  DATABASE_ENABLED = "true"
  DATABASE_PROVIDER = "postgresql"
  DATABASE_CONNECTION_CLIENT_NAME = "evolution"
  DATABASE_SAVE_DATA_INSTANCE = "true"
  DATABASE_SAVE_DATA_NEW_MESSAGE = "false"
  DATABASE_SAVE_MESSAGE_UPDATE = "false"
  DATABASE_SAVE_DATA_CONTACTS = "false"
  DATABASE_SAVE_DATA_CHATS = "false"
  CACHE_REDIS_ENABLED = "false"
  CACHE_REDIS_URI = ""
  CACHE_LOCAL_ENABLED = "false"
  CONFIG_SESSION_PHONE_CLIENT = "Rozare"
  CONFIG_SESSION_PHONE_NAME = "Chrome"
  QRCODE_LIMIT = "30"
  QRCODE_COLOR = "#000000"
  LOG_LEVEL = "DEBUG"
  LOG_COLOR = "true"
  DEL_INSTANCE = "false"
  WEBHOOK_GLOBAL_ENABLED = "false"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

---

## 6. Our Hypothesis

We suspect that **outbound WebSocket connections to WhatsApp servers might be blocked or restricted** on Fly.io's free tier. 

Evolution API needs to establish WebSocket connections to:
- `web.whatsapp.com` (port 443)
- WhatsApp's WebSocket endpoints

The same issue occurred on Railway's free tier, which is why we moved to Fly.io.

---

## 7. Questions for Fly.io Support

1. **Are there any restrictions on outbound WebSocket connections** from Fly.io apps?
2. **Are connections to WhatsApp servers (web.whatsapp.com) blocked or rate-limited?**
3. **Do we need to configure anything special for WebSocket connections** to external services?
4. **Would upgrading to a paid plan resolve this issue?**
5. **Can you see any network-level blocks or failures** in your logs that we can't see?

---

## 8. Additional Context

- Evolution API works perfectly on Heroku (tested and confirmed)
- The same Docker image works locally with `docker run`
- This is not a code issue - it's specifically about network connectivity to WhatsApp servers
- Evolution API documentation: https://doc.evolution-api.com/

---

## 9. What We Need

We need Evolution API to be able to:
1. Establish outbound WebSocket connections to `web.whatsapp.com`
2. Maintain persistent WebSocket connections (WhatsApp sessions can last hours/days)
3. Send/receive WebSocket messages to WhatsApp servers

If this is not possible on the free tier, please let us know what plan we need to upgrade to.

---

Thank you for your help!

Best regards,
[Your Name]

---

## Attachments

Full logs available in app: `rozare-evolution-api`
Machines: 781567ec160478, 2879091f1eee68
