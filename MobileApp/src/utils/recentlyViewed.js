/**
 * Recently Viewed — persisted product browse history.
 * Stores an ordered list of product IDs (max 30, deduplicated, newest first).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'recently_viewed_products';
const MAX_ITEMS = 30;

const listeners = new Set();
const notify = (ids) => listeners.forEach((cb) => { try { cb(ids); } catch {} });

export const getRecentlyViewed = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const trackProductView = async (productId) => {
  if (!productId) return;
  try {
    const current = await getRecentlyViewed();
    const next = [productId, ...current.filter((id) => id !== productId)].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    notify(next);
    return next;
  } catch {
    return [];
  }
};

export const clearRecentlyViewed = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
    notify([]);
  } catch {}
};

export const subscribeRecentlyViewed = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
