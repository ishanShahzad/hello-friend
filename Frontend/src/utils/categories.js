// Centralized list of preset product categories used across the platform.
// Sellers can pick from these in the product form (or choose "Other" to
// add a custom one), and shoppers see them as the primary filter on the
// home page.

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
