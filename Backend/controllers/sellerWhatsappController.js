const WhatsAppOTP = require('../models/WhatsAppOTP');
const WhatsAppConfig = require('../models/WhatsAppConfig');
const User = require('../models/User');
const sellerEvolutionClient = require('../services/whatsapp/sellerEvolutionClient');

// Configuration constants
const OTP_EXPIRY_MINUTES = 5;         // How long a code is valid for ENTRY
const VERIFIED_EXPIRY_MINUTES = 10;   // How long a verified record is valid for CONSUMPTION during signup
const MAX_ATTEMPTS = 5;               // Wrong OTP tries before the record is locked
const RATE_LIMIT_PER_HOUR = 3;        // Max OTPs sent per phone number per hour
const GLOBAL_RATE_LIMIT_PER_HOUR = 200; // Circuit-breaker for the whole endpoint

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Clean number to digits only
const cleanNumber = (number) => {
    return String(number || '').replace(/\D/g, '');
};

// Constant-time string comparison to avoid timing attacks on OTP
const safeEqual = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
};

/**
 * Helper (internal): Consume a verified OTP record during signup/becomeSeller.
 * Returns true if a valid, recently-verified record exists for the given number,
 * and deletes it to prevent replay. Returns false otherwise.
 *
 * This is how the backend PROVES the phone was actually verified via OTP,
 * without trusting a client-sent `whatsappVerified` boolean.
 */
exports.consumeVerifiedWhatsAppNumber = async (whatsappNumber) => {
    if (!whatsappNumber) return false;
    const digits = cleanNumber(whatsappNumber);
    if (!digits) return false;

    const cutoff = new Date(Date.now() - VERIFIED_EXPIRY_MINUTES * 60 * 1000);
    const record = await WhatsAppOTP.findOneAndDelete({
        number: digits,
        verified: true,
        verifiedAt: { $gte: cutoff },
    }).sort({ verifiedAt: -1 });

    return !!record;
};

/**
 * POST /api/seller-whatsapp/send-otp
 * Send a WhatsApp OTP for verification.
 * Body: { whatsappNumber } — E.164 format like "+923028588506"
 *
 * Rate-limited: 3 per number per hour, plus a global 200/hour circuit breaker.
 */
exports.sendWhatsAppOTP = async (req, res) => {
    try {
        const { whatsappNumber } = req.body;

        if (!whatsappNumber) {
            return res.status(400).json({ success: false, msg: 'WhatsApp number is required' });
        }

        const digits = cleanNumber(whatsappNumber);
        if (!digits || digits.length < 10) {
            return res.status(400).json({ success: false, msg: 'Invalid WhatsApp number format' });
        }

        // Check that the seller WhatsApp instance is connected
        const cfg = await WhatsAppConfig.findOne({ singletonKey: 'seller' });
        if (!cfg || cfg.status !== 'connected') {
            return res.status(503).json({
                success: false,
                msg: 'WhatsApp verification service is temporarily unavailable. Please try again later.'
            });
        }

        if (!sellerEvolutionClient.isConfigured()) {
            return res.status(503).json({
                success: false,
                msg: 'WhatsApp service is not configured. Please contact support.'
            });
        }

        // Per-number rate limit
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const perNumberCount = await WhatsAppOTP.countDocuments({
            number: digits,
            createdAt: { $gte: oneHourAgo }
        });
        if (perNumberCount >= RATE_LIMIT_PER_HOUR) {
            return res.status(429).json({
                success: false,
                msg: 'Too many verification attempts for this number. Please try again in an hour.'
            });
        }

        // Global rate limit (protects against attacker iterating random numbers)
        const globalCount = await WhatsAppOTP.countDocuments({ createdAt: { $gte: oneHourAgo } });
        if (globalCount >= GLOBAL_RATE_LIMIT_PER_HOUR) {
            console.warn('[sellerWhatsapp] Global OTP rate limit hit — possible abuse');
            return res.status(429).json({
                success: false,
                msg: 'Verification service is busy. Please try again in a few minutes.'
            });
        }

        // Check if number is on WhatsApp. If the check itself fails (null),
        // we bail rather than risk messaging invalid numbers and burning quota.
        const isOnWhatsApp = await sellerEvolutionClient.checkWhatsAppNumber(digits);
        if (isOnWhatsApp === false) {
            return res.status(400).json({
                success: false,
                msg: 'This number is not registered on WhatsApp. Please use a valid WhatsApp number.'
            });
        }
        if (isOnWhatsApp === null) {
            return res.status(503).json({
                success: false,
                msg: 'Unable to verify the number with WhatsApp right now. Please try again shortly.'
            });
        }

        // Generate OTP and send it FIRST; persist only on success to avoid
        // burning the per-hour quota when the gateway fails.
        const otp = generateOTP();
        const message = `*Rozare Verification*\n\nYour verification code is: *${otp}*\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.\nDo not share this code with anyone.`;

        try {
            await sellerEvolutionClient.sendText(digits, message);
        } catch (sendErr) {
            console.error('[sellerWhatsapp] sendText failed:', sendErr.message);
            return res.status(502).json({
                success: false,
                msg: 'Failed to send verification code. Please try again.'
            });
        }

        // Persist OTP after successful send
        const sellerId = req.user?.id || req.user?._id || null;
        await WhatsAppOTP.create({
            number: digits,
            otp,
            sellerId,
            attempts: 0,
            verified: false,
        });

        return res.status(200).json({
            success: true,
            msg: 'Verification code sent to your WhatsApp'
        });
    } catch (error) {
        console.error('[sellerWhatsapp] sendWhatsAppOTP error:', error.message);
        return res.status(500).json({
            success: false,
            msg: 'Failed to send verification code. Please try again.'
        });
    }
};

/**
 * POST /api/seller-whatsapp/verify-otp
 * Verify a WhatsApp OTP.
 * Body: { whatsappNumber, otp }
 *
 * On success:
 *   - If authenticated: updates User.sellerInfo.whatsappNumber + whatsappVerified.
 *   - If unauthenticated (signup flow): marks the OTP record as verified,
 *     which the subsequent registration endpoint will consume as proof.
 *
 * Brute-force protection: max 5 wrong attempts per OTP record; after that
 * the record is force-expired.
 */
exports.verifyWhatsAppOTP = async (req, res) => {
    try {
        const { whatsappNumber, otp } = req.body;

        if (!whatsappNumber || !otp) {
            return res.status(400).json({ success: false, msg: 'WhatsApp number and OTP are required' });
        }

        const digits = cleanNumber(whatsappNumber);
        const otpStr = String(otp).trim();
        if (!digits || !/^\d{6}$/.test(otpStr)) {
            return res.status(400).json({ success: false, msg: 'Invalid WhatsApp number or code format' });
        }

        // Find the most recent UNEXPIRED, UNVERIFIED OTP record for this number
        const otpExpiry = new Date(Date.now() - OTP_EXPIRY_MINUTES * 60 * 1000);
        const otpRecord = await WhatsAppOTP.findOne({
            number: digits,
            verified: false,
            createdAt: { $gte: otpExpiry },
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                msg: 'No pending verification. Please request a new code.'
            });
        }

        // Brute-force lockout
        if (otpRecord.attempts >= MAX_ATTEMPTS) {
            // Force-expire by setting createdAt to past (TTL will clean up)
            otpRecord.createdAt = new Date(0);
            await otpRecord.save().catch(() => null);
            return res.status(429).json({
                success: false,
                msg: 'Too many incorrect attempts. Please request a new code.'
            });
        }

        // Constant-time compare
        if (!safeEqual(otpRecord.otp, otpStr)) {
            otpRecord.attempts = (otpRecord.attempts || 0) + 1;
            await otpRecord.save().catch(() => null);
            const remaining = Math.max(0, MAX_ATTEMPTS - otpRecord.attempts);
            return res.status(400).json({
                success: false,
                msg: remaining > 0
                    ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
                    : 'Too many incorrect attempts. Please request a new code.',
            });
        }

        // Correct OTP — mark verified (but do NOT delete yet)
        otpRecord.verified = true;
        otpRecord.verifiedAt = new Date();
        await otpRecord.save();

        // For logged-in sellers: immediately update their user record AND delete
        // the record (no signup consumption needed).
        const sellerId = req.user?.id || req.user?._id || null;
        if (sellerId) {
            // Store in E.164 form consistently: '+' + digits
            const storedNumber = whatsappNumber.trim().startsWith('+')
                ? whatsappNumber.trim()
                : `+${digits}`;
            await User.findByIdAndUpdate(sellerId, {
                'sellerInfo.whatsappNumber': storedNumber,
                'sellerInfo.whatsappVerified': true,
            });
            await WhatsAppOTP.deleteOne({ _id: otpRecord._id });
        }
        // For signup flow: the verified record stays in the DB. The registration
        // endpoint (verifySellerOTPAndRegister / becomeSeller) will call
        // consumeVerifiedWhatsAppNumber() to atomically prove + consume it.

        return res.status(200).json({
            success: true,
            verified: true,
            msg: 'WhatsApp number verified successfully'
        });
    } catch (error) {
        console.error('[sellerWhatsapp] verifyWhatsAppOTP error:', error.message);
        return res.status(500).json({
            success: false,
            msg: 'Verification failed. Please try again.'
        });
    }
};

/**
 * GET /api/seller-whatsapp/prefs
 * Get seller's WhatsApp notification preferences
 */
exports.getWhatsAppPrefs = async (req, res) => {
    try {
        const sellerId = req.user?.id || req.user?._id;
        if (!sellerId) {
            return res.status(401).json({ success: false, msg: 'Authentication required' });
        }

        const user = await User.findById(sellerId).select('sellerInfo.whatsappNumber sellerInfo.whatsappVerified whatsappNotificationPrefs');
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            whatsappNumber: user.sellerInfo?.whatsappNumber || null,
            whatsappVerified: user.sellerInfo?.whatsappVerified || false,
            prefs: {
                enabled: user.whatsappNotificationPrefs?.enabled ?? true,
                newOrders: user.whatsappNotificationPrefs?.newOrders ?? true,
                orderUpdates: user.whatsappNotificationPrefs?.orderUpdates ?? true,
                subscriptionAlerts: user.whatsappNotificationPrefs?.subscriptionAlerts ?? true,
                bonusAlerts: user.whatsappNotificationPrefs?.bonusAlerts ?? true,
                storeAlerts: user.whatsappNotificationPrefs?.storeAlerts ?? true,
            }
        });
    } catch (error) {
        console.error('[sellerWhatsapp] getWhatsAppPrefs error:', error.message);
        return res.status(500).json({ success: false, msg: 'Failed to fetch preferences' });
    }
};

/**
 * PUT /api/seller-whatsapp/prefs
 * Update seller's WhatsApp notification preferences
 * Body: { enabled, newOrders, orderUpdates, subscriptionAlerts, bonusAlerts, storeAlerts }
 *
 * SECURITY: Explicitly allowlists keys to prevent arbitrary field overwrite.
 */
exports.updateWhatsAppPrefs = async (req, res) => {
    try {
        const sellerId = req.user?.id || req.user?._id;
        if (!sellerId) {
            return res.status(401).json({ success: false, msg: 'Authentication required' });
        }

        const { enabled, newOrders, orderUpdates, subscriptionAlerts, bonusAlerts, storeAlerts } = req.body;

        const update = {};
        if (typeof enabled === 'boolean') update['whatsappNotificationPrefs.enabled'] = enabled;
        if (typeof newOrders === 'boolean') update['whatsappNotificationPrefs.newOrders'] = newOrders;
        if (typeof orderUpdates === 'boolean') update['whatsappNotificationPrefs.orderUpdates'] = orderUpdates;
        if (typeof subscriptionAlerts === 'boolean') update['whatsappNotificationPrefs.subscriptionAlerts'] = subscriptionAlerts;
        if (typeof bonusAlerts === 'boolean') update['whatsappNotificationPrefs.bonusAlerts'] = bonusAlerts;
        if (typeof storeAlerts === 'boolean') update['whatsappNotificationPrefs.storeAlerts'] = storeAlerts;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ success: false, msg: 'No valid preferences provided' });
        }

        const user = await User.findByIdAndUpdate(sellerId, { $set: update }, { new: true })
            .select('whatsappNotificationPrefs');

        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            msg: 'WhatsApp notification preferences updated',
            prefs: {
                enabled: user.whatsappNotificationPrefs?.enabled ?? true,
                newOrders: user.whatsappNotificationPrefs?.newOrders ?? true,
                orderUpdates: user.whatsappNotificationPrefs?.orderUpdates ?? true,
                subscriptionAlerts: user.whatsappNotificationPrefs?.subscriptionAlerts ?? true,
                bonusAlerts: user.whatsappNotificationPrefs?.bonusAlerts ?? true,
                storeAlerts: user.whatsappNotificationPrefs?.storeAlerts ?? true,
            }
        });
    } catch (error) {
        console.error('[sellerWhatsapp] updateWhatsAppPrefs error:', error.message);
        return res.status(500).json({ success: false, msg: 'Failed to update preferences' });
    }
};
