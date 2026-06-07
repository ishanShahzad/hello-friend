'use strict';

const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const mongoose = require('mongoose');
const { CURRENCIES, normalizeCurrency, convertAmount } = require('./currencyService');
const { getProductCurrency, roundMoney } = require('./productPricingService');

const PRODUCT_CURRENCY_PENDING_STATUS = 'pending_conversion';
const PRODUCT_CURRENCY_ACTIVE_STATUS = 'active';
const SUPPORTED_PRODUCT_CURRENCIES = Object.keys(CURRENCIES);

const COUNTRY_CURRENCY = {
  pakistan: 'PKR',
  pk: 'PKR',
  'united states': 'USD',
  'united states of america': 'USD',
  usa: 'USD',
  us: 'USD',
  america: 'USD',
  'united kingdom': 'GBP',
  uk: 'GBP',
  gb: 'GBP',
  britain: 'GBP',
  england: 'GBP',
  germany: 'EUR',
  france: 'EUR',
  italy: 'EUR',
  spain: 'EUR',
  netherlands: 'EUR',
  belgium: 'EUR',
  ireland: 'EUR',
  portugal: 'EUR',
  austria: 'EUR',
  finland: 'EUR',
  greece: 'EUR',
};

function countryCurrency(country) {
  const key = String(country || '').trim().toLowerCase();
  return COUNTRY_CURRENCY[key] || null;
}

function normalizeProductCurrency(value, fallback = 'USD') {
  const normalized = normalizeCurrency(value || fallback);
  return SUPPORTED_PRODUCT_CURRENCIES.includes(normalized) ? normalized : normalizeCurrency(fallback);
}

function sellerDefaultProductCurrency(store, seller) {
  return normalizeProductCurrency(
    store?.productCurrency
      || countryCurrency(store?.address?.country)
      || seller?.currency
      || 'USD'
  );
}

async function getProductCurrencyBreakdown(sellerId) {
  const sellerObjectId = mongoose.Types.ObjectId.isValid(sellerId)
    ? new mongoose.Types.ObjectId(sellerId)
    : sellerId;
  const rows = await Product.aggregate([
    { $match: { seller: sellerObjectId } },
    {
      $group: {
        _id: { $ifNull: ['$currency', { $ifNull: ['$priceCurrency', 'USD'] }] },
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = {};
  for (const row of rows) {
    const currency = normalizeProductCurrency(row._id);
    counts[currency] = (counts[currency] || 0) + row.count;
  }

  return {
    productCount: rows.reduce((sum, row) => sum + row.count, 0),
    productCurrencies: Object.keys(counts),
    productCurrencyCounts: counts,
  };
}

async function getSellerProductCurrencyState(sellerId, options = {}) {
  const [store, seller] = await Promise.all([
    options.store || Store.findOne({ seller: sellerId }),
    options.seller || User.findById(sellerId).select('currency').lean(),
  ]);

  if (!store) {
    const fallbackCurrency = normalizeProductCurrency(seller?.currency || 'USD');
    return {
      hasStore: false,
      activeCurrency: fallbackCurrency,
      status: PRODUCT_CURRENCY_ACTIVE_STATUS,
      pendingCurrency: null,
      previousCurrency: null,
      productCount: 0,
      productCurrencies: [],
      productCurrencyCounts: {},
      canAddProduct: false,
    };
  }

  const breakdown = await getProductCurrencyBreakdown(sellerId);
  const inferredCurrency = breakdown.productCurrencies.length === 1
    ? breakdown.productCurrencies[0]
    : sellerDefaultProductCurrency(store, seller);
  const activeCurrency = normalizeProductCurrency(store.productCurrency || inferredCurrency);
  const pendingCurrency = store.pendingProductCurrency
    ? normalizeProductCurrency(store.pendingProductCurrency)
    : null;
  const previousCurrency = store.previousProductCurrency
    ? normalizeProductCurrency(store.previousProductCurrency)
    : null;
  const status = store.productCurrencyStatus === PRODUCT_CURRENCY_PENDING_STATUS && pendingCurrency
    ? PRODUCT_CURRENCY_PENDING_STATUS
    : PRODUCT_CURRENCY_ACTIVE_STATUS;

  return {
    hasStore: true,
    activeCurrency,
    status,
    pendingCurrency: status === PRODUCT_CURRENCY_PENDING_STATUS ? pendingCurrency : null,
    previousCurrency: status === PRODUCT_CURRENCY_PENDING_STATUS ? (previousCurrency || activeCurrency) : null,
    productCount: breakdown.productCount,
    productCurrencies: breakdown.productCurrencies,
    productCurrencyCounts: breakdown.productCurrencyCounts,
    canAddProduct: status !== PRODUCT_CURRENCY_PENDING_STATUS,
    message: status === PRODUCT_CURRENCY_PENDING_STATUS
      ? `Product currency change from ${previousCurrency || activeCurrency} to ${pendingCurrency} is pending. Convert existing product prices or cancel the change before adding new products.`
      : '',
  };
}

async function ensureStoreProductCurrencyInitialized(sellerId, options = {}) {
  const store = options.store || await Store.findOne({ seller: sellerId });
  if (!store) return getSellerProductCurrencyState(sellerId, options);

  const seller = options.seller || await User.findById(sellerId).select('currency').lean();
  const state = await getSellerProductCurrencyState(sellerId, { store, seller });
  if (!store.productCurrency || store.productCurrencyStatus !== state.status) {
    store.productCurrency = state.activeCurrency;
    store.productCurrencyStatus = state.status;
    if (state.status === PRODUCT_CURRENCY_ACTIVE_STATUS) {
      store.pendingProductCurrency = null;
      store.previousProductCurrency = null;
    }
    await store.save();
  }
  return getSellerProductCurrencyState(sellerId, { store, seller });
}

async function requestProductCurrencyChange(sellerId, requestedCurrency, { confirm = false } = {}) {
  const targetCurrency = normalizeProductCurrency(requestedCurrency);
  const store = await Store.findOne({ seller: sellerId });
  if (!store) {
    const error = new Error('Store not found. Please create a store first.');
    error.status = 404;
    throw error;
  }

  const state = await ensureStoreProductCurrencyInitialized(sellerId, { store });
  if (state.status === PRODUCT_CURRENCY_PENDING_STATUS) {
    if (!confirm && targetCurrency !== state.pendingCurrency) {
      return {
        ...state,
        requiresConfirmation: true,
        requestedCurrency: targetCurrency,
        msg: `You already have a pending product currency change from ${state.previousCurrency} to ${state.pendingCurrency}. Confirm to replace it with ${targetCurrency}, or cancel the current change first.`,
      };
    }

    if (confirm && targetCurrency !== state.pendingCurrency) {
      store.pendingProductCurrency = targetCurrency;
      store.previousProductCurrency = state.previousCurrency || state.activeCurrency;
      store.productCurrencyStatus = PRODUCT_CURRENCY_PENDING_STATUS;
      store.productCurrencyChangedAt = new Date();
      await store.save();
    }
    return getSellerProductCurrencyState(sellerId, { store });
  }

  if (targetCurrency === state.activeCurrency) {
    store.productCurrency = targetCurrency;
    store.productCurrencyStatus = PRODUCT_CURRENCY_ACTIVE_STATUS;
    store.pendingProductCurrency = null;
    store.previousProductCurrency = null;
    await store.save();
    return getSellerProductCurrencyState(sellerId, { store });
  }

  if (state.productCount > 0 && !confirm) {
    return {
      ...state,
      requiresConfirmation: true,
      requestedCurrency: targetCurrency,
      msg: `You have added products in ${state.activeCurrency}. To switch product currency to ${targetCurrency}, you must convert existing product prices from the Products tab before adding more products.`,
    };
  }

  if (state.productCount === 0) {
    store.productCurrency = targetCurrency;
    store.productCurrencyStatus = PRODUCT_CURRENCY_ACTIVE_STATUS;
    store.pendingProductCurrency = null;
    store.previousProductCurrency = null;
    store.productCurrencyChangedAt = new Date();
    await store.save();
    return getSellerProductCurrencyState(sellerId, { store });
  }

  store.productCurrency = state.activeCurrency;
  store.previousProductCurrency = state.activeCurrency;
  store.pendingProductCurrency = targetCurrency;
  store.productCurrencyStatus = PRODUCT_CURRENCY_PENDING_STATUS;
  store.productCurrencyChangedAt = new Date();
  await store.save();
  return getSellerProductCurrencyState(sellerId, { store });
}

async function cancelPendingProductCurrencyChange(sellerId) {
  const store = await Store.findOne({ seller: sellerId });
  if (!store) {
    const error = new Error('Store not found. Please create a store first.');
    error.status = 404;
    throw error;
  }
  const fallback = normalizeProductCurrency(store.previousProductCurrency || store.productCurrency || 'USD');
  store.productCurrency = fallback;
  store.productCurrencyStatus = PRODUCT_CURRENCY_ACTIVE_STATUS;
  store.pendingProductCurrency = null;
  store.previousProductCurrency = null;
  store.productCurrencyChangedAt = new Date();
  await store.save();
  return getSellerProductCurrencyState(sellerId, { store });
}

async function convertPendingProductPrices(sellerId) {
  const store = await Store.findOne({ seller: sellerId });
  if (!store) {
    const error = new Error('Store not found. Please create a store first.');
    error.status = 404;
    throw error;
  }
  const state = await getSellerProductCurrencyState(sellerId, { store });
  if (state.status !== PRODUCT_CURRENCY_PENDING_STATUS || !state.pendingCurrency) {
    return { converted: 0, state };
  }

  const targetCurrency = state.pendingCurrency;
  const fallbackSourceCurrency = state.previousCurrency || state.activeCurrency;
  const products = await Product.find({ seller: sellerId });
  let converted = 0;

  for (const product of products) {
    const sourceCurrency = getProductCurrency(product, fallbackSourceCurrency);
    const nextPrice = await convertAmount(product.price, sourceCurrency, targetCurrency);
    const nextDiscountedPrice = Number(product.discountedPrice || 0) > 0
      ? await convertAmount(product.discountedPrice, sourceCurrency, targetCurrency)
      : 0;

    product.price = roundMoney(nextPrice);
    product.discountedPrice = nextDiscountedPrice > 0 && nextDiscountedPrice < product.price
      ? roundMoney(nextDiscountedPrice)
      : 0;
    product.currency = targetCurrency;
    product.priceCurrency = targetCurrency;
    product.priceInputAmount = product.price;
    product.discountedPriceCurrency = targetCurrency;
    product.discountedPriceInputAmount = product.discountedPrice;
    product.priceVersion = 2;
    await product.save();
    converted += 1;
  }

  store.productCurrency = targetCurrency;
  store.productCurrencyStatus = PRODUCT_CURRENCY_ACTIVE_STATUS;
  store.pendingProductCurrency = null;
  store.previousProductCurrency = null;
  store.productCurrencyChangedAt = new Date();
  await store.save();

  return {
    converted,
    state: await getSellerProductCurrencyState(sellerId, { store }),
  };
}

async function assertProductCreationAllowed(sellerId) {
  const state = await ensureStoreProductCurrencyInitialized(sellerId);
  if (!state.hasStore) {
    const error = new Error('You must create a store before adding products. Go to Store Settings to set up your store.');
    error.status = 403;
    error.productCurrencyState = state;
    throw error;
  }
  if (!state.canAddProduct) {
    const error = new Error(state.message || 'Convert existing product prices or cancel the pending product currency change before adding new products.');
    error.status = 409;
    error.productCurrencyState = state;
    throw error;
  }
  return state;
}

module.exports = {
  PRODUCT_CURRENCY_ACTIVE_STATUS,
  PRODUCT_CURRENCY_PENDING_STATUS,
  SUPPORTED_PRODUCT_CURRENCIES,
  countryCurrency,
  normalizeProductCurrency,
  sellerDefaultProductCurrency,
  getSellerProductCurrencyState,
  ensureStoreProductCurrencyInitialized,
  requestProductCurrencyChange,
  cancelPendingProductCurrencyChange,
  convertPendingProductPrices,
  assertProductCreationAllowed,
};
