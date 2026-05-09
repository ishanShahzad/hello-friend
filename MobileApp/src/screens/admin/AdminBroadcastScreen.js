/**
 * AdminBroadcastScreen — Liquid Glass
 * Send platform-wide push / in-app / email / WhatsApp broadcasts.
 * Mirrors web AdminBroadcastPanel.jsx (compose, audience, channels, schedule, history).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Loader from '../../components/common/Loader';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import { spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORIES = [
  { id: 'announcement', label: 'Announcement', icon: 'megaphone' },
  { id: 'promo', label: 'Promotion', icon: 'pricetag' },
  { id: 'system', label: 'System', icon: 'information-circle' },
];

const AUDIENCES = [
  { id: 'all_users', label: 'All Users', icon: 'person', desc: 'All buyer accounts' },
  { id: 'all_sellers', label: 'All Sellers', icon: 'storefront', desc: 'All sellers' },
  { id: 'both', label: 'Everyone', icon: 'people', desc: 'Users + sellers' },
  { id: 'specific', label: 'Specific', icon: 'search', desc: 'Pick people' },
];

const CHANNELS = [
  { id: 'inapp', label: 'In-App', icon: 'globe' },
  { id: 'push', label: 'Push', icon: 'phone-portrait' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
];

const STATUS_META = {
  scheduled: { label: 'Scheduled', icon: 'time' },
  sending: { label: 'Sending', icon: 'sync' },
  sent: { label: 'Sent', icon: 'checkmark-circle' },
  cancelled: { label: 'Cancelled', icon: 'close-circle' },
  failed: { label: 'Failed', icon: 'alert-circle' },
};

export default function AdminBroadcastScreen({ navigation }) {
  const { palette } = useTheme();
  const styles = buildStyles(palette);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('announcement');
  const [linkTo, setLinkTo] = useState('');
  const [audience, setAudience] = useState('all_users');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [channels, setChannels] = useState(['inapp', 'push']);
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduledAt, setScheduledAt] = useState('');
  const [audienceCount, setAudienceCount] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const STATUS_COLORS = useMemo(() => ({
    scheduled: palette.colors.warning,
    sending: palette.colors.info,
    sent: palette.colors.success,
    cancelled: palette.colors.gray,
    failed: palette.colors.error,
  }), [palette]);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications/broadcasts');
      setJobs(data?.jobs || []);
    } catch {} finally { setLoadingJobs(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Audience preview (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const params = { audience };
        if (audience === 'specific') params.userIds = selectedUsers.map(u => u._id).join(',');
        const { data } = await api.get('/api/notifications/audience-preview', { params });
        setAudienceCount(data?.count ?? 0);
      } catch { setAudienceCount(null); }
    }, 250);
    return () => clearTimeout(t);
  }, [audience, selectedUsers]);

  // User search (debounced)
  useEffect(() => {
    if (audience !== 'specific' || !searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/api/notifications/users-search', { params: { q: searchQuery } });
        setSearchResults(data?.users || []);
      } catch { setSearchResults([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, audience]);

  const addUser = (u) => {
    if (selectedUsers.find(x => x._id === u._id)) return;
    setSelectedUsers([...selectedUsers, u]);
    setSearchQuery(''); setSearchResults([]);
  };
  const removeUser = (id) => setSelectedUsers(selectedUsers.filter(u => u._id !== id));
  const toggleChannel = (id) =>
    setChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !body.trim()) return false;
    if (channels.length === 0) return false;
    if (audience === 'specific' && selectedUsers.length === 0) return false;
    if (scheduleType === 'one_time' && !scheduledAt) return false;
    return true;
  }, [title, body, channels, audience, selectedUsers, scheduleType, scheduledAt]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        title, body, category, linkTo, channels, audience,
        userIds: audience === 'specific' ? selectedUsers.map(u => u._id) : [],
        scheduleType,
        scheduledAt: scheduleType === 'one_time' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        recurrence: 'none',
      };
      const { data } = await api.post('/api/notifications/broadcast', payload);
      const stats = data?.job?.stats;
      Alert.alert(
        'Broadcast sent',
        scheduleType === 'immediate'
          ? `Delivered to ${stats?.recipients ?? 0} recipient(s).`
          : 'Broadcast scheduled successfully.'
      );
      setTitle(''); setBody(''); setLinkTo(''); setSelectedUsers([]);
      setChannels(['inapp', 'push']); setScheduledAt('');
      fetchJobs();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || 'Failed to send broadcast');
    } finally { setSubmitting(false); }
  };

  const handleCancel = (id) => {
    Alert.alert('Cancel broadcast', 'Are you sure?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel job', style: 'destructive', onPress: async () => {
        try { await api.post(`/api/notifications/broadcasts/${id}/cancel`); fetchJobs(); }
        catch { Alert.alert('Error', 'Failed to cancel'); }
      }},
    ]);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={palette.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Broadcast Center</Text>
            <Text style={styles.subtitle}>Send announcements platform-wide</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs(); }} tintColor={palette.colors.primary} />
          }
        >
          {/* Compose */}
          <GlassPanel variant="card" style={styles.section}>
            <Text style={styles.sectionLabel}>Compose</Text>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={(v) => setTitle(v.slice(0, 140))}
              placeholder="e.g. Weekend sale — 30% off"
              placeholderTextColor={palette.colors.textLight}
              style={styles.input}
            />
            <Text style={styles.counter}>{title.length} / 140</Text>

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              value={body}
              onChangeText={(v) => setBody(v.slice(0, 1000))}
              placeholder="Write the message your audience will read..."
              placeholderTextColor={palette.colors.textLight}
              style={[styles.input, styles.textarea]}
              multiline
            />
            <Text style={styles.counter}>{body.length} / 1000</Text>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map(c => {
                const active = category === c.id;
                return (
                  <TouchableOpacity key={c.id} onPress={() => setCategory(c.id)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Ionicons name={c.icon} size={12} color={active ? palette.colors.white : palette.colors.primary} />
                    <Text style={[styles.chipText, active && { color: palette.colors.white }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Link (optional)</Text>
            <TextInput
              value={linkTo}
              onChangeText={setLinkTo}
              placeholder="/marketplace?promo=summer"
              placeholderTextColor={palette.colors.textLight}
              autoCapitalize="none"
              style={styles.input}
            />
          </GlassPanel>

          {/* Audience */}
          <GlassPanel variant="card" style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Audience</Text>
              {audienceCount != null && (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{audienceCount.toLocaleString()} recipient{audienceCount === 1 ? '' : 's'}</Text>
                </View>
              )}
            </View>
            <View style={styles.audienceGrid}>
              {AUDIENCES.map(a => {
                const active = audience === a.id;
                return (
                  <TouchableOpacity key={a.id} onPress={() => setAudience(a.id)}
                    style={[styles.audienceCard, active && styles.audienceCardActive]}>
                    <View style={[styles.audienceIcon, active && { backgroundColor: palette.colors.primary }]}>
                      <Ionicons name={a.icon} size={16} color={active ? palette.colors.white : palette.colors.text} />
                    </View>
                    <Text style={styles.audienceLabel}>{a.label}</Text>
                    <Text style={styles.audienceDesc}>{a.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {audience === 'specific' && (
              <View style={{ marginTop: spacing.md }}>
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={14} color={palette.colors.textSecondary} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by name or email..."
                    placeholderTextColor={palette.colors.textLight}
                    style={styles.searchInput}
                  />
                </View>
                {searching && <Text style={styles.helperText}>Searching...</Text>}
                {searchResults.map(u => (
                  <TouchableOpacity key={u._id} onPress={() => addUser(u)} style={styles.searchResultRow}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={14} color={palette.colors.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{u.username || u.name}</Text>
                      <Text style={styles.userMeta}>{u.email} · {u.role}</Text>
                    </View>
                    <Ionicons name="add-circle" size={18} color={palette.colors.primary} />
                  </TouchableOpacity>
                ))}
                {selectedUsers.length > 0 && (
                  <View style={styles.selectedRow}>
                    {selectedUsers.map(u => (
                      <View key={u._id} style={styles.selectedChip}>
                        <Text style={styles.selectedChipText}>{u.username || u.name}</Text>
                        <TouchableOpacity onPress={() => removeUser(u._id)}>
                          <Ionicons name="close" size={12} color={palette.colors.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </GlassPanel>

          {/* Channels */}
          <GlassPanel variant="card" style={styles.section}>
            <Text style={styles.sectionLabel}>Channels</Text>
            <View style={styles.audienceGrid}>
              {CHANNELS.map(ch => {
                const active = channels.includes(ch.id);
                return (
                  <TouchableOpacity key={ch.id} onPress={() => toggleChannel(ch.id)}
                    style={[styles.audienceCard, active && styles.audienceCardActive]}>
                    <View style={[styles.audienceIcon, active && { backgroundColor: palette.colors.primary }]}>
                      <Ionicons name={ch.icon} size={16} color={active ? palette.colors.white : palette.colors.text} />
                    </View>
                    <Text style={styles.audienceLabel}>{ch.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassPanel>

          {/* Schedule */}
          <GlassPanel variant="card" style={styles.section}>
            <Text style={styles.sectionLabel}>Schedule</Text>
            <View style={styles.chipsRow}>
              {[
                { id: 'immediate', label: 'Send Now' },
                { id: 'one_time', label: 'Schedule' },
              ].map(s => {
                const active = scheduleType === s.id;
                return (
                  <TouchableOpacity key={s.id} onPress={() => setScheduleType(s.id)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && { color: palette.colors.white }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {scheduleType === 'one_time' && (
              <>
                <Text style={styles.fieldLabel}>Send at (ISO date)</Text>
                <TextInput
                  value={scheduledAt}
                  onChangeText={setScheduledAt}
                  placeholder="2026-05-10T14:30"
                  placeholderTextColor={palette.colors.textLight}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <Text style={styles.helperText}>Use format YYYY-MM-DDTHH:mm</Text>
              </>
            )}
          </GlassPanel>

          {/* Send */}
          <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit || submitting}
            style={[styles.sendBtn, (!canSubmit || submitting) && { opacity: 0.5 }]}>
            {submitting ? <ActivityIndicator color={palette.colors.white} /> : (
              <>
                <Ionicons name="send" size={16} color={palette.colors.white} />
                <Text style={styles.sendBtnText}>{scheduleType === 'immediate' ? 'Send Broadcast' : 'Schedule Broadcast'}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* History */}
          <GlassPanel variant="card" style={styles.section}>
            <Text style={styles.sectionLabel}>Recent Broadcasts</Text>
            {loadingJobs ? <Loader fullScreen={false} message="Loading..." />
              : jobs.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="megaphone-outline" size={32} color={palette.colors.textLight} />
                  <Text style={styles.emptyText}>No broadcasts yet</Text>
                </View>
              ) : jobs.slice(0, 20).map(j => {
                const meta = STATUS_META[j.status] || STATUS_META.sent;
                const color = STATUS_COLORS[j.status] || palette.colors.gray;
                return (
                  <View key={j._id} style={styles.jobRow}>
                    <View style={[styles.jobDot, { backgroundColor: `${color}20` }]}>
                      <Ionicons name={meta.icon} size={14} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{j.title}</Text>
                      <Text style={styles.jobMeta}>
                        {meta.label} · {j.stats?.recipients ?? 0} recipient(s)
                        {j.scheduledAt ? ` · ${new Date(j.scheduledAt).toLocaleString()}` : ''}
                      </Text>
                    </View>
                    {j.status === 'scheduled' && (
                      <TouchableOpacity onPress={() => handleCancel(j._id)}>
                        <Ionicons name="close-circle" size={18} color={palette.colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
          </GlassPanel>

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

  section: { padding: spacing.lg, marginBottom: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: p.colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldLabel: { fontSize: 11, fontWeight: fontWeight.semibold, color: p.colors.textSecondary, marginTop: spacing.md, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: `${p.colors.gray}08`, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm, fontSize: fontSize.sm, color: p.colors.text, borderWidth: 1, borderColor: p.glass.borderSubtle },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  counter: { fontSize: 10, color: p.colors.textLight, textAlign: 'right', marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: `${p.colors.primary}10` },
  chipActive: { backgroundColor: p.colors.primary },
  chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: p.colors.primary },

  countPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, backgroundColor: `${p.colors.info}15` },
  countPillText: { fontSize: 10, fontWeight: fontWeight.bold, color: p.colors.info },

  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  audienceCard: { width: '47%', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: `${p.colors.gray}06`, borderWidth: 1, borderColor: 'transparent' },
  audienceCardActive: { backgroundColor: `${p.colors.primary}10`, borderColor: p.colors.primary },
  audienceIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: `${p.colors.gray}12`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  audienceLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: p.colors.text },
  audienceDesc: { fontSize: 10, color: p.colors.textSecondary, marginTop: 2 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${p.colors.gray}08`, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: p.glass.borderSubtle },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: p.colors.text, padding: 0 },
  helperText: { fontSize: 11, color: p.colors.textSecondary, marginTop: spacing.xs },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.glass.borderSubtle },
  userAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: p.colors.primary, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: p.colors.text },
  userMeta: { fontSize: 10, color: p.colors.textSecondary },
  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full, backgroundColor: `${p.colors.primary}15` },
  selectedChipText: { fontSize: 11, fontWeight: fontWeight.semibold, color: p.colors.text },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: p.colors.primary, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md },
  sendBtnText: { color: p.colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: p.colors.textSecondary },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.glass.borderSubtle },
  jobDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: p.colors.text },
  jobMeta: { fontSize: 10, color: p.colors.textSecondary, marginTop: 2 },
});
