const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const StoreTrust = require('../models/StoreTrust');
const Store = require('../models/Store');

// @desc    Trust a store
// @route   POST /api/stores/:storeId/trust
// @access  Private
const trustStore = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.id || req.user._id;

  // Validate store ID
  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    res.status(400);
    throw new Error('Invalid store ID');
  }

  // Check if store exists
  const store = await Store.findById(storeId);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }

  // Check if already trusted
  const existingTrust = await StoreTrust.findOne({ user: userId, store: storeId });
  if (existingTrust) {
    res.status(400);
    throw new Error('You have already trusted this store');
  }

  // Create trust relationship
  await StoreTrust.create({
    user: userId,
    store: storeId
  });

  // Atomically increment trust count
  const updatedStore = await Store.findByIdAndUpdate(
    storeId,
    { $inc: { trustCount: 1 } },
    { new: true }
  );

  res.status(201).json({
    success: true,
    message: 'Store trusted successfully',
    data: {
      isTrusted: true,
      trustCount: updatedStore.trustCount
    }
  });
});

// @desc    Untrust a store
// @route   DELETE /api/stores/:storeId/trust
// @access  Private
const untrustStore = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.id || req.user._id;

  // Validate store ID
  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    res.status(400);
    throw new Error('Invalid store ID');
  }

  // Check if store exists
  const store = await Store.findById(storeId);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }

  // Check if trust exists
  const existingTrust = await StoreTrust.findOne({ user: userId, store: storeId });
  if (!existingTrust) {
    res.status(400);
    throw new Error('You have not trusted this store');
  }

  // Remove trust relationship
  await StoreTrust.deleteOne({ user: userId, store: storeId });

  // Get current store to check count
  const currentStore = await Store.findById(storeId);
  
  // Decrement trust count, but don't go below 0
  const newCount = Math.max(0, (currentStore.trustCount || 0) - 1);
  const updatedStore = await Store.findByIdAndUpdate(
    storeId,
    { trustCount: newCount },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Store untrusted successfully',
    data: {
      isTrusted: false,
      trustCount: updatedStore.trustCount
    }
  });
});

// @desc    Get trust status for a store
// @route   GET /api/stores/:storeId/trust-status
// @access  Private
const getTrustStatus = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.id || req.user._id;

  // Validate store ID
  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    res.status(400);
    throw new Error('Invalid store ID');
  }

  // Check if store exists
  const store = await Store.findById(storeId);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }

  // Check if user trusts this store
  const trust = await StoreTrust.findOne({ user: userId, store: storeId });

  res.status(200).json({
    success: true,
    data: {
      isTrusted: !!trust,
      trustCount: store.trustCount
    }
  });
});

// @desc    Get all stores trusted by user
// @route   GET /api/stores/trusted
// @access  Private
const getTrustedStores = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  // Find all trust relationships for this user
  const trusts = await StoreTrust.find({ user: userId })
    .populate({
      path: 'store',
      select: 'storeName storeSlug description logo trustCount verification'
    })
    .sort({ createdAt: -1 });

  // Filter out any trusts where the store was deleted
  const trustedStores = trusts
    .filter(trust => trust.store)
    .map(trust => ({
      _id: trust.store._id,
      storeName: trust.store.storeName,
      storeSlug: trust.store.storeSlug,
      description: trust.store.description,
      logo: trust.store.logo,
      trustCount: trust.store.trustCount,
      verification: trust.store.verification,
      trustedAt: trust.createdAt
    }));

  res.status(200).json({
    success: true,
    data: {
      trustedStores,
      count: trustedStores.length
    }
  });
});

module.exports = {
  trustStore,
  untrustStore,
  getTrustStatus,
  getTrustedStores
};
