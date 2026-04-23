# Deploy Evolution API to Oracle Cloud Free Tier

## Why Oracle Cloud?

**Oracle Cloud Free Tier is THE MOST GENEROUS:**
- ✅ **4 ARM VMs** (Ampere A1) - 24GB RAM total
- ✅ **200GB storage**
- ✅ **10TB bandwidth/month**
- ✅ **ALWAYS FREE** - No expiration
- ✅ **No sleep** - Runs 24/7
- ✅ **Can run multiple apps**

**Perfect for:**
- Production workloads
- Multiple services
- Long-term free hosting
- High traffic apps

---

## Setup Time: 30-45 minutes

## Prerequisites

1. Oracle Cloud account (sign up at https://cloud.oracle.com)
2. Credit card (for verification, won't be charged)
3. Basic Linux knowledge

---

## Step 1: Create Oracle Cloud Account

1. Go to https://cloud.oracle.com
2. Click "Start for free"
3. Fill in details (requires credit card for verification)
4. Verify email
5. Wait for account activation (5-10 minutes)

---

## Step 2: Create Compute Instance

1. Login to Oracle Cloud Console
2. Click "Create a VM instance"
3. Configure:
   - **Name**: `rozare-evolution-api`
   - **Image**: Ubuntu 22.04 (Minimal)
   - **Shape**: Ampere A1 (ARM)
   - **OCPUs**: 2
   - **Memory**: 12GB
   - **Boot volume**: 50GB
4. **Networking**:
   - Create new VCN (Virtual Cloud Network)
   - Assign public IP
5. **SSH Keys**:
   - Generate new key pair
   - Download private key (save it!)
6. Click "Create"

---

## Step 3: Configure Firewall

1. Go to your instance details
2. Click on the subnet
3. Click on the default security list
4. Add Ingress Rules:
   - **Port 80** (HTTP)
   - **Port 443** (HTTPS)
   - **Port 8080** (Evolution API)
   - Source: 0.0.0.0/0

---

## Step 4: Connect to Instance

```bash
# SSH into your instance
ssh -i /path/to/private-key.pem ubuntu@<your-instance-public-ip>

# Update system
sudo apt update && sudo apt upgrade -y
```

---

## Step 5: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify
docker --version
```

---

## Step 6: Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

---

## Step 7: Create Docker Compose File

```bash
# Create directory
mkdir -p ~/evolution-api
cd ~/evolution-api

# Create docker-compose.yml
nano docker-compose.yml
```

Paste this:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: evolution-postgres
    restart: always
    environment:
      POSTGRES_DB: evolution
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: your-secure-password-here
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - evolution-network

  evolution-api:
    image: atendai/evolution-api:v2.2.3
    container_name: evolution-api
    restart: always
    ports:
      - "8080:8080"
    environment:
      SERVER_TYPE: http
      SERVER_PORT: 8080
      AUTHENTICATION_API_KEY: rozareplatform
      AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: "true"
      DATABASE_ENABLED: "true"
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgresql://evolution:your-secure-password-here@postgres:5432/evolution
      DATABASE_CONNECTION_CLIENT_NAME: evolution
      CONFIG_SESSION_PHONE_CLIENT: Rozare
      CONFIG_SESSION_PHONE_NAME: Chrome
      QRCODE_LIMIT: 30
      LOG_LEVEL: ERROR
      DEL_INSTANCE: "false"
      WEBHOOK_GLOBAL_ENABLED: "false"
    depends_on:
      - postgres
    networks:
      - evolution-network

volumes:
  postgres_data:

networks:
  evolution-network:
    driver: bridge
```

Save and exit (Ctrl+X, Y, Enter)

---

## Step 8: Start Evolution API

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f evolution-api

# Check status
docker-compose ps
```

---

## Step 9: Configure Firewall on Instance

```bash
# Allow port 8080
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save
```

---

## Step 10: Test Evolution API

```bash
# Test locally
curl http://localhost:8080

# Test from outside
curl http://<your-instance-public-ip>:8080
```

---

## Step 11: Set Up Domain (Optional)

1. Go to your domain registrar (e.g., Cloudflare, Namecheap)
2. Add A record:
   - **Name**: `evolution` (or `api`)
   - **Value**: Your Oracle instance public IP
   - **TTL**: 300

Wait 5-10 minutes for DNS propagation.

---

## Step 12: Install Nginx + SSL (Optional but Recommended)

```bash
# Install Nginx
sudo apt install nginx -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Configure Nginx
sudo nano /etc/nginx/sites-available/evolution-api
```

Paste this:

```nginx
server {
    listen 80;
    server_name evolution.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/evolution-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d evolution.yourdomain.com
```

---

## Step 13: Update Backend

```bash
# Update Heroku backend
heroku config:set -a tortrose-backend \
  EVOLUTION_API_URL="https://evolution.yourdomain.com" \
  EVOLUTION_API_KEY="rozareplatform" \
  EVOLUTION_INSTANCE_NAME="rozare-main"

# Or if no domain:
heroku config:set -a tortrose-backend \
  EVOLUTION_API_URL="http://<oracle-instance-ip>:8080" \
  EVOLUTION_API_KEY="rozareplatform" \
  EVOLUTION_INSTANCE_NAME="rozare-main"

# Restart backend
heroku restart -a tortrose-backend
```

---

## Step 14: Test WhatsApp

1. Visit: https://www.rozare.com/admin-dashboard/whatsapp-verification
2. Click "Link WhatsApp"
3. QR code should appear!
4. Scan and connect

---

## Maintenance Commands

```bash
# View logs
docker-compose logs -f evolution-api

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update Evolution API
docker-compose pull
docker-compose up -d

# Backup database
docker exec evolution-postgres pg_dump -U evolution evolution > backup.sql
```

---

## Cost Breakdown

**Oracle Cloud Free Tier (Always Free):**
- 4 ARM VMs (24GB RAM total) - **FREE**
- 200GB storage - **FREE**
- 10TB bandwidth/month - **FREE**
- Public IP - **FREE**

**Your Usage:**
- 1 VM (2 OCPUs, 12GB RAM) - **FREE**
- 50GB storage - **FREE**
- ~100GB bandwidth/month - **FREE**

**Total Cost: $0/month FOREVER**

---

## Advantages Over Other Platforms

| Feature | Oracle Cloud | Fly.io | Railway | Heroku Eco |
|---------|--------------|--------|---------|------------|
| **Cost** | FREE forever | FREE (limited) | FREE | $5/month |
| **RAM** | 12GB | 256MB | 8GB | 512MB |
| **Storage** | 50GB | 3GB | 5GB | 512MB |
| **Bandwidth** | 10TB/month | 160GB/month | 100GB/month | Unlimited |
| **Sleep** | Never | Never | Never | Never |
| **Setup Time** | 45 min | 15 min | 10 min | 5 min |
| **Management** | Manual | Automatic | Automatic | Automatic |

**Winner for Free Tier: Oracle Cloud** (most resources)
**Winner for Ease: Fly.io** (fastest setup)

---

## Troubleshooting

### Can't connect to instance

```bash
# Check firewall
sudo iptables -L -n

# Check Docker
docker ps

# Check logs
docker-compose logs
```

### Evolution API not starting

```bash
# Check logs
docker-compose logs evolution-api

# Restart
docker-compose restart evolution-api

# Check database
docker-compose logs postgres
```

### Out of memory

```bash
# Check memory
free -h

# Increase swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Summary

**Oracle Cloud is best if:**
- ✅ You want maximum free resources
- ✅ You're comfortable with Linux/Docker
- ✅ You want long-term free hosting
- ✅ You can spend 45 minutes on setup

**Fly.io is best if:**
- ✅ You want quick setup (15 minutes)
- ✅ You don't want to manage servers
- ✅ You want automatic scaling
- ✅ Free tier is enough for your needs

**My recommendation: Try Fly.io first (15 min), then Oracle Cloud if you need more resources!**
