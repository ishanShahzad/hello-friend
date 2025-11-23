import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

const statusConfig = {
  pending: { color: colors.warning, icon: 'time-outline', label: 'Pending' },
  confirmed: { color: colors.info, icon: 'checkmark-circle-outline', label: 'Confirmed' },
  processing: { color: colors.warning, icon: 'hourglass-outline', label: 'Processing' },
  shipped: { color: colors.info, icon: 'airplane-outline', label: 'Shipped' },
  delivered: { color: colors.success, icon: 'checkmark-done-outline', label: 'Delivered' },
  cancelled: { color: colors.danger, icon: 'close-circle-outline', label: 'Cancelled' }
};

export default function OrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const { formatPrice } = useCurrency();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const res = await axios.get(`${API_BASE_URL}/api/order/detail/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOrder(res.data.order);
    } catch (error) {
      console.error('Error fetching order detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text>Order not found</Text>
      </View>
    );
  }

  const config = statusConfig[order.orderStatus] || statusConfig.pending;
  
  // Calculate total with actual shipping
  const subtotal = order.orderSummary.subtotal || 0;
  const tax = order.orderSummary.tax || 0;
  let actualShipping = order.orderSummary.shippingCost || 0;
  
  if (order.sellerShipping && order.sellerShipping.length > 0) {
    actualShipping = order.sellerShipping.reduce((sum, sellerShip) => 
      sum + (sellerShip.shippingMethod.price || 0), 0
    );
  }
  
  const total = subtotal + tax + actualShipping;

  return (
    <ScrollView style={styles.container}>
      {/* Order Status */}
      <View style={styles.statusSection}>
        <View style={[styles.statusIcon, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon} size={40} color={config.color} />
        </View>
        <Text style={styles.statusLabel}>{config.label}</Text>
        <Text style={styles.orderId}>Order #{order.orderId}</Text>
        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {order.orderItems.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <Image
              source={{ uri: item.image || 'https://via.placeholder.com/80' }}
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Shipping Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Information</Text>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={20} color={colors.gray} />
          <Text style={styles.infoText}>{order.shippingInfo.fullName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color={colors.gray} />
          <Text style={styles.infoText}>{order.shippingInfo.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color={colors.gray} />
          <Text style={styles.infoText}>{order.shippingInfo.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color={colors.gray} />
          <Text style={styles.infoText}>
            {order.shippingInfo.address}, {order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.postalCode}
          </Text>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping:</Text>
          <Text style={styles.summaryValue}>{formatPrice(actualShipping)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax:</Text>
          <Text style={styles.summaryValue}>{formatPrice(tax)}</Text>
        </View>
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={20} color={colors.gray} />
          <Text style={styles.infoText}>
            {order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Stripe'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons 
            name={order.paymentStatus === 'paid' ? 'checkmark-circle' : 'time-outline'} 
            size={20} 
            color={order.paymentStatus === 'paid' ? colors.success : colors.warning} 
          />
          <Text style={styles.infoText}>
            {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSection: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusLabel: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  orderId: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  itemQuantity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.md,
    color: colors.dark,
    marginLeft: spacing.sm,
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    color: colors.dark,
  },
  totalRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.dark,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
});
