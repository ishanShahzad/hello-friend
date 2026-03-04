/**
 * SellerDashboardScreen — Liquid Glass Design
 * Main dashboard for sellers with statistics and quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import StatCard, {
  ProductsStatCard, OrdersStatCard, RevenueStatCard, PendingOrdersStatCard,
} from '../../components/common/StatCard';
import ActionCard, {
  ProductManagementAction, OrderManagementAction,
  StoreSettingsAction, ShippingConfigAction, StoreAnalyticsAction,
} from '../../components/common/ActionCard';
import OrderCard from '../../components/common/OrderCard';
import Loader from '../../components/common/Loader';
import { EmptyOrders } from '../../components/common/EmptyState';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import {
  colors, spacing, fontSize, borderRadius, fontWeight, typography,
} from '../../styles/theme';

export const calculateSellerStats = (products, orders) => {
  const totalProducts = products?.length || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'processing').length || 0;
  const revenue = orders?.reduce((sum, order) => {
    if (order.status !== 'cancelled') return sum + (order.total || 0);
    return sum;
  }, 0) || 0;
  return { totalProducts, totalOrders, pendingOrders, revenue };
};

export default function SellerDashboardScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, pendingOrders: 0, revenue: 0 });

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const storeRes = await api.get('/api/stores/my-store').catch(() => ({ data: { store: null } }));
      setStore(storeRes.data?.store);
      const productsRes = await api.get('/api/products/get-seller-products').catch(() => ({ data: [] }));
      const fetchedProducts = productsRes.data?.products || productsRes.data || [];
      setProducts(fetchedProducts);
      const ordersRes = await api.get('/api/order/get').catch(() => ({ data: { orders: [] } }));
      const fetchedOrders = ordersRes.data?.orders || [];
      setOrders(fetchedOrders);
      setStats(calculateSellerStats(fetchedProducts, fetchedOrders));
    } catch (error) { console.error('Error fetching dashboard data:', error); }
    finally { setIsLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchDashboardData(); }, []);
  const recentOrders = orders.slice(0, 5);

  if (isLoading) return <GlassBackground><Loader fullScreen message="Loading dashboard..." /></GlassBackground>;

  return (
    <GlassBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <GlassPanel variant="strong" style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="storefront" size={28} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{store?.name || 'Seller Dashboard'}</Text>
              <Text style={styles.headerSubtitle}>Welcome back, {currentUser?.name?.split(' ')[0] || 'Seller'}</Text>
            </View>
          </View>
          {store && (
            <TouchableOpacity style={styles.viewStoreButton} onPress={() => navigation.navigate('Store', { storeSlug: store.slug })} activeOpacity={0.8}>
              <Text style={styles.viewStoreText}>View Store</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </GlassPanel>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <View style={styles.statWrapper}>
                <ProductsStatCard value={stats.totalProducts} onPress={() => navigation.navigate('SellerProductManagement')} />
              </View>
              <View style={styles.statWrapper}>
                <OrdersStatCard value={stats.totalOrders} onPress={() => navigation.navigate('SellerOrderManagement')} />
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statWrapper}>
                <RevenueStatCard value={stats.revenue} />
              </View>
              <View style={styles.statWrapper}>
                <PendingOrdersStatCard value={stats.pendingOrders} onPress={() => navigation.navigate('SellerOrderManagement')} />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <GlassPanel variant="card" style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ProductManagementAction onPress={() => navigation.navigate('SellerProductManagement')} badge={stats.totalProducts} />
          <OrderManagementAction onPress={() => navigation.navigate('SellerOrderManagement')} badge={stats.pendingOrders} />
          <StoreSettingsAction onPress={() => navigation.navigate('SellerStoreSettings')} />
          <ShippingConfigAction onPress={() => navigation.navigate('SellerShippingConfiguration')} />
          <StoreAnalyticsAction onPress={() => navigation.navigate('SellerAnalytics')} />
        </GlassPanel>

        {/* Recent Orders */}
        <GlassPanel variant="card" style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {orders.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('SellerOrderManagement')} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentOrders.length > 0 ? (
            <View style={styles.ordersContainer}>
              {recentOrders.map((order) => (
                <OrderCard key={order._id} order={order}
                  onPress={() => navigation.navigate('OrderDetailManagement', { orderId: order._id, isAdmin: false })}
                  showCustomer={true} />
              ))}
            </View>
          ) : (
            <EmptyOrders onBrowse={null} />
          )}
        </GlassPanel>

        <View style={{ height: 100 }} />
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  header: { margin: spacing.lg, padding: spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  headerIcon: {
    width: 50, height: 50, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(99,102,241,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 2 },
  headerSubtitle: { ...typography.body, color: colors.textSecondary },
  viewStoreButton: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(99,102,241,0.12)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: borderRadius.lg, gap: spacing.xs,
  },
  viewStoreText: { ...typography.bodySemibold, color: colors.primary, fontSize: fontSize.sm },
  section: { padding: spacing.lg, paddingBottom: 0 },
  actionsSection: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.bodySemibold, color: colors.text, marginBottom: spacing.md },
  viewAllText: { ...typography.caption, color: colors.primary, fontWeight: fontWeight.semibold },
  statsGrid: { gap: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md },
  statWrapper: { flex: 1 },
  ordersContainer: { gap: spacing.sm },
});
