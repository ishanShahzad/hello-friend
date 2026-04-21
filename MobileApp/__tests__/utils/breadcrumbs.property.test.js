/**
 * Tests for Sentry breadcrumb helpers.
 * Confirms wrappers remain crash-safe even when Sentry throws.
 */

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  setUser: jest.fn(),
}));

const Sentry = require('@sentry/react-native');
const {
  trackCheckoutStep,
  trackPaymentEvent,
  trackAuthEvent,
  trackError,
  setUserContext,
} = require('../../src/utils/breadcrumbs');

beforeEach(() => jest.clearAllMocks());

describe('breadcrumb helpers', () => {
  test('trackCheckoutStep adds checkout breadcrumb', () => {
    trackCheckoutStep('shipping_filled', { city: 'Karachi' });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'checkout',
      message: 'checkout.shipping_filled',
      level: 'info',
      data: { city: 'Karachi' },
    }));
  });

  test('trackPaymentEvent adds payment breadcrumb', () => {
    trackPaymentEvent('initiated', { amount: 100 });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'payment',
      message: 'payment.initiated',
    }));
  });

  test('trackAuthEvent adds auth breadcrumb', () => {
    trackAuthEvent('login_success');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      category: 'auth',
      message: 'auth.login_success',
    }));
  });

  test('trackError records breadcrumb and captures exception', () => {
    const err = new Error('boom');
    trackError('checkout', err, { step: 'place_order' });
    expect(Sentry.addBreadcrumb).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(err, expect.objectContaining({
      tags: { scope: 'checkout' },
    }));
  });

  test('setUserContext with user calls Sentry.setUser', () => {
    setUserContext({ _id: 'u1', email: 'a@b.com', name: 'Alice' });
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'u1', email: 'a@b.com', username: 'Alice' });
  });

  test('setUserContext with null clears user', () => {
    setUserContext(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });

  test('helpers swallow Sentry errors silently', () => {
    Sentry.addBreadcrumb.mockImplementationOnce(() => { throw new Error('sentry down'); });
    expect(() => trackCheckoutStep('summary_loaded')).not.toThrow();
  });
});
