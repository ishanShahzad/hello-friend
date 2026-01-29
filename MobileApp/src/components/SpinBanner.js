import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, borderRadius, shadows, fontWeight } from '../styles/theme';

export default function SpinBanner({ spinResult, selectedCount = 0, onOpenSpinner, formatPrice }) {
  const { currentUser } = useAuth();

  if (!spinResult) {
    return (
      <TouchableOpacity style={styles.inviteBanner} onPress={onOpenSpinner} activeOpacity={0.9}>
        <View style={styles.inviteContent}>
          <View style={styles.inviteIconContainer}><Text style={styles.inviteEmoji}>🎡</Text></View>
          <View style={styles.inviteTextContainer}>
            <Text style={styles.inviteTitle}>Spin & Win!</Text>
            <Text style={styles.inviteSubtitle}>Try your luck and win amazing discounts</Text>
          </View>
          <View style={styles.spinButtonContainer}>
            <View style={styles.spinButton}>
              <Text style={styles.spinButtonText}>Spin Now</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.white} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (spinResult.hasCheckedOut) {
    return (
      <View style={styles.checkedOutBanner}>
        <View style={styles.checkedOutContent}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <View style={styles.checkedOutTextContainer}>
            <Text style={styles.checkedOutTitle}>Discount Applied!</Text>
            <Text style={styles.checkedOutSubtitle}>Your spin discount has been used. Spin again in 24 hours!</Text>
          </View>
        </View>
      </View>
    );
  }

  const discountLabel = spinResult.label || getDiscountLabel(spinResult);
  const remainingProducts = 3 - selectedCount;

  return (
    <View style={styles.activeBanner}>
      <View style={styles.activeContent}>
        <View style={styles.prizeContainer}>
          <Text style={styles.prizeEmoji}>🎉</Text>
          <View style={styles.prizeTextContainer}>
            <Text style={styles.prizeTitle}>You Won: {discountLabel}</Text>
            <Text style={styles.prizeSubtitle}>
              {remainingProducts > 0 ? `Select ${remainingProducts} more product${remainingProducts > 1 ? 's' : ''} to apply discount` : 'All 3 products selected! Proceed to checkout'}
            </Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${(selectedCount / 3) * 100}%` }]} /></View>
          <Text style={styles.progressText}>{selectedCount}/3 products</Text>
        </View>
      </View>
    </View>
  );
}

function getDiscountLabel(spinResult) {
  const type = spinResult.type || spinResult.discountType;
  const value = spinResult.value || spinResult.discount;
  if (type === 'free') return 'FREE Products!';
  if (type === 'fixed') return `$${value} Each`;
  if (type === 'percentage') return `${value}% OFF`;
  return 'Special Discount';
}

const styles = StyleSheet.create({
  inviteBanner: { marginHorizontal: spacing.lg, marginVertical: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.xl, ...shadows.md, borderWidth: 1, borderColor: colors.light, overflow: 'hidden' },
  inviteContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  inviteIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  inviteEmoji: { fontSize: 24 },
  inviteTextContainer: { flex: 1 },
  inviteTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 2 },
  inviteSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  spinButtonContainer: { marginLeft: spacing.sm },
  spinButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, gap: 4 },
  spinButtonText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  checkedOutBanner: { marginHorizontal: spacing.lg, marginVertical: spacing.md, backgroundColor: colors.successLight, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.success },
  checkedOutContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  checkedOutTextContainer: { flex: 1, marginLeft: spacing.md },
  checkedOutTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.success, marginBottom: 2 },
  checkedOutSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  activeBanner: { marginHorizontal: spacing.lg, marginVertical: spacing.md, backgroundColor: '#fef3c7', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: '#f59e0b', overflow: 'hidden' },
  activeContent: { padding: spacing.md },
  prizeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  prizeEmoji: { fontSize: 28, marginRight: spacing.md },
  prizeTextContainer: { flex: 1 },
  prizeTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#92400e', marginBottom: 2 },
  prizeSubtitle: { fontSize: fontSize.sm, color: '#b45309' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressBar: { flex: 1, height: 8, backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  progressText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#92400e' },
});
