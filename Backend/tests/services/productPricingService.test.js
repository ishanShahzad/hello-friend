const {
  getProductCurrency,
  getProductEffectivePrice,
  normalizeNativeProductPricing,
} = require('../../services/productPricingService');

describe('productPricingService', () => {
  test('uses product currency as source of truth', () => {
    expect(getProductCurrency({ price: 1000, currency: 'PKR', priceCurrency: 'USD' })).toBe('PKR');
  });

  test('keeps native product amounts without normalizing to USD', () => {
    const product = normalizeNativeProductPricing({
      price: 1000,
      discountedPrice: 900,
      currency: 'PKR',
    });

    expect(product).toMatchObject({
      price: 1000,
      discountedPrice: 900,
      currency: 'PKR',
      priceCurrency: 'PKR',
      priceInputAmount: 1000,
      discountedPriceCurrency: 'PKR',
      discountedPriceInputAmount: 900,
      priceVersion: 2,
    });
  });

  test('ignores invalid discounts that are not lower than price', () => {
    const product = normalizeNativeProductPricing({
      price: 100,
      discountedPrice: 120,
      currency: 'USD',
    });

    expect(product.discountedPrice).toBe(0);
    expect(getProductEffectivePrice(product)).toBe(100);
  });

  test('converts explicit discount currency into the native product currency', () => {
    const product = normalizeNativeProductPricing({
      price: 2846,
      discountedPrice: 5,
      currency: 'PKR',
      discountedPriceCurrency: 'USD',
    });

    expect(product).toMatchObject({
      price: 2846,
      discountedPrice: 1423,
      currency: 'PKR',
      discountedPriceCurrency: 'PKR',
      discountedPriceInputAmount: 1423,
    });
  });
});
