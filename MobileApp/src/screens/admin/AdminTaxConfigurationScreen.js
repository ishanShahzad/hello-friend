/**
 * AdminTaxConfigurationScreen
 * Modern admin screen for managing tax configurations
 * 
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6
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
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  typography,
  cardStyles,
  buttonStyles,
  inputStyles,
  layout,
} from '../../styles/theme';
import api from '../../config/api';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';

// Tax rate display format helper - exported for testing
export const formatTaxRate = (rate) => {
  if (rate === null || rate === undefined || isNaN(rate)) return '0%';
  return `${parseFloat(rate).toFixed(2)}%`;
};

export default function AdminTaxConfigurationScreen() {
  const [taxConfigs, setTaxConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    region: '',
    rate: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchTaxConfigs();
  }, []);

  const fetchTaxConfigs = async () => {
    try {
      const response = await api.get('/api/tax/get-all');
      setTaxConfigs(response.data.taxes || response.data || []);
    } catch (error) {
      console.log('Error fetching tax configs:', error);
      Alert.alert('Error', 'Failed to load tax configurations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTaxConfigs();
  }, []);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.region.trim()) {
      errors.region = 'Region is required';
    }
    
    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      errors.rate = 'Rate must be between 0 and 100';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openAddModal = () => {
    setEditingTax(null);
    setFormData({ region: '', rate: '', description: '' });
    setFormErrors({});
    setModalVisible(true);
  };

  const openEditModal = (tax) => {
    setEditingTax(tax);
    setFormData({
      region: tax.region || '',
      rate: tax.rate?.toString() || '',
      description: tax.description || '',
    });
    setFormErrors({});
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTax(null);
    setFormData({ region: '', rate: '', description: '' });
    setFormErrors({});
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        region: formData.region.trim(),
        rate: parseFloat(formData.rate),
        description: formData.description.trim(),
      };

      if (editingTax) {
        await api.put(`/api/tax/update/${editingTax._id}`, payload);
        Alert.alert('Success', 'Tax rule updated successfully');
      } else {
        await api.post('/api/tax/create', payload);
        Alert.alert('Success', 'Tax rule created successfully');
      }
      
      closeModal();
      fetchTaxConfigs();
    } catch (error) {
      console.log('Error saving tax config:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save tax rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tax) => {
    Alert.alert(
      'Delete Tax Rule',
      `Are you sure you want to delete the tax rule for "${tax.region}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(tax),
        },
      ]
    );
  };

  const confirmDelete = async (tax) => {
    setDeleting(tax._id);
    try {
      await api.delete(`/api/tax/delete/${tax._id}`);
      Alert.alert('Success', 'Tax rule deleted successfully');
      fetchTaxConfigs();
    } catch (error) {
      console.log('Error deleting tax config:', error);
      Alert.alert('Error', 'Failed to delete tax rule');
    } finally {
      setDeleting(null);
    }
  };

  const renderTaxCard = (tax) => {
    const isDeleting = deleting === tax._id;
    
    return (
      <View key={tax._id} style={styles.taxCard}>
        <View style={styles.taxCardHeader}>
          <View style={styles.taxCardLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="receipt-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.taxInfo}>
              <Text style={styles.regionText}>{tax.region}</Text>
              {tax.description && (
                <Text style={styles.descriptionText} numberOfLines={1}>
                  {tax.description}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rateContainer}>
            <Text style={styles.rateText}>{formatTaxRate(tax.rate)}</Text>
          </View>
        </View>
        
        <View style={styles.taxCardActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(tax)}
            disabled={isDeleting}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(tax)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingTax ? 'Edit Tax Rule' : 'Add Tax Rule'}
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Region Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Region *</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.region && styles.inputError,
                ]}
                value={formData.region}
                onChangeText={(text) => {
                  setFormData({ ...formData, region: text });
                  if (formErrors.region) {
                    setFormErrors({ ...formErrors, region: null });
                  }
                }}
                placeholder="e.g., California, EU, Canada"
                placeholderTextColor={colors.grayLight}
              />
              {formErrors.region && (
                <Text style={styles.errorText}>{formErrors.region}</Text>
              )}
            </View>

            {/* Rate Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tax Rate (%) *</Text>
              <View style={styles.rateInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.rateInput,
                    formErrors.rate && styles.inputError,
                  ]}
                  value={formData.rate}
                  onChangeText={(text) => {
                    // Only allow numbers and decimal point
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, rate: cleaned });
                    if (formErrors.rate) {
                      setFormErrors({ ...formErrors, rate: null });
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.grayLight}
                />
                <View style={styles.percentBadge}>
                  <Text style={styles.percentText}>%</Text>
                </View>
              </View>
              {formErrors.rate && (
                <Text style={styles.errorText}>{formErrors.rate}</Text>
              )}
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Add a description for this tax rule"
                placeholderTextColor={colors.grayLight}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeModal}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingTax ? 'Update' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="calculator-outline" size={24} color={colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Tax Configuration</Text>
            <Text style={styles.headerSubtitle}>
              {taxConfigs.length} {taxConfigs.length === 1 ? 'rule' : 'rules'} configured
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {taxConfigs.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <EmptyState
            icon="receipt-outline"
            title="No Tax Rules"
            subtitle="Add tax rules to configure tax rates for different regions"
            actionLabel="Add Tax Rule"
            onAction={openAddModal}
          />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.info} />
            <Text style={styles.infoText}>
              Tax rates are applied based on the customer's shipping region during checkout.
            </Text>
          </View>

          {/* Tax Rules List */}
          <View style={styles.taxList}>
            {taxConfigs.map(renderTaxCard)}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Modal */}
      {renderModal()}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  
  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.white,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoSubtle,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.infoDark,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },

  // Tax List
  taxList: {
    gap: spacing.md,
  },

  // Tax Card
  taxCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.light,
  },
  taxCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  taxCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  taxInfo: {
    flex: 1,
  },
  regionText: {
    ...typography.h4,
    color: colors.text,
  },
  descriptionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rateContainer: {
    backgroundColor: colors.successLighter,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  rateText: {
    ...typography.bodySemibold,
    color: colors.successDark,
  },
  taxCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySubtle,
  },
  editButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorSubtle,
    minWidth: 80,
    justifyContent: 'center',
  },
  deleteButtonText: {
    ...typography.bodySmall,
    color: colors.error,
    marginLeft: spacing.xs,
    fontWeight: fontWeight.medium,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },

  // Form
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.lighter,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.light,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorSubtle,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  percentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  percentText: {
    ...typography.bodySemibold,
    color: colors.white,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Buttons
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.bodySemibold,
    color: colors.gray,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primarySm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.bodySemibold,
    color: colors.white,
  },
});
