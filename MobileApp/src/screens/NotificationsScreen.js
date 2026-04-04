/**
 * NotificationsScreen — In-App Notification Inbox
 * Features: category filtering, order-based grouping (expandable cards),
 * read/unread state, local persistence, real-time badge sync.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity,
  RefreshControl, Animated, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useGlobal } from '../contexts/GlobalContext';
import GlassBackground from '../components/common/GlassBackground';
import GlassPanel from '../components/common/GlassPanel';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function categorizeNotification(type) {
  if (!type) return 'system';
  if (type.startsWith('order_') || type === 'order_placed' || type === 'order_confirmed' || type === 'order_processing') return 'order';
  if (type === 'order_shipped' || type === 'order_delivered') return 'delivery';
  if (type === 'new_order_received' || type === 'low_stock' || type === 'store_verified' || type === 'new_review' || type === 'subscription_expiring' || type === 'payout_received') return 'seller';
  if (type === 'price_drop' || type === 'back_in_stock' || type === 'wishlist_sale' || type === 'coupon_available' || type === 'cart_reminder') return 'promo';
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

/** Group notifications by orderId. Non-order notifs get their own group. */
function groupNotifications(notifications) {
  const groups = [];
  const orderMap = new Map();

  notifications.forEach(n => {
    if (n.orderId) {
      if (!orderMap.has(n.orderId)) {
        const group = { type: 'group', orderId: n.orderId, items: [], latestDate: n.createdAt };
        orderMap.set(n.orderId, group);
        groups.push(group);
      }
      const g = orderMap.get(n.orderId);
      g.items.push(n);
      if (new Date(n.createdAt) > new Date(g.latestDate)) g.latestDate = n.createdAt;
    } else {
      groups.push({ type: 'single', item: n });
    }
  });

  // Sort groups by latest date
  groups.sort((a, b) => {
    const da = a.type === 'group' ? new Date(a.latestDate) : new Date(a.item.createdAt);
    const db = b.type === 'group' ? new Date(b.latestDate) : new Date(b.item.createdAt);
    return db - da;
  });

  return groups;
}

// ─── Expandable Order Group Card ─────────────────────────────────────────────
function OrderGroupCard({ group, onPress, onMarkRead, readIds }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const { items, orderId } = group;
  const shortId = orderId.slice(-6).toUpperCase();
  const unreadCount = items.filter(i => !i.read && !readIds.has(i.id)).length;
  const latestItem = items[0]; // already sorted desc
  const latestMeta = NOTIFICATION_META[latestItem.category] || NOTIFICATION_META.system;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Animated.timing(rotateAnim, { toValue: expanded ? 0 : 1, duration: 200, useNativeDriver: true }).start();
  };

  const rotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <GlassPanel variant="card" style={[styles.groupCard, unreadCount > 0 && styles.notifCardUnread]}>
      <TouchableOpacity style={styles.groupHeader} onPress={toggleExpand} activeOpacity={0.7}>
        {unreadCount > 0 && <View style={styles.unreadDot} />}
        <View style={[styles.notifIcon, { backgroundColor: latestMeta.bg }]}>
          <Ionicons name="cube-outline" size={22} color={latestMeta.color} />
        </View>
        <View style={styles.groupHeaderText}>
          <Text style={styles.groupTitle}>Order #{shortId}</Text>
          <Text style={styles.groupSubtitle} numberOfLines={1}>{latestItem.title} · {items.length} updates</Text>
          <Text style={styles.notifTime}>{formatTime(group.latestDate)}</Text>
        </View>
        <View style={styles.groupRight}>
          {unreadCount > 0 && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>{unreadCount}</Text>
            </View>
          )}
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.groupItems}>
          {items.map((item, idx) => {
            const meta = NOTIFICATION_META[item.category] || NOTIFICATION_META.system;
            const isRead = item.read || readIds.has(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.groupItem, idx < items.length - 1 && styles.groupItemBorder, !isRead && styles.groupItemUnread]}
                onPress={() => onPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.timelineDot, { backgroundColor: meta.color }]} />
                {idx < items.length - 1 && <View style={styles.timelineLine} />}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupItemTitle, !isRead && { fontWeight: fontWeight.bold }]}>{item.title}</Text>
                  <Text style={styles.groupItemBody} numberOfLines={1}>{item.body}</Text>
                  <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markReadBtn} onPress={() => onMarkRead(items.map(i => i.id))}>
              <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </GlassPanel>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const { currentUser } = useAuth();
  const { refreshUnreadCount } = useGlobal();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const readIds = useRef(new Set());
  const listenerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await AsyncStorage.getItem(NOTIF_READ_KEY);
        if (r) readIds.current = new Set(JSON.parse(r));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    listenerRef.current = Notifications.addNotificationReceivedListener(async (notification) => {
      const content = notification.request.content;
      const data = content.data || {};
      const newNotif = {
        id: notification.request.identifier || `push_${Date.now()}`,
        orderId: data.orderId || null,
        category: categorizeNotification(data.type),
        title: content.title || 'Notification',
        body: content.body || '',
        createdAt: new Date().toISOString(),
        read: false,
        data,
      };
      setNotifications(prev => [newNotif, ...prev]);
      try {
        const stored = await AsyncStorage.getItem(NOTIF_STORE_KEY);
        const arr = stored ? JSON.parse(stored) : [];
        arr.unshift(newNotif);
        await AsyncStorage.setItem(NOTIF_STORE_KEY, JSON.stringify(arr.slice(0, 200)));
      } catch {}
    });
    return () => { if (listenerRef.current) Notifications.removeNotificationSubscription(listenerRef.current); };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      let pushNotifs = [];
      try { const stored = await AsyncStorage.getItem(NOTIF_STORE_KEY); if (stored) pushNotifs = JSON.parse(stored); } catch {}

      let orderNotifs = [];
      if (currentUser) {
        try { const res = await api.get('/api/order/user-orders'); orderNotifs = buildNotificationsFromOrders(res.data?.orders || []); } catch {}
      }

      const allMap = new Map();
      [...orderNotifs, ...pushNotifs].forEach(n => { if (!allMap.has(n.id)) allMap.set(n.id, n); });

      if (allMap.size === 0) {
        allMap.set('welcome', { id: 'welcome', category: 'system', title: 'Welcome to Tortrose 👋', body: 'Start shopping to see notifications here.', createdAt: new Date().toISOString(), read: false });
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

  const grouped = groupNotifications(filtered);

  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadByCategory = {};
  notifications.forEach(n => { if (!n.read) unreadByCategory[n.category] = (unreadByCategory[n.category] || 0) + 1; });

  const persistReadIds = useCallback(() => {
    AsyncStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...readIds.current])).catch(() => {});
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const handlePress = useCallback((item) => {
    readIds.current.add(item.id);
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    persistReadIds();
    if (item.orderId) navigation.navigate('OrderDetail', { orderId: item.orderId });
    else if (item.data?.productId) navigation.navigate('ProductDetail', { productId: item.data.productId });
    else if (item.data?.type === 'new_order_received') navigation.navigate('SellerOrderManagement');
    else if (item.data?.type === 'low_stock') navigation.navigate('SellerProductManagement');
  }, [navigation, persistReadIds]);

  const handleMarkGroupRead = useCallback((ids) => {
    ids.forEach(id => readIds.current.add(id));
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    persistReadIds();
  }, [persistReadIds]);

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => readIds.current.add(n.id));
      return prev.map(n => ({ ...n, read: true }));
    });
    persistReadIds();
  }, [persistReadIds]);

  const handleClearAll = useCallback(async () => {
    setNotifications([]);
    readIds.current.clear();
    await AsyncStorage.multiRemove([NOTIF_STORE_KEY, NOTIF_READ_KEY]).catch(() => {});
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const renderGroupedItem = useCallback(({ item: group }) => {
    if (group.type === 'group' && group.items.length > 1) {
      return <OrderGroupCard group={group} onPress={handlePress} onMarkRead={handleMarkGroupRead} readIds={readIds.current} />;
    }
    // Single notification
    const item = group.type === 'group' ? group.items[0] : group.item;
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
  }, [handlePress, handleMarkGroupRead]);

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <GlassPanel variant="floating" style={styles.heroHeader}>
          <TouchableOpacity style={styles.heroBackBtn} onPress={() => { refreshUnreadCount(); navigation.goBack(); }} activeOpacity={0.7}>
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
              <TouchableOpacity style={[styles.chip, isActive && styles.chipActive]} onPress={() => setActiveCategory(cat.key)} activeOpacity={0.7}>
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
            data={grouped}
            keyExtractor={(item, idx) => item.type === 'group' ? `g_${item.orderId}` : `s_${item.item.id}`}
            renderItem={renderGroupedItem}
            contentContainerStyle={[styles.listContent, grouped.length === 0 && styles.listContentEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}><Ionicons name="notifications-off-outline" size={56} color={colors.primaryLight} /></View>
                <Text style={styles.emptyTitle}>{activeCategory === 'all' ? 'No notifications yet' : `No ${activeCategory} notifications`}</Text>
                <Text style={styles.emptySubtitle}>We'll notify you about orders, deals, and more</Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} colors={[colors.primary]} tintColor={colors.primary} />}
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

  // Single notification card
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

  // Grouped order card
  groupCard: { marginBottom: spacing.sm, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, position: 'relative' },
  groupHeaderText: { flex: 1, marginLeft: spacing.md },
  groupTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  groupSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  groupRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  groupBadge: { backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  groupBadgeText: { color: colors.white, fontSize: 10, fontWeight: fontWeight.bold },
  groupItems: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingHorizontal: spacing.md },
  groupItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md, paddingLeft: spacing.lg, position: 'relative' },
  groupItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  groupItemUnread: { backgroundColor: 'rgba(99,102,241,0.04)' },
  groupItemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  groupItemBody: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', left: 0, top: 18 },
  timelineLine: { position: 'absolute', left: 4, top: 30, width: 2, bottom: 0, backgroundColor: 'rgba(255,255,255,0.1)' },
  markReadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  markReadText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(99,102,241,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
