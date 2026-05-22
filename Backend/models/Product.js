const mongoose = require('mongoose');

// Review schema definition
const reviewSchema = mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true },
    },
    { timestamps: true }
);

// Product schema definition
const productSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        discountedPrice: { type: Number, default: 0 }, 
        category: { type: String, required: true }, 
        brand: { type: String, required: true }, 
        stock: { type: Number, required: true, default: 0 }, 
        image: { type: String, required: true }, 
        images: [
            {
                url: { type: String, required: true },
            },
        ], 
        reviews: [reviewSchema],
        rating: { type: Number, default: 0 },
        numReviews: { type: Number, default: 0 },
        isFeatured: { type: Boolean, default: false },
        isBlocked: { type: Boolean, default: false, index: true },
        blockedAt: { type: Date, default: null },
        blockedReason: { type: String, default: '' },
        moderationStatus: {
            type: String,
            enum: ['approved', 'blocked'],
            default: 'approved',
            index: true,
        },
        moderationReason: { type: String, default: '' },
        moderationSignals: [{ type: String }],
        moderationReviewedAt: { type: Date, default: null },
        createdVia: {
            type: String,
            enum: ['manual', 'ai', 'admin', 'import'],
            default: 'manual',
            index: true,
        },
        tags: [String],
        colors: [{ type: String }], // Legacy: kept for backward compatibility
        // Flexible seller-defined option groups (Size, Color, Material, etc.)
        // Each group: { name: 'Size', values: ['S','M','L'], default: 'M' }
        optionGroups: [{
            _id: false,
            name: { type: String, required: true },
            values: [{ type: String }],
            default: { type: String, default: '' }, // Default selected value for this option group
        }],
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Track who created the product
        views: { type: Number, default: 0 }, // Track product views for popularity
        totalSales: { type: Number, default: 0 }, // Track total sales for ranking
        returnPolicy: {
            useStorePolicy: { type: Boolean, default: true }, // true = inherit from store
            returnsEnabled: { type: Boolean, default: false },
            returnDuration: { type: Number, default: 0 },
            refundType: { type: String, enum: ['none', 'full_refund', 'replacement_only', 'store_credit'], default: 'none' },
            warrantyEnabled: { type: Boolean, default: false },
            warrantyDuration: { type: Number, default: 0 },
            warrantyDescription: { type: String, default: '' },
        },
    },
    {
        timestamps: true
    }
);

productSchema.index({ moderationStatus: 1, isBlocked: 1 });

// Method to calculate rating based on reviews
productSchema.methods.calculateRating = function () {
    if (this.reviews.length > 0) {
        const totalRating = this.reviews.reduce((acc, review) => acc + review.rating, 0);
        this.rating = totalRating / this.reviews.length;
        this.numReviews = this.reviews.length;
    } else {
        this.rating = 0;
        this.numReviews = 0;
    }
};

module.exports = mongoose.model('Product', productSchema);
