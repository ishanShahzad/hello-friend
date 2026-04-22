const mongoose = require('mongoose');

// Singleton config doc holding the current Evolution-API instance state
const whatsAppConfigSchema = new mongoose.Schema({
    singletonKey: { type: String, default: 'main', unique: true },

    status: {
        type: String,
        enum: ['disconnected', 'pending_qr', 'connecting', 'connected', 'error'],
        default: 'disconnected',
    },

    instanceName: { type: String, default: '' },
    linkedNumber: { type: String, default: '' }, // E.164, e.g. +9230012345678
    linkedAt: { type: Date, default: null },
    lastSeen: { type: Date, default: null },

    lastQrBase64: { type: String, default: '' },        // PNG data URL — kept for instant re-display
    lastQrFetchedAt: { type: Date, default: null },
    lastError: { type: String, default: '' },

    // Soft hourly cap to mitigate ban risk
    sentInLastHour: { type: Number, default: 0 },
    sentWindowStartedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppConfig', whatsAppConfigSchema);
