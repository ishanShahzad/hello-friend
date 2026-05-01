# Evolution API Upgrade: v1.7.4 → v2.3.7

## Pre-Upgrade Checklist

### Current Setup
- ✅ Version: 1.7.4
- ✅ Server: Oracle Cloud (80.225.254.66:8080)
- ✅ Instance: rozare-main
- ✅ Status: Connected (923201166402)
- ✅ Database: PostgreSQL 15-alpine
- ✅ Integration: WHATSAPP-BAILEYS

### Backup Plan
1. Document current docker-compose.yml
2. Export WhatsApp session data
3. Note current configuration
4. Keep v1.7.4 as rollback option

## Upgrade Steps

### Step 1: SSH into Oracle Cloud
```bash
ssh -i ~/Downloads/ssh-key-2026-04-28.key ubuntu@80.225.254.66
```

### Step 2: Backup Current Setup
```bash
cd ~/evolution-api
cp docker-compose.yml docker-compose.yml.backup.v1.7.4
docker-compose down
```

### Step 3: Update docker-compose.yml to v2.3.7
- Change image from `atendai/evolution-api:v1.7.4` to `atendai/evolution-api:v2.3.7`
- Review v2.3.7 environment variables
- Update any deprecated configs

### Step 4: Pull New Image
```bash
docker-compose pull
```

### Step 5: Start Services
```bash
docker-compose up -d
```

### Step 6: Verify Connection
- Check logs: `docker-compose logs -f evolution-api`
- Test API: `curl http://80.225.254.66:8080`
- Check instance status
- Verify WhatsApp connection

### Step 7: Update Backend Code
- Review v2.3.7 API changes
- Update message format if needed
- Update webhook handling
- Test all endpoints

## API Changes v1.7.4 → v2.3.7

### Message Format Changes
**v1.7.4 (current):**
```javascript
// Text
{ number: "...", textMessage: { text: "..." } }

// Poll
{ number: "...", pollMessage: { name: "...", values: [...] } }
```

**v2.3.7 (new):**
Need to verify - may have changed back to simpler format or new structure.

## Rollback Plan
If anything fails:
```bash
cd ~/evolution-api
docker-compose down
cp docker-compose.yml.backup.v1.7.4 docker-compose.yml
docker-compose up -d
```

## Testing Checklist
- [ ] API responds
- [ ] Instance status shows
- [ ] QR code generation works
- [ ] WhatsApp connects
- [ ] Send text message
- [ ] Send poll message
- [ ] Webhook receives events
- [ ] Order confirmation flow works

## Status: READY TO BEGIN
