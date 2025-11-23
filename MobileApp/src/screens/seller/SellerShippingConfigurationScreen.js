import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';
import api from '../../config/api';

export default function SellerShippingConfigurationScreen() {
  const [shippingFee, setShippingFee] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/api/shipping/methods');
      setShippingFee(response.data.shippingFee?.toString() || '0');
      setFreeShippingThreshold(response.data.freeShippingThreshold?.toString() || '0');
    } catch (error) {
      console.log('Error fetching config:', error);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      await api.put('/api/shipping/methods', {
        shippingFee: parseFloat(shippingFee),
        freeShippingThreshold: parseFloat(freeShippingThreshold),
      });
      Alert.alert('Success', 'Shipping configuration saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Configuration</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shipping Fee ($)</Text>
          <TextInput
            style={styles.input}
            value={shippingFee}
            onChangeText={setShippingFee}
            keyboardType="decimal-pad"
            placeholder="Enter shipping fee"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Free Shipping Threshold ($)</Text>
          <TextInput
            style={styles.input}
            value={freeShippingThreshold}
            onChangeText={setFreeShippingThreshold}
            keyboardType="decimal-pad"
            placeholder="Enter threshold for free shipping"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveConfig}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
