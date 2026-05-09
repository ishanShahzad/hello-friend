/**
 * SellerComplaintsScreen — Liquid Glass
 * Inbox of complaints/feedback filed against the seller's store.
 * Backend: GET /api/chatbot/complaints scoped server-side by role; we filter by category here.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Loader from '../../components/common/Loader';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import { spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

export default function SellerComplaintsScreen({ navigation }) {
  const { palette } = useTheme();
  const styles = buildStyles(palette);

  const STATUS_COLORS = {
    open: palette.colors.error,
    in_progress: palette.colors.warning,
    resolved: palette.colors.success,
    closed: palette.colors.gray,
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [response, setResponse] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      const res = await api.get(`/api/chatbot/complaints?${params}`);
      // Backend returns scoped to user; if admin endpoint, filter to relevant categories
      const all = res.data?.complaints || [];
      // Show product/order/seller related complaints relevant to a seller
      const relevant = all.filter(c =>
        ['product_issue', 'order_issue', 'delivery', 'refund', 'seller_complaint'].includes(c.category)
      );
      setItems(relevant);
    } catch (e) { Alert.alert('Error', 'Failed to load complaints'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const update = async (id, updates) => {
    setUpdatingId(id);
    try {
      await api.put(`/api/chatbot/complaint/${id}`, updates);
      setResponse(''); fetchData();
    } catch { Alert.alert('Error', 'Failed to update'); }
    finally { setUpdatingId(null); }
  };

  const filtered = search
    ? items.filter(c => c.subject?.toLowerCase().includes(search.toLowerCase()) || c.message?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={palette.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Complaints</Text>
            <Text style={styles.subtitle}>Customer issues for your store</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={palette.colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
            {STATUSES.map(s => (
              <TouchableOpacity key={s.value} onPress={() => setStatus(s.value)}
                style={[styles.chip, status === s.value && styles.chipActive]}>
                <Text style={[styles.chipText, status === s.value && { color: palette.colors.white }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <GlassPanel variant="card" style={styles.searchPanel}>
            <View style={styles.searchInner}>
              <Ionicons name="search" size={14} color={palette.colors.textSecondary} />
              <TextInput style={styles.searchInput} placeholder="Search complaints..."
                placeholderTextColor={palette.colors.textLight} value={search} onChangeText={setSearch} />
            </View>
          </GlassPanel>

          {loading ? <Loader fullScreen={false} message="Loading..." /> :
            filtered.length === 0 ? (
              <GlassPanel variant="card" style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={36} color={palette.colors.textLight} />
                <Text style={styles.emptyText}>No complaints right now</Text>
              </GlassPanel>
            ) : filtered.map(c => {
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.open;
              const isExpanded = expandedId === c._id;
              return (
                <TouchableOpacity key={c._id} activeOpacity={0.85}
                  onPress={() => setExpandedId(isExpanded ? null : c._id)}>
                  <GlassPanel variant="card" style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.statusDot, { backgroundColor: `${sc}20` }]}>
                        <Ionicons name={c.status === 'resolved' ? 'checkmark-circle' : 'alert-circle'} size={14} color={sc} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subject} numberOfLines={1}>{c.subject}</Text>
                        <Text style={styles.preview} numberOfLines={1}>{c.message}</Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.meta}>{c.user?.username || 'Customer'}</Text>
                          <Text style={styles.meta}>·</Text>
                          <Text style={styles.meta}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                          <View style={[styles.badge, { backgroundColor: `${sc}15` }]}>
                            <Text style={[styles.badgeText, { color: sc }]}>{(c.status || '').replace('_', ' ')}</Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={palette.colors.textSecondary} />
                    </View>

                    {isExpanded && (
                      <View style={styles.expanded}>
                        <Text style={styles.fullMsg}>{c.message}</Text>
                        {c.adminResponse ? (
                          <View style={styles.respBox}>
                            <Text style={styles.respLabel}>Previous response</Text>
                            <Text style={styles.respText}>{c.adminResponse}</Text>
                          </View>
                        ) : null}
                        <View style={styles.replyRow}>
                          <TextInput value={response} onChangeText={setResponse}
                            placeholder="Reply to customer..." placeholderTextColor={palette.colors.textLight}
                            style={styles.replyInput} />
                          <TouchableOpacity disabled={!response.trim() || updatingId === c._id}
                            onPress={() => update(c._id, { adminResponse: response, status: 'in_progress' })}
                            style={[styles.sendBtn, (!response.trim() || updatingId === c._id) && { opacity: 0.5 }]}>
                            {updatingId === c._id ? <ActivityIndicator size="small" color={palette.colors.white} /> :
                              <Ionicons name="send" size={14} color={palette.colors.white} />}
                          </TouchableOpacity>
                        </View>
                        <View style={styles.statusBtns}>
                          {['open', 'in_progress', 'resolved'].map(s => (
                            <TouchableOpacity key={s} onPress={() => update(c._id, { status: s })}
                              style={[styles.statusBtn, c.status === s && { backgroundColor: `${STATUS_COLORS[s]}20`, borderColor: STATUS_COLORS[s] }]}>
                              <Text style={[styles.statusBtnText, { color: STATUS_COLORS[s] }]}>{s.replace('_', ' ')}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </GlassPanel>
                </TouchableOpacity>
              );
            })}

          <View style={{ height: 60 }} />
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

  statusRow: { gap: spacing.xs, paddingBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: `${p.colors.primary}10` },
  chipActive: { backgroundColor: p.colors.primary },
  chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: p.colors.primary },

  searchPanel: { padding: spacing.md, marginBottom: spacing.md },
  searchInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${p.colors.gray}08`, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: p.colors.text, padding: 0 },

  empty: { alignItems: 'center', padding: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: p.colors.textSecondary },

  card: { padding: spacing.md, marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  statusDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subject: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: p.colors.text },
  preview: { fontSize: 11, color: p.colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  meta: { fontSize: 10, color: p.colors.textSecondary },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, marginLeft: 'auto' },
  badgeText: { fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'capitalize' },

  expanded: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.glass.borderSubtle },
  fullMsg: { fontSize: fontSize.sm, color: p.colors.text, lineHeight: 20, marginBottom: spacing.sm },
  respBox: { backgroundColor: `${p.colors.info}10`, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: p.colors.info },
  respLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: p.colors.info, marginBottom: 2 },
  respText: { fontSize: fontSize.sm, color: p.colors.text },
  replyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  replyInput: { flex: 1, fontSize: fontSize.sm, color: p.colors.text, backgroundColor: `${p.colors.gray}08`, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: p.glass.borderSubtle },
  sendBtn: { width: 40, height: 40, borderRadius: borderRadius.lg, backgroundColor: p.colors.primary, alignItems: 'center', justifyContent: 'center' },
  statusBtns: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, borderWidth: 1, borderColor: `${p.colors.gray}20` },
  statusBtnText: { fontSize: 11, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
});
