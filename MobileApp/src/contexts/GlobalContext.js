import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  
  // Spin state
  const [spinResult, setSpinResult] = useState(null);
  const [spinSelectedProducts, setSpinSelectedProducts] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      setCartItems({ totalCartPrice: 0, cart: [] });
      setWishlistItems([]);
      setSpinResult(null);
      setSpinSelectedProducts([]);
    } else {
      // Load spin data when user logs in
      loadSpinData();
    }
  }, [currentUser]);

  // Load spin data from storage/API
  const loadSpinData = useCallback(async () => {
    try {
      // Try to fetch from API first
      const token = await AsyncStorage.getItem('jwtToken');
      if (token) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/spin/get-active`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.data.hasActiveSpin) {
            setSpinResult(response.data.spinResult);
            setSpinSelectedProducts(response.data.spinResult.selectedProducts || []);
            return;
          }
        } catch (apiError) {
          console.log('API spin fetch failed, checking local storage');
        }
      }

      // Fallback to local storage
      const localSpinResult = await AsyncStorage.getItem('spinResult');
      const localSelectedProducts = await AsyncStorage.getItem('spinSelectedProducts');
      
      if (localSpinResult) {
        const parsed = JSON.parse(localSpinResult);
        const expiresAt = new Date(parsed.expiresAt);
        if (expiresAt > new Date()) {
          setSpinResult(parsed);
          setSpinSelectedProducts(localSelectedProducts ? JSON.parse(localSelectedProducts) : []);
        } else {
          // Clear expired spin
          await AsyncStorage.removeItem('spinResult');
          await AsyncStorage.removeItem('spinSelectedProducts');
        }
      }
    } catch (error) {
      console.error('Error loading spin data:', error);
    }
  }, []);

  // Fetch active spin from API
  const fetchActiveSpin = useCallback(async () => {
    if (!currentUser) return null;

    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await axios.get(
        `${API_BASE_URL}/api/spin/get-active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.hasActiveSpin) {
        setSpinResult(response.data.spinResult);
        setSpinSelectedProducts(response.data.spinResult.selectedProducts || []);
        await AsyncStorage.setItem('spinResult', JSON.stringify(response.data.spinResult));
        return response.data.spinResult;
      } else {
        setSpinResult(null);
        setSpinSelectedProducts([]);
        await AsyncStorage.removeItem('spinResult');
        return null;
      }
    } catch (error) {
      console.error('Error fetching active spin:', error);
      return null;
    }
  }, [currentUser]);

  // Save spin result
  const saveSpinResult = useCallback(async (result) => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      
      const response = await axios.post(
        `${API_BASE_URL}/api/spin/save-result`,
        {
          discount: result.value,
          discountType: result.type,
          label: result.label
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const savedResult = response.data.spinResult;
      setSpinResult(savedResult);
      setSpinSelectedProducts([]);
      
      await AsyncStorage.setItem('spinResult', JSON.stringify(savedResult));
      await AsyncStorage.setItem('spinSelectedProducts', JSON.stringify([]));
      
      return savedResult;
    } catch (error) {
      console.error('Error saving spin result:', error);
      
      // Save locally as fallback
      const localResult = {
        ...result,
        discount: result.value,
        discountType: result.type,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        selectedProducts: [],
        hasCheckedOut: false
      };
      
      setSpinResult(localResult);
      await AsyncStorage.setItem('spinResult', JSON.stringify(localResult));
      
      throw error;
    }
  }, []);

  // Select products for spin discount
  const selectSpinProduct = useCallback(async (productId) => {
    if (!spinResult || spinResult.hasCheckedOut) return false;
    
    if (spinSelectedProducts.length >= 3 && !spinSelectedProducts.includes(productId)) {
      Toast.show({
        type: 'error',
        text1: 'Limit Reached',
        text2: 'You can only select 3 products with your spin discount!'
      });
      return false;
    }

    const newSelectedProducts = spinSelectedProducts.includes(productId)
      ? spinSelectedProducts.filter(id => id !== productId)
      : [...spinSelectedProducts, productId];

    setSpinSelectedProducts(newSelectedProducts);
    await AsyncStorage.setItem('spinSelectedProducts', JSON.stringify(newSelectedProducts));
    
    return true;
  }, [spinResult, spinSelectedProducts]);

  // Checkout spin (mark as used)
  const checkoutSpin = useCallback(async () => {
    if (!spinResult) return;

    try {
      const token = await AsyncStorage.getItem('jwtToken');
      
      await axios.post(
        `${API_BASE_URL}/api/spin/checkout`,
        { spinId: spinResult._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedResult = { ...spinResult, hasCheckedOut: true };
      setSpinResult(updatedResult);
      await AsyncStorage.setItem('spinResult', JSON.stringify(updatedResult));
      
      return true;
    } catch (error) {
      console.error('Error checking out spin:', error);
      // Update locally anyway
      const updatedResult = { ...spinResult, hasCheckedOut: true };
      setSpinResult(updatedResult);
      await AsyncStorage.setItem('spinResult', JSON.stringify(updatedResult));
      return true;
    }
  }, [spinResult]);

  // Clear spin data
  const clearSpinData = useCallback(async () => {
    setSpinResult(null);
    setSpinSelectedProducts([]);
    await AsyncStorage.removeItem('spinResult');
    await AsyncStorage.removeItem('spinSelectedProducts');
  }, []);

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
        qtyUpdateId,
        // Spin functionality
        spinResult,
        spinSelectedProducts,
        fetchActiveSpin,
        saveSpinResult,
        selectSpinProduct,
        checkoutSpin,
        clearSpinData
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
