/**
 * Search History — persisted recent search queries.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'search_history';
const MAX_ITEMS = 8;

export const getSearchHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addSearchHistory = async (query) => {
  const q = (query || '').trim();
  if (!q || q.length < 2) return;
  try {
    const current = await getSearchHistory();
    const next = [q, ...current.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {}
};

export const removeSearchHistoryItem = async (query) => {
  try {
    const current = await getSearchHistory();
    const next = current.filter((x) => x !== query);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
};

export const clearSearchHistory = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
};
