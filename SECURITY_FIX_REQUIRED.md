# URGENT: Security Fix Required

## What Happened

GitGuardian detected an exposed PostgreSQL URL in your GitHub repository. I've removed it from the documentation, but you need to take additional security steps.

## Why This Happened

The PostgreSQL URL was accidentally committed to `DEPLOY_EVOLUTION_TO_HEROKU_MANUAL.md` when I was documenting the Heroku setup.

## Is This Why QR Wasn't Showing?

**NO.** The exposed database URL is a security issue, but it's NOT related to the QR code problem.

- **QR Issue**: Railway blocks WebSocket connections to WhatsApp servers
- **Security Issue**: Database credentials were exposed in public GitHub repo

These are two separate issues.

## Immediate Actions Required

### 1. Rotate the Exposed Database Credentials

The exposed database belongs to your Heroku Evolution API app. You need to rotate it:

```bash
# Delete the old database
heroku addons:destroy postgresql-elliptical-37602 -a rozare-evolution-api --confirm rozare-evolution-api

# Add a new database
heroku addons:create heroku-postgresql:essential-0 -a rozare-evolution-api

# Get the new database URL
heroku config:get DATABASE_URL -a rozare-evolution-api

# Set it as DATABASE_CONNECTION_URI
heroku config:set DATABASE_CONNECTION_URI="<new database URL>" -a rozare-evolution-api
```

### 2. Check Git History

The exposed URL is still in your Git history. To completely remove it:

**Option A: Use BFG Repo-Cleaner (Recommended)**
```bash
# Install BFG
brew install bfg  # macOS

# Clone a fresh copy
git clone --mirror https://github.com/Salman-here/Tortrose.git

# Remove the exposed URL from history
bfg --replace-text passwords.txt Tortrose.git

# Force push
cd Tortrose.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

**Option B: Contact GitHub Support**
- Go to https://github.com/Salman-here/Tortrose/security
- Report the exposed credential
- GitHub will help you remove it from history

### 3. Enable Secret Scanning

1. Go to your repository settings
2. Navigate to "Security & analysis"
3. Enable:
   - Dependency graph
   - Dependabot alerts
   - Secret scanning

### 4. Use .env Files Properly

**Never commit these files:**
- `.env`
- `.env.local`
- `.env.production`
- Any file with credentials

**Always use:**
- `.env.example` (with placeholder values)
- Environment variables on hosting platforms (Heroku, Vercel, Railway)

### 5. Check Other Repositories

If you have the same credentials in other repos (like `ishanShahzad/hello-friend`), rotate them there too:

```bash
# Check hellofriend repo
cd /path/to/hello-friend
git log -p | grep "postgres://"
```

## What I've Done

✅ Removed the exposed URL from `DEPLOY_EVOLUTION_TO_HEROKU_MANUAL.md`
✅ Committed and pushed the fix
✅ Verified no other exposed credentials in markdown files

## What You Need to Do

1. ⚠️ **Rotate the Heroku PostgreSQL database** (see commands above)
2. ⚠️ **Remove from Git history** (use BFG or contact GitHub)
3. ✅ Enable secret scanning on your repository
4. ✅ Review all `.env` files are in `.gitignore`

## Prevention

Add this to your `.gitignore` if not already there:

```
# Environment variables
.env
.env.local
.env.production
.env.*.local

# Credentials
**/credentials.json
**/secrets.json
**/*-credentials.json
```

## Summary

- **QR Issue**: Not related to exposed database - it's a Railway network problem
- **Security Issue**: Database credentials exposed - needs rotation
- **Solution for QR**: Deploy Evolution API to Render.com (as discussed)
- **Solution for Security**: Rotate database + clean Git history

Both issues are separate and need different fixes!
