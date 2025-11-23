// API Configuration
// Change this to your backend URL
// For local development on Android emulator: http://10.0.2.2:5000
// For local development on physical device: http://YOUR_LOCAL_IP:5000
// For production: your deployed backend URL

export const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:5000'  // Android emulator
  // ? 'http://192.168.1.X:5000'  // Uncomment and use your local IP for physical device
  : 'https://your-production-api.com';

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
  },
  USER: {
    PROFILE: '/api/user/profile',
    UPDATE: '/api/user/update',
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
      const token = await AsyncStorage.getItem('token');
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
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
