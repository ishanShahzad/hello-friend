const mongoose = require('mongoose');

const spinResultSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        discount: {
            type: Number,
            required: true
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed', 'free'],
            required: true
        },
        label: {
            type: String,
            required: true
        },
        selectedProducts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        hasCheckedOut: {
            type: Boolean,
            default: false
        },
        isWinner: {
            type: Boolean,
            default: null // null means not determined yet
        },
        expiresAt: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Index to automatically delete expired documents
spinResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SpinResult', spinResultSchema);
