const mongoose = require('mongoose');

const sellerNotificationLogSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerName: { type: String, default: '' },
    phone: { type: String, default: '' }, // masked for security
    category: { type: String, required: true, index: true },
    message: { type: String, default: '' },
    status: {
        type: String,
        enum: ['sent', 'failed', 'skipped'],
        default: 'sent',
        index: true,
    },
    reason: { type: String, default: '' }, // failure/skip reason
    error: { type: String, default: '' },
}, { timestamps: true });

// TTL: auto-delete logs older than 30 days to keep collection small
sellerNotificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('SellerNotificationLog', sellerNotificationLogSchema);
