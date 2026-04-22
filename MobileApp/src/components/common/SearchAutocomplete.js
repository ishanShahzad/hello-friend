/**
 * SearchAutocomplete — themed recent searches + live product suggestions overlay.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useTheme } from '../../contexts/ThemeContext';
import { getSearchHistory, removeSearchHistoryItem, clearSearchHistory } from '../../utils/searchHistory';
import { spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';

export default function SearchAutocomplete({ visible, query, onSelectQuery, onSelectProduct, onClose, navigation }) {
  const { palette } = useTheme();
  const colors = palette.colors;
  const styles = makeStyles(palette);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [storeSuggestions, setStoreSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => { if (visible) getSearchHistory().then(setHistory); }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (!query || query.trim().length < 2) { setSuggestions([]); setStoreSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const q = encodeURIComponent(query.trim());
        const [productsRes, storesRes] = await Promise.allSettled([
          api.get(`/api/products/get-products?search=${q}&limit=5`),
          api.get(`/api/stores/search?q=${q}&limit=4`),
        ]);
        setSuggestions(productsRes.status === 'fulfilled' ? (productsRes.value.data?.products || []) : []);
        setStoreSuggestions(storesRes.status === 'fulfilled' ? (storesRes.value.data?.stores || storesRes.value.data?.results || []) : []);
      } catch { setSuggestions([]); setStoreSuggestions([]); } finally { setLoading(false); }
    }, 280);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, visible]);

  const handleRemove = useCallback(async (q) => { const next = await removeSearchHistoryItem(q); setHistory(next || []); }, []);
  const handleClearAll = useCallback(async () => { await clearSearchHistory(); setHistory([]); }, []);

  if (!visible) return null;

  const showHistory = (!query || query.trim().length < 2) && history.length > 0;
  const showSuggestions = query && query.trim().length >= 2;

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {showHistory && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>
              <TouchableOpacity onPress={handleClearAll} accessibilityLabel="Clear search history">
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {history.map((q) => (
              <View key={q} style={styles.historyRow}>
                <TouchableOpacity style={styles.historyMain} onPress={() => onSelectQuery(q)} accessibilityLabel={`Search ${q}`}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.historyText}>{q}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemove(q)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={`Remove ${q} from history`}>
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {showSuggestions && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SUGGESTIONS</Text>
              {loading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Stores & Brands */}
            {storeSuggestions.length > 0 && (
              <View style={{ marginBottom: spacing.xs }}>
                <Text style={styles.subSectionLabel}>Stores & Brands</Text>
                {storeSuggestions.map((st) => {
                  const isBrand = st.sellerType === 'brand';
                  const badgeBg = isBrand ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)';
                  const badgeBorder = isBrand ? 'rgba(168,85,247,0.35)' : 'rgba(59,130,246,0.35)';
                  const badgeColor = isBrand ? '#a855f7' : '#3b82f6';
                  return (
                    <TouchableOpacity
                      key={st._id}
                      style={styles.suggestionRow}
                      onPress={() => navigation?.navigate('Store', { storeSlug: st.storeSlug, storeName: st.storeName })}
                      accessibilityLabel={`View ${st.storeName}`}
                    >
                      {st.logo ? (
                        <Image source={{ uri: st.logo }} style={styles.storeLogoImg} contentFit="cover" cachePolicy="memory-disk" />
                      ) : (
                        <View style={[styles.storeLogoImg, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name={isBrand ? 'sparkles' : 'storefront'} size={20} color={badgeColor} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.suggestionName} numberOfLines={1}>{st.storeName}</Text>
                          <View style={[styles.typePill, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                            <Ionicons name={isBrand ? 'sparkles' : 'storefront'} size={9} color={badgeColor} />
                            <Text style={[styles.typePillText, { color: badgeColor }]}>{isBrand ? 'Brand' : 'Store'}</Text>
                          </View>
                        </View>
                        <Text style={styles.suggestionMeta} numberOfLines={1}>
                          {(st.trustCount || 0)} {(st.trustCount || 0) === 1 ? 'truster' : 'trusters'}
                        </Text>
                      </View>
                      <Ionicons name="arrow-up-outline" size={16} color={colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Products */}
            {suggestions.length > 0 && storeSuggestions.length > 0 && (
              <Text style={styles.subSectionLabel}>Products</Text>
            )}
            {suggestions.length === 0 && storeSuggestions.length === 0 && !loading && (
              <Text style={styles.emptyText}>No matches found</Text>
            )}
            {suggestions.map((p) => (
              <TouchableOpacity key={p._id} style={styles.suggestionRow} onPress={() => onSelectProduct(p)} accessibilityLabel={`View ${p.name}`}>
                <Image source={{ uri: p.images?.[0]?.url || p.image }} style={styles.suggestionImg} contentFit="cover" cachePolicy="memory-disk" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.suggestionMeta} numberOfLines={1}>{p.category}</Text>
                </View>
                <Ionicons name="arrow-up-outline" size={16} color={colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!showHistory && !showSuggestions && (
          <View style={styles.emptyHint}>
            <Ionicons name="search-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyHintText}>Start typing to search products</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (palette) => { const colors = palette.colors; const glass = palette.glass; return StyleSheet.create({
  container: { backgroundColor: glass.bgStrong, marginHorizontal: spacing.md, marginTop: spacing.xs, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: glass.border, maxHeight: 380, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
  section: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  sectionTitle: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.textSecondary, letterSpacing: 0.7 },
  clearText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  historyMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  historyText: { fontSize: fontSize.md, color: colors.text },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  suggestionImg: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: glass.bgSubtle },
  suggestionName: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  suggestionMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, paddingVertical: spacing.md, textAlign: 'center' },
  emptyHint: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyHintText: { fontSize: fontSize.sm, color: colors.textSecondary },
  subSectionLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textSecondary, letterSpacing: 0.6, marginTop: spacing.xs, marginBottom: 2, textTransform: 'uppercase' },
  storeLogoImg: { width: 44, height: 44, borderRadius: 22, backgroundColor: glass.bgSubtle, borderWidth: 1, borderColor: glass.border },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  typePillText: { fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 0.4, textTransform: 'uppercase' },
}); };
