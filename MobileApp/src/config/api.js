// API Configuration
// Change this to your backend URL
// For local development on Android emulator: http://10.0.2.2:5000
// For local development on physical device: http://YOUR_LOCAL_IP:5000
// For production: your deployed backend URL

export const API_BASE_URL = 'https://genzwinners-backend.vercel.app';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    LOGOUT: '/api/auth/logout',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    GOOGLE_AUTH: '/api/auth/google',
  },
  PRODUCTS: {
    GET_ALL: '/api/products',
    GET_BY_ID: '/api/products',
    CREATE: '/api/products',
    UPDATE: '/api/products',
    DELETE: '/api/products',
    WISHLIST: '/api/products/get-wishlist',
    ADD_TO_WISHLIST: '/api/products/add-to-wishlist',
    REMOVE_FROM_WISHLIST: '/api/products/delete-from-wishlist',
    BULK_DISCOUNT: '/api/products/bulk-discount',
    REMOVE_DISCOUNT: '/api/products/remove-discount',
  },
  ORDERS: {
    GET_ALL: '/api/orders',
    GET_BY_ID: '/api/orders',
    CREATE: '/api/orders',
    UPDATE: '/api/orders',
  },
  STORES: {
    GET_ALL: '/api/stores',
    GET_BY_SLUG: '/api/stores',
    TRUST: '/api/stores', // POST /:storeId/trust
    UNTRUST: '/api/stores', // DELETE /:storeId/trust
    TRUST_STATUS: '/api/stores', // GET /:storeId/trust-status
    TRUSTED_STORES: '/api/stores/trusted',
    VERIFY: '/api/stores', // POST /:storeId/verify
    UNVERIFY: '/api/stores', // POST /:storeId/unverify
  },
  USER: {
    PROFILE: '/api/user/profile',
    UPDATE: '/api/user/update',
    SINGLE: '/api/user/single',
    BECOME_SELLER: '/api/user/become-seller',
    GET_ALL: '/api/user/get',
    BLOCK_TOGGLE: '/api/user/block-toggle',
    ADMIN_TOGGLE: '/api/user/admin-toggle',
    DELETE: '/api/user/delete',
  },
  SPIN: {
    SAVE_RESULT: '/api/spin/save-result',
    GET_ACTIVE: '/api/spin/get-active',
    ADD_PRODUCTS: '/api/spin/add-products',
    CHECKOUT: '/api/spin/checkout',
    CAN_ADD_TO_CART: '/api/spin/can-add-to-cart',
  },
  CART: {
    GET: '/api/cart/get',
    ADD: '/api/cart/add',
    REMOVE: '/api/cart/remove',
    QTY_INC: '/api/cart/qty-inc',
    QTY_DEC: '/api/cart/qty-dec',
  },
  CURRENCY: {
    GET_RATES: '/api/currency/rates',
  },
};

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Try both token keys for compatibility
      let token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('jwtToken');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
