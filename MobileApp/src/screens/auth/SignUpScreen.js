/**
 * SignUpScreen — Liquid Glass Design
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import { spacing, fontSize, borderRadius, shadows, fontWeight } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function SignUpScreen({ navigation }) {
  const { palette } = useTheme();
  const styles = buildStyles(palette);

  const { signup, googleSignIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState({});

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    const result = await googleSignIn();
    setGoogleLoading(false);
    if (result?.success) navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleSignUp = async () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password.trim()) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setIsLoading(true);
    const result = await signup({ name, email, password });
    setIsLoading(false);
    if (result.success) navigation.navigate('OTPVerification', { email, name });
  };

  const setField = (field, value) => {
    if (field === 'name') setName(value);
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'confirmPassword') setConfirmPassword(value);
    setErrors(e => ({ ...e, [field]: null }));
  };

  const inputStyle = (field) => [
    styles.inputContainer,
    focused[field] && styles.inputFocused,
    errors[field] && styles.inputError,
  ];

  const fields = [
    { field: 'name', label: 'Full Name', placeholder: 'John Doe', icon: 'person-outline', autoCapitalize: 'words' },
    { field: 'email', label: 'Email Address', placeholder: 'john@example.com', icon: 'mail-outline', keyboardType: 'email-address', autoCapitalize: 'none' },
  ];

  return (
    <GlassBackground>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={palette.colors.text} />
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}><Ionicons name="storefront" size={20} color={palette.colors.white} /></View>
              <Text style={styles.logoText}>Rozare</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Hero */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Create Account ✨</Text>
            <Text style={styles.heroSubtitle}>Join thousands of shoppers on Rozare</Text>
          </View>

          {/* Form Card */}
          <GlassPanel variant="strong" style={styles.card}>
            {fields.map(({ field, label, placeholder, icon, ...rest }) => (
              <View key={field} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <View style={inputStyle(field)}>
                  <Ionicons name={icon} size={20} color={focused[field] ? palette.colors.primary : palette.colors.grayLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input} placeholder={placeholder} placeholderTextColor={palette.colors.grayLight}
                    value={field === 'name' ? name : email}
                    onChangeText={(v) => setField(field, v)}
                    onFocus={() => setFocused(f => ({ ...f, [field]: true }))}
                    onBlur={() => setFocused(f => ({ ...f, [field]: false }))}
                    autoCorrect={false} {...rest}
                  />
                </View>
                {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
              </View>
            ))}

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={inputStyle('password')}>
                <Ionicons name="lock-closed-outline" size={20} color={focused.password ? palette.colors.primary : palette.colors.grayLight} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor={palette.colors.grayLight}
                  secureTextEntry={!showPassword} value={password} onChangeText={(v) => setField('password', v)}
                  onFocus={() => setFocused(f => ({ ...f, password: true }))} onBlur={() => setFocused(f => ({ ...f, password: false }))} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={palette.colors.grayLight} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={inputStyle('confirmPassword')}>
                <Ionicons name="shield-checkmark-outline" size={20} color={focused.confirmPassword ? palette.colors.primary : palette.colors.grayLight} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Re-enter password" placeholderTextColor={palette.colors.grayLight}
                  secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={(v) => setField('confirmPassword', v)}
                  onFocus={() => setFocused(f => ({ ...f, confirmPassword: true }))} onBlur={() => setFocused(f => ({ ...f, confirmPassword: false }))} />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={palette.colors.grayLight} />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]} onPress={handleSignUp} disabled={isLoading} activeOpacity={0.85}>
              {isLoading ? <ActivityIndicator color={palette.colors.white} size="small" /> : (
                <><Text style={styles.signUpButtonText}>Create Account</Text><Ionicons name="arrow-forward" size={20} color={palette.colors.white} /></>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} /><Text style={styles.dividerText}>or continue with</Text><View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]} onPress={handleGoogleSignUp} disabled={googleLoading} activeOpacity={0.85}>
              {googleLoading ? <ActivityIndicator color="#4285F4" size="small" /> : (
                <><View style={styles.googleIcon}><Text style={styles.googleIconText}>G</Text></View><Text style={styles.googleButtonText}>Continue with Google</Text></>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.loginLink}> Sign In</Text></TouchableOpacity>
            </View>

            <View style={[styles.loginRow, { marginTop: spacing.md }]}>
              <Text style={styles.loginText}>Want to sell?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SellerSignUp')}><Text style={styles.loginLink}> Register as Seller</Text></TouchableOpacity>
            </View>
          </GlassPanel>

          <Text style={styles.footerText}>By creating an account, you agree to our Terms of Service and Privacy Policy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

const buildStyles = (p) => StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.xxxl, paddingBottom: spacing.sm },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: p.colors.primary, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: p.colors.text },
  heroSection: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, paddingBottom: spacing.xl },
  heroTitle: { fontSize: fontSize.title, fontWeight: fontWeight.extrabold, color: p.colors.text, marginBottom: spacing.sm },
  heroSubtitle: { fontSize: fontSize.md, color: p.colors.textSecondary, lineHeight: 22 },
  card: { marginHorizontal: spacing.lg, padding: spacing.xxl, marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: p.colors.text, marginBottom: spacing.sm, letterSpacing: 0.3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: borderRadius.xl, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', paddingHorizontal: spacing.md, height: 56 },
  inputFocused: { borderColor: p.colors.primary, backgroundColor: 'rgba(255,255,255,0.8)' },
  inputError: { borderColor: p.colors.error, backgroundColor: p.colors.errorSubtle },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: fontSize.md, color: p.colors.text, paddingVertical: 0 },
  eyeButton: { padding: spacing.sm },
  errorText: { fontSize: fontSize.sm, color: p.colors.error, marginTop: spacing.xs, marginLeft: spacing.xs },
  signUpButton: { flexDirection: 'row', backgroundColor: p.colors.primary, paddingVertical: spacing.lg, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadows.primaryMd, marginBottom: spacing.xl, marginTop: spacing.sm },
  signUpButtonDisabled: { opacity: 0.7 },
  signUpButtonText: { color: p.colors.white, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  dividerText: { marginHorizontal: spacing.md, fontSize: fontSize.sm, color: p.colors.textSecondary, fontWeight: fontWeight.medium },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: borderRadius.xl, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xl, gap: spacing.sm },
  googleButtonDisabled: { opacity: 0.7 },
  googleIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' },
  googleIconText: { color: p.colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold, lineHeight: 20 },
  googleButtonText: { fontSize: fontSize.md, color: p.colors.text, fontWeight: fontWeight.semibold },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: fontSize.md, color: p.colors.textSecondary },
  loginLink: { fontSize: fontSize.md, color: p.colors.primary, fontWeight: fontWeight.bold },
  footerText: { fontSize: fontSize.xs, color: p.colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xxl, marginTop: spacing.md },
});
