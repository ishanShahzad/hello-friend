// Middleware to detect and handle subdomain routing
const Store = require('../models/Store');

const subdomainDetector = async (req, res, next) => {
    try {
        const host = req.get('host') || '';
        const parts = host.split('.');
        
        // Check if it's a subdomain (e.g., storename.rozare.com)
        // Assuming main domain is rozare.com (2 parts)
        if (parts.length > 2) {
            const subdomain = parts[0];
            
            // Skip common subdomains
            if (['www', 'api', 'admin', 'app'].includes(subdomain.toLowerCase())) {
                return next();
            }
            
            // Find store by slug matching subdomain - ONLY verified stores get subdomain routing
            const store = await Store.findOne({ 
                storeSlug: subdomain.toLowerCase(),
                isActive: true,
                'verification.isVerified': true
            });
            
            if (store) {
                // Attach store info to request
                req.subdomainStore = store;
            }
        }
        
        next();
    } catch (error) {
        console.error('Subdomain detection error:', error);
        next();
    }
};

module.exports = subdomainDetector;
