/**
 * PersonalizedSliders — themed Recommended / Trending / Recently Viewed / Price Drops
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getRecentlyViewed, subscribeRecentlyViewed } from '../../utils/recentlyViewed';
import { SliderSkeleton } from './Skeleton';
import { spacing, fontSize, fontWeight, borderRadius } from '../../styles/theme';

const SectionHeader = ({ icon, title, subtitle, color, palette }) => {
  const styles = makeStyles(palette);
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const SliderCard = ({ product, onPress, formatPrice, palette }) => {
  const styles = makeStyles(palette);
  const displayPrice = product.discountedPrice || product.price;
  const hasDiscount = product.discountedPrice > 0 && product.discountedPrice < product.price;
  const discountPct = hasDiscount ? Math.round(((product.price - product.discountedPrice) / product.price) * 100) : 0;
  const imageSource = product.images?.[0]?.url || product.image;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress} accessibilityLabel={`View ${product.name}`}>
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: imageSource }} style={styles.cardImage} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        {discountPct > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPct}%</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>{formatPrice(displayPrice)}</Text>
          {hasDiscount && <Text style={styles.cardOriginalPrice}>{formatPrice(product.price)}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const Section = ({ icon, title, subtitle, color, products, formatPrice, navigation, palette }) => {
  const styles = makeStyles(palette);
  if (!products || products.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} color={color} palette={palette} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow} decelerationRate="fast" snapToInterval={172} snapToAlignment="start">
        {products.map((p) => (
          <SliderCard key={p._id} product={p} formatPrice={formatPrice} palette={palette} onPress={() => navigation.navigate('ProductDetail', { productId: p._id })} />
        ))}
      </ScrollView>
    </View>
  );
};

export default function PersonalizedSliders({ navigation }) {
  const { palette } = useTheme();
  const colors = palette.colors;
  const styles = makeStyles(palette);
  const { formatPrice } = useCurrency();
  const [picked, setPicked] = useState([]);
  const [trending, setTrending] = useState([]);
  const [priceDrops, setPriceDrops] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, viewedIds] = await Promise.all([
        api.get('/api/products/get-products?limit=50'),
        getRecentlyViewed(),
      ]);
      const all = allRes.data?.products || [];
      const viewed = viewedIds.map((id) => all.find((p) => p._id === id)).filter(Boolean).slice(0, 10);
      setRecentlyViewed(viewed);
      const preferredCategories = [...new Set(viewed.map((p) => p.category))];
      const preferredBrands = [...new Set(viewed.map((p) => p.brand))];
      let pickedItems = [];
      if (preferredCategories.length > 0) {
        pickedItems = all.filter((p) => preferredCategories.includes(p.category) || preferredBrands.includes(p.brand)).filter((p) => !viewedIds.includes(p._id)).slice(0, 12);
      }
      if (pickedItems.length < 4) {
        const fillers = all.filter((p) => !pickedItems.find((x) => x._id === p._id)).sort(() => Math.random() - 0.5).slice(0, 12 - pickedItems.length);
        pickedItems = [...pickedItems, ...fillers];
      }
      setPicked(pickedItems);
      setTrending([...all].sort((a, b) => (b.numReviews || 0) * (b.rating || 0) - (a.numReviews || 0) * (a.rating || 0)).slice(0, 12));
      setPriceDrops(all.filter((p) => p.discountedPrice > 0 && p.discountedPrice < p.price).sort((a, b) => {
        const da = ((a.price - a.discountedPrice) / a.price) * 100;
        const db = ((b.price - b.discountedPrice) / b.price) * 100;
        return db - da;
      }).slice(0, 12));
    } catch (e) {
      console.error('Personalized fetch failed:', e?.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const unsub = subscribeRecentlyViewed(() => fetchData());
    return unsub;
  }, [fetchData]);

  if (loading) {
    return (
      <View>
        <View style={[styles.sectionHeader, { paddingHorizontal: spacing.lg }]}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Loading personalized picks…</Text>
        </View>
        <SliderSkeleton count={3} />
      </View>
    );
  }

  const hasAnything = picked.length > 0 || trending.length > 0 || priceDrops.length > 0 || recentlyViewed.length > 0;
  if (!hasAnything) return null;

  return (
    <View>
      <Section icon="time-outline" title="Recently Viewed" subtitle="Continue where you left off" color={colors.info} products={recentlyViewed} formatPrice={formatPrice} navigation={navigation} palette={palette} />
      <Section icon="sparkles" title="Picked for You" subtitle="Based on what you've explored" color={colors.primary} products={picked} formatPrice={formatPrice} navigation={navigation} palette={palette} />
      <Section icon="pricetag" title="Price Drops" subtitle="Hot deals right now" color={colors.error} products={priceDrops} formatPrice={formatPrice} navigation={navigation} palette={palette} />
      <Section icon="trending-up" title="Trending Now" subtitle="Most popular products" color={colors.success} products={trending} formatPrice={formatPrice} navigation={navigation} palette={palette} />
    </View>
  );
}

const makeStyles = (palette) => { const colors = palette.colors; const glass = palette.glass; return StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  sectionSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  scrollRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xs },
  card: { width: 160, backgroundColor: glass.bg, borderRadius: 16, borderWidth: 1, borderColor: glass.border, overflow: 'hidden', marginRight: spacing.sm },
  cardImageWrap: { width: '100%', aspectRatio: 1, backgroundColor: glass.bgSubtle },
  cardImage: { width: '100%', height: '100%' },
  discountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  discountText: { color: '#fff', fontSize: 10, fontWeight: fontWeight.bold },
  cardBody: { padding: spacing.sm, gap: 4 },
  cardName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, minHeight: 36 },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  cardOriginalPrice: { fontSize: fontSize.xs, color: colors.textSecondary, textDecorationLine: 'line-through' },
}); };
