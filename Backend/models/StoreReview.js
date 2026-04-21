const mongoose = require('mongoose');

const storeReviewSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 100, default: '' },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    // Optional: link to a verified purchase (Order id)
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    helpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Seller reply
    reply: {
      text: { type: String, trim: true, maxlength: 1000, default: '' },
      repliedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// One review per user per store
storeReviewSchema.index({ store: 1, user: 1 }, { unique: true });
storeReviewSchema.index({ store: 1, createdAt: -1 });

module.exports = mongoose.model('StoreReview', storeReviewSchema);
