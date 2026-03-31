const mongoose = require('mongoose');

const aiRateLimitSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ip: { type: String, default: null },
    messageCount: { type: Number, default: 0 },
    date: { type: String, required: true }, // YYYY-MM-DD
}, { timestamps: true });

// Compound index for efficient lookups
aiRateLimitSchema.index({ userId: 1, date: 1 });
aiRateLimitSchema.index({ ip: 1, date: 1 });

module.exports = mongoose.model('AIRateLimit', aiRateLimitSchema);
