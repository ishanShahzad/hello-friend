/**
 * OrdersScreen
 * Displays user's order history with modern design
 * 
 * Requirements: 10.1, 10.2, 10.4, 10.5, 10.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  typography,
} from '../styles/theme';
import Loader from '../components/common/Loader';
import { EmptyOrders, LoginRequired, ErrorState } from '../components/common/EmptyState';
import OrderCard from '../components/common/OrderCard';

/**
 * Sort orders by date (newest first)
 * Property 10: Order List Sorting
 * Validates: Requirements 10.1
 */
export const sortOrdersByDate = (orders) => {
  if (!Array.isArray(orders)) return [];
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA; // Descending order (newest first)
  });
};

export default function OrdersScreen({ navigation }) {
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('jwtToken');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/order/user-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Sort orders by date (newest first) - Property 10
      const sortedOrders = sortOrdersByDate(res.data.orders || []);
      setOrders(sortedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleOrderPress = useCallback((order) => {
    navigation.navigate('OrderDetail', { orderId: order._id });
  }, [navigation]);

  const handleStartShopping = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  }, [navigation]);

  const handleLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const renderOrderItem = useCallback(({ item, index }) => {
    // Transform order data for OrderCard component
    const orderData = {
      ...item,
      status: item.orderStatus || item.status || 'pending',
    };

    return (
      <OrderCard
        order={orderData}
        onPress={() => handleOrderPress(item)}
        showItems={true}
        style={index === 0 ? styles.firstCard : undefined}
      />
    );
  }, [handleOrderPress]);

  const keyExtractor = useCallback((item) => item._id, []);

  // Show login prompt for guests
  if (!currentUser) {
    return (
      <View style={styles.container}>
        <LoginRequired
          onLogin={handleLogin}
          onBrowse={handleStartShopping}
        />
      </View>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size="large" />
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={error}
          onRetry={fetchOrders}
        />
      </View>
    );
  }

  // Show empty state
  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyOrders onBrowse={handleStartShopping} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </Text>
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={keyExtractor}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={<View style={styles.listFooter} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  headerTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
  },
  firstCard: {
    marginTop: 0,
  },
  listFooter: {
    height: spacing.xxl,
  },
});
