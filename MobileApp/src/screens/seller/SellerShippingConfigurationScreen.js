/**
 * SellerShippingConfigurationScreen
 * Manage shipping methods and configuration
 * 
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  shadows,
  fontWeight,
  typography,
  buttonStyles,
} from '../../styles/theme';

export default function SellerShippingConfigurationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    estimatedDays: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/api/shipping/methods');
      setShippingMethods(response.data?.methods || []);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConfig();
  }, []);

  const resetForm = useCallback(() => {
    setFormData({ name: '', price: '', estimatedDays: '' });
    setErrors({});
    setEditingMethod(null);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((method) => {
    setEditingMethod(method);
    setFormData({
      name: method.name || '',
      price: method.price?.toString() || '',
      estimatedDays: method.estimatedDays?.toString() || '',
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((method) => {
    Alert.alert(
      'Delete Shipping Method',
      `Are you sure you want to delete "${method.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/shipping/methods/${method._id}`);
              setShippingMethods(prev => prev.filter(m => m._id !== method._id));
              Alert.alert('Success', 'Shipping method deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete shipping method');
            }
          },
        },
      ]
    );
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Method name is required';
    }
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }
    if (!formData.estimatedDays || isNaN(parseInt(formData.estimatedDays)) || parseInt(formData.estimatedDays) < 1) {
      newErrors.estimatedDays = 'Valid delivery days is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveMethod = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const methodData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        estimatedDays: parseInt(formData.estimatedDays),
      };

      if (editingMethod) {
        await api.put(`/api/shipping/methods/${editingMethod._id}`, methodData);
        setShippingMethods(prev =>
          prev.map(m => m._id === editingMethod._id ? { ...m, ...methodData } : m)
        );
        Alert.alert('Success', 'Shipping method updated');
      } else {
        const response = await api.post('/api/shipping/methods', methodData);
        setShippingMethods(prev => [...prev, response.data.method || methodData]);
        Alert.alert('Success', 'Shipping method added');
      }
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save shipping method');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loader fullScreen message="Loading shipping methods..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="car-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Shipping Configuration</Text>
          <Text style={styles.headerSubtitle}>Manage your shipping methods</Text>
        </View>

        {/* Shipping Methods List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shipping Methods</Text>
            {!showForm && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowForm(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {shippingMethods.length === 0 && !showForm ? (
            <EmptyState
              icon="car-outline"
              title="No shipping methods"
              subtitle="Add your first shipping method to start"
              actionLabel="Add Shipping Method"
              onAction={() => setShowForm(true)}
              compact
            />
          ) : (
            <View style={styles.methodsList}>
              {shippingMethods.map((method, index) => (
                <View key={method._id || index} style={styles.methodCard}>
                  <View style={styles.methodIcon}>
                    <Ionicons name="cube-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <View style={styles.methodDetails}>
                      <Text style={styles.methodPrice}>${method.price?.toFixed(2)}</Text>
                      <Text style={styles.methodDays}>
                        {method.estimatedDays} {method.estimatedDays === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.methodActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(method)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(method)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Add/Edit Form */}
        {showForm && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {editingMethod ? 'Edit Shipping Method' : 'Add Shipping Method'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Method Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(value) => {
                  setFormData(prev => ({ ...prev, name: value }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                }}
                placeholder="e.g., Standard Shipping"
                placeholderTextColor={colors.grayLight}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>
                  Price ($) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  value={formData.price}
                  onChangeText={(value) => {
                    setFormData(prev => ({ ...prev, price: value }));
                    if (errors.price) setErrors(prev => ({ ...prev, price: null }));
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.grayLight}
                  keyboardType="decimal-pad"
                />
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>
                  Est. Days <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.estimatedDays && styles.inputError]}
                  value={formData.estimatedDays}
                  onChangeText={(value) => {
                    setFormData(prev => ({ ...prev, estimatedDays: value }));
                    if (errors.estimatedDays) setErrors(prev => ({ ...prev, estimatedDays: null }));
                  }}
                  placeholder="3"
                  placeholderTextColor={colors.grayLight}
                  keyboardType="number-pad"
                />
                {errors.estimatedDays && <Text style={styles.errorText}>{errors.estimatedDays}</Text>}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={saveMethod}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <Loader size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons
                    name={editingMethod ? 'checkmark-circle' : 'add-circle'}
                    size={22}
                    color={colors.white}
                  />
                  <Text style={styles.submitButtonText}>
                    {editingMethod ? 'Update Method' : 'Add Method'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Sections
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  addButtonText: {
    ...typography.bodySemibold,
    color: colors.white,
    fontSize: fontSize.sm,
  },
  // Methods List
  methodsList: {
    gap: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lighter,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    ...typography.bodySemibold,
    marginBottom: spacing.xs,
  },
  methodDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  methodPrice: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  methodDays: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  methodActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Form
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySemibold,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.lighter,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.lighter,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  // Submit
  submitButton: {
    ...buttonStyles.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...buttonStyles.primaryText,
  },
  // Bottom
  bottomSpacing: {
    height: spacing.xxl,
  },
});
