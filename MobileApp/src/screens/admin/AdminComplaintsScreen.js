/**
 * AdminComplaintsScreen — Liquid Glass
 * Manage customer complaints, suggestions, and support requests
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
import { spacing, fontSize, fontWeight, borderRadius, typography } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORIES = [
  { value: '', label: 'All', icon: 'apps' },
  { value: 'product_issue', label: 'Product', icon: 'cube' },
  { value: 'order_issue', label: 'Order', icon: 'receipt' },
  { value: 'delivery', label: 'Delivery', icon: 'car' },
  { value: 'refund', label: 'Refund', icon: 'cash' },
  { value: 'seller_complaint', label: 'Seller', icon: 'person' },
  { value: 'website_bug', label: 'Bug', icon: 'bug' },
  { value: 'suggestion', label: 'Suggestion', icon: 'bulb' },
  { value: 'other', label: 'Other', icon: 'help-circle' },
];

const STATUSES = [
  { value: '', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const getStatusColors = (palette) => ({
  open: palette.colors.error,
  in_progress: palette.colors.warning,
  resolved: palette.colors.success,
  closed: palette.colors.gray,
});

const getPriorityColors = (palette) => ({
  low: palette.colors.gray,
  medium: palette.colors.info,
  high: palette.colors.warning,
  urgent: palette.colors.error,
});

export default function AdminComplaintsScreen({ navigation }) {
  const { palette } = useTheme();
  const styles = buildStyles(palette);
  const statusColors = getStatusColors(palette);
  const priorityColors = getPriorityColors(palette);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [stats, setStats] = useState({ statusStats: {} });

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      const res = await api.get(`/api/chatbot/complaints?${params}`);
      setComplaints(res.data.complaints || []);
      setStats({ statusStats: res.data.statusStats || {}, categoryStats: res.data.categoryStats || {} });
    } catch (e) { Alert.alert('Error', 'Failed to fetch complaints'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [category, status]);

  useEffect(() => { fetchComplaints(); }, [category, status]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchComplaints(); }, [fetchComplaints]);

  const handleUpdate = async (id, updates) => {
    setUpdatingId(id);
    try {
      await api.put(`/api/chatbot/complaint/${id}`, updates);
      Alert.alert('Success', 'Complaint updated');
      fetchComplaints();
    } catch (e) { Alert.alert('Error', 'Failed to update'); }
    finally { setUpdatingId(null); }
  };

  const filtered = search
    ? complaints.filter(c => c.subject?.toLowerCase().includes(search.toLowerCase()) || c.message?.toLowerCase().includes(search.toLowerCase()))
    : complaints;

  const totalOpen = stats.statusStats?.open || 0;
  const totalInProgress = stats.statusStats?.in_progress || 0;
  const totalResolved = stats.statusStats?.resolved || 0;

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={palette.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Complaints & Feedback</Text>
            <Text style={styles.subtitle}>Manage support requests</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.colors.primary} />}
        >
          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Open', value: totalOpen, color: statusColors.open, icon: 'alert-circle' },
              { label: 'In Progress', value: totalInProgress, color: statusColors.in_progress, icon: 'time' },
              { label: 'Resolved', value: totalResolved, color: statusColors.resolved, icon: 'checkmark-circle' },
              { label: 'Total', value: complaints.length, color: palette.colors.info, icon: 'chatbubbles' },
            ].map((s, i) => (
              <GlassPanel key={i} variant="card" style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${s.color}15` }]}>
                  <Ionicons name={s.icon} size={18} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </GlassPanel>
            ))}
          </View>

          {/* Category Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setCategory(category === cat.value ? '' : cat.value)}
                style={[styles.catChip, category === cat.value && styles.catChipActive]}
              >
                <Ionicons name={cat.icon} size={14} color={category === cat.value ? palette.colors.white : palette.colors.primary} />
                <Text style={[styles.catChipText, category === cat.value && { color: palette.colors.white }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Search */}
          <GlassPanel variant="card" style={styles.searchPanel}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={palette.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search complaints..."
                placeholderTextColor={palette.colors.textLight}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </GlassPanel>

          {/* List */}
          {loading ? (
            <Loader fullScreen={false} message="Loading..." />
          ) : filtered.length === 0 ? (
            <GlassPanel variant="card" style={styles.emptyPanel}>
              <Ionicons name="chatbubbles-outline" size={40} color={palette.colors.textLight} />
              <Text style={styles.emptyText}>No complaints found</Text>
            </GlassPanel>
          ) : (
            filtered.map(c => {
              const sc = statusColors[c.status] || statusColors.open;
              const pc = priorityColors[c.priority] || priorityColors.medium;
              const isExpanded = expandedId === c._id;
              const catInfo = CATEGORIES.find(cat => cat.value === c.category);

              return (
                <TouchableOpacity
                  key={c._id}
                  activeOpacity={0.8}
                  onPress={() => setExpandedId(isExpanded ? null : c._id)}
                >
                  <GlassPanel variant="card" style={styles.complaintCard}>
                    <View style={styles.complaintRow}>
                      <View style={[styles.statusDot, { backgroundColor: `${sc}15` }]}>
                        <Ionicons
                          name={c.status === 'open' ? 'alert-circle' : c.status === 'in_progress' ? 'time' : 'checkmark-circle'}
                          size={16} color={sc}
                        />
                      </View>
                      <View style={styles.complaintInfo}>
                        <View style={styles.complaintHeader}>
                          <Text style={styles.complaintSubject} numberOfLines={1}>{c.subject}</Text>
                        </View>
                        <View style={styles.badgesRow}>
                          <View style={[styles.badge, { backgroundColor: `${sc}15` }]}>
                            <Text style={[styles.badgeText, { color: sc }]}>{(c.status || '').replace('_', ' ')}</Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: `${pc}15` }]}>
                            <Text style={[styles.badgeText, { color: pc }]}>{c.priority}</Text>
                          </View>
                        </View>
                        <Text style={styles.complaintPreview} numberOfLines={1}>{c.message}</Text>
                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            <Ionicons name="person-outline" size={11} color={palette.colors.textSecondary} />
                            <Text style={styles.metaText}>{c.user?.username || 'Unknown'}</Text>
                          </View>
                          <Text style={styles.metaText}>{catInfo?.label || c.category}</Text>
                          <Text style={styles.metaText}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={palette.colors.textSecondary} />
                    </View>

                    {/* Expanded */}
                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        <View style={styles.fullMessage}>
                          <Text style={styles.fullMessageLabel}>Full Message:</Text>
                          <Text style={styles.fullMessageText}>{c.message}</Text>
                        </View>
                        {c.user?.email && (
                          <Text style={styles.emailText}>Email: {c.user.email}</Text>
                        )}
                        {c.adminResponse && (
                          <View style={styles.adminResponseBox}>
                            <Text style={styles.adminResponseLabel}>Admin Response:</Text>
                            <Text style={styles.adminResponseText}>{c.adminResponse}</Text>
                          </View>
                        )}
                        <View style={styles.responseRow}>
                          <TextInput
                            style={styles.responseInput}
                            placeholder="Write response..."
                            placeholderTextColor={palette.colors.textLight}
                            value={adminResponse}
                            onChangeText={setAdminResponse}
                          />
                          <TouchableOpacity
                            onPress={() => { handleUpdate(c._id, { adminResponse, status: 'in_progress' }); setAdminResponse(''); }}
                            disabled={!adminResponse.trim() || updatingId === c._id}
                            style={[styles.respondBtn, (!adminResponse.trim() || updatingId === c._id) && { opacity: 0.5 }]}
                          >
                            {updatingId === c._id ? (
                              <ActivityIndicator size="small" color={palette.colors.white} />
                            ) : (
                              <Ionicons name="send" size={16} color={palette.colors.white} />
                            )}
                          </TouchableOpacity>
                        </View>
                        <View style={styles.statusBtns}>
                          {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                            <TouchableOpacity
                              key={s}
                              onPress={() => handleUpdate(c._id, { status: s })}
                              style={[styles.statusBtn, c.status === s && { backgroundColor: `${statusColors[s]}20`, borderColor: statusColors[s] }]}
                            >
                              <Text style={[styles.statusBtnText, { color: statusColors[s] }]}>{s.replace('_', ' ')}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </GlassPanel>
                </TouchableOpacity>
              );
            })
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
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, color: p.colors.text },
  statLabel: { fontSize: 10, color: p.colors.textSecondary, marginTop: 2 },
  catRow: { gap: spacing.xs, paddingBottom: spacing.md },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: `${p.colors.primary}10` },
  catChipActive: { backgroundColor: p.colors.primary },
  catChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: p.colors.primary },
  searchPanel: { padding: spacing.md, marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${p.colors.gray}08`, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, color: p.colors.text, padding: 0 },
  emptyPanel: { padding: spacing.xxxl, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: p.colors.textSecondary },
  complaintCard: { padding: spacing.md, marginBottom: spacing.sm },
  complaintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  statusDot: { width: 32, height: 32, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  complaintInfo: { flex: 1 },
  complaintHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  complaintSubject: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: p.colors.text, flex: 1 },
  badgesRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: 10, fontWeight: fontWeight.medium, textTransform: 'capitalize' },
  complaintPreview: { fontSize: fontSize.xs, color: p.colors.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: p.colors.textSecondary },
  expandedSection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: `${p.colors.gray}10` },
  fullMessage: { backgroundColor: `${p.colors.gray}06`, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  fullMessageLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: p.colors.text, marginBottom: 4 },
  fullMessageText: { fontSize: fontSize.sm, color: p.colors.textSecondary, lineHeight: 20 },
  emailText: { fontSize: fontSize.xs, color: p.colors.textSecondary, marginBottom: spacing.sm },
  adminResponseBox: { backgroundColor: `${p.colors.info}08`, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: p.colors.info },
  adminResponseLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: p.colors.info, marginBottom: 4 },
  adminResponseText: { fontSize: fontSize.sm, color: p.colors.text },
  responseRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  responseInput: { flex: 1, fontSize: fontSize.sm, color: p.colors.text, backgroundColor: `${p.colors.gray}08`, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  respondBtn: { width: 40, height: 40, borderRadius: borderRadius.lg, backgroundColor: p.colors.primary, alignItems: 'center', justifyContent: 'center' },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statusBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, borderWidth: 1, borderColor: `${p.colors.gray}20` },
  statusBtnText: { fontSize: 11, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
});
