/**
 * SellerWhatsAppSettingsScreen — Liquid Glass parity with web SellerWhatsAppSettings.jsx
 * Manage WhatsApp number, OTP verification, and per-category notification toggles.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import Loader from '../../components/common/Loader';
import { spacing, fontSize, fontWeight, borderRadius, typography } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

const NOTIFICATION_CATEGORIES = [
  { key: 'newOrders', label: 'New Orders', desc: 'When a customer places an order', icon: 'bag-outline' },
  { key: 'orderUpdates', label: 'Order Updates', desc: 'Buyer confirmations & cancellations', icon: 'refresh-outline' },
  { key: 'subscriptionAlerts', label: 'Subscription Alerts', desc: 'Plan changes, renewals, billing', icon: 'card-outline' },
  { key: 'bonusAlerts', label: 'Bonus Alerts', desc: 'Bonus feature expiry warnings', icon: 'gift-outline' },
  { key: 'storeAlerts', label: 'Store Alerts', desc: 'Verification status & store updates', icon: 'storefront-outline' },
];

const maskNumber = (num) => {
  if (!num) return 'Not set';
  const s = String(num);
  if (s.length <= 4) return s;
  const prefix = s.length > 7 ? s.slice(0, 3) : s.slice(0, 1);
  const last4 = s.slice(-4);
  const middle = Math.max(3, s.length - prefix.length - 4);
  return `${prefix}${'•'.repeat(middle)}${last4}`;
};

export default function SellerWhatsAppSettingsScreen({ navigation }) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [prefs, setPrefs] = useState({
    enabled: true, newOrders: true, orderUpdates: true,
    subscriptionAlerts: true, bonusAlerts: true, storeAlerts: true,
  });

  const [showChange, setShowChange] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => {
    fetchPrefs();
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const fetchPrefs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/seller-whatsapp/prefs');
      setWhatsappNumber(res.data.whatsappNumber || '');
      setWhatsappVerified(!!res.data.whatsappVerified);
      if (res.data.prefs) setPrefs(res.data.prefs);
    } catch (e) {
      Alert.alert('Error', 'Failed to load WhatsApp settings');
    } finally { setLoading(false); }
  };

  const savePrefs = async (updated) => {
    setSaving(true);
    try {
      await api.put('/api/seller-whatsapp/prefs', updated);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || 'Failed to save preferences');
      fetchPrefs();
    } finally { setSaving(false); }
  };

  const togglePref = (key) => {
    if (!whatsappVerified) { Alert.alert('Verify first', 'Verify your WhatsApp number to manage preferences'); return; }
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    savePrefs(next);
  };

  const startCooldown = () => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => { if (c <= 1) { clearInterval(cooldownRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  const sendOtp = async () => {
    const num = (showChange ? newNumber : whatsappNumber).trim();
    if (!num || num.length < 8) { Alert.alert('Invalid', 'Enter a valid WhatsApp number with country code, e.g. +14155552671'); return; }
    setSendingOtp(true);
    try {
      await api.post('/api/seller-whatsapp/send-otp', { whatsappNumber: num });
      setOtpSent(true); setOtp(''); startCooldown();
      Alert.alert('OTP Sent', 'Check your WhatsApp for the 6-digit code.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || 'Failed to send OTP');
    } finally { setSendingOtp(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) { Alert.alert('Invalid', 'Enter the 6-digit code'); return; }
    const num = (showChange ? newNumber : whatsappNumber).trim();
    setVerifyingOtp(true);
    try {
      await api.post('/api/seller-whatsapp/verify-otp', { whatsappNumber: num, otp });
      setWhatsappNumber(num); setWhatsappVerified(true);
      setOtpSent(false); setShowChange(false); setNewNumber(''); setOtp('');
      Alert.alert('Verified', 'WhatsApp number verified successfully');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.msg || 'Invalid OTP');
    } finally { setVerifyingOtp(false); }
  };

  const cancelFlow = () => {
    setOtpSent(false); setShowChange(false); setNewNumber(''); setOtp('');
    setCooldown(0); if (cooldownRef.current) clearInterval(cooldownRef.current);
  };

  if (loading) return <GlassBackground><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Loader /></View></GlassBackground>;

  return (
    <GlassBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <GlassPanel variant="floating" style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="arrow-back" size={22} color={palette.colors.text} />
              </TouchableOpacity>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(34,197,94,0.18)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="logo-whatsapp" size={22} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.h1}>WhatsApp Notifications</Text>
                <Text style={styles.sub}>Manage number & alert preferences</Text>
              </View>
            </View>
          </GlassPanel>

          {/* Number card */}
          <GlassPanel variant="card" style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <Ionicons name="call-outline" size={18} color="#22C55E" />
              <Text style={styles.sectionTitle}>WhatsApp Number</Text>
            </View>

            <View style={styles.numberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Current Number</Text>
                <Text style={styles.numberText}>{whatsappNumber ? maskNumber(whatsappNumber) : 'Not configured'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: whatsappVerified ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)' }]}>
                <Ionicons name={whatsappVerified ? 'checkmark-circle' : 'alert-circle'} size={12} color={whatsappVerified ? '#10B981' : '#F59E0B'} />
                <Text style={[styles.badgeText, { color: whatsappVerified ? '#10B981' : '#F59E0B' }]}>
                  {whatsappVerified ? 'Verified' : 'Not Verified'}
                </Text>
              </View>
            </View>

            {!showChange && !otpSent && (
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={() => setShowChange(true)} style={[styles.btnSecondary]}>
                  <Text style={styles.btnSecondaryText}>{whatsappNumber ? 'Change Number' : 'Add Number'}</Text>
                </TouchableOpacity>
                {whatsappNumber && !whatsappVerified && (
                  <TouchableOpacity onPress={sendOtp} disabled={sendingOtp} style={[styles.btnPrimary, { opacity: sendingOtp ? 0.6 : 1 }]}>
                    {sendingOtp ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={14} color="#fff" />}
                    <Text style={styles.btnPrimaryText}>Verify Number</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {showChange && !otpSent && (
              <View style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.lg }}>
                <Text style={[styles.label, { marginBottom: spacing.sm }]}>Enter WhatsApp number (with country code)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={newNumber}
                    onChangeText={setNewNumber}
                    placeholder="+14155552671"
                    placeholderTextColor={palette.colors.textSecondary}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <TouchableOpacity onPress={sendOtp} disabled={sendingOtp || !newNumber} style={[styles.btnPrimary, { flex: 1, opacity: (sendingOtp || !newNumber) ? 0.6 : 1 }]}>
                    {sendingOtp ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={14} color="#fff" />}
                    <Text style={styles.btnPrimaryText}>Send OTP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={cancelFlow} style={[styles.btnSecondary, { flex: 1 }]}>
                    <Text style={styles.btnSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {otpSent && (
              <View style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.lg }}>
                <Text style={[styles.label, { marginBottom: spacing.sm }]}>Enter 6-digit OTP from WhatsApp</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { fontSize: 20, letterSpacing: 8, textAlign: 'center' }]}
                    value={otp}
                    onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor={palette.colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
                  <TouchableOpacity onPress={verifyOtp} disabled={verifyingOtp || otp.length !== 6} style={[styles.btnPrimary, { flex: 1, opacity: (verifyingOtp || otp.length !== 6) ? 0.6 : 1 }]}>
                    {verifyingOtp ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={14} color="#fff" />}
                    <Text style={styles.btnPrimaryText}>Verify</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={sendOtp} disabled={cooldown > 0 || sendingOtp} style={[styles.btnSecondary, { opacity: (cooldown > 0 || sendingOtp) ? 0.5 : 1 }]}>
                    <Text style={styles.btnSecondaryText}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={cancelFlow} style={styles.btnSecondary}>
                    <Text style={styles.btnSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </GlassPanel>

          {/* Master toggle */}
          <GlassPanel variant="card" style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
            <ToggleRow
              palette={palette}
              icon={prefs.enabled ? 'notifications' : 'notifications-off'}
              label="WhatsApp Notifications"
              desc={whatsappVerified ? 'Master switch for all WhatsApp alerts' : 'Verify your number to enable'}
              value={prefs.enabled && whatsappVerified}
              onToggle={() => togglePref('enabled')}
              disabled={!whatsappVerified}
            />
          </GlassPanel>

          {/* Categories */}
          <GlassPanel variant="card" style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={[styles.sectionTitle, { marginBottom: spacing.md }]}>Notification Types</Text>
            {NOTIFICATION_CATEGORIES.map((c, idx) => (
              <View key={c.key}>
                <ToggleRow
                  palette={palette}
                  icon={c.icon}
                  label={c.label}
                  desc={c.desc}
                  value={prefs[c.key] && prefs.enabled && whatsappVerified}
                  onToggle={() => togglePref(c.key)}
                  disabled={!whatsappVerified || !prefs.enabled}
                />
                {idx < NOTIFICATION_CATEGORIES.length - 1 && <View style={{ height: 1, backgroundColor: palette.glass.borderSubtle, marginVertical: spacing.sm }} />}
              </View>
            ))}
            {saving && <Text style={{ marginTop: spacing.sm, fontSize: fontSize.xs, color: palette.colors.textSecondary, textAlign: 'center' }}>Saving...</Text>}
          </GlassPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

function ToggleRow({ palette, icon, label, desc, value, onToggle, disabled }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.55 : 1 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.12)', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={icon} size={18} color="#22C55E" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: palette.colors.text }}>{label}</Text>
        {!!desc && <Text style={{ fontSize: fontSize.xs, color: palette.colors.textSecondary, marginTop: 2 }}>{desc}</Text>}
      </View>
      <TouchableOpacity disabled={disabled} onPress={onToggle} activeOpacity={0.8}
        style={{ width: 50, height: 28, borderRadius: 14, padding: 3, backgroundColor: value ? '#22C55E' : 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (p) => StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: p.colors.text },
  sub: { fontSize: fontSize.xs, color: p.colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: p.colors.text },
  label: { fontSize: fontSize.xs, color: p.colors.textSecondary, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255,255,255,0.05)' },
  numberText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: p.colors.text, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  inputContainer: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  input: { padding: spacing.md, fontSize: fontSize.md, color: p.colors.text },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: '#22C55E' },
  btnPrimaryText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#fff' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  btnSecondaryText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: p.colors.text },
});
