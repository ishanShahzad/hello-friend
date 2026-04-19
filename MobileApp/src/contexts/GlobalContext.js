import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import api from '../config/api';
import { useAuth } from './AuthContext';

const GlobalContext = createContext();

const NOTIF_STORE_KEY = 'notification_inbox';
const NOTIF_READ_KEY = 'notifications_read_ids';

export const GlobalProvider = ({ children }) => {
  const { currentUser } = useAuth();
  
  const [wishlistItems, setWishlistItems] = useState([]);
  const [cartItems, setCartItems] = useState({
    totalCartPrice: 0,
    cart: []
  });
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [qtyUpdateId, setQtyUpdateId] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const notifListenerRef = useRef(null);

  // Track unread notification count globally
  const refreshUnreadCount = useCallback(async () => {
    try {
      const [storedRaw, readRaw] = await Promise.all([
        AsyncStorage.getItem(NOTIF_STORE_KEY),
        AsyncStorage.getItem(NOTIF_READ_KEY),
      ]);
      const stored = storedRaw ? JSON.parse(storedRaw) : [];
      const readSet = readRaw ? new Set(JSON.parse(readRaw)) : new Set();
      
      // Also count order-based unread if logged in
      let orderUnread = 0;
      if (currentUser) {
        try {
          const res = await api.get('/api/order/user-orders');
          const orders = res.data?.orders || [];
          orders.forEach(o => {
            const status = (o.orderStatus || o.status || '').toLowerCase();
            if (status === 'delivered' && !readSet.has(`${o._id}_delivered_0`)) orderUnread++;
            if (status === 'cancelled' && !readSet.has(`${o._id}_cancelled_0`)) orderUnread++;
          });
        } catch {}
      }
      
      const pushUnread = stored.filter(n => !readSet.has(n.id) && !n.read).length;
      setUnreadNotifCount(pushUnread + orderUnread);
    } catch {
      setUnreadNotifCount(0);
    }
  }, [currentUser]);

  // Listen for incoming notifications to bump count
  useEffect(() => {
    refreshUnreadCount();
    
    notifListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      setUnreadNotifCount(prev => prev + 1);
    });

    return () => {
      if (notifListenerRef.current) Notifications.removeNotificationSubscription(notifListenerRef.current);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!currentUser) {
      setCartItems({ totalCartPrice: 0, cart: [] });
      setWishlistItems([]);
    }
  }, [currentUser]);

  const fetchWishlist = async () => {
    try {
      const res = await api.get('/api/products/get-wishlist');
      setWishlistItems(res.data.wishlist);
    } catch (error) {
      console.error(error.response?.data?.msg);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.msg || 'Failed to fetch wishlist'
      });
    }
  };

  const handleAddToWishlist = async (id) => {
    try {
      if (!currentUser) {
        Toast.show({
          type: 'info',
          text1: 'Login Required',
          text2: 'Please login to add items to wishlist'
        });
        return;
      }

      const res = await api.get(`/api/products/add-to-wishlist/${id}`);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: res.data.msg
      });

      fetchWishlist();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.response?.data?.msg || 'Error adding to wishlist'
      });
    }
  };

  const handleDeleteFromWishlist = async (id) => {
    try {
      if (!currentUser) {
        Toast.show({
          type: 'info',
          text1: 'Login Required',
          text2: 'Please login to manage wishlist'
        });
        return;
      }

      const res = await api.delete(`/api/products/delete-from-wishlist/${id}`);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Toast.show({
        type: 'info',
        text1: 'Removed',
        text2: res.data.msg
      });

      fetchWishlist();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.response?.data?.msg || 'Error removing from wishlist'
      });
    }
  };

  const handleAddToCart = async (id, selectedColor = null) => {
    try {
      if (!currentUser) {
        Toast.show({
          type: 'info',
          text1: 'Login Required',
          text2: 'Please login to add items to cart'
        });
        return;
      }

      setIsCartLoading(true);
      setLoadingProductId(id);

      const isInCart = cartItems?.cart?.some(item => item?.product?._id === id && (item.selectedColor || null) === (selectedColor || null)) || false;

      if (isInCart) {
        await handleRemoveCartItem(id);
        setIsCartLoading(false);
        setLoadingProductId(null);
        return;
      }

      const res = await api.post(`/api/cart/add/${id}`, { selectedColor });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: res.data.msg
      });

      setCartItems({ cart: res.data.cart, totalCartPrice: res.data.totalCartPrice });
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.msg || 'Failed to add to cart'
      });
    } finally {
      setIsCartLoading(false);
      setLoadingProductId(null);
    }
  };

  const fetchCart = async () => {
    try {
      setIsCartLoading(true);
      if (!currentUser) {
        setIsCartLoading(false);
        return;
      }

      const res = await api.get('/api/cart/get');

      setCartItems({ cart: res.data.cart, totalCartPrice: res.data.totalCartPrice });
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error(error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.response?.data?.msg || 'Failed to fetch cart'
        });
      }
    } finally {
      setIsCartLoading(false);
    }
  };

  const handleQtyInc = async (id) => {
    try {
      setQtyUpdateId(id);
      const res = await api.patch(`/api/cart/qty-inc/${id}`, {});
      setCartItems({ cart: res.data.cart, totalCartPrice: res.data.totalCartPrice });
    } catch (error) {
      console.error(error?.response?.data?.msg || 'Failed to increase quantity');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.msg || 'Failed to increase quantity'
      });
    } finally {
      setQtyUpdateId(null);
    }
  };

  const handleQtyDec = async (id) => {
    try {
      setQtyUpdateId(id);
      const res = await api.patch(`/api/cart/qty-dec/${id}`, {});
      setCartItems({ cart: res.data.cart, totalCartPrice: res.data.totalCartPrice });
    } catch (error) {
      console.error(error?.response?.data?.msg || 'Failed to decrease quantity');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.msg || 'Failed to decrease quantity'
      });
    } finally {
      setQtyUpdateId(null);
    }
  };

  const handleRemoveCartItem = async (id) => {
    try {
      setQtyUpdateId(id);
      const res = await api.delete(`/api/cart/remove/${id}`);

      setCartItems({ cart: res.data.cart, totalCartPrice: res.data.totalCartPrice });
      
      Toast.show({
        type: 'info',
        text1: 'Removed',
        text2: res.data?.msg || 'Item removed from your cart'
      });
    } catch (error) {
      console.log(error);
    } finally {
      setQtyUpdateId(null);
    }
  };

  return (
    <GlobalContext.Provider
      value={{
        fetchWishlist,
        wishlistItems,
        handleAddToWishlist,
        handleDeleteFromWishlist,
        fetchCart,
        handleAddToCart,
        cartItems,
        handleQtyInc,
        handleQtyDec,
        handleRemoveCartItem,
        isCartLoading,
        loadingProductId,
        qtyUpdateId,
        unreadNotifCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within GlobalProvider');
  }
  return context;
};
