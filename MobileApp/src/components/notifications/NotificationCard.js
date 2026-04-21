/**
 * NotificationCard — single in-app notification row used by the inbox.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassPanel from '../common/GlassPanel';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';
import { formatTime } from '../../hooks/useNotificationInbox';

export const NOTIFICATION_META = {
  order: { icon: 'receipt-outline', color: colors.primary, bg: 'rgba(99,102,241,0.15)' },
  delivery: { icon: 'bicycle-outline', color: colors.success, bg: 'rgba(16,185,129,0.15)' },
  promo: { icon: 'pricetag-outline', color: colors.warning, bg: 'rgba(245,158,11,0.15)' },
  seller: { icon: 'storefront-outline', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  system: { icon: 'information-circle-outline', color: colors.info, bg: 'rgba(59,130,246,0.15)' },
  alert: { icon: 'alert-circle-outline', color: colors.error, bg: 'rgba(239,68,68,0.15)' },
};

export default function NotificationCard({ item, onPress }) {
  const meta = NOTIFICATION_META[item.category] || NOTIFICATION_META.system;
  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.75}>
      <GlassPanel variant="card" style={[styles.card, !item.read && styles.cardUnread]}>
        {!item.read && <View style={styles.unreadDot} />}
        <View style={[styles.icon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, !item.read && { fontWeight: fontWeight.bold }]} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <View style={styles.footer}>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            <View style={[styles.tag, { backgroundColor: meta.bg }]}>
              <Text style={[styles.tagText, { color: meta.color }]}>{item.category}</Text>
            </View>
          </View>
        </View>
      </GlassPanel>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  unreadDot: { position: 'absolute', top: spacing.md, right: spacing.md, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  icon: { width: 44, height: 44, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, flexShrink: 0 },
  content: { flex: 1, paddingRight: spacing.lg },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: 2 },
  body: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.xs },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontSize: fontSize.xs, color: colors.textLight, fontWeight: fontWeight.medium },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  tagText: { fontSize: 10, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
});
