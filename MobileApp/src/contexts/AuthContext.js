import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const userStr = await AsyncStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndUpdateCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/api/user/single`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const user = res.data?.user;
      setCurrentUser(user);
      await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching user:', error);
      }
    }
  };

  const signup = async (data) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/registerr`, data);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: res.data.msg
      });
      return { success: true };
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.msg || 'Signup failed'
      });
      return { success: false, error: error.response?.data?.msg };
    }
  };

  const login = async (data) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, data);
      
      await AsyncStorage.setItem('jwtToken', res.data.token);
      await AsyncStorage.setItem('currentUser', JSON.stringify(res.data.user));
      
      setCurrentUser(res.data.user);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: res.data.msg
      });
      
      return { success: true };
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.msg || 'Login failed'
      });
      return { success: false, error: error.response?.data?.msg };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('jwtToken');
      await AsyncStorage.removeItem('currentUser');
      setCurrentUser(null);
      
      Toast.show({
        type: 'info',
        text1: 'Logged out',
        text2: 'You have been logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        fetchAndUpdateCurrentUser,
        signup,
        login,
        logout,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
