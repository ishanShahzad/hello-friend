jest.mock('../../services/currencyService', () => {
  const CURRENCIES = {
    USD: { code: 'USD' },
    PKR: { code: 'PKR' },
    EUR: { code: 'EUR' },
    GBP: { code: 'GBP' },
  };
  const normalizeCurrency = (value) => CURRENCIES[String(value || 'USD').trim().toUpperCase()]
    ? String(value || 'USD').trim().toUpperCase()
    : 'USD';
  const convertAmount = jest.fn(async (amount, fromCurrency = 'USD', toCurrency = 'USD') => {
    const value = Number(amount || 0);
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);
    if (from === to) return Math.round(value * 100) / 100;
    if (from === 'PKR' && to === 'USD') return Math.round((value / 284.6) * 100) / 100;
    if (from === 'USD' && to === 'PKR') return Math.round((value * 284.6) * 100) / 100;
    return value;
  });
  return { CURRENCIES, normalizeCurrency, convertAmount };
});

jest.mock('../../models/Product', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../../models/Store', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../models/User', () => ({
  findById: jest.fn(),
}));

const Product = require('../../models/Product');
const Store = require('../../models/Store');
const User = require('../../models/User');
const {
  requestProductCurrencyChange,
  assertProductCreationAllowed,
  convertPendingProductPrices,
} = require('../../services/storeProductCurrencyService');

const mockUser = (currency = 'PKR') => {
  User.findById.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue({ currency }),
  });
};

describe('storeProductCurrencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser('PKR');
  });

  test('requires confirmation before changing currency when products already exist', async () => {
    const store = {
      productCurrency: 'PKR',
      productCurrencyStatus: 'active',
      save: jest.fn(),
    };
    Store.findOne.mockResolvedValue(store);
    Product.aggregate.mockResolvedValue([{ _id: 'PKR', count: 2 }]);

    const state = await requestProductCurrencyChange('seller-1', 'USD');

    expect(state.requiresConfirmation).toBe(true);
    expect(state.activeCurrency).toBe('PKR');
    expect(state.requestedCurrency).toBe('USD');
    expect(store.save).not.toHaveBeenCalled();
  });

  test('confirmed change creates a pending conversion state and blocks new products', async () => {
    const store = {
      productCurrency: 'PKR',
      productCurrencyStatus: 'active',
      pendingProductCurrency: null,
      previousProductCurrency: null,
      save: jest.fn(),
    };
    Store.findOne.mockResolvedValue(store);
    Product.aggregate.mockResolvedValue([{ _id: 'PKR', count: 1 }]);

    const state = await requestProductCurrencyChange('seller-1', 'USD', { confirm: true });

    expect(store.productCurrency).toBe('PKR');
    expect(store.previousProductCurrency).toBe('PKR');
    expect(store.pendingProductCurrency).toBe('USD');
    expect(store.productCurrencyStatus).toBe('pending_conversion');
    expect(state.canAddProduct).toBe(false);

    await expect(assertProductCreationAllowed('seller-1')).rejects.toMatchObject({ status: 409 });
  });

  test('converts pending product prices and activates the new currency', async () => {
    const store = {
      productCurrency: 'PKR',
      productCurrencyStatus: 'pending_conversion',
      previousProductCurrency: 'PKR',
      pendingProductCurrency: 'USD',
      save: jest.fn(),
    };
    const product = {
      price: 284.6,
      discountedPrice: 142.3,
      currency: 'PKR',
      priceCurrency: 'PKR',
      save: jest.fn(),
    };
    Store.findOne.mockResolvedValue(store);
    Product.aggregate
      .mockResolvedValueOnce([{ _id: 'PKR', count: 1 }])
      .mockResolvedValueOnce([{ _id: 'USD', count: 1 }]);
    Product.find.mockResolvedValue([product]);

    const result = await convertPendingProductPrices('seller-1');

    expect(result.converted).toBe(1);
    expect(product).toMatchObject({
      price: 1,
      discountedPrice: 0.5,
      currency: 'USD',
      priceCurrency: 'USD',
      priceInputAmount: 1,
      discountedPriceCurrency: 'USD',
      discountedPriceInputAmount: 0.5,
      priceVersion: 2,
    });
    expect(store.productCurrency).toBe('USD');
    expect(store.productCurrencyStatus).toBe('active');
    expect(store.pendingProductCurrency).toBeNull();
    expect(product.save).toHaveBeenCalled();
    expect(store.save).toHaveBeenCalled();
  });
});
