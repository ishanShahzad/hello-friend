# Subdomain Setup Guide for Store Owners

## Overview
Store owners can now have their own subdomain: `storename.tortrose.com`

## Setup Steps

### 1. DNS Configuration (Namecheap)
1. Log into Namecheap
2. Go to Domain List → Manage → Advanced DNS
3. Add a new record:
   - **Type**: `CNAME Record`
   - **Host**: `*` (wildcard)
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: Automatic

### 2. Vercel Domain Configuration
1. Go to your Vercel project → Settings → Domains
2. Click "Add Domain"
3. Enter: `*.tortrose.com`
4. Follow Vercel's verification steps
5. Wait for DNS propagation (can take up to 48 hours, usually 10-30 minutes)

### 3. How It Works

**Backend:**
- Middleware detects subdomain from request hostname
- Looks up store by matching `storeSlug` to subdomain
- Serves store data and products via `/api/subdomain/*` endpoints

**Frontend:**
- App.jsx detects if user is on a subdomain
- Routes to `SubdomainStorePage` component instead of normal routes
- Fetches store data from subdomain API endpoints

**Example:**
- Store with slug `"awesome-shop"` → accessible at `awesome-shop.tortrose.com`
- Main site remains at `tortrose.com`
- Path-based URLs still work: `tortrose.com/store/awesome-shop`

### 4. Testing Locally

For local development, subdomain routing is disabled. Use path-based URLs:
- `http://localhost:5173/store/storename`

To test subdomains locally, you can:
1. Edit your `/etc/hosts` file (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows)
2. Add: `127.0.0.1 storename.localhost`
3. Access: `http://storename.localhost:5173`

### 5. Reserved Subdomains

These subdomains are reserved and won't route to stores:
- `www` → redirects to main site
- `api` → reserved for API
- `admin` → reserved for admin panel
- `app` → reserved for future use

### 6. Store Slug Requirements

- Automatically generated from store name
- Lowercase, alphanumeric, hyphens only
- Must be unique
- Example: "My Awesome Store" → `my-awesome-store`

## Features

✅ Automatic subdomain detection  
✅ SEO-friendly URLs  
✅ Custom branding for each store  
✅ Fallback to path-based URLs  
✅ Works with existing store pages  

## Troubleshooting

**Subdomain not working?**
1. Check DNS propagation: `nslookup storename.tortrose.com`
2. Verify wildcard domain is added in Vercel
3. Check store slug matches subdomain exactly
4. Clear browser cache and try incognito mode

**Store not found?**
- Ensure store is active (`isActive: true`)
- Verify store slug is correct
- Check backend logs for errors
