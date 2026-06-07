'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const {
  normalizeCurrency,
  convertFromUSD,
} = require('../services/currencyService');
const { roundMoney } = require('../services/productPricingService');

const write = process.argv.includes('--write');
const force = process.argv.includes('--force');

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is required');

  await mongoose.connect(mongoUri);

  const query = force ? {} : {
    $or: [
      { currency: { $exists: false } },
      { priceVersion: { $ne: 2 } },
    ],
  };

  const products = await Product.find(query).select(
    'seller price discountedPrice currency priceCurrency priceInputAmount discountedPriceCurrency discountedPriceInputAmount priceOriginal discountedPriceOriginal priceVersion'
  );

  let changed = 0;
  let skipped = 0;

  for (const product of products) {
    const seller = product.seller
      ? await User.findById(product.seller).select('currency').lean()
      : null;

    const metadataCurrency = normalizeCurrency(product.priceCurrency || product.currency || seller?.currency || 'USD');
    const hasNativeMetadata = product.priceInputAmount != null && Number.isFinite(Number(product.priceInputAmount));
    const hasLegacyOriginal = product.priceOriginal != null && Number.isFinite(Number(product.priceOriginal));
    const targetCurrency = hasNativeMetadata
      ? metadataCurrency
      : hasLegacyOriginal
        ? metadataCurrency
        : normalizeCurrency(seller?.currency || product.currency || product.priceCurrency || 'USD');

    let nextPrice;
    let nextDiscountedPrice;

    if (hasNativeMetadata) {
      nextPrice = roundMoney(product.priceInputAmount);
      nextDiscountedPrice = product.discountedPriceInputAmount != null
        ? roundMoney(product.discountedPriceInputAmount)
        : 0;
    } else if (hasLegacyOriginal) {
      nextPrice = roundMoney(product.priceOriginal);
      nextDiscountedPrice = product.discountedPriceOriginal != null
        ? roundMoney(product.discountedPriceOriginal)
        : 0;
    } else {
      nextPrice = await convertFromUSD(product.price, targetCurrency);
      nextDiscountedPrice = product.discountedPrice > 0
        ? await convertFromUSD(product.discountedPrice, targetCurrency)
        : 0;
    }

    if (nextDiscountedPrice >= nextPrice) nextDiscountedPrice = 0;

    const update = {
      price: nextPrice,
      discountedPrice: nextDiscountedPrice,
      currency: targetCurrency,
      priceCurrency: targetCurrency,
      priceInputAmount: nextPrice,
      discountedPriceCurrency: targetCurrency,
      discountedPriceInputAmount: nextDiscountedPrice,
      priceVersion: 2,
      priceMigratedAt: new Date(),
    };

    changed += 1;
    console.log(`${write ? 'MIGRATE' : 'DRY RUN'} ${product._id}: ${product.price} -> ${nextPrice} ${targetCurrency}`);

    if (write) {
      await Product.updateOne({ _id: product._id }, { $set: update });
    }
  }

  if (!products.length) skipped += 1;
  console.log(`${write ? 'Done' : 'Dry run complete'}: ${changed} product(s) ${write ? 'updated' : 'would be updated'}, ${skipped} skipped.`);
}

run()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
