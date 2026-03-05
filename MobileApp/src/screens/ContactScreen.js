/**
 * ContactScreen — Liquid Glass Design
 * Matches website Contact page with contact methods and form
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassBackground from '../components/common/GlassBackground';
import GlassPanel from '../components/common/GlassPanel';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

const contactMethods = [
  { icon: 'mail-outline', title: 'Email Us', value: 'support@tortrose.com', desc: 'We respond within 24 hours', color: colors.primary },
  { icon: 'chatbubbles-outline', title: 'Live Chat', value: 'Available on platform', desc: 'Mon–Fri, 9 AM – 6 PM EST', color: colors.success },
  { icon: 'location-outline', title: 'Headquarters', value: 'Global / Remote', desc: 'Serving customers worldwide', color: colors.info },
];

export default function ContactScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    setSending(true);
    setTimeout(() => {
      Alert.alert('Message Sent!', 'We\'ll get back to you soon.');
      setForm({ name: '', email: '', subject: '', message: '' });
      setSending(false);
    }, 1200);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        <GlassPanel variant="floating" style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Contact Us</Text>
            <Text style={styles.headerSubtitle}>We'd love to hear from you</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="mail-outline" size={22} color={colors.primary} />
          </View>
        </GlassPanel>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Contact Methods */}
            {contactMethods.map((m, i) => (
              <GlassPanel key={i} variant="card" style={styles.methodCard}>
                <View style={[styles.methodIcon, { backgroundColor: `${m.color}18` }]}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <View style={styles.methodText}>
                  <Text style={styles.methodTitle}>{m.title}</Text>
                  <Text style={styles.methodValue}>{m.value}</Text>
                  <Text style={styles.methodDesc}>{m.desc}</Text>
                </View>
              </GlassPanel>
            ))}

            {/* Contact Form */}
            <GlassPanel variant="card" style={styles.formCard}>
              <Text style={styles.formTitle}>Send us a message</Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="Your name" placeholderTextColor={colors.textLight} />

              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} value={form.email} onChangeText={t => setForm({ ...form, email: t })} placeholder="you@example.com" placeholderTextColor={colors.textLight} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Subject</Text>
              <TextInput style={styles.input} value={form.subject} onChangeText={t => setForm({ ...form, subject: t })} placeholder="What's this about?" placeholderTextColor={colors.textLight} />

              <Text style={styles.label}>Message *</Text>
              <TextInput style={[styles.input, styles.textarea]} value={form.message} onChangeText={t => setForm({ ...form, message: t })} placeholder="Tell us how we can help..." placeholderTextColor={colors.textLight} multiline textAlignVertical="top" />

              <TouchableOpacity style={[styles.submitBtn, sending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={sending} activeOpacity={0.7}>
                <Ionicons name="send-outline" size={16} color={colors.white} />
                <Text style={styles.submitText}>{sending ? 'Sending...' : 'Send Message'}</Text>
              </TouchableOpacity>
            </GlassPanel>

            <GlassPanel variant="card" style={styles.ctaCard}>
              <Text style={styles.ctaText}>
                Check our FAQ for quick answers to common questions.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('FAQ')} activeOpacity={0.7}>
                <Text style={styles.ctaLink}>Go to FAQ →</Text>
              </TouchableOpacity>
            </GlassPanel>

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
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
  methodCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  methodIcon: { width: 48, height: 48, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  methodText: { flex: 1 },
  methodTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  methodValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.primary, marginTop: 2 },
  methodDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  formCard: { marginBottom: spacing.md },
  formTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginBottom: spacing.xs },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: spacing.md },
  textarea: { minHeight: 120, paddingTop: spacing.md },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.lg, gap: spacing.sm, marginTop: spacing.sm },
  submitText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.white },
  ctaCard: { alignItems: 'center' },
  ctaText: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm, textAlign: 'center' },
  ctaLink: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
});
