/**
 * AdminSubscriptionsScreen — Liquid Glass
 * Platform-wide overview of every seller subscription:
 *   • Aggregate counts by status
 *   • Estimated MRR
 *   • Filterable, searchable list with seller + store + plan info
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Loader from '../../components/common/Loader';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import { EmptyState } from '../../components/common/EmptyState';
import { spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

const STATUS_FILTERS = [
  { key: 'all', label: 'All', icon: 'apps-outline', color: palette.colors.primary },
  { key: 'trial', label: 'Trial', icon: 'time-outline', color: palette.colors.warning },
  { key: 'free_period', label: 'Free', icon: 'gift-outline', color: palette.colors.info },
  { key: 'active', label: 'Active', icon: 'checkmark-circle-outline', color: palette.colors.success },
  { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', color: palette.colors.gray },
  { key: 'blocked', label: 'Blocked', icon: 'ban-outline', color: palette.colors.error },
];

const STATUS_META = {
  trial:       { color: palette.colors.warning,         label: 'Trial' },
  free_period: { color: palette.colors.info,            label: 'Free Period' },
  active:      { color: palette.colors.success,         label: 'Active' },
  past_due:    { color: palette.colors.error,           label: 'Past Due' },
  cancelled:   { color: palette.colors.gray,            label: 'Cancelled' },
  blocked:     { color: palette.colors.error,           label: 'Blocked' },
};

const formatDate = (date) => {
  if (!date) return '—';
  try { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

export default function AdminSubscriptionsScreen({ navigation }) {
  const { palette } = useTheme();
  const styles = buildStyles(palette);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/subscriptions/admin/all');
      if (res.data?.success) {
        setStats(res.data.stats || null);
        setSubscriptions(res.data.subscriptions || []);
      }
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let list = subscriptions;
    if (filter !== 'all') list = list.filter(s => s.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.seller?.username?.toLowerCase().includes(q) ||
        s.seller?.email?.toLowerCase().includes(q) ||
        s.store?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [subscriptions, filter, search]);

  if (loading) return <GlassBackground><Loader fullScreen message="Loading subscriptions..." /></GlassBackground>;

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <GlassPanel variant="floating" style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={palette.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Subscriptions</Text>
            <Text style={styles.subtitle}>Platform-wide seller plans</Text>
          </View>
        </GlassPanel>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.colors.primary} />}
        >
          {/* MRR Hero */}
          {stats && (
            <GlassPanel variant="strong" style={styles.mrrHero}>
              <View style={styles.mrrIcon}>
                <Ionicons name="trending-up" size={28} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mrrLabel}>Monthly Recurring Revenue</Text>
                <Text style={styles.mrrValue}>${stats.monthlyRecurringRevenue.toLocaleString()}</Text>
                <Text style={styles.mrrHint}>{stats.payingSellers} paying seller{stats.payingSellers !== 1 ? 's' : ''}</Text>
              </View>
            </GlassPanel>
          )}

          {/* Stat Pills */}
          {stats && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {STATUS_FILTERS.filter(f => f.key !== 'all').map(f => (
                <View key={f.key} style={styles.statPill}>
                  <View style={[styles.statPillIcon, { backgroundColor: `${f.color}18` }]}>
                    <Ionicons name={f.icon} size={16} color={f.color} />
                  </View>
                  <Text style={styles.statPillValue}>{stats[f.key] || 0}</Text>
                  <Text style={styles.statPillLabel}>{f.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={palette.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search seller, email, or store…"
              placeholderTextColor={palette.colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={palette.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {STATUS_FILTERS.map(f => {
              const isActive = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chip, isActive && { backgroundColor: f.color, borderColor: f.color }]}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={f.icon} size={14} color={isActive ? '#fff' : f.color} />
                  <Text style={[styles.chipText, isActive && { color: '#fff' }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* List */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
            {filtered.length === 0 ? (
              <EmptyState
                icon="card-outline"
                title="No subscriptions"
                message={search || filter !== 'all' ? 'Try a different filter or search term.' : 'No seller subscriptions yet.'}
              />
            ) : filtered.map(sub => {
              const meta = STATUS_META[sub.status] || { color: palette.colors.gray, label: sub.status };
              return (
                <GlassPanel key={sub._id} variant="card" style={styles.subCard}>
                  <View style={styles.subHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sellerName} numberOfLines={1}>
                        {sub.seller?.username || 'Unknown seller'}
                      </Text>
                      <Text style={styles.sellerEmail} numberOfLines={1}>{sub.seller?.email || '—'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${meta.color}1A`, borderColor: meta.color }]}>
                      <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>

                  {sub.store?.name && (
                    <View style={styles.storeRow}>
                      <Ionicons name="storefront-outline" size={14} color={palette.colors.primary} />
                      <Text style={styles.storeName} numberOfLines={1}>{sub.store.name}</Text>
                      {sub.store.verification?.isVerified && (
                        <Ionicons name="shield-checkmark" size={14} color={palette.colors.success} />
                      )}
                    </View>
                  )}

                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Plan</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>{sub.planName || '—'}</Text>
                    </View>
                    {sub.status === 'trial' ? (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Trial Ends</Text>
                        <Text style={styles.metaValue}>{formatDate(sub.trialEndDate)}</Text>
                      </View>
                    ) : (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Renews</Text>
                        <Text style={styles.metaValue}>{formatDate(sub.currentPeriodEnd)}</Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Since</Text>
                      <Text style={styles.metaValue}>{formatDate(sub.subscribedAt || sub.trialStartDate)}</Text>
                    </View>
                  </View>

                  {sub.status === 'blocked' && sub.blockedReason && (
                    <View style={styles.blockedNote}>
                      <Ionicons name="alert-circle" size={14} color={palette.colors.error} />
                      <Text style={styles.blockedText} numberOfLines={2}>{sub.blockedReason}</Text>
                    </View>
                  )}
                </GlassPanel>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const buildStyles = (p) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: p.colors.text },
  subtitle: { fontSize: fontSize.xs, color: p.colors.textSecondary, marginTop: 1 },

  mrrHero: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    margin: spacing.lg, padding: spacing.lg,
  },
  mrrIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: p.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  mrrLabel: { fontSize: fontSize.xs, color: p.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  mrrValue: { fontSize: 28, fontWeight: fontWeight.extrabold, color: p.colors.text, marginTop: 2 },
  mrrHint: { fontSize: fontSize.sm, color: p.colors.textSecondary, marginTop: 2 },

  pillsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  statPill: {
    backgroundColor: p.glass.bg || 'rgba(255,255,255,0.55)',
    borderRadius: 16, padding: spacing.md, marginRight: spacing.sm,
    alignItems: 'center', minWidth: 84,
    borderWidth: 1, borderColor: p.glass.border || 'rgba(255,255,255,0.5)',
  },
  statPillIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statPillValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: p.colors.text },
  statPillLabel: { fontSize: 10, color: p.colors.textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: p.glass.bg || 'rgba(255,255,255,0.55)',
    borderRadius: 14, borderWidth: 1, borderColor: p.glass.borderSubtle,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: p.colors.text, padding: 0 },

  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: 999, marginRight: spacing.xs,
    backgroundColor: p.glass.bgSubtle, borderWidth: 1, borderColor: p.glass.borderSubtle,
  },
  chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: p.colors.text },

  subCard: { padding: spacing.md, marginBottom: spacing.sm },
  subHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  sellerName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: p.colors.text },
  sellerEmail: { fontSize: fontSize.xs, color: p.colors.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  storeName: { flex: 1, fontSize: fontSize.sm, color: p.colors.text, fontWeight: fontWeight.medium },

  metaGrid: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: p.glass.borderSubtle },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 10, color: p.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: p.colors.text },

  blockedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.sm, padding: spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10,
  },
  blockedText: { flex: 1, fontSize: fontSize.xs, color: p.colors.error },
});
