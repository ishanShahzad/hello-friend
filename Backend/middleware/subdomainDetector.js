// Middleware to detect and handle subdomain routing
const Store = require('../models/Store');

const subdomainDetector = async (req, res, next) => {
    try {
        const host = req.get('host') || '';
        const parts = host.split('.');
        
        // Check if it's a subdomain (e.g., storename.rozare.com)
        if (parts.length > 2) {
            const subdomain = parts[0];
            
            // Skip common subdomains
            if (['www', 'api', 'admin', 'app'].includes(subdomain.toLowerCase())) {
                return next();
            }
            
            // First try to find an active, verified store
            const store = await Store.findOne({ 
                storeSlug: subdomain.toLowerCase(),
                isActive: true,
                'verification.isVerified': true
            });
            
            if (store) {
                req.subdomainStore = store;
            } else {
                // Check if the store exists but is blocked/inactive
                const blockedStore = await Store.findOne({
                    storeSlug: subdomain.toLowerCase(),
                });
                if (blockedStore && !blockedStore.isActive) {
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
