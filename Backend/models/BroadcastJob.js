const mongoose = require('mongoose');

/**
 * Admin-authored broadcast job. The dispatcher polls for due jobs (`status: 'scheduled'`
 * and `nextRunAt <= now`), fans them out into Notification docs + Expo pushes, then
 * either marks them `sent` (one-shot) or computes the next `nextRunAt` (recurring).
 */
const broadcastJobSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, maxlength: 140 },
        body: { type: String, required: true, maxlength: 1000 },
        category: {
            type: String,
            enum: ['announcement', 'promo', 'order', 'system', 'seller'],
            default: 'announcement',
        },
        linkTo: { type: String, default: '' },

        // Targeting — combine `audience` with optional explicit user IDs.
        // 'all_users'   = role === 'user'
        // 'all_sellers' = role === 'seller'
        // 'both'        = role in ['user','seller']
        // 'specific'    = only userIds[]
        audience: {
            type: String,
            enum: ['all_users', 'all_sellers', 'both', 'specific'],
            default: 'all_users',
        },
        userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

        // Schedule
        scheduleType: {
            type: String,
            enum: ['immediate', 'one_time', 'recurring'],
            default: 'immediate',
        },
        // For 'recurring': how often to repeat after the first run.
        recurrence: {
            type: String,
            enum: ['none', 'daily', 'weekly', 'monthly'],
            default: 'none',
        },
        nextRunAt: { type: Date, index: true },
        // Optional stop date for recurring jobs; null = forever (until cancelled).
        endsAt: { type: Date, default: null },

        status: {
            type: String,
            enum: ['scheduled', 'sending', 'sent', 'cancelled', 'failed'],
            default: 'scheduled',
            index: true,
        },
        lastRunAt: { type: Date },
        runCount: { type: Number, default: 0 },
        lastError: { type: String, default: '' },
        // Per-run delivery stats (sum across runs for recurring).
        stats: {
            recipients: { type: Number, default: 0 },
            pushSent: { type: Number, default: 0 },
        },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

broadcastJobSchema.index({ status: 1, nextRunAt: 1 });

module.exports = mongoose.model('BroadcastJob', broadcastJobSchema);
