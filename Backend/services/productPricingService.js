'use strict';

const {
  normalizeCurrency,
  convertAmount,
  convertAmountSync,
} = require('./currencyService');

function roundMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function getProductCurrency(product, fallbackCurrency = 'USD') {
  return normalizeCurrency(product?.currency || product?.priceCurrency || fallbackCurrency);
}

function getProductBasePrice(product) {
  return roundMoney(product?.price);
}

function getProductEffectivePrice(product) {
  const price = getProductBasePrice(product);
  const discounted = roundMoney(product?.discountedPrice);
  return discounted > 0 && discounted < price ? discounted : price;
}

async function convertProductAmount(product, amount, targetCurrency = 'USD') {
  return convertAmount(amount, getProductCurrency(product), targetCurrency);
}

function convertProductAmountSync(product, amount, targetCurrency = 'USD') {
  return convertAmountSync(amount, getProductCurrency(product), targetCurrency);
}

function normalizeNativeProductPricing(product, fallbackCurrency = 'USD') {
  if (!product || typeof product !== 'object') return product;

  const currency = getProductCurrency(product, fallbackCurrency);
  const priceSourceCurrency = normalizeCurrency(product.priceCurrency || product.currency || currency);
  const discountSourceCurrency = normalizeCurrency(product.discountedPriceCurrency || product.discountedCurrency || currency);
  const rawPrice = roundMoney(product.price);
  const rawDiscountedPrice = roundMoney(product.discountedPrice);
  const price = priceSourceCurrency === currency
    ? rawPrice
    : convertAmountSync(rawPrice, priceSourceCurrency, currency);
  const discountedPrice = rawDiscountedPrice > 0
    ? discountSourceCurrency === currency
      ? rawDiscountedPrice
      : convertAmountSync(rawDiscountedPrice, discountSourceCurrency, currency)
    : 0;

  return {
    ...product,
    price,
    discountedPrice: discountedPrice > 0 && discountedPrice < price ? discountedPrice : 0,
    currency,
    priceCurrency: currency,
    priceInputAmount: price,
    discountedPriceCurrency: currency,
    discountedPriceInputAmount: discountedPrice > 0 && discountedPrice < price ? discountedPrice : 0,
    priceVersion: 2,
  };
}

module.exports = {
  roundMoney,
  getProductCurrency,
  getProductBasePrice,
  getProductEffectivePrice,
  convertProductAmount,
  convertProductAmountSync,
  normalizeNativeProductPricing,
};
