// Middleware to detect and handle subdomain routing
const Store = require('../models/Store');

const subdomainDetector = async (req, res, next) => {
    try {
        let subdomain = null;

        // Priority 1: Explicit ?slug= query param (used when frontend is on a different host)
        if (req.query.slug) {
            subdomain = req.query.slug.toLowerCase().trim();
        }

        // Priority 2: X-Store-Subdomain header (alternative way to pass it)
        if (!subdomain && req.get('x-store-subdomain')) {
            subdomain = req.get('x-store-subdomain').toLowerCase().trim();
        }

        // Priority 3: Detect from Host header (works when backend is on same domain)
        if (!subdomain) {
            const host = req.get('host') || '';
            const parts = host.split('.');
            if (parts.length > 2) {
                const hostSub = parts[0].toLowerCase();
                if (!['www', 'api', 'admin', 'app'].includes(hostSub)) {
                    subdomain = hostSub;
                }
            }
        }

        if (!subdomain) {
            return next();
        }

        // Skip common subdomains
        if (['www', 'api', 'admin', 'app'].includes(subdomain)) {
            return next();
        }

        // First try to find an active, verified store
        const store = await Store.findOne({ 
            storeSlug: subdomain,
            isActive: true,
            'verification.isVerified': true
        });
        
        if (store) {
            req.subdomainStore = store;
        } else {
            // Check if the store exists but is blocked/inactive
            const blockedStore = await Store.findOne({ storeSlug: subdomain });
            if (blockedStore && !blockedStore.isActive) {
                // Lazy release: free the slug if blocked + past removal window + not purchased
                const now = new Date();
                const purchased = blockedStore.subdomainPurchase?.isPurchased &&
                    blockedStore.subdomainPurchase?.expiresAt &&
                    new Date(blockedStore.subdomainPurchase.expiresAt) > now;
                const removeAt = blockedStore.subdomainPurchase?.removalScheduledAt;
                if (!purchased && removeAt && new Date(removeAt) <= now) {
                    blockedStore.storeSlug = `released-${blockedStore._id.toString().slice(-8)}-${Date.now()}`;
                    blockedStore.subdomainPurchase = {
                        ...(blockedStore.subdomainPurchase?.toObject?.() || {}),
                        removalScheduledAt: null,
                    };
                    await blockedStore.save();
                    // Slug is now free — fall through as "not found"
                } else {
                    req.subdomainStoreBlocked = true;
                    req.subdomainStoreName = blockedStore.storeName;
                }
            }
        }
        
        next();
    } catch (error) {
        console.error('Subdomain detection error:', error);
        next();
    }
};

module.exports = subdomainDetector;
