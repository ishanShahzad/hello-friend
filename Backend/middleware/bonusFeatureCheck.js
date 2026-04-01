const SellerSubscription = require('../models/SellerSubscription');

// Middleware to restrict access to bonus features after 6-month expiry
const bonusFeatureCheck = (featureName) => async (req, res, next) => {
    try {
        // Only apply to sellers
        if (req.user?.role !== 'seller') return next();

        const sub = await SellerSubscription.findOne({ seller: req.user.id });

        // No subscription = new seller on trial, allow access during trial
        if (!sub) return next();

        // Trial users get all features during trial
        if (sub.status === 'trial') return next();

        // Check if bonus features have expired
        if (sub.bonusExpiryDate && new Date() > sub.bonusExpiryDate) {
            // Auto-deactivate if still marked active
            if (sub.bonusFeaturesActive) {
                sub.bonusFeaturesActive = false;
                await sub.save();
            }

            return res.status(403).json({
                msg: `${featureName} is a premium feature. Your bonus period has expired. This feature will be available in upcoming premium plans.`,
                bonusExpired: true,
                featureName,
            });
        }

        // Bonus still active or subscribed — allow
        next();
    } catch (error) {
        console.error('Bonus feature check error:', error);
        next(); // Don't block on errors
    }
};

module.exports = bonusFeatureCheck;
