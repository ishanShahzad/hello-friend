/**
 * Sentry breadcrumb helpers — concise wrappers so screens can leave a trail
 * without importing Sentry directly. All functions are no-ops if Sentry is
 * not initialized.
 */

import * as Sentry from '@sentry/react-native';

const safe = (fn) => {
  try { fn(); } catch {}
};

export function trackCheckoutStep(step, data = {}) {
  safe(() => Sentry.addBreadcrumb({
    category: 'checkout',
    message: `checkout.${step}`,
    level: 'info',
    data,
  }));
}

export function trackPaymentEvent(event, data = {}) {
  safe(() => Sentry.addBreadcrumb({
    category: 'payment',
    message: `payment.${event}`,
    level: 'info',
    data,
  }));
}

export function trackAuthEvent(event, data = {}) {
  safe(() => Sentry.addBreadcrumb({
    category: 'auth',
    message: `auth.${event}`,
    level: 'info',
    data,
  }));
}

export function trackError(scope, error, extra = {}) {
  safe(() => {
    Sentry.addBreadcrumb({
      category: scope,
      message: `${scope}.error`,
      level: 'error',
      data: { message: error?.message || String(error), ...extra },
    });
    Sentry.captureException(error, { tags: { scope }, extra });
  });
}

export function setUserContext(user) {
  safe(() => {
    if (user?._id) {
      Sentry.setUser({ id: user._id, email: user.email, username: user.name });
    } else {
      Sentry.setUser(null);
    }
  });
}
