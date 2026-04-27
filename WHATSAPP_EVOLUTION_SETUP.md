# Oracle Cloud Free Tier - Evolution API Setup Guide

## Complete Professional Setup for WhatsApp Evolution API

This guide will help you deploy Evolution API on Oracle Cloud's **Always Free** tier with full production-ready configuration.

---

## 🎯 What You'll Get

- ✅ **Completely FREE** - Forever (Oracle Always Free tier)
- ✅ **Full VM Control** - No restrictions on WebSocket connections
- ✅ **2 AMD VMs** - 1 GB RAM each (we'll use 1)
- ✅ **Guaranteed to work** - No network restrictions
- ✅ **Professional setup** - Docker, SSL, automatic restarts
- ✅ **Public IP** - Dedicated IP address for your Evolution API

---

## 📋 Prerequisites

- Oracle Cloud account (free)
- Credit card (for verification only - won't be charged)
- SSH client (Terminal on Mac)
- 45-60 minutes of time

---

## Part 1: Oracle Cloud Account Setup (10 minutes)

### Step 1: Create Oracle Cloud Account

1. Go to https://www.oracle.com/cloud/free/
2. Click **"Start for free"**
3. Fill in your details:
   - Email: topinterestss@gmail.com (or your email)
   - Country: Select your country
   - Name and address
4. **Verify your email**
5. **Add payment method** (credit card - for verification only)
   - Oracle will charge $1 and refund immediately
   - This is just to verify you're not a bot
6. Wait for account approval (usually instant, can take up to 24 hours)

### Step 2: Sign In

1. Go to https://cloud.oracle.com/
2. Enter your **Cloud Account Name** (you chose this during signup)
3. Click **Continue**
4. Sign in with your email and password

---

## Part 2: Create Virtual Machine (15 minutes)

### Step 1: Navigate to Compute Instances

1. In Oracle Cloud Console, click **☰** (hamburger menu)
2. Go to **Compute** → **Instances**
3. Make sure you're in the correct **Compartment** (usually "root" or your name)

### Step 2: Create Instance

1. Click **"Create Instance"**

2. **Name your instance**:
   ```
   rozare-evolution-api
   ```

3. **Placement**:
   - Leave default (should show your home region)

4. **Image and Shape**:
   - Click **"Change Image"**
   - Select **"Canonical Ubuntu"** (Ubuntu 22.04 or 24.04)
   - Click **"Select Image"**
   
   - Click **"Change Shape"**
   - Select **"Ampere"** or **"AMD"** (both are free)
   - Choose **VM.Standard.E2.1.Micro** (Always Free eligible)
   - 1 OCPU, 1 GB RAM
   - Click **"Select Shape"**

5. **Networking**:
   - Leave **"Create new virtual cloud network"** selected
   - VCN Name: `rozare-vcn`
   - Subnet Name: `rozare-subnet`
   - ✅ Check **"Assign a public IPv4 address"**

6. **Add SSH Keys**:
   
   **Option A: Generate new SSH key (Recommended)**
   - Select **"Generate a key pair for me"**
   - Click **"Save Private Key"** → Save as `oracle-key.pem`
   - Click **"Save Public Key"** → Save as `oracle-key.pub`
   - **IMPORTANT**: Keep these files safe!
   
   **Option B: Use existing SSH key**
   - Select **"Upload public key files"**
   - Upload your existing `~/.ssh/id_rsa.pub`

7. **Boot Volume**:
   - Leave default (50 GB is fine)

8. Click **"Create"** at the bottom

9. **Wait for provisioning** (2-3 minutes)
   - Status will change from "PROVISIONING" to "RUNNING"
   - Note down the **Public IP Address** (you'll need this)

---

## Part 3: Configure Firewall Rules (5 minutes)

### Step 1: Open Required Ports

1. On your instance page, under **"Instance Details"**
2. Click on your **Subnet** name (e.g., `rozare-subnet`)
3. Click on **"Default Security List for rozare-vcn"**
4. Click **"Add Ingress Rules"**

**Add these rules one by one:**

#### Rule 1: HTTP (Port 80)
- Source CIDR: `0.0.0.0/0`
- IP Protocol: `TCP`
- Destination Port Range: `80`
- Description: `HTTP`
- Click **"Add Ingress Rules"**

#### Rule 2: HTTPS (Port 443)
- Source CIDR: `0.0.0.0/0`
- IP Protocol: `TCP`
- Destination Port Range: `443`
- Description: `HTTPS`
- Click **"Add Ingress Rules"**

#### Rule 3: Evolution API (Port 8080)
- Source CIDR: `0.0.0.0/0`
- IP Protocol: `TCP`
- Destination Port Range: `8080`
- Description: `Evolution API`
- Click **"Add Ingress Rules"**

---

## Part 4: Connect to Your VM (5 minutes)

### Step 1: Set SSH Key Permissions

Open Terminal and run:

```bash
# Move the key to .ssh folder
mv ~/Downloads/oracle-key.pem ~/.ssh/

# Set correct permissions
chmod 400 ~/.ssh/oracle-key.pem
```

### Step 2: Connect via SSH

Replace `YOUR_PUBLIC_IP` with your instance's public IP:

```bash
ssh -i ~/.ssh/oracle-key.pem ubuntu@YOUR_PUBLIC_IP
```

**First time connecting:**
- You'll see: "Are you sure you want to continue connecting?"
- Type `yes` and press Enter

**You should now be connected to your Oracle Cloud VM!**

---

## Part 5: Install Docker & Docker Compose (10 minutes)

Run these commands one by one in your SSH session:

### Step 1: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker ubuntu

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Apply group changes (logout and login)
exit
```

### Step 3: Reconnect and Verify

```bash
# Reconnect to VM
ssh -i ~/.ssh/oracle-key.pem ubuntu@YOUR_PUBLIC_IP

# Verify Docker is working
docker --version
docker ps
```

You should see Docker version and an empty container list.

---

## Part 6: Configure Ubuntu Firewall (5 minutes)

Oracle Cloud has TWO firewalls - we configured Oracle's firewall, now configure Ubuntu's:

```bash
# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow Evolution API
sudo ufw allow 8080/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

You should see all ports listed as "ALLOW".

---

## Part 7: Deploy Evolution API with Docker (10 minutes)

### Step 1: Create Project Directory

```bash
# Create directory
mkdir -p ~/evolution-api
cd ~/evolution-api
```

### Step 2: Create Docker Compose File

```bash
nano docker-compose.yml
```

**Paste this configuration** (press Ctrl+Shift+V to paste):

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: evolution-postgres
    restart: always
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: evolution_secure_password_2024
      POSTGRES_DB: evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - evolution-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evolution"]
      interval: 10s
      timeout: 5s
      retries: 5

  evolution-api:
    image: atendai/evolution-api:v2.1.0
    container_name: evolution-api
    restart: always
    ports:
      - "8080:8080"
    environment:
      # Server Configuration
      SERVER_TYPE: http
      SERVER_PORT: 8080
      
      # Authentication
      AUTHENTICATION_API_KEY: rozareplatform
      AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: "true"
      
      # Database Configuration
      DATABASE_ENABLED: "true"
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgresql://evolution:evolution_secure_password_2024@postgres:5432/evolution?schema=public
      DATABASE_CONNECTION_CLIENT_NAME: evolution
      DATABASE_SAVE_DATA_INSTANCE: "true"
      DATABASE_SAVE_DATA_NEW_MESSAGE: "true"
      DATABASE_SAVE_MESSAGE_UPDATE: "true"
      DATABASE_SAVE_DATA_CONTACTS: "true"
      DATABASE_SAVE_DATA_CHATS: "true"
      
      # Cache Configuration (Disabled)
      CACHE_REDIS_ENABLED: "false"
      CACHE_LOCAL_ENABLED: "false"
      
      # WhatsApp Configuration
      CONFIG_SESSION_PHONE_CLIENT: Rozare
      CONFIG_SESSION_PHONE_NAME: Chrome
      
      # QR Code Configuration
      QRCODE_LIMIT: 30
      QRCODE_COLOR: "#000000"
      
      # Logging
      LOG_LEVEL: INFO
      LOG_COLOR: "true"
      
      # Instance Management
      DEL_INSTANCE: "false"
      
      # Webhook Configuration
      WEBHOOK_GLOBAL_ENABLED: "false"
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    networks:
      - evolution-network
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
    driver: local
  evolution_instances:
    driver: local
  evolution_store:
    driver: local

networks:
  evolution-network:
    driver: bridge
```

**Save and exit**:
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### Step 3: Start Evolution API

```bash
# Start services
docker compose up -d

# Check if containers are running
docker compose ps

# View logs
docker compose logs -f evolution-api
```

**Wait for this message in logs:**
```
Welcome to the Evolution API, it is working!
```

Press `Ctrl + C` to stop viewing logs.

### Step 4: Test Evolution API

```bash
# Test API (replace YOUR_PUBLIC_IP with your actual IP)
curl http://YOUR_PUBLIC_IP:8080/

# You should see:
# {"status":200,"message":"Welcome to the Evolution API, it is working!","version":"2.1.0"}
```

**🎉 If you see this message, Evolution API is running successfully!**

---

## Part 8: Update Backend Configuration (5 minutes)

Now update your Heroku backend to use Oracle Cloud Evolution API:

### Step 1: Update Heroku Environment Variable

```bash
# On your local machine (not SSH)
heroku config:set EVOLUTION_API_URL=http://YOUR_PUBLIC_IP:8080 -a tortrose-backend
```

Replace `YOUR_PUBLIC_IP` with your Oracle Cloud instance IP.

### Step 2: Update Local Backend .env

Update `Backend/.env`:

```env
EVOLUTION_API_URL=http://YOUR_PUBLIC_IP:8080
EVOLUTION_API_KEY=rozareplatform
EVOLUTION_INSTANCE_NAME=rozare-main
```

---

## Part 9: Test WhatsApp Connection (5 minutes)

### Step 1: Test from Command Line

```bash
# Create WhatsApp instance
curl -X POST http://YOUR_PUBLIC_IP:8080/instance/create \
  -H "apikey: rozareplatform" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "rozare-main",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'

# Connect to generate QR code
curl -X GET http://YOUR_PUBLIC_IP:8080/instance/connect/rozare-main \
  -H "apikey: rozareplatform"

# Check instance status
curl -X GET http://YOUR_PUBLIC_IP:8080/instance/fetchInstances \
  -H "apikey: rozareplatform"
```

### Step 2: Test from Admin Panel

1. Go to https://www.rozare.com/admin
2. Navigate to WhatsApp settings
3. Click **"Link WhatsApp"**
4. **QR code should appear!** 📱
5. Scan with WhatsApp mobile app

---

## Part 10: Production Optimizations (Optional)

### Enable Automatic Restarts

```bash
# Services already have restart: always in docker-compose.yml
# They will auto-restart on VM reboot

# To make sure Docker starts on boot:
sudo systemctl enable docker
```

### Monitor Services

```bash
# View all logs
docker compose logs -f

# View only Evolution API logs
docker compose logs -f evolution-api

# View only PostgreSQL logs
docker compose logs -f postgres

# Check resource usage
docker stats
```

### Backup Database

```bash
# Create backup script
nano ~/backup-evolution.sh
```

Paste:

```bash
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec evolution-postgres pg_dump -U evolution evolution > $BACKUP_DIR/evolution_$DATE.sql
echo "Backup created: $BACKUP_DIR/evolution_$DATE.sql"
```

Make executable:

```bash
chmod +x ~/backup-evolution.sh

# Run backup
~/backup-evolution.sh
```

---

## 🔧 Troubleshooting

### Issue: Can't connect to VM via SSH

**Solution:**
```bash
# Check key permissions
chmod 400 ~/.ssh/oracle-key.pem

# Try verbose mode to see error
ssh -v -i ~/.ssh/oracle-key.pem ubuntu@YOUR_PUBLIC_IP
```

### Issue: Can't access Evolution API from browser

**Solution:**
```bash
# Check if containers are running
docker compose ps

# Check firewall
sudo ufw status

# Check Oracle Cloud security list (Part 3)
```

### Issue: Evolution API not starting

**Solution:**
```bash
# View logs
docker compose logs evolution-api

# Restart services
docker compose restart

# Rebuild if needed
docker compose down
docker compose up -d
```

### Issue: QR code not generating

**Solution:**
```bash
# Check Evolution API logs
docker compose logs -f evolution-api

# Delete and recreate instance
curl -X DELETE http://YOUR_PUBLIC_IP:8080/instance/delete/rozare-main \
  -H "apikey: rozareplatform"

# Then create again (see Part 9)
```

---

## 📊 Useful Commands

### Docker Management

```bash
# Stop all services
docker compose down

# Start all services
docker compose up -d

# Restart specific service
docker compose restart evolution-api

# View logs
docker compose logs -f

# Update Evolution API to new version
docker compose pull evolution-api
docker compose up -d evolution-api
```

### System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check Docker resource usage
docker stats
```

### Database Management

```bash
# Connect to PostgreSQL
docker exec -it evolution-postgres psql -U evolution

# Inside PostgreSQL:
\dt              # List tables
\q               # Quit
```

---

## 🎯 Final Checklist

- ✅ Oracle Cloud VM created and running
- ✅ Firewall rules configured (Oracle + Ubuntu)
- ✅ Docker and Docker Compose installed
- ✅ Evolution API running on port 8080
- ✅ PostgreSQL database connected
- ✅ Backend updated with new Evolution API URL
- ✅ WhatsApp QR code generating successfully
- ✅ WhatsApp connected and working

---

## 📝 Important Information to Save

**Oracle Cloud VM:**
- Public IP: `YOUR_PUBLIC_IP`
- SSH Key: `~/.ssh/oracle-key.pem`
- SSH Command: `ssh -i ~/.ssh/oracle-key.pem ubuntu@YOUR_PUBLIC_IP`

**Evolution API:**
- URL: `http://YOUR_PUBLIC_IP:8080`
- API Key: `rozareplatform`
- Instance Name: `rozare-main`

**Database:**
- Type: PostgreSQL
- User: `evolution`
- Password: `evolution_secure_password_2024`
- Database: `evolution`

**Docker:**
- Location: `~/evolution-api/`
- Compose file: `~/evolution-api/docker-compose.yml`
- Start: `docker compose up -d`
- Stop: `docker compose down`
- Logs: `docker compose logs -f`

---

## 🚀 Next Steps

1. **Test thoroughly** - Make sure WhatsApp QR code works
2. **Set up SSL** (Optional) - Use Nginx + Let's Encrypt for HTTPS
3. **Configure backups** - Run backup script daily
4. **Monitor logs** - Check logs regularly for issues
5. **Update regularly** - Keep Evolution API updated

---

## 💡 Tips

- **Keep your SSH key safe** - Without it, you can't access your VM
- **Monitor disk space** - Free tier has 50GB, monitor usage
- **Check logs regularly** - `docker compose logs -f`
- **Backup database** - Run backup script weekly
- **Update Evolution API** - Check for updates monthly

---

## 🆘 Need Help?

If you encounter issues:

1. Check logs: `docker compose logs -f evolution-api`
2. Check container status: `docker compose ps`
3. Check firewall: `sudo ufw status`
4. Restart services: `docker compose restart`
5. Check Oracle Cloud console for VM status

---

**You're all set! Evolution API is now running professionally on Oracle Cloud Free Tier.** 🎉
