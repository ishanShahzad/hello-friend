/**
 * Centralized Stripe Configuration
 * Supports both test and live modes based on environment variables
 */

const STRIPE_MODE = process.env.STRIPE_MODE || 'test'; // 'test' or 'live'

const STRIPE_SECRET_KEY = STRIPE_MODE === 'live' 
  ? process.env.STRIPE_LIVE_SECRET_KEY 
  : process.env.STRIPE_TEST_SECRET_KEY;

const STRIPE_WEBHOOK_SECRET = STRIPE_MODE === 'live'
  ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
  : process.env.STRIPE_TEST_WEBHOOK_SECRET;

const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

if (stripe) {
  console.log(`✅ Stripe initialized in ${STRIPE_MODE.toUpperCase()} mode`);
} else {
  console.warn('⚠️  Stripe not configured - payment features disabled');
}

module.exports = {
  stripe,
  STRIPE_MODE,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  isLiveMode: () => STRIPE_MODE === 'live',
  isTestMode: () => STRIPE_MODE === 'test',
};
