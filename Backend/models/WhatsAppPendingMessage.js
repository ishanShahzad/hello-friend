const mongoose = require('mongoose');

const whatsAppPendingMessageSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderId: { type: String, required: true, index: true }, // human-readable ORD-xxxx
    confirmationToken: { type: String, required: true }, // mirror of order.confirmation.token

    phone: { type: String, required: true, index: true }, // normalized E.164 digits, e.g. 9230012345678
    buyerName: { type: String, default: '' },

    // Evolution API artifacts
    summaryMessageId: { type: String, default: '' },
    pollMessageId: { type: String, default: '', index: true },

    status: {
        type: String,
        enum: ['queued', 'sending', 'sent', 'voted_yes', 'voted_no', 'failed', 'failed_invalid_number', 'expired'],
        default: 'queued',
        index: true,
    },

    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },

    sentAt: { type: Date, default: null },
    repliedAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: () => new Date() }, // for queue scheduling
}, { timestamps: true });

whatsAppPendingMessageSchema.index({ status: 1, nextAttemptAt: 1 });

module.exports = mongoose.model('WhatsAppPendingMessage', whatsAppPendingMessageSchema);
