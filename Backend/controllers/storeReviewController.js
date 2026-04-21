const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const StoreReview = require('../models/StoreReview');
const Store = require('../models/Store');

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

// Build aggregate stats {average, count, distribution: {1..5}}
const buildSummary = async (storeId) => {
  const reviews = await StoreReview.find({ store: storeId }).select('rating');
  const count = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  reviews.forEach((r) => {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    sum += r.rating;
  });
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  return { average, count, distribution };
};

// GET /api/store-reviews/:storeId — public
exports.getStoreReviews = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  if (!validId(storeId)) return res.status(400).json({ msg: 'Invalid store ID' });

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const skip = parseInt(req.query.skip, 10) || 0;

  const [reviews, summary] = await Promise.all([
    StoreReview.find({ store: storeId })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    buildSummary(storeId),
  ]);

  res.json({ reviews, summary });
});

// GET /api/store-reviews/:storeId/summary — public lightweight aggregate
exports.getStoreReviewSummary = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  if (!validId(storeId)) return res.status(400).json({ msg: 'Invalid store ID' });
  const summary = await buildSummary(storeId);
  res.json({ summary });
});

// POST /api/store-reviews/summary/bulk — body: { storeIds: [] } — for listings
exports.getBulkStoreReviewSummaries = asyncHandler(async (req, res) => {
  const { storeIds = [] } = req.body || {};
  const ids = storeIds.filter(validId).map((id) => new mongoose.Types.ObjectId(id));
  if (ids.length === 0) return res.json({ summaries: {} });

  const agg = await StoreReview.aggregate([
    { $match: { store: { $in: ids } } },
    {
      $group: {
        _id: '$store',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const summaries = {};
  ids.forEach((id) => {
    summaries[id.toString()] = { average: 0, count: 0 };
  });
  agg.forEach((row) => {
    summaries[row._id.toString()] = {
      average: Math.round(row.average * 10) / 10,
      count: row.count,
    };
  });

  res.json({ summaries });
});

// POST /api/store-reviews/:storeId — protected
exports.createOrUpdateReview = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.id || req.user._id;
  const { rating, title = '', comment = '' } = req.body;

  if (!validId(storeId)) return res.status(400).json({ msg: 'Invalid store ID' });
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ msg: 'Rating must be between 1 and 5' });
  }
  if (typeof comment !== 'string' || comment.length > 1000) {
    return res.status(400).json({ msg: 'Comment too long (max 1000 chars)' });
  }
  if (typeof title !== 'string' || title.length > 100) {
    return res.status(400).json({ msg: 'Title too long (max 100 chars)' });
  }

  const store = await Store.findById(storeId);
  if (!store) return res.status(404).json({ msg: 'Store not found' });
  if (store.seller.toString() === userId.toString()) {
    return res.status(403).json({ msg: 'You cannot review your own store' });
  }

  // Optional: verify purchase
  let isVerifiedPurchase = false;
  try {
    const Order = require('../models/Order');
    const purchased = await Order.exists({ user: userId, 'orderItems.sellerId': store.seller });
    isVerifiedPurchase = !!purchased;
  } catch (_) {}

  const review = await StoreReview.findOneAndUpdate(
    { store: storeId, user: userId },
    {
      $set: {
        rating: numRating,
        title: title.trim(),
        comment: comment.trim(),
        isVerifiedPurchase,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('user', 'username avatar');

  const summary = await buildSummary(storeId);
  res.status(201).json({ review, summary });
});

// DELETE /api/store-reviews/:reviewId — protected (owner or admin)
exports.deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id || req.user._id;
  if (!validId(reviewId)) return res.status(400).json({ msg: 'Invalid review ID' });

  const review = await StoreReview.findById(reviewId);
  if (!review) return res.status(404).json({ msg: 'Review not found' });

  const isOwner = review.user.toString() === userId.toString();
  const isAdmin = req.user.isAdmin || req.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ msg: 'Not authorized' });

  await review.deleteOne();
  const summary = await buildSummary(review.store);
  res.json({ msg: 'Review deleted', summary });
});

// POST /api/store-reviews/:reviewId/helpful — toggle helpful
exports.toggleHelpful = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id || req.user._id;
  if (!validId(reviewId)) return res.status(400).json({ msg: 'Invalid review ID' });

  const review = await StoreReview.findById(reviewId);
  if (!review) return res.status(404).json({ msg: 'Review not found' });

  const idx = review.helpfulBy.findIndex((u) => u.toString() === userId.toString());
  if (idx >= 0) {
    review.helpfulBy.splice(idx, 1);
    review.helpfulCount = Math.max(0, review.helpfulCount - 1);
  } else {
    review.helpfulBy.push(userId);
    review.helpfulCount += 1;
  }
  await review.save();
  res.json({ helpfulCount: review.helpfulCount, marked: idx < 0 });
});

// POST /api/store-reviews/:reviewId/reply — seller reply (must own store)
exports.replyToReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id || req.user._id;
  const { text } = req.body;
  if (!validId(reviewId)) return res.status(400).json({ msg: 'Invalid review ID' });
  if (!text || typeof text !== 'string' || text.length > 1000) {
    return res.status(400).json({ msg: 'Reply text required (max 1000 chars)' });
  }

  const review = await StoreReview.findById(reviewId);
  if (!review) return res.status(404).json({ msg: 'Review not found' });

  const store = await Store.findById(review.store);
  if (!store) return res.status(404).json({ msg: 'Store not found' });
  if (store.seller.toString() !== userId.toString()) {
    return res.status(403).json({ msg: 'Only the store owner can reply' });
  }

  review.reply = { text: text.trim(), repliedAt: new Date() };
  await review.save();
  res.json({ review });
});
