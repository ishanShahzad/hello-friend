const SellerSubscription = require('../models/SellerSubscription');

// Middleware to check seller subscription status.
// Blocked sellers CAN still access their dashboard (add products, manage settings)
// but their store and products are hidden publicly.
const subscriptionCheck = async (req, res, next) => {
    try {
        // Only apply to sellers
        if (req.user?.role !== 'seller') return next();

        const sub = await SellerSubscription.findOne({ seller: req.user.id });

        // No subscription record = new seller, let them through (will be initialized)
        if (!sub) return next();

        // Check if trial expired — auto-block
        if (sub.status === 'trial') {
            const now = new Date();
            if (now > sub.trialEndDate) {
                sub.status = 'blocked';
                sub.blockedAt = now;
                sub.blockedReason = 'Trial period expired. Subscribe to reactivate your store.';
                await sub.save();

                const Store = require('../models/Store');
                await Store.findOneAndUpdate({ seller: req.user.id }, { isActive: false });
            }
        }

        // Check bonus features expiry
        if (sub.bonusFeaturesActive && sub.bonusExpiryDate && new Date() > sub.bonusExpiryDate) {
            sub.bonusFeaturesActive = false;
            await sub.save();
        }

        // Attach subscription info to request — seller can always proceed
        // The frontend uses this to show warnings/blocked UI, but doesn't block access
        req.subscription = sub;
        req.subscriptionBlocked = sub.status === 'blocked';
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        next(); // Don't block on errors
    }
};

module.exports = subscriptionCheck;
