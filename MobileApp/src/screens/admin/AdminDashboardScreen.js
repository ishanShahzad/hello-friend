/**
 * AdminDashboardScreen — Liquid Glass Design
 * Main dashboard for administrators with statistics and quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import StatCard, {
  UsersStatCard, StoresStatCard, ProductsStatCard, OrdersStatCard, RevenueStatCard,
} from '../../components/common/StatCard';
import ActionCard, {
  UserManagementAction, StoreVerificationAction, TaxConfigAction,
  AdminProductsAction, AdminOrdersAction, StoreOverviewAction,
  AdminStoresAction,
} from '../../components/common/ActionCard';
import Loader from '../../components/common/Loader';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import {
  colors, spacing, fontSize, borderRadius, fontWeight, typography,
} from '../../styles/theme';

export const calculateAdminStats = (users, stores, products, orders) => {
  const totalUsers = users?.length || 0;
  const totalStores = stores?.length || 0;
  const totalProducts = products?.length || 0;
  const totalOrders = orders?.length || 0;
  const pendingVerifications = stores?.filter(s => !s.verification?.isVerified).length || 0;
  const revenue = orders?.reduce((sum, order) => {
    if (order.status !== 'cancelled') return sum + (order.totalAmount || order.total || 0);
    return sum;
  }, 0) || 0;
  return { totalUsers, totalStores, totalProducts, totalOrders, pendingVerifications, revenue };
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return colors.warning;
    case 'processing': return colors.info;
    case 'shipped': return colors.primary;
    case 'delivered': return colors.success;
    case 'cancelled': return colors.error;
    default: return colors.gray;
  }
};

export default function AdminDashboardScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalStores: 0, totalProducts: 0, totalOrders: 0, pendingVerifications: 0, revenue: 0 });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, storesRes, productsRes, ordersRes] = await Promise.all([
        api.get('/api/user/get').catch(() => ({ data: [] })),
        api.get('/api/stores/all').catch(() => ({ data: { stores: [] } })),
        api.get('/api/products/get-products?limit=50&page=1').catch(() => ({ data: [] })),
        api.get('/api/order/get').catch(() => ({ data: [] })),
      ]);
      const users = usersRes.data?.users || usersRes.data || [];
      const stores = storesRes.data?.stores || [];
      const products = productsRes.data?.products || productsRes.data || [];
      const totalProductsFromPagination = productsRes.data?.pagination?.totalProducts;
      const orders = ordersRes.data?.orders || ordersRes.data || [];
      const computedStats = calculateAdminStats(users, stores, products, orders);
      if (totalProductsFromPagination !== undefined) computedStats.totalProducts = totalProductsFromPagination;
      setStats(computedStats);
      const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentActivity(sortedOrders.slice(0, 5));
    } catch (error) { console.error('Error fetching dashboard data:', error); }
    finally { setIsLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchDashboardData(); }, []);

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
              <Ionicons name="shield-checkmark" size={28} color={colors.error} />
            </View>
            <View style={styles.headerText}>
              <View style={styles.tagPill}>
                <Ionicons name="sparkles" size={12} color={colors.error} />
                <Text style={[styles.tagText, { color: colors.error }]}>Admin</Text>
              </View>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>Welcome, {currentUser?.name?.split(' ')[0] || 'Admin'}</Text>
            </View>
          </View>
        </GlassPanel>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <View style={styles.statWrapper}>
                <UsersStatCard value={stats.totalUsers} onPress={() => navigation.navigate('AdminUserManagement')} />
              </View>
              <View style={styles.statWrapper}>
                <StoresStatCard value={stats.totalStores} onPress={() => navigation.navigate('StoreVerification')} />
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statWrapper}>
                <ProductsStatCard value={stats.totalProducts} onPress={() => navigation.navigate('AdminProductManagement')} />
              </View>
              <View style={styles.statWrapper}>
                <OrdersStatCard value={stats.totalOrders} onPress={() => navigation.navigate('AdminOrderManagement')} />
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statWrapper}>
                <RevenueStatCard value={stats.revenue} />
              </View>
              <View style={styles.statWrapper}>
                <StatCard title="Pending Verifications" value={stats.pendingVerifications}
                  icon="hourglass-outline" iconColor={colors.warning}
                  onPress={() => navigation.navigate('StoreVerification')} />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <GlassPanel variant="card" style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <AdminStoresAction onPress={() => navigation.navigate('StoreOverview')} />
          <ActionCard title="Analytics" subtitle="Platform insights & reports" icon="bar-chart-outline" color={colors.info} onPress={() => navigation.navigate('AdminAnalytics')} />
          <UserManagementAction onPress={() => navigation.navigate('AdminUserManagement')} badge={stats.totalUsers} />
          <StoreVerificationAction onPress={() => navigation.navigate('StoreVerification')} badge={stats.pendingVerifications} />
          <AdminOrdersAction onPress={() => navigation.navigate('AdminOrderManagement')} badge={stats.totalOrders} />
          <AdminProductsAction onPress={() => navigation.navigate('AdminProductManagement')} />
          <TaxConfigAction onPress={() => navigation.navigate('AdminTaxConfiguration')} />
          <ActionCard title="Notifications" subtitle="System alerts & updates" icon="notifications-outline" color={colors.warning} onPress={() => navigation.navigate('AdminNotifications')} />
          <ActionCard title="Notification Settings" subtitle="Configure alert preferences" icon="options-outline" color={colors.gray} onPress={() => navigation.navigate('NotificationSettings')} />
        </GlassPanel>

        {/* Recent Activity */}
        <GlassPanel variant="card" style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('AdminOrderManagement')} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentActivity.length > 0 ? (
            recentActivity.map((order, index) => (
              <TouchableOpacity
                key={order._id || index} style={styles.activityItem} activeOpacity={0.7}
                onPress={() => navigation.navigate('OrderDetailManagement', { orderId: order._id, isAdmin: true })}
              >
                <View style={[styles.activityIcon, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <Ionicons name="receipt-outline" size={18} color={getStatusColor(order.status)} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Order #{order._id?.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.activitySubtitle}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.activityRight}>
                  <Text style={styles.activityAmount}>${(order.totalAmount || order.total || 0).toFixed(2)}</Text>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
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
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: {
    width: 50, height: 50, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(239,68,68,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  headerText: { flex: 1 },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(239,68,68,0.12)', alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, marginBottom: spacing.xs,
  },
  tagText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 2 },
  headerSubtitle: { ...typography.body, color: colors.textSecondary },
  section: { padding: spacing.lg, paddingBottom: 0 },
  actionsSection: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.bodySemibold, color: colors.text, marginBottom: spacing.md },
  viewAllText: { ...typography.caption, color: colors.primary, fontWeight: fontWeight.semibold },
  statsGrid: { gap: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md },
  statWrapper: { flex: 1 },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  activityIcon: { width: 40, height: 40, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  activityContent: { flex: 1 },
  activityTitle: { ...typography.bodySemibold, marginBottom: 2 },
  activitySubtitle: { ...typography.caption, color: colors.textSecondary },
  activityRight: { alignItems: 'flex-end' },
  activityAmount: { ...typography.bodySemibold, color: colors.primary, marginBottom: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  emptyActivity: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyActivityText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
});
