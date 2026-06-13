'use strict';

const Store = require('../models/Store');

const ACTIVE_STORE_QUERY = {
  isActive: true,
  blockedAt: null,
};

const normalizeId = (value) => {
  const id = value?._id || value;
  return id ? String(id) : '';
};

async function getActiveSellerIds(extraStoreFilter = {}) {
  const stores = await Store.find({ ...ACTIVE_STORE_QUERY, ...extraStoreFilter })
    .select('seller')
    .lean();
  return stores.map(store => store.seller).filter(Boolean);
}

function activeStoreQuery(extra = {}) {
  return { ...ACTIVE_STORE_QUERY, ...extra };
}

function applyActiveSellerProductFilter(productFilter = {}, activeSellerIds = []) {
  const visibilityFilter = {
    $or: [
      { seller: null },
      { seller: { $exists: false } },
      { seller: { $in: activeSellerIds } },
    ],
  };
  return {
    ...productFilter,
    $and: [
      ...(Array.isArray(productFilter.$and) ? productFilter.$and : []),
      visibilityFilter,
    ],
  };
}

async function publicProductFilterWithActiveStores(productFilter = {}, extraStoreFilter = {}) {
  const activeSellerIds = await getActiveSellerIds(extraStoreFilter);
  return applyActiveSellerProductFilter(productFilter, activeSellerIds);
}

async function isProductSellerPubliclyActive(sellerId) {
  const id = normalizeId(sellerId);
  if (!id) return true;
  return Boolean(await Store.exists(activeStoreQuery({ seller: id })));
}

async function findActiveStore(filter = {}, options = {}) {
  const query = activeStoreQuery(filter);
  let cursor = Store.findOne(query);
  if (options.select) cursor = cursor.select(options.select);
  if (options.populate) cursor = cursor.populate(options.populate);
  if (options.lean !== false) cursor = cursor.lean();
  return cursor;
}

module.exports = {
  ACTIVE_STORE_QUERY,
  activeStoreQuery,
  applyActiveSellerProductFilter,
  findActiveStore,
  getActiveSellerIds,
  isProductSellerPubliclyActive,
  publicProductFilterWithActiveStores,
};
