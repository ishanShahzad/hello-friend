/**
 * ProductFormScreen — Liquid Glass
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../config/api';
import SmartTagGenerator from '../../components/SmartTagGenerator';
import Loader from '../../components/common/Loader';
import GlassBackground from '../../components/common/GlassBackground';
import GlassPanel from '../../components/common/GlassPanel';
import { spacing, fontSize, borderRadius, fontWeight, typography } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { PRESET_CATEGORIES, isPresetCategory, MAX_TAGS, MAX_DESCRIPTION_LENGTH } from '../../utils/categories';

export const getFormMode = (product) => product && product._id ? 'edit' : 'create';

export const validateProductForm = (data) => {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Product name is required';
  else if (data.name.length < 3) errors.name = 'Min 3 characters';
  if (!data.price || isNaN(parseFloat(data.price)) || parseFloat(data.price) <= 0) errors.price = 'Valid price required';
  if (!data.stock || isNaN(parseInt(data.stock)) || parseInt(data.stock) < 0) errors.stock = 'Valid stock required';
  return { isValid: Object.keys(errors).length === 0, errors };
};

export default function ProductFormScreen({ navigation, route }) {
  const { palette } = useTheme();
  const styles = buildStyles(palette);

  const { product, isAdmin } = route.params || {};
  const isEditMode = getFormMode(product) === 'edit';

  const [formData, setFormData] = useState({
    name: product?.name || '', description: product?.description || '',
    price: product?.price?.toString() || '', discountedPrice: product?.discountedPrice?.toString() || '',
    stock: product?.stock?.toString() || '', category: product?.category || '', brand: product?.brand || '',
  });
  const [images, setImages] = useState(product?.images || []);
  const [tags, setTags] = useState(product?.tags || []);
  const [optionGroups, setOptionGroups] = useState(product?.optionGroups || []);
  const [newGroupName, setNewGroupName] = useState('');
  const [valueDrafts, setValueDrafts] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [isFeatured, setIsFeatured] = useState(!!product?.isFeatured);
  const [canFeature, setCanFeature] = useState(true);
  const [featuredStats, setFeaturedStats] = useState({ current: 0, max: 6, allowed: true, plan: 'free_trial' });

  // Category combobox
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [otherCategory, setOtherCategory] = useState('');

  // AI description improver
  const [improvingDesc, setImprovingDesc] = useState(false);
  const [previousDescription, setPreviousDescription] = useState(null);

  // AI tag generator
  const [generatingTags, setGeneratingTags] = useState(false);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return PRESET_CATEGORIES;
    return PRESET_CATEGORIES.filter((c) => c.toLowerCase().includes(q));
  }, [categorySearch]);

  const tagsAtLimit = tags.length >= MAX_TAGS;

  // Fetch featured product stats (entitlement + count/limit).
  useEffect(() => {
    if (isAdmin) { setCanFeature(true); setFeaturedStats({ current: 0, max: 999, allowed: true, plan: 'admin' }); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/products/featured-stats');
        const stats = res.data;
        if (!cancelled) {
          setFeaturedStats(stats);
          setCanFeature(stats.allowed || stats.current < stats.max);
        }
      } catch { if (!cancelled) setCanFeature(false); }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  }, [errors]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8, aspect: [1, 1] });
      if (!result.canceled && result.assets) setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    } catch (e) { Alert.alert('Error', 'Failed to pick image'); }
  }, []);

  const removeImage = useCallback((index) => { setImages(prev => prev.filter((_, i) => i !== index)); }, []);

  const handleImproveDescription = async () => {
    const desc = formData.description?.trim();
    if (!desc || desc.length < 10) { Alert.alert('Info', 'Write a short description first (10+ chars)'); return; }
    setImprovingDesc(true);
    try {
      const res = await api.post('/api/ai-assist/improve-description', {
        name: formData.name, description: desc, category: formData.category, brand: formData.brand,
      });
      const improved = res.data?.description || res.data?.improved;
      if (improved) {
        setPreviousDescription(desc);
        const trimmed = improved.slice(0, MAX_DESCRIPTION_LENGTH);
        setFormData(prev => ({ ...prev, description: trimmed }));
      } else {
        Alert.alert('Error', 'No improvement returned');
      }
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to improve description'); }
    finally { setImprovingDesc(false); }
  };

  const handleRevertDescription = () => {
    if (previousDescription != null) {
      setFormData(prev => ({ ...prev, description: previousDescription }));
      setPreviousDescription(null);
    }
  };

  const handleGenerateTagsAI = async () => {
    if (tagsAtLimit) return;
    if (!formData.name?.trim()) { Alert.alert('Info', 'Add a product name first'); return; }
    setGeneratingTags(true);
    try {
      const res = await api.post('/api/ai-assist/generate-tags', {
        name: formData.name, description: formData.description, category: formData.category, brand: formData.brand, existingTags: tags,
      });
      const newTags = res.data?.tags || [];
      const merged = [...new Set([...tags, ...newTags])].slice(0, MAX_TAGS);
      setTags(merged);
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to generate tags'); }
    finally { setGeneratingTags(false); }
  };

  const handleTagsUpdated = (next) => {
    const capped = (next || []).slice(0, MAX_TAGS);
    setTags(capped);
  };

  const saveProduct = async () => {
    const validation = validateProductForm(formData);
    if (!validation.isValid) { setErrors(validation.errors); setTouched({ name: true, price: true, stock: true }); return; }
    setLoading(true);
    try {
      const productData = { name: formData.name.trim(), description: formData.description.trim().slice(0, MAX_DESCRIPTION_LENGTH), price: parseFloat(formData.price), discountedPrice: formData.discountedPrice ? parseFloat(formData.discountedPrice) : null, stock: parseInt(formData.stock), category: formData.category.trim(), brand: formData.brand.trim(), images, tags: tags.slice(0, MAX_TAGS), optionGroups: optionGroups.filter(g => g.name && g.values.length > 0), isFeatured: canFeature ? isFeatured : false };
      if (isEditMode) { await api.put(`/api/products/edit/${product._id}`, { product: productData }); Alert.alert('Success', 'Product updated', [{ text: 'OK', onPress: () => navigation.goBack() }]); }
      else { await api.post('/api/products/add', { product: productData }); Alert.alert('Success', 'Product created', [{ text: 'OK', onPress: () => navigation.goBack() }]); }
    } catch (e) { Alert.alert('Error', e.response?.data?.message || e.response?.data?.msg || 'Failed to save'); }
    finally { setLoading(false); }
  };

  const renderInput = (field, label, options = {}) => {
    const { placeholder, keyboardType = 'default', multiline = false, required = false, prefix } = options;
    const hasError = touched[field] && errors[field];
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label} {required && <Text style={{ color: palette.colors.error }}>*</Text>}</Text>
        <View style={[styles.inputContainer, multiline && { alignItems: 'flex-start' }, hasError && styles.inputError]}>
          {prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
          <TextInput style={[styles.input, multiline && styles.textArea, prefix && { paddingLeft: spacing.xs }]}
            value={formData[field]} onChangeText={(v) => updateField(field, v)} onBlur={() => setTouched(p => ({ ...p, [field]: true }))}
            placeholder={placeholder} placeholderTextColor={palette.colors.textSecondary} keyboardType={keyboardType}
            multiline={multiline} numberOfLines={multiline ? 4 : 1} textAlignVertical={multiline ? 'top' : 'center'} />
        </View>
        {hasError && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  return (
    <GlassBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <GlassPanel variant="floating" style={styles.header}>
            <View style={styles.headerIcon}><Ionicons name={isEditMode ? 'create-outline' : 'add-circle-outline'} size={28} color={palette.colors.primary} /></View>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Product' : 'Add New Product'}</Text>
            <Text style={styles.headerSubtitle}>{isEditMode ? 'Update your product details' : 'Fill in the details'}</Text>
          </GlassPanel>

          <GlassPanel variant="card" style={styles.section}>
            <Text style={styles.sectionTitle}>Product Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity style={styles.addImageButton} onPress={pickImage} activeOpacity={0.7}>
                  <Ionicons name="camera-outline" size={28} color={palette.colors.primary} />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </GlassPanel>

          <GlassPanel variant="card" style={styles.section}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            {renderInput('name', 'Product Name', { placeholder: 'Enter product name', required: true })}

            {/* Description with AI improver */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={styles.label}>Description</Text>
                <Text style={{ fontSize: fontSize.xs, color: (formData.description?.length || 0) >= MAX_DESCRIPTION_LENGTH ? palette.colors.error : palette.colors.textSecondary }}>
                  {formData.description?.length || 0}/{MAX_DESCRIPTION_LENGTH}
                </Text>
              </View>
              <View style={[styles.inputContainer, { alignItems: 'flex-start' }]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(v) => updateField('description', v.slice(0, MAX_DESCRIPTION_LENGTH))}
                  placeholder="Describe your product..."
                  placeholderTextColor={palette.colors.textSecondary}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  onPress={handleImproveDescription}
                  disabled={improvingDesc || !formData.description?.trim()}
                  activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: 'rgba(139,92,246,0.18)', opacity: (improvingDesc || !formData.description?.trim()) ? 0.5 : 1 }}>
                  {improvingDesc ? <ActivityIndicator size="small" color="#8B5CF6" /> : <Ionicons name="sparkles" size={14} color="#8B5CF6" />}
                  <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#8B5CF6' }}>Improve with AI</Text>
                </TouchableOpacity>
                {previousDescription != null && (
                  <TouchableOpacity
                    onPress={handleRevertDescription}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <Ionicons name="arrow-undo" size={14} color={palette.colors.text} />
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: palette.colors.text }}>Revert</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Price <Text style={{ color: palette.colors.error }}>*</Text></Text>
                  <View style={[styles.inputContainer, touched.price && errors.price && styles.inputError]}>
                    <Text style={styles.inputPrefix}>$</Text>
                    <TextInput
                      style={[styles.input, { paddingLeft: spacing.xs }]}
                      value={formData.price}
                      onChangeText={(v) => updateField('price', v.replace(/[^0-9.]/g, ''))}
                      onBlur={() => setTouched(p => ({ ...p, price: true }))}
                      placeholder="0.00"
                      placeholderTextColor={palette.colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {touched.price && errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
                </View>
              </View>
              <View style={{ flex: 1 }}>{renderInput('discountedPrice', 'Sale Price', { placeholder: '0.00', keyboardType: 'decimal-pad', prefix: '$' })}</View>
            </View>
            {renderInput('stock', 'Stock', { placeholder: '0', keyboardType: 'number-pad', required: true })}

            {/* Category combobox */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setCategorySearch(''); setShowCategoryPicker(true); }}
                style={[styles.inputContainer, { paddingHorizontal: spacing.md, paddingVertical: spacing.md, justifyContent: 'space-between' }]}>
                <Text style={{ flex: 1, fontSize: fontSize.md, color: formData.category ? palette.colors.text : palette.colors.textSecondary }} numberOfLines={1}>
                  {formData.category || 'Choose a category'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={palette.colors.textSecondary} />
              </TouchableOpacity>
              {formData.category && !isPresetCategory(formData.category) && (
                <Text style={{ fontSize: fontSize.xs, color: palette.colors.textSecondary, marginTop: 4 }}>Custom category</Text>
              )}
            </View>

            {renderInput('brand', 'Brand', { placeholder: 'e.g., Apple' })}
          </GlassPanel>

          {/* Product Options (Size, Color, Material, etc.) */}
          <GlassPanel variant="card" style={styles.section}>
            <Text style={styles.sectionTitle}>Product Options (Optional)</Text>
            <Text style={{ ...typography.caption, color: palette.colors.textSecondary, marginBottom: spacing.md }}>
              Let buyers pick size, color, material, etc.
            </Text>

            {optionGroups.map((g, idx) => (
              <View key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput style={styles.input} value={g.name}
                      onChangeText={(v) => setOptionGroups(prev => prev.map((x, i) => i === idx ? { ...x, name: v } : x))}
                      placeholder="Option name (e.g. Size)" placeholderTextColor={palette.colors.textSecondary} />
                  </View>
                  <TouchableOpacity style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, justifyContent: 'center' }}
                    onPress={() => setOptionGroups(prev => prev.filter((_, i) => i !== idx))}>
                    <Ionicons name="trash-outline" size={18} color={palette.colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput style={styles.input} value={valueDrafts[idx] || ''}
                      onChangeText={(v) => setValueDrafts(p => ({ ...p, [idx]: v }))}
                      placeholder="Add a value (e.g. S, M, L)" placeholderTextColor={palette.colors.textSecondary} />
                  </View>
                  <TouchableOpacity style={{ backgroundColor: palette.colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, justifyContent: 'center' }}
                    onPress={() => {
                      const v = (valueDrafts[idx] || '').trim();
                      if (!v) return;
                      setOptionGroups(prev => prev.map((x, i) => i === idx ? { ...x, values: x.values.includes(v) ? x.values : [...x.values, v] } : x));
                      setValueDrafts(p => ({ ...p, [idx]: '' }));
                    }}>
                    <Ionicons name="add" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {g.values.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {g.values.map((v, vi) => (
                      <View key={vi} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, gap: 4 }}>
                        <Text style={{ fontSize: fontSize.sm, color: palette.colors.primary, fontWeight: fontWeight.medium }}>{v}</Text>
                        <TouchableOpacity onPress={() => setOptionGroups(prev => prev.map((x, i) => i === idx ? { ...x, values: x.values.filter(y => y !== v) } : x))}>
                          <Ionicons name="close-circle" size={14} color={palette.colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <TextInput style={styles.input} value={newGroupName} onChangeText={setNewGroupName}
                  placeholder="New option (Size, Color, Material...)" placeholderTextColor={palette.colors.textSecondary} />
              </View>
              <TouchableOpacity style={{ backgroundColor: palette.colors.success || palette.colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, justifyContent: 'center' }}
                onPress={() => {
                  const n = newGroupName.trim();
                  if (!n || optionGroups.some(g => g.name.toLowerCase() === n.toLowerCase())) return;
                  setOptionGroups(prev => [...prev, { name: n, values: [] }]);
                  setNewGroupName('');
                }}>
                <Ionicons name="add" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </GlassPanel>


          {/* Smart Tags */}
          <GlassPanel variant="card" style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={styles.sectionTitle}>Smart Tags</Text>
              <Text style={{ fontSize: fontSize.xs, color: tagsAtLimit ? palette.colors.error : palette.colors.textSecondary }}>
                {tags.length}/{MAX_TAGS}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleGenerateTagsAI}
              disabled={generatingTags || tagsAtLimit}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: 'rgba(139,92,246,0.18)', marginBottom: spacing.md, opacity: (generatingTags || tagsAtLimit) ? 0.5 : 1 }}>
              {generatingTags ? <ActivityIndicator size="small" color="#8B5CF6" /> : <Ionicons name="sparkles" size={16} color="#8B5CF6" />}
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#8B5CF6' }}>
                {tagsAtLimit ? 'Tag limit reached' : 'Generate Tags with AI'}
              </Text>
            </TouchableOpacity>
            <SmartTagGenerator
              productId={isEditMode ? product._id : null}
              currentTags={tags}
              onTagsUpdated={handleTagsUpdated}
              productData={{ name: formData.name, description: formData.description, category: formData.category, brand: formData.brand }}
            />
          </GlassPanel>

          {/* Featured Product (Premium / Bonus) */}
          <GlassPanel variant="card" style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Text style={styles.sectionTitle}>Feature on Homepage</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.15)' }}>
                    <Ionicons name="star" size={10} color="#8B5CF6" />
                    <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: '#8B5CF6' }}>PREMIUM</Text>
                  </View>
                </View>
                <Text style={{ ...typography.caption, color: palette.colors.textSecondary, marginTop: spacing.xs }}>
                  {canFeature
                    ? `Adds a Featured badge. ${featuredStats.current}/${featuredStats.max} slots used.`
                    : `Featured limit reached (${featuredStats.max}). Upgrade for more slots.`}
                </Text>
              </View>
              <TouchableOpacity
                disabled={!canFeature || (!isFeatured && featuredStats.current >= featuredStats.max)}
                onPress={() => setIsFeatured(v => !v)}
                activeOpacity={0.8}
                style={{
                  width: 52, height: 30, borderRadius: 15, padding: 3,
                  backgroundColor: (canFeature && isFeatured) ? palette.colors.primary : 'rgba(255,255,255,0.12)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
                  opacity: canFeature ? 1 : 0.5,
                  justifyContent: 'center',
                }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                  alignSelf: (canFeature && isFeatured) ? 'flex-end' : 'flex-start',
                }} />
              </TouchableOpacity>
            </View>
            {!canFeature && (
              <TouchableOpacity onPress={() => navigation.navigate('SellerSubscription')} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
                <Text style={{ ...typography.caption, color: '#8B5CF6', fontWeight: fontWeight.bold }}>Upgrade to unlock →</Text>
              </TouchableOpacity>
            )}
          </GlassPanel>

          <View style={styles.submitContainer}>
            <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.6 }]} onPress={saveProduct} disabled={loading} activeOpacity={0.8}>
              {loading ? <Loader size="small" color="white" /> : (
                <><Ionicons name={isEditMode ? 'checkmark-circle' : 'add-circle'} size={22} color="white" />
                <Text style={styles.submitButtonText}>{isEditMode ? 'Update' : 'Create'} Product</Text></>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowCategoryPicker(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: spacing.lg }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: palette.colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '75%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ ...typography.h4, color: palette.colors.text }}>Choose Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={22} color={palette.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputContainer, { marginBottom: spacing.md }]}>
              <Ionicons name="search" size={16} color={palette.colors.textSecondary} style={{ marginLeft: spacing.md }} />
              <TextInput
                style={styles.input}
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Search categories..."
                placeholderTextColor={palette.colors.textSecondary}
                autoFocus
              />
            </View>
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {filteredCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => { updateField('category', cat); setShowCategoryPicker(false); }}
                  style={{ paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.glass.borderSubtle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: fontSize.md, color: palette.colors.text }}>{cat}</Text>
                  {formData.category?.toLowerCase() === cat.toLowerCase() && (
                    <Ionicons name="checkmark-circle" size={18} color={palette.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {filteredCategories.length === 0 && (
                <Text style={{ color: palette.colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg }}>
                  No matches. Use "Other" to add a custom category.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              onPress={() => { setShowCategoryPicker(false); setOtherCategory(isPresetCategory(formData.category) ? '' : (formData.category || '')); setShowOtherModal(true); }}
              style={{ marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="add-circle-outline" size={18} color={palette.colors.primary} />
              <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: palette.colors.primary }}>Other (custom)</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Custom (Other) Category Modal */}
      <Modal visible={showOtherModal} transparent animationType="fade" onRequestClose={() => setShowOtherModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: palette.colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg }}>
            <Text style={{ ...typography.h4, color: palette.colors.text, marginBottom: spacing.md }}>Custom Category</Text>
            <View style={[styles.inputContainer, { marginBottom: spacing.md }]}>
              <TextInput
                style={styles.input}
                value={otherCategory}
                onChangeText={setOtherCategory}
                placeholder="Enter category name"
                placeholderTextColor={palette.colors.textSecondary}
                autoFocus
                maxLength={40}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity onPress={() => setShowOtherModal(false)} style={{ flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' }}>
                <Text style={{ color: palette.colors.text, fontWeight: fontWeight.semibold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { const v = otherCategory.trim(); if (!v) return; updateField('category', v); setShowOtherModal(false); }}
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: palette.colors.primary, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: fontWeight.bold }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GlassBackground>
  );
}

const buildStyles = (p) => StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  header: { alignItems: 'center', margin: spacing.lg, padding: spacing.xl },
  headerIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(99,102,241,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  headerTitle: { ...typography.h2, color: p.colors.text, marginBottom: spacing.xs },
  headerSubtitle: { ...typography.body, color: p.colors.textSecondary, textAlign: 'center' },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.h4, color: p.colors.text, marginBottom: spacing.md },
  imagesContainer: { gap: spacing.md },
  imageWrapper: { position: 'relative' },
  imagePreview: { width: 100, height: 100, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255,255,255,0.06)' },
  removeImageButton: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: p.colors.error, justifyContent: 'center', alignItems: 'center' },
  addImageButton: { width: 100, height: 100, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: p.colors.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.08)' },
  addImageText: { ...typography.caption, color: p.colors.primary, marginTop: spacing.xs },
  inputGroup: { marginBottom: spacing.lg },
  label: { ...typography.bodySemibold, color: p.colors.text, marginBottom: spacing.sm },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  inputError: { borderColor: p.colors.error },
  inputPrefix: { ...typography.body, color: p.colors.textSecondary, paddingLeft: spacing.md },
  input: { flex: 1, padding: spacing.md, fontSize: fontSize.md, color: p.colors.text },
  textArea: { height: 100, textAlignVertical: 'top' },
  errorText: { ...typography.caption, color: p.colors.error, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  submitContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  submitButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: p.colors.primary, borderRadius: borderRadius.xl, paddingVertical: spacing.lg },
  submitButtonText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: 'white' },
});
