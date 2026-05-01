# Evolution API v2.3.7 Professional Upgrade

## Objective
Upgrade from v1.7.4 (MongoDB) to v2.3.7 (PostgreSQL + Redis)

## Approach
Build Docker image from GitHub source (tag 2.3.7)

## Steps

### Phase 1: Cleanup ✅
- [ ] Stop and remove all v1.7.4 containers
- [ ] Remove old volumes (MongoDB data)
- [ ] Clean workspace

### Phase 2: Build v2.3.7 Image ⏳
- [ ] Clone Evolution API repository
- [ ] Checkout v2.3.7 tag
- [ ] Build Docker image
- [ ] Verify image

### Phase 3: Setup Infrastructure ⏳
- [ ] Create PostgreSQL 16 container
- [ ] Create Redis 7 container
- [ ] Configure networking
- [ ] Test connections

### Phase 4: Deploy Evolution API v2.3.7 ⏳
- [ ] Create docker-compose.yml
- [ ] Configure environment variables
- [ ] Start services
- [ ] Verify startup

### Phase 5: Verification ⏳
- [ ] Check API health
- [ ] Test instance creation
- [ ] Generate QR code
- [ ] Connect WhatsApp
- [ ] Test message sending

### Phase 6: Backend Integration ⏳
- [ ] Update backend code for v2.3.7 API format
- [ ] Test all endpoints
- [ ] Deploy to Heroku

## Status: STARTING
