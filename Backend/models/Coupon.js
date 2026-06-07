const mongoose = require('mongoose');

const couponSchema = mongoose.Schema(
    {
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        code: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        // 'percentage' or 'fixed'
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            required: true,
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            uppercase: true,
            trim: true,
            default: 'USD',
        },
        // Which products: 'all' = all seller products, 'selected' = specific products
        applicableTo: {
            type: String,
            enum: ['all', 'selected'],
            default: 'all',
        },
        // If applicableTo is 'selected', list the product IDs
        applicableProducts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
        ],
        // Maximum number of times this coupon can be used (total across all users)
        maxUses: {
            type: Number,
            default: null, // null = unlimited
        },
        // How many times it has been used
        usedCount: {
            type: Number,
            default: 0,
        },
        // Max uses per single user
        maxUsesPerUser: {
            type: Number,
            default: 1,
        },
        // Track which users used it and how many times
        usedBy: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                count: { type: Number, default: 1 },
            },
        ],
        // Minimum order amount to apply this coupon (for the applicable products subtotal)
        minOrderAmount: {
            type: Number,
            default: 0,
        },
        // Maximum discount amount (caps the discount for percentage type)
        maxDiscountAmount: {
            type: Number,
            default: null, // null = no cap
        },
        // Validity period
        startDate: {
            type: Date,
            default: Date.now,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

// Ensure coupon code is unique per seller
couponSchema.index({ seller: 1, code: 1 }, { unique: true });

// Virtual to check if coupon is currently valid
couponSchema.virtual('isValid').get(function () {
    const now = new Date();
    return (
        this.isActive &&
        now >= this.startDate &&
        now <= this.expiryDate &&
        (this.maxUses === null || this.usedCount < this.maxUses)
    );
});

couponSchema.set('toJSON', { virtuals: true });
couponSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Coupon', couponSchema);
