const mongoose = require('mongoose');

/**
 * Admin WhatsApp Numbers
 * ──────────────────────
 * Stores phone numbers designated as "admin" for the seller WhatsApp instance.
 * When a message arrives on the seller instance from one of these numbers,
 * the AI chat treats the sender as an admin (full platform access).
 * All other numbers on the seller instance are treated as sellers.
 */
const adminWhatsAppNumberSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    label: { type: String, default: '' },           // optional friendly label e.g. "CEO Phone"
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Index for fast lookup during webhook processing
adminWhatsAppNumberSchema.index({ number: 1, isActive: 1 });

module.exports = mongoose.model('AdminWhatsAppNumber', adminWhatsAppNumberSchema);
