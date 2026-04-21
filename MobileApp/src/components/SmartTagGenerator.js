/**
 * SmartTagGenerator — themed
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import GlassPanel from './common/GlassPanel';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

export default function SmartTagGenerator({ productId, currentTags = [], onTagsUpdated, productData }) {
  const { palette } = useTheme();
  const colors = palette.colors;
  const styles = makeStyles(palette);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);

  const generateTags = async () => {
    if (!productId) { Alert.alert('Info', 'Save the product first to generate tags'); return; }
    setIsGenerating(true);
    try {
      const res = await api.post(`/api/smart-tags/generate/${productId}`);
      Alert.alert('Success', `Generated ${res.data.newTags?.length || 0} new tags!`);
      if (onTagsUpdated) onTagsUpdated(res.data.tags);
    } catch (e) { Alert.alert('Error', 'Failed to generate tags'); }
    finally { setIsGenerating(false); }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await api.post('/api/smart-tags/suggestions', productData || {});
      setSuggestions(res.data);
      setShowSuggestions(true);
    } catch (e) { console.error(e); }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const applySelected = () => {
    if (selectedTags.length > 0 && onTagsUpdated) {
      const newTags = [...new Set([...currentTags, ...selectedTags])];
      onTagsUpdated(newTags);
      setSelectedTags([]);
      setShowSuggestions(false);
      Alert.alert('Success', `Added ${selectedTags.length} tags`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.btnRow}>
        <TouchableOpacity onPress={generateTags} disabled={isGenerating || !productId} style={[styles.generateBtn, (isGenerating || !productId) && { opacity: 0.5 }]}>
          {isGenerating ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="sparkles" size={16} color="#ffffff" />}
          <Text style={styles.generateBtnText}>AI Generate</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={fetchSuggestions} style={styles.browseBtn}>
          <Ionicons name="pricetags-outline" size={16} color={colors.primary} />
          <Text style={styles.browseBtnText}>Suggestions</Text>
        </TouchableOpacity>
      </View>

      {currentTags.length > 0 && (
        <View style={styles.tagsWrap}>
          {currentTags.map(tag => (
            <View key={tag} style={styles.tagPill}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity onPress={() => onTagsUpdated && onTagsUpdated(currentTags.filter(t => t !== tag))}>
                <Ionicons name="close" size={12} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {showSuggestions && suggestions && (
        <GlassPanel variant="inner" style={styles.suggestionsPanel}>
          <View style={styles.suggestionsHeader}>
            <Text style={styles.suggestionsTitle}>
              <Ionicons name="sparkles" size={14} color={colors.primary} /> Tag Suggestions
            </Text>
            <TouchableOpacity onPress={() => setShowSuggestions(false)}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {suggestions.smartSuggestions?.length > 0 && (
            <View style={styles.catSection}>
              <Text style={styles.catLabel}>AI Recommended</Text>
              <View style={styles.tagsWrap}>
                {suggestions.smartSuggestions.map(tag => (
                  <TouchableOpacity key={tag} onPress={() => toggleTag(tag)} style={[styles.sugTag, (selectedTags.includes(tag) || currentTags.includes(tag)) && styles.sugTagSelected]}>
                    {selectedTags.includes(tag) && <Ionicons name="checkmark" size={12} color={colors.secondary} />}
                    <Text style={[styles.sugTagText, selectedTags.includes(tag) && { color: colors.secondary }]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {Object.entries(suggestions.categories || {}).map(([category, tags]) => (
              <View key={category} style={styles.catSection}>
                <Text style={styles.catLabel}>{category}</Text>
                <View style={styles.tagsWrap}>
                  {tags.map(tag => (
                    <TouchableOpacity key={tag} onPress={() => !currentTags.includes(tag) && toggleTag(tag)} disabled={currentTags.includes(tag)} style={[styles.sugTag, currentTags.includes(tag) && { backgroundColor: colors.successSubtle }, selectedTags.includes(tag) && styles.sugTagSelected]}>
                      {currentTags.includes(tag) && <Ionicons name="checkmark" size={10} color={colors.success} />}
                      <Text style={[styles.sugTagText, currentTags.includes(tag) && { color: colors.success }]}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {selectedTags.length > 0 && (
            <TouchableOpacity onPress={applySelected} style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Apply {selectedTags.length} Tag{selectedTags.length !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          )}
        </GlassPanel>
      )}
    </View>
  );
}

const makeStyles = (palette) => { const colors = palette.colors; const glass = palette.glass; return StyleSheet.create({
  container: { gap: spacing.md },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.secondary },
  generateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#ffffff' },
  browseBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: glass.bgSubtle },
  browseBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySubtle, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  tagText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.primary },
  suggestionsPanel: { padding: spacing.md },
  suggestionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  suggestionsTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  catSection: { marginBottom: spacing.md },
  catLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, textTransform: 'capitalize', marginBottom: spacing.xs },
  sugTag: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full, backgroundColor: glass.bgSubtle, flexDirection: 'row', alignItems: 'center', gap: 3 },
  sugTagSelected: { borderWidth: 1, borderColor: colors.secondary, backgroundColor: colors.secondarySubtle },
  sugTagText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text },
  applyBtn: { backgroundColor: colors.success, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.sm },
  applyBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#ffffff' },
}); };
