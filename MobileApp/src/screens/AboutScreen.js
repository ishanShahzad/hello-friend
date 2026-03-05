/**
 * AboutScreen — Liquid Glass Design
 * Matches website About page
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassBackground from '../components/common/GlassBackground';
import GlassPanel from '../components/common/GlassPanel';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

const stats = [
  { value: '10K+', label: 'Products Listed' },
  { value: '500+', label: 'Verified Sellers' },
  { value: '50+', label: 'Countries Served' },
  { value: '99.9%', label: 'Uptime' },
];

const values = [
  { icon: 'shield-checkmark-outline', title: 'Trust & Safety', desc: 'Every store is verified. Our trust system lets the community vouch for quality sellers.' },
  { icon: 'flash-outline', title: 'Fast & Seamless', desc: 'From discovery to checkout in seconds. We optimize every step of the shopping journey.' },
  { icon: 'globe-outline', title: 'Global Reach', desc: 'Multi-currency support and international shipping connect buyers and sellers worldwide.' },
  { icon: 'heart-outline', title: 'Community First', desc: 'Built for independent sellers and conscious shoppers who value quality over quantity.' },
];

export default function AboutScreen({ navigation }) {
  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        <GlassPanel variant="floating" style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>About Us</Text>
            <Text style={styles.headerSubtitle}>Our Story</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="star-outline" size={22} color={colors.primary} />
          </View>
        </GlassPanel>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero */}
          <Text style={styles.heroTitle}>About Tortrose</Text>
          <Text style={styles.heroDesc}>
            A modern marketplace built on trust, designed for independent sellers and thoughtful shoppers who believe in quality, transparency, and community.
          </Text>

          {/* Mission */}
          <GlassPanel variant="card" style={styles.missionCard}>
            <Text style={styles.missionTitle}>Our Mission</Text>
            <Text style={styles.missionText}>
              To empower independent sellers with beautiful storefronts and powerful tools, while giving shoppers a curated, trustworthy marketplace experience. We believe commerce should be personal, transparent, and accessible to everyone — no matter where they are in the world.
            </Text>
          </GlassPanel>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {stats.map((s, i) => (
              <GlassPanel key={i} variant="card" style={styles.statCard}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </GlassPanel>
            ))}
          </View>

          {/* Values */}
          <Text style={styles.sectionTitle}>What We Stand For</Text>
          {values.map((v, i) => (
            <GlassPanel key={i} variant="card" style={styles.valueCard}>
              <View style={styles.valueIconWrap}>
                <Ionicons name={v.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.valueText}>
                <Text style={styles.valueTitle}>{v.title}</Text>
                <Text style={styles.valueDesc}>{v.desc}</Text>
              </View>
            </GlassPanel>
          ))}

          {/* CTA */}
          <GlassPanel variant="card" style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to join Tortrose?</Text>
            <Text style={styles.ctaDesc}>Start shopping or become a seller today.</Text>
            <View style={styles.ctaButtons}>
              <TouchableOpacity style={styles.ctaPrimary} onPress={() => navigation.navigate('MainTabs')} activeOpacity={0.7}>
                <Text style={styles.ctaPrimaryText}>Browse Products</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctaSecondary} onPress={() => navigation.navigate('BecomeSeller')} activeOpacity={0.7}>
                <Text style={styles.ctaSecondaryText}>Become a Seller</Text>
              </TouchableOpacity>
            </View>
          </GlassPanel>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, marginHorizontal: spacing.md, marginTop: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, marginLeft: spacing.md },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  heroTitle: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
  heroDesc: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  missionCard: { marginBottom: spacing.lg },
  missionTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  missionText: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: spacing.lg },
  statValue: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  valueCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  valueIconWrap: { width: 40, height: 40, borderRadius: borderRadius.lg, backgroundColor: 'rgba(99,102,241,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  valueText: { flex: 1 },
  valueTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: 4 },
  valueDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  ctaCard: { alignItems: 'center', marginTop: spacing.sm },
  ctaTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm },
  ctaDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg },
  ctaButtons: { flexDirection: 'row', gap: spacing.md },
  ctaPrimary: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
  ctaPrimaryText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.white },
  ctaSecondary: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
  ctaSecondaryText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
});
