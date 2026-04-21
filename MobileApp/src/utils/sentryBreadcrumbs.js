/**
 * Sentry breadcrumbs — typed helpers for key user journeys.
 * Safe no-op if Sentry isn't initialized.
 */
let SentryRef = null;
try { SentryRef = require('@sentry/react-native'); } catch {}

const safeAdd = (crumb) => {
  try { SentryRef?.addBreadcrumb?.(crumb); } catch {}
};

export const trackAuth = (action, data = {}) =>
  safeAdd({ category: 'auth', message: action, level: 'info', data });

export const trackCheckout = (action, data = {}) =>
  safeAdd({ category: 'checkout', message: action, level: 'info', data });

export const trackPayment = (action, data = {}) =>
  safeAdd({ category: 'payment', message: action, level: 'info', data });

export const trackError = (label, error) => {
  try { SentryRef?.captureException?.(error, { tags: { flow: label } }); } catch {}
};
