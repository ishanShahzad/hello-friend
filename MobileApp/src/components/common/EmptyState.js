/**
 * EmptyState Component — Liquid Glass Design with decorative illustrations.
 * Uses layered gradient blobs behind the icon for a more premium feel
 * (no external illustration assets required — pure RN).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GlassPanel from './GlassPanel';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

const ACCENT_GRADIENTS = {
  primary: ['rgba(99,102,241,0.35)', 'rgba(139,92,246,0.18)', 'rgba(236,72,153,0.05)'],
  heart: ['rgba(239,68,68,0.32)', 'rgba(244,114,182,0.18)', 'rgba(251,191,36,0.05)'],
  success: ['rgba(16,185,129,0.32)', 'rgba(20,184,166,0.18)', 'rgba(56,189,248,0.05)'],
  warning: ['rgba(245,158,11,0.32)', 'rgba(251,191,36,0.18)', 'rgba(244,114,182,0.05)'],
  info: ['rgba(59,130,246,0.32)', 'rgba(99,102,241,0.18)', 'rgba(168,85,247,0.05)'],
  error: ['rgba(239,68,68,0.32)', 'rgba(244,63,94,0.18)', 'rgba(168,85,247,0.05)'],
};

const Illustration = ({ icon, iconSize, iconColor, accent }) => {
  const gradient = ACCENT_GRADIENTS[accent] || ACCENT_GRADIENTS.primary;
  return (
    <View style={styles.illustrationWrap}>
      {/* Decorative offset blobs */}
      <View style={[styles.blob, styles.blobOne, { backgroundColor: gradient[0] }]} />
      <View style={[styles.blob, styles.blobTwo, { backgroundColor: gradient[1] }]} />
      <View style={[styles.blob, styles.blobThree, { backgroundColor: gradient[2] }]} />
      <LinearGradient
        colors={[gradient[0], gradient[2]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.illustrationGlow}
      />
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </View>
    </View>
  );
};

const accentForIcon = (iconColor, c) => {
  if (iconColor === c.error) return 'error';
  if (iconColor === c.warning) return 'warning';
  if (iconColor === c.success) return 'success';
  if (iconColor === c.heart) return 'heart';
  if (iconColor === c.info) return 'info';
  return 'primary';
};

const EmptyState = ({
  icon = 'cube-outline',
  iconSize = 56,
  iconColor,
  accent,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  compact = false,
}) => {
  const { palette } = useTheme();
  const c = palette.colors;
  const resolvedIconColor = iconColor || c.primary;
  const accentKey = accent || accentForIcon(resolvedIconColor, c);
  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <GlassPanel variant="card" style={styles.glassWrap}>
        <Illustration icon={icon} iconSize={compact ? 40 : iconSize} iconColor={resolvedIconColor} accent={accentKey} />
        {title && <Text style={[styles.title, { color: c.text }, compact && styles.titleCompact]}>{title}</Text>}
        {subtitle && <Text style={[styles.subtitle, { color: c.textSecondary }, compact && styles.subtitleCompact]}>{subtitle}</Text>}
        {(actionLabel || secondaryActionLabel) && (
          <View style={styles.actionsContainer}>
            {actionLabel && onAction && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: c.primary, shadowColor: c.primary }]} onPress={onAction} activeOpacity={0.85} accessibilityLabel={actionLabel}>
                <Text style={styles.actionButtonText}>{actionLabel}</Text>
              </TouchableOpacity>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryAction} activeOpacity={0.85} accessibilityLabel={secondaryActionLabel}>
                <Text style={[styles.secondaryButtonText, { color: c.primary }]}>{secondaryActionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </GlassPanel>
    </View>
  );
};

export const EmptyCart = ({ onBrowse, onAction }) => <EmptyState icon="cart-outline" accent="primary" title="Your cart is empty" subtitle="Discover thousands of products from verified sellers and add your favourites to checkout in one tap." actionLabel="Browse Products" onAction={onBrowse || onAction} />;
export const EmptyWishlist = ({ onBrowse }) => <EmptyState icon="heart-outline" iconColor={colors.heart} accent="heart" title="Your wishlist is empty" subtitle="Tap the heart on any product to save it here for later." actionLabel="Discover Products" onAction={onBrowse} />;
export const EmptyOrders = ({ onBrowse }) => <EmptyState icon="receipt-outline" accent="info" title="No orders yet" subtitle="When you place an order, it will appear here with full tracking and re-order options." actionLabel="Start Shopping" onAction={onBrowse} />;
export const EmptyProducts = ({ onAdd }) => <EmptyState icon="cube-outline" accent="primary" title="No products yet" subtitle="Add your first product to start selling on Tortrose." actionLabel={onAdd ? "Add Product" : undefined} onAction={onAdd} />;
export const EmptyStores = ({ onRefresh }) => <EmptyState icon="storefront-outline" accent="primary" title="No stores found" subtitle="Try adjusting your search or check back later for new sellers." actionLabel="Refresh" onAction={onRefresh} />;
export const EmptySearch = ({ query, onClear }) => <EmptyState icon="search-outline" accent="info" title="No results found" subtitle={query ? `We couldn't find anything for "${query}". Try different keywords.` : 'Try a different search term'} actionLabel="Clear Search" onAction={onClear} />;
export const EmptyNotifications = () => <EmptyState icon="notifications-outline" accent="primary" title="You're all caught up" subtitle="New notifications about orders, deals and store updates will appear here." />;
export const ErrorState = ({ message, onRetry }) => <EmptyState icon="alert-circle-outline" iconColor={colors.error} accent="error" title="Something went wrong" subtitle={message || "We couldn't load the content. Please try again."} actionLabel="Try Again" onAction={onRetry} />;
export const OfflineState = ({ onRetry }) => <EmptyState icon="cloud-offline-outline" iconColor={colors.warning} accent="warning" title="You're offline" subtitle="Please check your internet connection and try again." actionLabel="Retry" onAction={onRetry} />;
export const LoginRequired = ({ onLogin, onBrowse, onAction }) => <EmptyState icon="lock-closed-outline" accent="primary" title="Sign in required" subtitle="Sign in to access your wishlist, cart and personalized recommendations." actionLabel="Sign In" onAction={onLogin || onAction} secondaryActionLabel="Continue Browsing" onSecondaryAction={onBrowse} />;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl },
  containerCompact: { paddingVertical: spacing.xl },
  glassWrap: { padding: spacing.xl, alignItems: 'center', width: '100%', maxWidth: 380 },
  illustrationWrap: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  blob: { position: 'absolute', borderRadius: 999 },
  blobOne: { width: 110, height: 110, top: 8, left: 6 },
  blobTwo: { width: 80, height: 80, bottom: 10, right: 4 },
  blobThree: { width: 60, height: 60, top: 20, right: 20 },
  illustrationGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, opacity: 0.45 },
  iconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  titleCompact: { fontSize: fontSize.lg },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', maxWidth: 320, lineHeight: 21 },
  subtitleCompact: { fontSize: fontSize.sm, maxWidth: 240 },
  actionsContainer: { marginTop: spacing.lg, alignItems: 'center', gap: spacing.sm, width: '100%' },
  actionButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: borderRadius.xl, minWidth: 200, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  actionButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  secondaryButton: { borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.3)', paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: borderRadius.xl, minWidth: 200, alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.06)' },
  secondaryButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});

export default EmptyState;

