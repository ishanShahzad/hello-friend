const SellerSubscription = require('../models/SellerSubscription');

const DEFAULT_STORE_THEME_ID = 'rozare-professional-store';
const CUSTOM_STORE_THEME_ID = 'custom';

const STORE_THEME_IDS = [
  DEFAULT_STORE_THEME_ID,
  'pearl-boutique',
  'sage-studio',
  'skyline-market',
  'lilac-gallery',
  'sunlit-minimal',
  'coral-showroom',
  'aqua-retail',
  'orchid-luxe',
  'mint-catalog',
];

const STORE_THEME_LAYOUTS = ['classic', 'centered', 'editorial', 'showcase', 'compact'];
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

const makeHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const cleanText = (value, fallback, max = 40) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, max);
};

const normalizeLayout = (value) => (
  STORE_THEME_LAYOUTS.includes(value) ? value : 'classic'
);

const normalizeHex = (value, fallback) => {
  const color = String(value || '').trim();
  return HEX_COLOR_RE.test(color) ? color.toLowerCase() : fallback;
};

const normalizeCustomTheme = (customTheme = {}) => {
  const colors = customTheme.colors || {};
  return {
    name: cleanText(customTheme.name, 'Custom Store Theme'),
    layout: normalizeLayout(customTheme.layout),
    colors: {
      primary: normalizeHex(colors.primary, '#3b82f6'),
      secondary: normalizeHex(colors.secondary, '#8b5cf6'),
      accent: normalizeHex(colors.accent, '#10b981'),
      background: normalizeHex(colors.background, '#eef4ff'),
      surface: normalizeHex(colors.surface, '#ffffff'),
      text: normalizeHex(colors.text, '#111827'),
    },
  };
};

const normalizeStoreTheme = (storeTheme, { allowCustom = false } = {}) => {
  if (!storeTheme) {
    return {
      themeId: DEFAULT_STORE_THEME_ID,
      customTheme: null,
      updatedAt: new Date(),
    };
  }

  const requestedThemeId = String(
    typeof storeTheme === 'string' ? storeTheme : storeTheme.themeId || DEFAULT_STORE_THEME_ID
  ).trim().toLowerCase();

  if (requestedThemeId === CUSTOM_STORE_THEME_ID) {
    if (!allowCustom) {
      throw makeHttpError(403, 'Custom store themes are available on Rozare Elite only.');
    }
    return {
      themeId: CUSTOM_STORE_THEME_ID,
      customTheme: normalizeCustomTheme(storeTheme.customTheme),
      updatedAt: new Date(),
    };
  }

  if (!STORE_THEME_IDS.includes(requestedThemeId)) {
    throw makeHttpError(400, 'Invalid store theme selected.');
  }

  return {
    themeId: requestedThemeId,
    customTheme: null,
    updatedAt: new Date(),
  };
};

const sellerCanUseCustomStoreTheme = async (sellerId) => {
  const sub = await SellerSubscription.findOne({ seller: sellerId })
    .select('plan status')
    .lean();
  return !!sub && sub.plan === 'elite' && ['active', 'free_period'].includes(sub.status);
};

const ensureStoreThemeEntitlement = async (sellerId, store) => {
  if (!store || store.storeTheme?.themeId !== CUSTOM_STORE_THEME_ID) return true;
  const canUseCustomTheme = await sellerCanUseCustomStoreTheme(sellerId);
  if (canUseCustomTheme) return true;

  store.storeTheme = {
    themeId: DEFAULT_STORE_THEME_ID,
    customTheme: null,
    updatedAt: new Date(),
  };
  store.markModified?.('storeTheme');
  await store.save();
  return false;
};

module.exports = {
  DEFAULT_STORE_THEME_ID,
  CUSTOM_STORE_THEME_ID,
  STORE_THEME_IDS,
  STORE_THEME_LAYOUTS,
  normalizeStoreTheme,
  sellerCanUseCustomStoreTheme,
  ensureStoreThemeEntitlement,
};
