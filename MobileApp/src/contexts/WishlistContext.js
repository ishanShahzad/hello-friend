/**
 * WishlistContext — optimistic wishlist state, isolated from cart/notifications.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { impact as hapticImpact } from '../utils/haptics';
import api from '../config/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);

  useEffect(() => { if (!currentUser) setWishlistItems([]); }, [currentUser]);

  const fetchWishlist = async () => {
    try {
      const res = await api.get('/api/products/get-wishlist');
      setWishlistItems(res.data.wishlist);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.msg || 'Failed to fetch wishlist' });
    }
  };

  const handleAddToWishlist = async (id, productHint = null) => {
    if (!currentUser) {
      Toast.show({ type: 'info', text1: 'Login Required', text2: 'Please login to add items to wishlist' });
      return;
    }
    const previous = wishlistItems;
    const optimistic = wishlistItems.some((it) => it?._id === id)
      ? wishlistItems
      : [...wishlistItems, productHint ? { ...productHint, _id: id } : { _id: id }];
    setWishlistItems(optimistic);
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await api.get(`/api/products/add-to-wishlist/${id}`);
      Toast.show({ type: 'success', text1: 'Saved', text2: res.data.msg });
      fetchWishlist();
    } catch (err) {
      setWishlistItems(previous);
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.msg || 'Error adding to wishlist' });
    }
  };

  const handleDeleteFromWishlist = async (id) => {
    if (!currentUser) return;
    const previous = wishlistItems;
    setWishlistItems(wishlistItems.filter((it) => it?._id !== id));
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await api.delete(`/api/products/delete-from-wishlist/${id}`);
      Toast.show({ type: 'info', text1: 'Removed', text2: res.data.msg });
      fetchWishlist();
    } catch (err) {
      setWishlistItems(previous);
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.msg || 'Error removing from wishlist' });
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, fetchWishlist, handleAddToWishlist, handleDeleteFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
