/**
 * TrackOrderScreen — Guest order tracking via email + order ID
 * Liquid Glass Design
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../config/api';
import { useCurrency } from '../contexts/CurrencyContext';
import GlassBackground from '../components/common/GlassBackground';
import GlassPanel from '../components/common/GlassPanel';
import { colors, spacing, fontSize, borderRadius, fontWeight, glass, shadows } from '../styles/theme';

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const statusConfig = {
  pending: { icon: 'time-outline', color: '#f59e0b', label: 'Pending' },
  confirmed: { icon: 'checkmark-circle-outline', color: '#22c55e', label: 'Confirmed' },
  processing: { icon: 'cube-outline', color: '#3b82f6', label: 'Processing' },
  shipped: { icon: 'car-outline', color: '#8b5cf6', label: 'Shipped' },
  delivered: { icon: 'checkmark-circle', color: '#22c55e', label: 'Delivered' },
  cancelled: { icon: 'close-circle', color: '#ef4444', label: 'Cancelled' },
};

export default function TrackOrderScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { formatPrice } = useCurrency();

  const onRefresh = useCallback(async () => {
    if (!email.trim() || !orderId.trim() || !order) return;
    setRefreshing(true);
    try {
      const res = await api.get(`/api/order/track?email=${encodeURIComponent(email)}&orderId=${encodeURIComponent(orderId)}`);
      setOrder(res.data.order);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Refresh Failed', text2: err.response?.data?.msg || 'Could not refresh order' });
    } finally {
      setRefreshing(false);
    }
  }, [email, orderId, order]);

  const handleTrack = async () => {
    if (!email.trim() || !orderId.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Info', text2: 'Please enter both email and order ID' });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/api/order/track?email=${encodeURIComponent(email)}&orderId=${encodeURIComponent(orderId)}`);
      setOrder(res.data.order);
    } catch (err) {
      setOrder(null);
      Toast.show({ type: 'error', text1: 'Not Found', text2: err.response?.data?.msg || 'Order not found' });
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order ? statusSteps.indexOf(order.orderStatus) : -1;
  const isCancelled = order?.orderStatus === 'cancelled';

  return (
    <GlassBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <GlassPanel variant="floating" style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Track Order</Text>
            <Text style={styles.headerSubtitle}>Enter your details to find your order</Text>
          </View>
          <Ionicons name="search-outline" size={22} color={colors.primary} />
        </GlassPanel>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }}>
          {/* Search Form */}
          <GlassPanel variant="card" style={styles.formCard}>
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Ionicons name="mail-outline" size={16} color={colors.primary} />
                <Text style={styles.label}>Email Address</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Ionicons name="barcode-outline" size={16} color={colors.primary} />
                <Text style={styles.label}>Order ID</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="ORD-1234567890"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={orderId}
                onChangeText={setOrderId}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={[styles.trackBtn, loading && { opacity: 0.6 }]}
              onPress={handleTrack}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#fff" />
                  <Text style={styles.trackBtnText}>Track Order</Text>
                </>
              )}
            </TouchableOpacity>
          </GlassPanel>

          {/* Order Result */}
          {order && (
            <GlassPanel variant="card" style={styles.resultCard}>
              {/* Order Header */}
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderIdLabel}>Order ID</Text>
                  <Text style={styles.orderIdValue}>{order.orderId}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderIdLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatPrice(order.orderSummary?.totalAmount)}</Text>
                </View>
              </View>

              {/* Status Progress */}
              {isCancelled ? (
                <View style={styles.cancelledBanner}>
                  <Ionicons name="close-circle" size={28} color="#ef4444" />
                  <Text style={styles.cancelledText}>Order Cancelled</Text>
                </View>
              ) : (
                <View style={styles.progressContainer}>
                  {statusSteps.map((step, i) => {
                    const cfg = statusConfig[step];
                    const isActive = i <= currentStepIndex;
                    return (
                      <View key={step} style={styles.progressStep}>
                        <View style={[styles.progressDot, { backgroundColor: isActive ? cfg.color : 'rgba(255,255,255,0.15)' }]}>
                          <Ionicons name={cfg.icon} size={16} color={isActive ? '#fff' : 'rgba(255,255,255,0.4)'} />
                        </View>
                        <Text style={[styles.progressLabel, { color: isActive ? colors.text : colors.textSecondary }]}>{cfg.label}</Text>
                        {i < statusSteps.length - 1 && (
                          <View style={[styles.progressLine, { backgroundColor: i < currentStepIndex ? cfg.color : 'rgba(255,255,255,0.1)' }]} />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Shipping Info */}
              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>Shipping To</Text>
                <Text style={styles.infoText}>
                  {order.shippingInfo?.fullName}{'\n'}
                  {order.shippingInfo?.address}, {order.shippingInfo?.city}{'\n'}
                  {order.shippingInfo?.state} {order.shippingInfo?.postalCode}, {order.shippingInfo?.country}
                </Text>
              </View>

              {/* Order Items Toggle */}
              <TouchableOpacity style={styles.itemsToggle} onPress={() => setShowItems(!showItems)}>
                <Text style={styles.itemsToggleText}>Order Items ({order.orderItems?.length})</Text>
                <Ionicons name={showItems ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
              </TouchableOpacity>

              {showItems && order.orderItems?.map((item, i) => (
                <View key={i} style={styles.orderItem}>
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.orderItemImage} contentFit="cover" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderItemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.orderItemQty}>Qty: {item.quantity} × {formatPrice(item.price)}</Text>
                  </View>
                  <Text style={styles.orderItemTotal}>{formatPrice(item.price * item.quantity)}</Text>
                </View>
              ))}

              {/* Payment Info */}
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>Payment</Text>
                <Text style={styles.paymentValue}>
                  {order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Stripe'} ·{' '}
                  <Text style={{ color: order.isPaid ? '#22c55e' : '#f59e0b' }}>
                    {order.isPaid ? 'Paid' : 'Unpaid'}
                  </Text>
                </Text>
              </View>

              <Text style={styles.dateText}>
                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </GlassPanel>
          )}

          {/* Not Found */}
          {searched && !order && !loading && (
            <GlassPanel variant="card" style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={56} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>No order found</Text>
              <Text style={styles.emptySubtitle}>Double-check your email and order ID</Text>
            </GlassPanel>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: glass.bgSubtle, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  headerSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  formCard: { padding: spacing.lg, marginBottom: spacing.md },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  input: { backgroundColor: glass.bgSubtle, borderRadius: 14, padding: spacing.md, fontSize: fontSize.md, color: colors.text, borderWidth: 1, borderColor: glass.borderSubtle },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 16, marginTop: spacing.sm, ...shadows.md },
  trackBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  resultCard: { padding: spacing.lg, marginBottom: spacing.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  orderIdLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  orderIdValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary, marginTop: 2 },
  totalValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: 2 },
  cancelledBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, marginBottom: spacing.lg },
  cancelledText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#ef4444' },
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, paddingVertical: spacing.sm },
  progressStep: { alignItems: 'center', flex: 1, position: 'relative' },
  progressDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 10, fontWeight: fontWeight.medium, textAlign: 'center' },
  progressLine: { position: 'absolute', top: 16, left: '60%', right: '-40%', height: 2 },
  infoSection: { backgroundColor: glass.bgSubtle, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  infoTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 6 },
  infoText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  itemsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: glass.borderSubtle },
  itemsToggleText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: glass.bgSubtle, borderRadius: 14, padding: spacing.sm, marginBottom: spacing.sm },
  orderItemImage: { width: 44, height: 44, borderRadius: 10 },
  orderItemName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  orderItemQty: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  orderItemTotal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  paymentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: glass.bgSubtle, borderRadius: 14, padding: spacing.md, marginTop: spacing.md },
  paymentLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  paymentValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  dateText: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  emptyCard: { alignItems: 'center', padding: spacing.xxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
});
