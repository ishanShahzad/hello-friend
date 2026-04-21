/**
 * GlobalContext — backwards-compatible facade composing the three split contexts.
 * Delegates to WishlistContext, CartContext, and NotificationCountContext so that
 * `useGlobal()` continues working everywhere it's already imported.
 *
 * New code should import directly from the dedicated context files
 * (`useWishlist`, `useCart`, `useNotificationCount`).
 */
import React, { createContext, useContext } from 'react';
import { WishlistProvider, useWishlist } from './WishlistContext';
import { CartProvider, useCart } from './CartContext';
import { NotificationCountProvider, useNotificationCount } from './NotificationCountContext';

const GlobalContext = createContext();

const GlobalAggregator = ({ children }) => {
  const wishlist = useWishlist();
  const cart = useCart();
  const counts = useNotificationCount();
  const value = { ...wishlist, ...cart, ...counts };
  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const GlobalProvider = ({ children }) => (
  <NotificationCountProvider>
    <WishlistProvider>
      <CartProvider>
        <GlobalAggregator>{children}</GlobalAggregator>
      </CartProvider>
    </WishlistProvider>
  </NotificationCountProvider>
);

export const useGlobal = () => {
  const ctx = useContext(GlobalContext);
  if (!ctx) throw new Error('useGlobal must be used within GlobalProvider');
  return ctx;
};
