const SellerSubscription = require('../models/SellerSubscription');

// Middleware to check if seller's subscription is active (not blocked)
const subscriptionCheck = async (req, res, next) => {
    try {
        // Only apply to sellers
        if (req.user?.role !== 'seller') return next();

        const sub = await SellerSubscription.findOne({ seller: req.user.id });

        // No subscription record = new seller, let them through (will be initialized)
        if (!sub) return next();

        // Check if trial expired
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

        if (sub.status === 'blocked') {
            return res.status(403).json({
                msg: 'Your subscription has expired. Please subscribe to a paid plan to continue.',
                subscriptionBlocked: true,
                blockedReason: sub.blockedReason,
            });
        }

        // Attach subscription info to request
        req.subscription = sub;
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        next(); // Don't block on errors
    }
};

module.exports = subscriptionCheck;
