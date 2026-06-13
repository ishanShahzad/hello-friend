jest.mock('../../models/Store', () => ({
  find: jest.fn(),
  exists: jest.fn(),
}));

const Store = require('../../models/Store');
const {
  activeStoreQuery,
  applyActiveSellerProductFilter,
  getActiveSellerIds,
  isProductSellerPubliclyActive,
} = require('../../services/publicCatalogService');

describe('publicCatalogService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('builds active store queries with trial-blocked stores excluded', () => {
    expect(activeStoreQuery({ seller: 'seller-1' })).toEqual({
      isActive: true,
      blockedAt: null,
      seller: 'seller-1',
    });
  });

  test('adds active seller visibility to public product filters', () => {
    expect(applyActiveSellerProductFilter({ stock: { $gt: 0 } }, ['seller-1'])).toEqual({
      stock: { $gt: 0 },
      $and: [
        {
          $or: [
            { seller: null },
            { seller: { $exists: false } },
            { seller: { $in: ['seller-1'] } },
          ],
        },
      ],
    });
  });

  test('loads only active seller ids', async () => {
    const lean = jest.fn().mockResolvedValue([{ seller: 'seller-1' }, { seller: null }, { seller: 'seller-2' }]);
    const select = jest.fn(() => ({ lean }));
    Store.find.mockReturnValue({ select });

    await expect(getActiveSellerIds({ 'verification.isVerified': true })).resolves.toEqual(['seller-1', 'seller-2']);
    expect(Store.find).toHaveBeenCalledWith({
      isActive: true,
      blockedAt: null,
      'verification.isVerified': true,
    });
    expect(select).toHaveBeenCalledWith('seller');
  });

  test('treats products without a seller as public but blocks inactive seller products', async () => {
    await expect(isProductSellerPubliclyActive(null)).resolves.toBe(true);

    Store.exists.mockResolvedValueOnce(null);
    await expect(isProductSellerPubliclyActive('blocked-seller')).resolves.toBe(false);
    expect(Store.exists).toHaveBeenCalledWith({
      isActive: true,
      blockedAt: null,
      seller: 'blocked-seller',
    });
  });
});
