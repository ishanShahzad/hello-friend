/**
 * useReviewPrompt — show the native App Store / Play review prompt
 * after the user has completed N successful orders. Throttled by date.
 */
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY_COUNT = 'review_prompt_order_count';
const KEY_LAST = 'review_prompt_last_shown';
const KEY_DECLINED = 'review_prompt_declined';
const THRESHOLD = 3;
const COOLDOWN_DAYS = 60;

const daysSince = (iso) => {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (1000 * 60 * 60 * 24);
};

/**
 * Call once on a successful order (e.g. PaymentSuccessScreen mount or COD success).
 * Will silently no-op until the threshold/cooldown conditions are met.
 */
export const recordSuccessfulOrder = async () => {
  try {
    const [countRaw, lastShown, declined] = await Promise.all([
      AsyncStorage.getItem(KEY_COUNT),
      AsyncStorage.getItem(KEY_LAST),
      AsyncStorage.getItem(KEY_DECLINED),
    ]);
    const count = (parseInt(countRaw, 10) || 0) + 1;
    await AsyncStorage.setItem(KEY_COUNT, String(count));

    if (declined === 'true') return;
    if (count < THRESHOLD) return;
    if (daysSince(lastShown) < COOLDOWN_DAYS) return;

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    const hasAction = await StoreReview.hasAction();
    if (!hasAction) return;

    await StoreReview.requestReview();
    await AsyncStorage.setItem(KEY_LAST, new Date().toISOString());
  } catch (err) {
    // Silent fail — never disrupt user flow
    if (__DEV__) console.log('Review prompt skipped:', err?.message);
  }
};

/** Mark the user as having declined (call from custom prompts) */
export const declineReviewPrompt = () =>
  AsyncStorage.setItem(KEY_DECLINED, 'true').catch(() => {});

/**
 * React hook variant — fires once on mount.
 */
export default function useReviewPrompt(condition = true) {
  useEffect(() => {
    if (condition) recordSuccessfulOrder();
  }, [condition]);
}
