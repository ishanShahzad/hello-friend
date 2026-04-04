/**
 * NotificationsScreen — In-App Notification Inbox
 * Shows full history of all received notifications with read/unread state,
 * category filtering, and local persistence via AsyncStorage.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity,
  RefreshControl, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import GlassBackground from '../components/common/GlassBackground';
import GlassPanel from '../components/common/GlassPanel';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

const NOTIF_STORE_KEY = 'notification_inbox';
const NOTIF_READ_KEY = 'notifications_read_ids';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'order', label: 'Orders', icon: 'receipt-outline' },
  { key: 'delivery', label: 'Delivery', icon: 'bicycle-outline' },
  { key: 'promo', label: 'Promos', icon: 'pricetag-outline' },
  { key: 'seller', label: 'Seller', icon: 'storefront-outline' },
  { key: 'system', label: 'System', icon: 'information-circle-outline' },
];

const NOTIFICATION_META = {
  order: { icon: 'receipt-outline', color: colors.primary, bg: 'rgba(99,102,241,0.15)' },
  delivery: { icon: 'bicycle-outline', color: colors.success, bg: 'rgba(16,185,129,0.15)' },
  promo: { icon: 'pricetag-outline', color: colors.warning, bg: 'rgba(245,158,11,0.15)' },
  seller: { icon: 'storefront-outline', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  system: { icon: 'information-circle-outline', color: colors.info, bg: 'rgba(59,130,246,0.15)' },
  alert: { icon: 'alert-circle-outline', color: colors.error, bg: 'rgba(239,68,68,0.15)' },
};

// Map push notification types to inbox categories
function categorizeNotification(type) {
  if (!type) return 'system';
  if (type.startsWith('order_') || type === 'order_placed' || type === 'order_confirmed' ||
      type === 'order_processing') return 'order';
  if (type === 'order_shipped' || type === 'order_delivered') return 'delivery';
  if (type === 'new_order_received' || type === 'low_stock' || type === 'store_verified' ||
      type === 'new_review' || type === 'subscription_expiring' || type === 'payout_received') return 'seller';
  if (type === 'price_drop' || type === 'back_in_stock' || type === 'wishlist_sale' ||
      type === 'coupon_available' || type === 'cart_reminder') return 'promo';
  return 'system';
}

function formatTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diffMs / 86400000);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function buildNotificationsFromOrders(orders) {
  const items = [];
  let id = 0;
  orders.forEach((order) => {
    const shortId = (order._id || '').slice(-6).toUpperCase();
    const status = (order.orderStatus || order.status || '').toLowerCase();
    const createdAt = order.createdAt || new Date().toISOString();
    items.push({ id: `${order._id}_placed_${id++}`, orderId: order._id, category: 'order', title: 'Order Confirmed', body: `Order #${shortId} is being processed.`, createdAt, read: true });
    if (['shipped', 'out_for_delivery', 'delivered'].includes(status))
      items.push({ id: `${order._id}_shipped_${id++}`, orderId: order._id, category: 'delivery', title: 'Order Shipped', body: `Order #${shortId} is on its way.`, createdAt: order.shippedAt || createdAt, read: status === 'delivered' });
    if (status === 'delivered')
      items.push({ id: `${order._id}_delivered_${id++}`, orderId: order._id, category: 'delivery', title: 'Order Delivered ✅', body: `Order #${shortId} has been delivered!`, createdAt: order.deliveredAt || createdAt, read: false });
    if (status === 'cancelled')
      items.push({ id: `${order._id}_cancelled_${id++}`, orderId: order._id, category: 'alert', title: 'Order Cancelled', body: `Order #${shortId} has been cancelled.`, createdAt: order.updatedAt || createdAt, read: false });
  });
  return items;
}

export default function NotificationsScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const readIds = useRef(new Set());
  const listenerRef = useRef(null);

  // Load read IDs & stored push notifications
  useEffect(() => {
    (async () => {
      try {
        const r = await AsyncStorage.getItem(NOTIF_READ_KEY);
        if (r) readIds.current = new Set(JSON.parse(r));
      } catch {}
    })();
  }, []);

  // Listen for new notifications while on this screen — persist them
  useEffect(() => {
    listenerRef.current = Notifications.addNotificationReceivedListener(async (notification) => {
      const content = notification.request.content;
      const data = content.data || {};
      const newNotif = {
        id: notification.request.identifier || `push_${Date.now()}`,
        category: categorizeNotification(data.type),
        title: content.title || 'Notification',
        body: content.body || '',
        createdAt: new Date().toISOString(),
        read: false,
        data,
      };
      setNotifications(prev => [newNotif, ...prev]);
      // Persist
      try {
        const stored = await AsyncStorage.getItem(NOTIF_STORE_KEY);
        const arr = stored ? JSON.parse(stored) : [];
        arr.unshift(newNotif);
        await AsyncStorage.setItem(NOTIF_STORE_KEY, JSON.stringify(arr.slice(0, 200)));
      } catch {}
    });

    return () => {
      if (listenerRef.current) Notifications.removeNotificationSubscription(listenerRef.current);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      // 1. Load persisted push notifications
      let pushNotifs = [];
      try {
        const stored = await AsyncStorage.getItem(NOTIF_STORE_KEY);
        if (stored) pushNotifs = JSON.parse(stored);
      } catch {}

      // 2. Build order-based notifications
      let orderNotifs = [];
      if (currentUser) {
        try {
          const res = await api.get('/api/order/user-orders');
          orderNotifs = buildNotificationsFromOrders(res.data?.orders || []);
        } catch {}
      }

      // 3. Merge and deduplicate
      const allMap = new Map();
      [...orderNotifs, ...pushNotifs].forEach(n => { if (!allMap.has(n.id)) allMap.set(n.id, n); });

      // Add welcome if empty
      if (allMap.size === 0) {
        allMap.set('welcome', {
          id: 'welcome', category: 'system', title: 'Welcome to Tortrose 👋',
          body: 'Start shopping to see notifications here.', createdAt: new Date().toISOString(), read: false,
        });
      }

      const merged = [...allMap.values()]
        .map(n => readIds.current.has(n.id) ? { ...n, read: true } : n)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(merged);
    } catch {}
    finally { setIsLoading(false); setRefreshing(false); }
  }, [currentUser]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const filtered = activeCategory === 'all'
    ? notifications
    : notifications.filter(n => n.category === activeCategory);

  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadByCategory = {};
  notifications.forEach(n => {
    if (!n.read) unreadByCategory[n.category] = (unreadByCategory[n.category] || 0) + 1;
  });

  const handlePress = useCallback((item) => {
    readIds.current.add(item.id);
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    AsyncStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...readIds.current])).catch(() => {});

    if (item.orderId) navigation.navigate('OrderDetail', { orderId: item.orderId });
    else if (item.data?.productId) navigation.navigate('ProductDetail', { productId: item.data.productId });
    else if (item.data?.type === 'new_order_received') navigation.navigate('SellerOrderManagement');
    else if (item.data?.type === 'low_stock') navigation.navigate('SellerProductManagement');
  }, [navigation]);

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => readIds.current.add(n.id));
      AsyncStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...readIds.current])).catch(() => {});
      return prev.map(n => ({ ...n, read: true }));
    });
  }, []);

  const handleClearAll = useCallback(async () => {
    setNotifications([]);
    readIds.current.clear();
    await AsyncStorage.multiRemove([NOTIF_STORE_KEY, NOTIF_READ_KEY]).catch(() => {});
  }, []);

  const renderItem = useCallback(({ item }) => {
    const meta = NOTIFICATION_META[item.category] || NOTIFICATION_META.system;
    return (
      <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.75}>
        <GlassPanel variant="card" style={[styles.notifCard, !item.read && styles.notifCardUnread]}>
          {!item.read && <View style={styles.unreadDot} />}
          <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>
          <View style={styles.notifContent}>
            <Text style={[styles.notifTitle, !item.read && { fontWeight: fontWeight.bold }]} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
            <View style={styles.notifFooter}>
              <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
              <View style={[styles.categoryTag, { backgroundColor: meta.bg }]}>
                <Text style={[styles.categoryTagText, { color: meta.color }]}>{item.category}</Text>
              </View>
            </View>
          </View>
        </GlassPanel>
      </TouchableOpacity>
    );
  }, [handlePress]);

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <GlassPanel variant="floating" style={styles.heroHeader}>
          <TouchableOpacity style={styles.heroBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.heroCenter}>
            <Text style={styles.heroTitle}>Inbox</Text>
            {unreadCount > 0 && <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{unreadCount}</Text></View>}
          </View>
          <View style={styles.heroActions}>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.heroActionBtn} onPress={handleMarkAllRead}>
                <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.heroActionBtn} onPress={() => navigation.navigate('NotificationPreferences')}>
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            {notifications.length > 0 && (
              <TouchableOpacity style={styles.heroActionBtn} onPress={handleClearAll}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </GlassPanel>

        {/* Category Filter Chips */}
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={c => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
          renderItem={({ item: cat }) => {
            const isActive = activeCategory === cat.key;
            const badge = cat.key === 'all' ? unreadCount : (unreadByCategory[cat.key] || 0);
            return (
              <TouchableOpacity
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={cat.icon} size={14} color={isActive ? colors.white : colors.textSecondary} />
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.label}</Text>
                {badge > 0 && (
                  <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                    <Text style={[styles.chipBadgeText, isActive && { color: colors.primary }]}>{badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* Notification List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="notifications-outline" size={40} color={colors.primaryLight} />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listContentEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}><Ionicons name="notifications-off-outline" size={56} color={colors.primaryLight} /></View>
                <Text style={styles.emptyTitle}>
                  {activeCategory === 'all' ? 'No notifications yet' : `No ${activeCategory} notifications`}
                </Text>
                <Text style={styles.emptySubtitle}>We'll notify you about orders, deals, and more</Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: fontSize.md, color: colors.textSecondary },
  heroHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.sm },
  heroBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  heroCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: spacing.md, gap: spacing.sm },
  heroTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  heroBadge: { backgroundColor: colors.error, borderRadius: borderRadius.full, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  heroBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  heroActions: { flexDirection: 'row', gap: spacing.xs },
  heroActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  chipList: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.white },
  chipBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.2)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.error },
  listContent: { padding: spacing.md },
  listContentEmpty: { flex: 1 },
  notifCard: { padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  unreadDot: { position: 'absolute', top: spacing.md, right: spacing.md, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  notifIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, flexShrink: 0 },
  notifContent: { flex: 1, paddingRight: spacing.lg },
  notifTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: 2 },
  notifBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.xs },
  notifFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTime: { fontSize: fontSize.xs, color: colors.textLight, fontWeight: fontWeight.medium },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  categoryTagText: { fontSize: 10, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(99,102,241,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
