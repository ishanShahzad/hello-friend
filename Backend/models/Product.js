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
        tags: [String],
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Track who created the product
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