/**
 * PrivacyPolicyScreen — Liquid Glass Design
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassBackground from '../components/common/GlassBackground';
import GlassPanel from '../components/common/GlassPanel';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

const sections = [
  { icon: 'server-outline', title: '1. Information We Collect', content: 'We collect information you provide directly: name, email, shipping address, payment details, and phone number. We also collect usage data including browsing patterns, device information, IP addresses, and cookies to improve your experience and platform security.' },
  { icon: 'eye-outline', title: '2. How We Use Your Information', content: 'Your information is used to: process orders and payments; personalize your shopping experience; communicate about orders and promotions; improve platform features; detect and prevent fraud; comply with legal obligations; and provide customer support.' },
  { icon: 'person-outline', title: '3. Information Sharing', content: 'We share information with: sellers (to fulfill orders); payment processors (to process transactions); shipping providers (for delivery); and service providers (for analytics and support). We never sell your personal information to third parties for marketing purposes.' },
  { icon: 'lock-closed-outline', title: '4. Data Security', content: 'We implement industry-standard security measures including SSL/TLS encryption, secure payment processing through Stripe, regular security audits, and access controls. While we strive to protect your data, no method of transmission over the internet is 100% secure.' },
  { icon: 'notifications-outline', title: '5. Cookies & Tracking', content: 'We use cookies and similar technologies for: session management; remembering preferences; analytics and performance monitoring; and personalized content. You can manage cookie preferences through your browser settings.' },
  { icon: 'shield-checkmark-outline', title: '6. Your Rights', content: 'Depending on your jurisdiction, you may have rights to: access your personal data; correct inaccurate data; request deletion of your data; object to processing; data portability; and withdraw consent. To exercise these rights, contact us at privacy@tortrose.com.' },
  { icon: 'trash-outline', title: '7. Data Retention', content: 'We retain personal data for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce agreements. Account data is retained for the duration of your account and for a reasonable period after deletion.' },
  { icon: 'globe-outline', title: '8. International Transfers', content: 'Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international data transfers, including standard contractual clauses and adequacy decisions where applicable.' },
];

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        <GlassPanel variant="floating" style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <Text style={styles.headerSubtitle}>Last updated: March 1, 2026</Text>
          </View>
        </GlassPanel>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <GlassPanel variant="card" style={styles.introCard}>
            <Text style={styles.introText}>
              At Tortrose, your privacy is important to us. This policy explains what information we collect, how we use it, and what choices you have. We are committed to protecting your personal data and being transparent about our practices.
            </Text>
          </GlassPanel>

          {sections.map((s, i) => (
            <GlassPanel key={i} variant="card" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name={s.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>{s.title}</Text>
              </View>
              <Text style={styles.sectionContent}>{s.content}</Text>
            </GlassPanel>
          ))}

          <GlassPanel variant="card" style={styles.ctaCard}>
            <Text style={styles.ctaText}>For privacy inquiries, email privacy@tortrose.com</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')} activeOpacity={0.7}>
              <Text style={styles.ctaLink}>View Terms of Service →</Text>
            </TouchableOpacity>
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
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  introCard: { marginBottom: spacing.md },
  introText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  sectionCard: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  sectionIconWrap: { width: 36, height: 36, borderRadius: borderRadius.lg, backgroundColor: 'rgba(99,102,241,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, flex: 1 },
  sectionContent: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  ctaCard: { alignItems: 'center' },
  ctaText: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm, textAlign: 'center' },
  ctaLink: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
});
