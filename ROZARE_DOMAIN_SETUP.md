# Rozare.com Domain Setup Guide

## Current Status
- Old domain: tortrose.com / www.tortrose.com
- New domain: rozare.com / www.rozare.com
- Backend: tortrose-backend-496a749db93a.herokuapp.com

## Steps to Complete Domain Migration

### 1. DNS Configuration (Your Domain Registrar)
Add these DNS records for **rozare.com**:

```
Type: A
Name: @ (or leave blank for root domain)
Value: 76.76.21.21 (Vercel IP)

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Note**: DNS propagation can take 24-48 hours. Check status at: https://dnschecker.org

### 2. Vercel Project Settings

#### A. Add Domain in Vercel Dashboard
1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your project (Frontend)
3. Go to **Settings** → **Domains**
4. Add both:
   - `rozare.com`
   - `www.rozare.com`
5. Vercel will show you DNS records to configure

#### B. Update Environment Variables in Vercel
Go to **Settings** → **Environment Variables** and update:

```
VITE_API_URL=https://tortrose-backend-496a749db93a.herokuapp.com
```

Make sure this is set for **Production** environment.

After updating, **redeploy** your frontend.

### 3. Update Backend CORS Configuration

The backend needs to allow requests from the new domain. Update Heroku config:

```bash
heroku config:set FRONTEND_URL=https://www.rozare.com --app tortrose-backend
```

### 4. Update Backend Environment Variables on Heroku

```bash
# Update frontend URL
heroku config:set FRONTEND_URL=https://www.rozare.com --app tortrose-backend

# Update Google OAuth callback (if using Google login)
heroku config:set GOOGLE_CALLBACK_URL=https://tortrose-backend-496a749db93a.herokuapp.com/api/auth/google/callback --app tortrose-backend
```

### 5. Update Branding in Backend
The backend still references "Tortrose" in emails. Update:

```bash
heroku config:set BREVO_SENDER_NAME=Rozare --app tortrose-backend
heroku config:set BREVO_SENDER_EMAIL=no-reply@rozare.com --app tortrose-backend
```

### 6. Verify CORS in Backend Code
The backend `server.js` should allow the new domain. Check that these origins are included:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://www.rozare.com',
  'https://rozare.com',
  process.env.FRONTEND_URL
].filter(Boolean);
```

### 7. Testing Checklist

After DNS propagates and Vercel is configured:

- [ ] Visit https://rozare.com - should load the site
- [ ] Visit https://www.rozare.com - should load the site
- [ ] Test API calls (login, products, etc.)
- [ ] Check browser console for CORS errors
- [ ] Test Google OAuth login
- [ ] Verify email sending works

### 8. Common Issues

#### "This site can't be reached"
- DNS not propagated yet (wait 24-48 hours)
- DNS records incorrect (double-check A and CNAME records)

#### "404 - Not Found" on Vercel
- Domain not added in Vercel dashboard
- Need to redeploy after adding domain

#### CORS Errors
- Backend FRONTEND_URL not updated
- Backend CORS allowedOrigins not including new domain
- Need to restart Heroku dyno: `heroku restart --app tortrose-backend`

#### API Calls Failing
- VITE_API_URL not set in Vercel environment variables
- Need to redeploy frontend after setting env vars

### 9. Quick Commands

```bash
# Check current Heroku config
heroku config --app tortrose-backend

# Update frontend URL
heroku config:set FRONTEND_URL=https://www.rozare.com --app tortrose-backend

# Restart Heroku
heroku restart --app tortrose-backend

# Check DNS propagation
# Visit: https://dnschecker.org and enter rozare.com
```

### 10. After Everything Works

Update these files in the codebase:
- [ ] `Frontend/.env.production.example`
- [ ] `Backend/.env.example`
- [ ] All documentation files mentioning tortrose.com
- [ ] README files
- [ ] Package.json descriptions

## Current Backend Configuration Needed

Run these commands now:

```bash
heroku config:set FRONTEND_URL=https://www.rozare.com --app tortrose-backend
heroku config:set BREVO_SENDER_NAME=Rozare --app tortrose-backend
heroku restart --app tortrose-backend
```
