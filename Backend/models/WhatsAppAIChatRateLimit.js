const mongoose = require('mongoose');

/**
 * WhatsApp AI Chat Rate Limit
 * ────────────────────────────
 * Per-user rate limiting for AI chat via WhatsApp.
 * Prevents abuse by capping messages per hour per user.
 * Documents auto-expire after 2 hours via TTL index.
 */
const whatsAppAIChatRateLimitSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    phone: { type: String, required: true },
    instance: { type: String, enum: ['main', 'seller'], required: true },
    messageCount: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
}, { timestamps: true });

// TTL index: auto-delete documents 2 hours after windowStart
whatsAppAIChatRateLimitSchema.index({ windowStart: 1 }, { expireAfterSeconds: 7200 });

// Compound index for fast lookup
whatsAppAIChatRateLimitSchema.index({ user: 1, instance: 1 });

module.exports = mongoose.model('WhatsAppAIChatRateLimit', whatsAppAIChatRateLimitSchema);
