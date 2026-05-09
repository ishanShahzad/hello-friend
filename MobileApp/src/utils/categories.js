// Mirror of Frontend/src/utils/categories.js
export const PRESET_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Health & Wellness',
  'Sports & Outdoors',
  'Toys & Games',
  'Books',
  'Grocery',
  'Automotive',
  'Jewelry & Accessories',
  'Pet Supplies',
];

export const isPresetCategory = (cat) =>
  PRESET_CATEGORIES.some((c) => c.toLowerCase() === String(cat || '').toLowerCase());

export const MAX_TAGS = 15;
export const MAX_DESCRIPTION_LENGTH = 2000;
