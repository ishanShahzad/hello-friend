jest.mock('../../models/SellerSubscription', () => ({
  findOne: jest.fn(),
}));

const SellerSubscription = require('../../models/SellerSubscription');
const {
  CUSTOM_STORE_THEME_ID,
  DEFAULT_STORE_THEME_ID,
  normalizeStoreTheme,
  ensureStoreThemeEntitlement,
} = require('../../services/storeThemeService');

const mockSubscription = (subscription) => {
  SellerSubscription.findOne.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(subscription),
  });
};

describe('storeThemeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes missing theme to the default Rozare theme', () => {
    expect(normalizeStoreTheme()).toMatchObject({
      themeId: DEFAULT_STORE_THEME_ID,
      customTheme: null,
    });
  });

  test('accepts known preset theme ids', () => {
    expect(normalizeStoreTheme({ themeId: 'sage-studio' })).toMatchObject({
      themeId: 'sage-studio',
      customTheme: null,
    });
  });

  test('rejects unknown preset theme ids', () => {
    expect(() => normalizeStoreTheme({ themeId: 'unknown-theme' })).toThrow('Invalid store theme selected.');
  });

  test('rejects custom theme saves when seller is not allowed to customize', () => {
    expect(() => normalizeStoreTheme({
      themeId: CUSTOM_STORE_THEME_ID,
      customTheme: { name: 'My Theme' },
    })).toThrow('Custom store themes are available on Rozare Elite only.');
  });

  test('normalizes custom themes when seller is allowed to customize', () => {
    const theme = normalizeStoreTheme({
      themeId: CUSTOM_STORE_THEME_ID,
      customTheme: {
        name: '  Elite Theme  ',
        layout: 'showcase',
        colors: {
          primary: '#AABBCC',
          secondary: 'bad',
          accent: '#112233',
        },
      },
    }, { allowCustom: true });

    expect(theme).toMatchObject({
      themeId: CUSTOM_STORE_THEME_ID,
      customTheme: {
        name: 'Elite Theme',
        layout: 'showcase',
        colors: {
          primary: '#aabbcc',
          secondary: '#8b5cf6',
          accent: '#112233',
        },
      },
    });
  });

  test('resets custom theme when the seller loses Elite access', async () => {
    mockSubscription({ plan: 'starter', status: 'active' });
    const store = {
      storeTheme: { themeId: CUSTOM_STORE_THEME_ID, customTheme: { name: 'Old Custom' } },
      save: jest.fn(),
      markModified: jest.fn(),
    };

    const allowed = await ensureStoreThemeEntitlement('seller-1', store);

    expect(allowed).toBe(false);
    expect(store.storeTheme).toMatchObject({ themeId: DEFAULT_STORE_THEME_ID, customTheme: null });
    expect(store.markModified).toHaveBeenCalledWith('storeTheme');
    expect(store.save).toHaveBeenCalled();
  });
});
