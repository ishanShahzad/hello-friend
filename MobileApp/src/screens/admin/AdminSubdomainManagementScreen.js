/**
 * AdminSubdomainManagementScreen — Liquid Glass
 * View/manage all store subdomains, traffic, verification
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import api from '../../config/api';
import Loader from '../../components/common/Loader';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import { spacing, fontSize, fontWeight, borderRadius, typography } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'pending', label: 'Pending' },
];

export default function AdminSubdomainManagementScreen({ navigation }) {
  const { palette } = useTheme();
  const styles = buildStyles(palette);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stores, setStores] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [editingStore, setEditingStore] = useState(null);
  const [editSlug, setEditSlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', page);
      params.append('limit', 15);
      const res = await api.get(`/api/subdomain/admin/all?${params}`);
      setStores(res.data.stores || []);
      setSummary(res.data.summary || {});
      setPagination(res.data.pagination || {});
    } catch (e) { Alert.alert('Error', 'Failed to load subdomain data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchData(); }, [statusFilter, page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchData(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const handleUpdateSlug = async (storeId) => {
    if (!editSlug || editSlug.length < 3) { Alert.alert('Error', 'Subdomain must be at least 3 characters'); return; }
    try {
      setSavingSlug(true);
      await api.put(`/api/subdomain/admin/${storeId}/update-slug`, { newSlug: editSlug });
      Alert.alert('Success', 'Subdomain updated!');
      setEditingStore(null);
      fetchData();
    } catch (e) { Alert.alert('Error', e.response?.data?.msg || 'Failed to update'); }
    finally { setSavingSlug(false); }
  };

  const handleToggleVerification = async (store) => {
    try {
      if (store.verification?.isVerified) {
        await api.put(`/api/stores/verification/${store._id}/remove`, { reason: 'Admin action' });
        Alert.alert('Success', 'Verification removed');
      } else {
        await api.put(`/api/stores/verification/${store._id}/approve`, {});
        Alert.alert('Success', 'Store verified');
      }
      fetchData();
    } catch (e) { Alert.alert('Error', e.response?.data?.msg || 'Action failed'); }
  };

  const getStatusBadge = (store) => {
    if (store.isSubdomainActive) return { label: 'Active', color: palette.colors.success, icon: 'checkmark-circle' };
    if (store.verification?.status === 'pending') return { label: 'Pending', color: palette.colors.warning, icon: 'time' };
    return { label: 'Inactive', color: palette.colors.gray, icon: 'lock-closed' };
  };

  const summaryCards = [
    { label: 'Total Stores', value: summary.totalStores || 0, icon: 'globe-outline', color: palette.colors.primary },
    { label: 'Active', value: summary.activeSubdomains || 0, icon: 'checkmark-circle-outline', color: palette.colors.success },
    { label: 'Inactive', value: summary.inactiveSubdomains || 0, icon: 'lock-closed-outline', color: palette.colors.warning },
    { label: 'Pending', value: summary.pendingVerifications || 0, icon: 'time-outline', color: palette.colors.error },
  ];

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={palette.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Subdomain Management</Text>
            <Text style={styles.subtitle}>Manage store subdomains & verification</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.colors.primary} />}
        >
          {/* Summary */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
            {summaryCards.map((c, i) => (
              <GlassPanel key={i} variant="card" style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: `${c.color}15` }]}>
                  <Ionicons name={c.icon} size={18} color={c.color} />
                </View>
                <Text style={styles.summaryValue}>{c.value}</Text>
                <Text style={styles.summaryLabel}>{c.label}</Text>
              </GlassPanel>
            ))}
          </ScrollView>

          {/* Search & Tabs */}
          <GlassPanel variant="card" style={styles.filterPanel}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={palette.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stores..."
                placeholderTextColor={palette.colors.textLight}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {STATUS_TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => { setStatusFilter(tab.key); setPage(1); }}
                  style={[styles.tab, statusFilter === tab.key && styles.tabActive]}
                >
                  <Text style={[styles.tabText, statusFilter === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassPanel>

          {/* Store List */}
          {loading ? (
            <Loader fullScreen={false} message="Loading..." />
          ) : stores.length === 0 ? (
            <GlassPanel variant="card" style={styles.emptyPanel}>
              <Ionicons name="globe-outline" size={40} color={palette.colors.textLight} />
              <Text style={styles.emptyText}>No stores found</Text>
            </GlassPanel>
          ) : (
            stores.map((store) => {
              const badge = getStatusBadge(store);
              return (
                <GlassPanel key={store._id} variant="card" style={styles.storeCard}>
                  <View style={styles.storeRow}>
                    {store.logo ? (
                      <Image source={{ uri: store.logo }} style={styles.storeLogo} />
                    ) : (
                      <View style={[styles.storeLogo, styles.logoPlaceholder]}>
                        <Ionicons name="globe-outline" size={18} color={palette.colors.textLight} />
                      </View>
                    )}
                    <View style={styles.storeInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.storeName} numberOfLines={1}>{store.storeName}</Text>
                        <View style={[styles.badge, { backgroundColor: `${badge.color}15` }]}>
                          <Ionicons name={badge.icon} size={10} color={badge.color} />
                          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      </View>

                      {editingStore === store._id ? (
                        <View style={styles.editRow}>
                          <TextInput
                            style={styles.editInput}
                            value={editSlug}
                            onChangeText={(t) => setEditSlug(t.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="new-slug"
                            placeholderTextColor={palette.colors.textLight}
                            autoCapitalize="none"
                          />
                          <TouchableOpacity onPress={() => handleUpdateSlug(store._id)} disabled={savingSlug}>
                            {savingSlug ? <ActivityIndicator size="small" color={palette.colors.success} /> : <Ionicons name="checkmark" size={18} color={palette.colors.success} />}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditingStore(null)}>
                            <Ionicons name="close" size={18} color={palette.colors.error} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.slugRow}>
                          <Text style={styles.slugText} numberOfLines={1}>{store.subdomainUrl}</Text>
                          <TouchableOpacity onPress={() => { setEditingStore(store._id); setEditSlug(store.storeSlug); }}>
                            <Ionicons name="pencil" size={12} color={palette.colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text style={styles.sellerText} numberOfLines={1}>
                        {store.seller?.username} · {store.seller?.email}
                      </Text>
                    </View>
                  </View>

                  {/* Metrics */}
                  <View style={styles.metricsRow}>
                    {[
                      { l: 'Views', v: store.views },
                      { l: 'Products', v: store.productCount },
                      { l: 'Orders', v: store.totalOrders },
                      { l: 'Trust', v: store.trustCount },
                    ].map((m, i) => (
                      <View key={i} style={styles.metric}>
                        <Text style={styles.metricValue}>{m.v || 0}</Text>
                        <Text style={styles.metricLabel}>{m.l}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action */}
                  <TouchableOpacity
                    onPress={() => handleToggleVerification(store)}
                    style={[styles.actionBtn, { backgroundColor: store.isSubdomainActive ? `${palette.colors.error}15` : `${palette.colors.success}15` }]}
                  >
                    <Ionicons name={store.isSubdomainActive ? 'close-circle-outline' : 'checkmark-circle-outline'} size={16} color={store.isSubdomainActive ? palette.colors.error : palette.colors.success} />
                    <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: store.isSubdomainActive ? palette.colors.error : palette.colors.success }}>
                      {store.isSubdomainActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </GlassPanel>
              );
            })
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <View style={styles.paginationRow}>
              {Array.from({ length: pagination.pages }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setPage(i + 1)}
                  style={[styles.pageBtn, page === i + 1 && styles.pageBtnActive]}
                >
                  <Text style={[styles.pageBtnText, page === i + 1 && styles.pageBtnTextActive]}>{i + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const buildStyles = (p) => StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${p.colors.gray}10`, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, color: p.colors.text },
  subtitle: { fontSize: fontSize.xs, color: p.colors.textSecondary, marginTop: 2 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  summaryRow: { gap: spacing.sm, paddingBottom: spacing.md },
  summaryCard: { padding: spacing.md, alignItems: 'center', minWidth: 90 },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  summaryValue: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, color: p.colors.text },
  summaryLabel: { fontSize: fontSize.xs, color: p.colors.textSecondary, marginTop: 2 },
  filterPanel: { padding: spacing.md, marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${p.colors.gray}08`, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, color: p.colors.text, padding: 0 },
  tabsRow: { gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  tabActive: { backgroundColor: p.colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: p.colors.textSecondary },
  tabTextActive: { color: p.colors.white },
  emptyPanel: { padding: spacing.xxxl, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: p.colors.textSecondary },
  storeCard: { padding: spacing.md, marginBottom: spacing.sm },
  storeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  storeLogo: { width: 40, height: 40, borderRadius: borderRadius.lg },
  logoPlaceholder: { backgroundColor: `${p.colors.gray}10`, alignItems: 'center', justifyContent: 'center' },
  storeInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  storeName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: p.colors.text, flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: 10, fontWeight: fontWeight.semibold },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  editInput: { flex: 1, fontSize: fontSize.sm, color: p.colors.text, backgroundColor: `${p.colors.gray}08`, borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  slugRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  slugText: { fontSize: fontSize.xs, color: p.colors.primary, fontFamily: 'monospace' },
  sellerText: { fontSize: 10, color: p.colors.textSecondary, marginTop: 2 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: `${p.colors.gray}10` },
  metric: { alignItems: 'center' },
  metricValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: p.colors.text },
  metricLabel: { fontSize: 10, color: p.colors.textSecondary, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, marginTop: spacing.md },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md },
  pageBtn: { width: 32, height: 32, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: `${p.colors.gray}10` },
  pageBtnActive: { backgroundColor: p.colors.primary },
  pageBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: p.colors.textSecondary },
  pageBtnTextActive: { color: p.colors.white },
});
