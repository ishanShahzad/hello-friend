# Oracle Cloud - Quick Reference Card

## 🚀 Quick Start (Copy-Paste Commands)

### 1. Connect to VM
```bash
ssh -i ~/.ssh/oracle-key.pem ubuntu@YOUR_PUBLIC_IP
```

### 2. Install Docker (First Time Only)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw --force enable

# Logout and login again
exit
```

### 3. Deploy Evolution API
```bash
# Reconnect
ssh -i ~/.ssh/oracle-key.pem ubuntu@YOUR_PUBLIC_IP

# Create directory
mkdir -p ~/evolution-api && cd ~/evolution-api

# Create docker-compose.yml (see full guide for content)
nano docker-compose.yml

# Start services
docker compose up -d

# Check logs
docker compose logs -f evolution-api
```

### 4. Test Evolution API
```bash
# Test API
curl http://YOUR_PUBLIC_IP:8080/

# Create instance
curl -X POST http://YOUR_PUBLIC_IP:8080/instance/create \
  -H "apikey: rozareplatform" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"rozare-main","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'

# Connect to generate QR
curl -X GET http://YOUR_PUBLIC_IP:8080/instance/connect/rozare-main \
  -H "apikey: rozareplatform"
```

### 5. Update Backend
```bash
# On your local machine
heroku config:set EVOLUTION_API_URL=http://YOUR_PUBLIC_IP:8080 -a tortrose-backend
```

---

## 📋 Daily Commands

```bash
# View logs
docker compose logs -f evolution-api

# Restart Evolution API
docker compose restart evolution-api

# Stop all services
docker compose down

# Start all services
docker compose up -d

# Check status
docker compose ps

# Check resource usage
docker stats
```

---

## 🔧 Troubleshooting Commands

```bash
# Check if containers are running
docker compose ps

# View all logs
docker compose logs

# Restart everything
docker compose restart

# Rebuild and restart
docker compose down
docker compose up -d

# Check firewall
sudo ufw status

# Check disk space
df -h

# Check memory
free -h
```

---

## 📞 Important URLs & Credentials

**Evolution API:**
- URL: `http://YOUR_PUBLIC_IP:8080`
- API Key: `rozareplatform`
- Instance: `rozare-main`

**SSH:**
- Command: `ssh -i ~/.ssh/oracle-key.pem ubuntu@YOUR_PUBLIC_IP`
- Key: `~/.ssh/oracle-key.pem`

**Database:**
- User: `evolution`
- Password: `evolution_secure_password_2024`
- Database: `evolution`

---

## ⚡ Emergency Commands

```bash
# If Evolution API is stuck
docker compose restart evolution-api

# If database is stuck
docker compose restart postgres

# If everything is broken
docker compose down
docker compose up -d

# Check what's using port 8080
sudo lsof -i :8080

# Kill process on port 8080
sudo kill -9 $(sudo lsof -t -i:8080)
```

---

## 📊 Monitoring

```bash
# Real-time logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Check container health
docker compose ps

# System resources
htop  # (install with: sudo apt install htop)
```

---

## 🎯 Success Indicators

✅ **Evolution API Working:**
```bash
curl http://YOUR_PUBLIC_IP:8080/
# Should return: {"status":200,"message":"Welcome to the Evolution API..."}
```

✅ **Containers Running:**
```bash
docker compose ps
# Both evolution-api and postgres should show "Up"
```

✅ **QR Code Generated:**
```bash
curl -X GET http://YOUR_PUBLIC_IP:8080/instance/connect/rozare-main \
  -H "apikey: rozareplatform"
# Should return QR code data or count > 0
```

---

## 🔄 Update Evolution API

```bash
cd ~/evolution-api

# Pull new version
docker compose pull evolution-api

# Restart with new version
docker compose up -d evolution-api

# Check logs
docker compose logs -f evolution-api
```

---

## 💾 Backup Database

```bash
# Create backup
docker exec evolution-postgres pg_dump -U evolution evolution > ~/backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i evolution-postgres psql -U evolution evolution < ~/backup_20240423.sql
```

---

## 🆘 If You Get Locked Out

1. Go to Oracle Cloud Console
2. Navigate to Compute → Instances
3. Click on your instance
4. Click "Console Connection"
5. Create console connection
6. Use web-based console to access VM

---

## 📱 Test WhatsApp Connection

1. Go to https://www.rozare.com/admin
2. Navigate to WhatsApp settings
3. Click "Link WhatsApp"
4. Scan QR code with WhatsApp mobile app
5. Done! ✅
