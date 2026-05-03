const mongoose = require('mongoose');

/**
 * WhatsApp OTP record.
 *
 * Lifecycle:
 *   1. sendWhatsAppOTP creates a record with otp + attempts=0 + verified=false
 *   2. verifyWhatsAppOTP validates the OTP and marks verified=true (does NOT delete)
 *      - After 5 wrong attempts, the record is forcibly expired (verified stays false)
 *   3. During signup (unauthenticated), the frontend can't directly mark the User
 *      as verified. Instead, the backend looks up a verified record for the
 *      claimed number during verifySellerOTPAndRegister / becomeSeller and only
 *      then sets sellerInfo.whatsappVerified = true on the new User.
 *   4. After consumption (User created with whatsappVerified=true), the record
 *      is deleted. The 5-minute TTL also cleans it up automatically.
 *
 * Why we don't just return a signed token: the verified record IS the server-side
 * proof. Client can't forge it because it's keyed by phone number — the signup
 * endpoint must submit the same number that was verified.
 */
const whatsAppOTPSchema = new mongoose.Schema({
    number: { type: String, required: true },  // digits only, e.g. "923028588506"
    otp: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null during signup
    attempts: { type: Number, default: 0 },     // brute-force counter
    verified: { type: Boolean, default: false }, // set true after correct OTP entry
    verifiedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, expires: 600 } // 10-minute TTL (longer to cover signup)
});

whatsAppOTPSchema.index({ number: 1, createdAt: -1 });
whatsAppOTPSchema.index({ number: 1, verified: 1 });

module.exports = mongoose.model('WhatsAppOTP', whatsAppOTPSchema);
