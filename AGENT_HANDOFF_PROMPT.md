# Evolution API v2.3.7 Upgrade - Complete Task Handoff

## CRITICAL CONTEXT
You are taking over an **IN-PROGRESS** Evolution API upgrade from v1.7.4 to v2.3.7 on Oracle Cloud server.

**Server Details:**
- IP: `80.225.254.66`
- SSH Key: `~/Downloads/ssh-key-2026-04-28.key`
- SSH User: `ubuntu`
- Current Status: **SERVER UNREACHABLE** (connection timeout, 100% packet loss)

**Evolution API Credentials:**
- API Key: `rozareplatform`
- Instance Name: `rozare-main`
- Webhook Secret: `rozareplatform`

---

## WHAT WAS DONE (VERIFY THESE FIRST)

### 1. Cleanup Phase ✅
The previous agent cleaned up old v1.7.4 containers:
```bash
# These commands were executed:
docker stop evolution_api evolution_mongo || true
docker rm evolution_api evolution_mongo || true
docker volume rm evolution_instances evolution_mongo_data || true
docker system prune -f
```

**YOUR TASK:** Verify cleanup was successful:
```bash
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker ps -a"
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker volume ls"
```

### 2. Docker Compose File Created ✅
A production-ready `docker-compose.yml` was created and uploaded to server at `~/evolution-api/docker-compose.yml`

**YOUR TASK:** Verify file exists and read it:
```bash
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "cat ~/evolution-api/docker-compose.yml"
```

The file should contain:
- Evolution API v2.3.7 (image: `evoapicloud/evolution-api:latest`)
- PostgreSQL 16-alpine
- Redis 7-alpine
- Proper networking and volumes
- Environment variables configured

### 3. Docker Image Pull Started ⏳
The previous agent started pulling images but connection was lost:
```bash
cd ~/evolution-api && docker compose pull
```

**YOUR TASK:** Check if images were pulled successfully:
```bash
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker images | grep -E 'evolution|postgres|redis'"
```

---

## CURRENT PROBLEM: SERVER UNREACHABLE

The Oracle Cloud server is **completely unreachable**:
- SSH connection timeout
- Ping shows 100% packet loss
- No response on any port

**POSSIBLE CAUSES:**
1. Oracle Cloud instance stopped/paused
2. Firewall/Security group blocking access
3. Server crashed during Docker operations
4. IP address changed

**YOUR FIRST TASK:** Restore server access:

1. **Check Oracle Cloud Console:**
   - Log into Oracle Cloud account
   - Navigate to Compute → Instances
   - Verify instance is **Running** (not Stopped/Terminated)
   - Check current **Public IP** (should be 80.225.254.66)
   - If stopped, **start the instance**

2. **Verify Security Rules:**
   - Go to Instance → Attached VNIC → Security Lists
   - Ensure **Ingress Rule** allows:
     - Port 22 (SSH) from your IP or 0.0.0.0/0
     - Port 8080 (Evolution API) from 0.0.0.0/0
   - If missing, add these rules

3. **Test Connection:**
   ```bash
   ping -c 3 80.225.254.66
   ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "echo 'Connected'"
   ```

---

## WHAT NEEDS TO BE DONE (COMPLETE THESE STEPS)

### PHASE 1: Verify Previous Work ✅

Once server is accessible, verify what was done:

```bash
# 1. Check Docker is running
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker --version && docker compose version"

# 2. Check old containers are removed
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker ps -a"

# 3. Check docker-compose.yml exists
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "ls -la ~/evolution-api/"

# 4. Check if images were pulled
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker images"
```

### PHASE 2: Pull Docker Images (if not done)

If images are missing, pull them:

```bash
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "cd ~/evolution-api && docker compose pull"
```

This will pull:
- `evoapicloud/evolution-api:latest` (~500MB)
- `postgres:16-alpine` (~200MB)
- `redis:7-alpine` (~30MB)

**Expected time:** 5-10 minutes depending on connection speed

### PHASE 3: Start Services

```bash
# Start all services in detached mode
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "cd ~/evolution-api && docker compose up -d"

# Wait 30 seconds for startup
sleep 30

# Check container status
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker ps"
```

**Expected output:** 3 containers running:
- `evolution_api` (port 8080)
- `evolution_postgres` (port 5432)
- `evolution_redis` (port 6379)

### PHASE 4: Verify Evolution API Started

```bash
# Check Evolution API logs
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker logs evolution_api --tail 50"

# Check PostgreSQL logs
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker logs evolution_postgres --tail 20"

# Check Redis logs
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66 "docker logs evolution_redis --tail 20"
```

**Look for:**
- Evolution API: "Server started on port 8080" or similar
- PostgreSQL: "database system is ready to accept connections"
- Redis: "Ready to accept connections"

**If errors appear:** Read logs carefully and fix configuration issues

### PHASE 5: Test API Health

```bash
# Test API health endpoint
curl -v http://80.225.254.66:8080

# Test with API key
curl -H "apikey: rozareplatform" http://80.225.254.66:8080/instance/fetchInstances
```

**Expected:** 200 OK response with JSON data

### PHASE 6: Create WhatsApp Instance

```bash
# Create instance (Evolution API v2.3.7 format)
curl -X POST http://80.225.254.66:8080/instance/create \
  -H "apikey: rozareplatform" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "rozare-main",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

**Expected:** Instance created successfully

### PHASE 7: Generate QR Code

Evolution API v2.3.7 requires **explicit connection trigger**:

```bash
# Trigger connection (this generates QR code)
curl -X GET http://80.225.254.66:8080/instance/connect/rozare-main \
  -H "apikey: rozareplatform"

# Fetch instance to get QR code
curl -X GET http://80.225.254.66:8080/instance/fetchInstances \
  -H "apikey: rozareplatform"
```

**Expected:** Response contains `qrcode` field with base64 image or `pairingCode` with 8-digit code

### PHASE 8: Test Message Sending

After connecting WhatsApp (scan QR code):

```bash
# Test text message (Evolution API v2.3.7 format)
curl -X POST http://80.225.254.66:8080/message/sendText/rozare-main \
  -H "apikey: rozareplatform" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "923001234567",
    "text": "Test message from Evolution API v2.3.7"
  }'
```

**IMPORTANT:** Check if v2.3.7 uses different payload format than v1.7.4

### PHASE 9: Update Backend Code (if needed)

**Read these files to understand current implementation:**
- `Backend/services/whatsapp/evolutionClient.js` (API client)
- `Backend/services/whatsapp/messageBuilder.js` (message formatting)
- `Backend/services/whatsapp/webhookHandler.js` (webhook handling)

**Check if v2.3.7 API format differs from v1.7.4:**

Current v1.7.4 format (in code):
```javascript
// sendText
{
  number: "923001234567",
  textMessage: { text: "..." }
}

// sendPoll
{
  number: "923001234567",
  pollMessage: {
    name: "...",
    selectableCount: 1,
    values: ["...", "..."]
  }
}
```

**If v2.3.7 uses different format, update `evolutionClient.js`**

### PHASE 10: Deploy Backend to Heroku

After confirming everything works:

```bash
# Commit changes (if any)
git add .
git commit -m "Update Evolution API to v2.3.7"

# Push to all remotes
git push origin main
git push hellofriend main
git push heroku main
```

**Verify deployment:**
```bash
heroku logs --tail --app tortrose-backend
```

---

## IMPORTANT NOTES

### Evolution API v2.3.7 Key Differences from v1.7.4:

1. **Database:** PostgreSQL instead of MongoDB
2. **QR Generation:** Requires explicit `/instance/connect` call
3. **API Format:** May have different payload structure (verify this!)
4. **Webhook Events:** May have different event names/structure

### Docker Compose Configuration

The `docker-compose.yml` on server contains:

**Evolution API Environment:**
- `DATABASE_PROVIDER=postgresql`
- `DATABASE_CONNECTION_URI=postgresql://evolution:evolution_secure_password_2024@postgres:5432/evolution?schema=evolution_api`
- `CACHE_REDIS_ENABLED=true`
- `CACHE_REDIS_URI=redis://redis:6379/1`
- `AUTHENTICATION_API_KEY=rozareplatform`
- `SERVER_URL=http://80.225.254.66:8080`

**PostgreSQL:**
- User: `evolution`
- Password: `evolution_secure_password_2024`
- Database: `evolution`

**Redis:**
- Port: 6379
- Max memory: 512MB

### Backend Environment Variables

Current backend `.env` has:
```
EVOLUTION_API_URL = http://80.225.254.66:8080
EVOLUTION_API_KEY = rozareplatform
EVOLUTION_INSTANCE_NAME = rozare-main
EVOLUTION_WEBHOOK_SECRET = rozareplatform
```

**These should NOT need to change** (same IP, same credentials)

### Testing Checklist

After upgrade, test these features:
- [ ] WhatsApp connection (QR code generation)
- [ ] Text message sending
- [ ] Poll message sending
- [ ] Webhook receiving (poll votes)
- [ ] Order confirmation flow
- [ ] Vote change handling (max 1 change)
- [ ] Friendly response messages

### Git Remotes

Push to all three remotes:
- `origin` (Salman-here/Tortrose)
- `hellofriend` (ishanShahzad/hello-friend)
- `heroku` (tortrose-backend)

---

## SUCCESS CRITERIA

You're done when:
1. ✅ Evolution API v2.3.7 running on Oracle Cloud
2. ✅ PostgreSQL and Redis connected
3. ✅ WhatsApp instance created and connected
4. ✅ Test message sent successfully
5. ✅ Backend code updated (if needed)
6. ✅ Backend deployed to Heroku
7. ✅ Full order confirmation flow tested in production

---

## TROUBLESHOOTING

### If Evolution API won't start:
```bash
# Check logs
docker logs evolution_api --tail 100

# Check PostgreSQL connection
docker exec evolution_postgres psql -U evolution -d evolution -c "SELECT 1"

# Check Redis connection
docker exec evolution_redis redis-cli ping
```

### If QR code not generating:
```bash
# Restart instance
curl -X PUT http://80.225.254.66:8080/instance/restart/rozare-main \
  -H "apikey: rozareplatform"

# Delete and recreate
curl -X DELETE http://80.225.254.66:8080/instance/delete/rozare-main \
  -H "apikey: rozareplatform"

# Then create again
```

### If messages fail:
- Check Evolution API logs for errors
- Verify WhatsApp is still connected
- Test with curl first before blaming backend code
- Compare v2.3.7 API docs with v1.7.4 format

---

## FILES TO READ

**Local files:**
- `evolution-v2.3.7-docker-compose.yml` (the docker-compose config)
- `Backend/services/whatsapp/evolutionClient.js` (current API client)
- `Backend/services/whatsapp/messageBuilder.js` (message formatting)
- `Backend/services/whatsapp/webhookHandler.js` (webhook handling)
- `Backend/.env` (environment variables)
- `EVOLUTION_V2_UPGRADE_LOG.md` (upgrade progress tracking)

**Server files:**
- `~/evolution-api/docker-compose.yml` (on Oracle Cloud)

---

## FINAL NOTES

- **Be thorough:** Verify each step before moving to next
- **Check logs:** Always read container logs when something fails
- **Test incrementally:** Don't skip testing phases
- **Document issues:** If you encounter problems, document them
- **No shortcuts:** User explicitly said "do the best, don't find shortcuts"

Good luck! 🚀
