import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';

const GlobalContext = createContext();

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

  useEffect(() => {
    if (!currentUser) {
      setCartItems({ totalCartPrice: 0, cart: [] });
      setWishlistItems([]);
    }
  }, [currentUser]);

  const fetchWishlist = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const res = await axios.get(`${API_BASE_URL}/api/products/get-wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlistItems(res.data.wishlist);
    } catch (error) {
      console.error(error.response?.data.msg);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data.msg || 'Failed to fetch wishlist'
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
      
      const token = await AsyncStorage.getItem('jwtToken');
      const res = await axios.get(
        `${API_BASE_URL}/api/products/add-to-wishlist/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
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
      
      const token = await AsyncStorage.getItem('jwtToken');
      const res = await axios.delete(
        `${API_BASE_URL}/api/products/delete-from-wishlist/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
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

  const handleAddToCart = async (id) => {
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

      const isInCart = cartItems?.cart?.some(item => item?.product?._id === id) || false;

      if (isInCart) {
        await handleRemoveCartItem(id);
        setIsCartLoading(false);
        setLoadingProductId(null);
        return;
      }

      // Check spin product limit
      const spinResultStr = await AsyncStorage.getItem('spinResult');
      const spinResult = spinResultStr ? JSON.parse(spinResultStr) : null;
      const spinSelectedProductsStr = await AsyncStorage.getItem('spinSelectedProducts');
      const spinSelectedProducts = spinSelectedProductsStr ? JSON.parse(spinSelectedProductsStr) : [];

      if (spinResult && !spinResult.hasCheckedOut && spinSelectedProducts.length >= 3 && !spinSelectedProducts.includes(id)) {
        Toast.show({
          type: 'error',
          text1: 'Limit Reached',
          text2: 'You can only select 3 products with your spin discount!'
        });
        setIsCartLoading(false);
        setLoadingProductId(null);
        return;
      }

      const token = await AsyncStorage.getItem('jwtToken');
      const res = await axios.post(
        `${API_BASE_URL}/api/cart/add/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: res.data.msg
      });

      // Track spin selected products
      if (spinResult && !spinResult.hasCheckedOut && !spinSelectedProducts.includes(id)) {
        spinSelectedProducts.push(id);
        await AsyncStorage.setItem('spinSelectedProducts', JSON.stringify(spinSelectedProducts));
      }

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
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        setIsCartLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/cart/get`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
    Toast.show({
      type: 'error',
      text1: 'Not Allowed',
      text2: 'Quantity increase is disabled. Only 1 item per product allowed.'
    });
  };

  const handleQtyDec = async (id) => {
    try {
      setQtyUpdateId(id);
      const token = await AsyncStorage.getItem('jwtToken');
      const res = await axios.patch(
        `${API_BASE_URL}/api/cart/qty-dec/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = await AsyncStorage.getItem('jwtToken');
      const res = await axios.delete(`${API_BASE_URL}/api/cart/remove/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from spinSelectedProducts
      const spinSelectedProductsStr = await AsyncStorage.getItem('spinSelectedProducts');
      const spinSelectedProducts = spinSelectedProductsStr ? JSON.parse(spinSelectedProductsStr) : [];
      const updatedSpinProducts = spinSelectedProducts.filter(productId => productId !== id);
      await AsyncStorage.setItem('spinSelectedProducts', JSON.stringify(updatedSpinProducts));

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
        qtyUpdateId
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
