/**
 * Haptics utility — respects user's global haptics preference.
 * Setting key: settings_haptics_enabled (default: enabled).
 */
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HAPTICS_KEY = 'settings_haptics_enabled';

let enabled = true; // optimistic default
let loaded = false;

const ensureLoaded = async () => {
  if (loaded) return;
  try {
    const v = await AsyncStorage.getItem(HAPTICS_KEY);
    if (v !== null) enabled = v === 'true';
  } catch {}
  loaded = true;
};

// Eagerly load on import so first calls have correct value
ensureLoaded();

export const setHapticsEnabled = (value) => {
  enabled = !!value;
  loaded = true;
  AsyncStorage.setItem(HAPTICS_KEY, String(enabled)).catch(() => {});
};

export const isHapticsEnabled = () => enabled;

export const impact = async (style = Haptics.ImpactFeedbackStyle.Light) => {
  await ensureLoaded();
  if (!enabled) return;
  Haptics.impactAsync(style).catch(() => {});
};

export const notify = async (type = Haptics.NotificationFeedbackType.Success) => {
  await ensureLoaded();
  if (!enabled) return;
  Haptics.notificationAsync(type).catch(() => {});
};

export const selection = async () => {
  await ensureLoaded();
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
};

export { Haptics };
