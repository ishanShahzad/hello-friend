/**
 * ChatBot — Mobile AI Assistant
 * Role-aware with tool calling, rate limits, contextual chips, TTS, and embedded dashboard mode
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import {
  spacing, fontSize, borderRadius, fontWeight,
} from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';

// Uses our own backend (no Supabase) — the /api/ai-chat/once endpoint handles
// non-streaming tool execution loop server-side and returns the final response.
const AI_CHAT_ONCE_URL = null; // Set dynamically from api.defaults.baseURL below

const ROLE_CHIPS = {
  user: [
    { label: '👗 Find outfit', msg: "I'm looking for a new outfit, can you help me?" },
    { label: '📦 Track order', msg: 'Track my recent order' },
    { label: '🎨 Style advice', msg: 'Give me some fashion advice for this season' },
    { label: '🏪 Browse stores', msg: 'Show me popular stores' },
  ],
  seller: [
    { label: '📊 Analytics', msg: 'Show me my store analytics — revenue, orders, top products' },
    { label: '📦 Add product', msg: 'I want to add a new product to my store' },
    { label: '💰 Discount', msg: 'Help me apply a bulk discount to my products' },
    { label: '📋 Orders', msg: 'Show me my recent orders and their statuses' },
    { label: '🚀 Growth tips', msg: 'Give me strategies to grow my store and increase sales' },
  ],
  admin: [
    { label: '👥 Users', msg: 'Show me a summary of all users on the platform' },
    { label: '📊 Stats', msg: 'Give me platform-wide analytics — users, revenue, orders' },
    { label: '🛡️ Complaints', msg: 'Show me all pending complaints' },
    { label: '🏪 Verifications', msg: 'Show me pending store verifications' },
    { label: '⚙️ Tax config', msg: 'Show me the current tax configuration' },
  ],
};

const ROLE_GREETINGS = {
  user: (name, g) => name
    ? `${g}, ${name}! 👋 I'm your personal shopping stylist. I can help you find outfits, give style advice, track orders, and more!`
    : `${g}! 👋 I'm your personal shopping stylist. How can I help you today?`,
  seller: (name, g) => `${g}, ${name || 'Seller'}! 🚀 I'm your business assistant. I can manage products, analyze performance, handle orders, and suggest growth strategies.`,
  admin: (name, g) => `${g}, ${name || 'Admin'}! 🛡️ I'm your platform command center. I can manage users, analytics, complaints, verifications, and more.`,
};

const ROLE_TITLES = {
  user: { title: 'AI Stylist', subtitle: 'Personal Shopping Assistant' },
  seller: { title: 'Business Assistant', subtitle: 'Store Management & Growth' },
  admin: { title: 'Platform Commander', subtitle: 'Full Admin Control' },
};

// ─── Execute tool calls via backend API ───
const summarizeToolResultsForPrompt = (toolResults = []) => {
  const lines = [];
  for (const event of toolResults || []) {
    const result = event.result || {};
    const data = result.data || {};
    if (event.name === 'add_product' && result.success && data.productId) {
      lines.push(`[Tool memory: add_product succeeded. productId=${data.productId}; name="${data.name || ''}"; brand="${data.brand || ''}"; price=${data.price ?? ''}; tags=${JSON.stringify(data.tags || [])}; colors=${JSON.stringify(data.colors || [])}. Use this productId for follow-up edits; do not add it again unless explicitly asked for a duplicate.]`);
    } else if (event.name === 'edit_product' && result.success && (data._id || data.productId)) {
      lines.push(`[Tool memory: edit_product succeeded. productId=${data._id || data.productId}; name="${data.name || ''}".]`);
    } else if (event.name === 'add_product' && result.duplicate) {
      const existing = data.existingProduct || {};
      lines.push(`[Tool memory: add_product duplicate blocked. Existing productId=${existing.productId || ''}; name="${existing.name || ''}". Ask for explicit duplicate confirmation before creating another listing.]`);
    } else if (result.success === false) {
      lines.push(`[Tool memory: ${event.name} failed: ${result.error || result.message || 'unknown error'}. Do not claim it succeeded.]`);
    }
    if (lines.length >= 6) break;
  }
  return lines.join('\n');
};

async function executeToolCall(name, args) {
  const apiUrl = '';
  try {
    switch (name) {
      case 'search_products': {
        let url = `/api/ai-actions/search-products?`;
        if (args.query) url += `query=${encodeURIComponent(args.query)}&`;
        if (args.category) url += `category=${encodeURIComponent(args.category)}&`;
        if (args.maxPrice) url += `maxPrice=${args.maxPrice}&`;
        if (args.minPrice) url += `minPrice=${args.minPrice}&`;
        url += 'limit=5';
        const res = await api.get(url);
        return { products: res.data.products || [] };
      }
      case 'navigate': return { navigated: true, label: args.label, route: args.route };
      case 'show_style_advice': return { styleAdvice: args };
      case 'suggest_outfit': return { outfitSuggestion: args };
      case 'get_my_orders': {
        const res = await api.get(`/api/order/get-user-orders${args.status ? `?status=${args.status}` : ''}`);
        return { orders: (res.data.orders || []).slice(0, 5).map(o => ({ orderId: o.orderId, status: o.orderStatus, total: o.orderSummary?.totalAmount, date: o.createdAt })) };
      }
      case 'get_order_detail': { const res = await api.get(`/api/ai-actions/order-detail?orderId=${args.orderId}`); return res.data; }
      case 'cancel_order': { const res = await api.post('/api/ai-actions/cancel-order', { orderId: args.orderId }); return res.data; }
      case 'submit_complaint': { const res = await api.post('/api/chatbot/complaint', args); return res.data; }
      case 'get_my_complaints': { const res = await api.get('/api/chatbot/my-complaints'); return { complaints: (res.data.complaints || []).slice(0, 10).map(c => ({ subject: c.subject, category: c.category, status: c.status, date: c.createdAt })) }; }
      case 'add_product': { const res = await api.post('/api/ai-actions/add-product', { product: args }); return res.data; }
      case 'edit_product': { const res = await api.post('/api/ai-actions/edit-product', args); return res.data; }
      case 'delete_product': { const res = await api.post('/api/ai-actions/delete-product', args); return res.data; }
      case 'list_my_products': {
        let url = '/api/ai-actions/my-products?';
        if (args.search) url += `search=${encodeURIComponent(args.search)}&`;
        if (args.category) url += `category=${encodeURIComponent(args.category)}&`;
        if (args.limit) url += `limit=${args.limit}`;
        const res = await api.get(url);
        return res.data;
      }
      case 'bulk_discount': { const res = await api.post('/api/ai-actions/bulk-discount', args); return res.data; }
      case 'bulk_price_update': { const res = await api.post('/api/ai-actions/bulk-price-update', args); return res.data; }
      case 'remove_discount': { const res = await api.post('/api/ai-actions/remove-discount', args); return res.data; }
      case 'get_seller_analytics': { const res = await api.get('/api/ai-actions/seller-analytics'); return res.data; }
      case 'get_seller_orders': {
        let url = '/api/ai-actions/seller-orders?';
        if (args.status) url += `status=${args.status}&`;
        if (args.limit) url += `limit=${args.limit}`;
        const res = await api.get(url);
        return res.data;
      }
      case 'update_order_status': { const res = await api.post('/api/ai-actions/update-order-status', args); return res.data; }
      case 'get_my_store': { const res = await api.get('/api/ai-actions/my-store'); return res.data; }
      case 'update_store': { const res = await api.post('/api/ai-actions/update-store', args); return res.data; }
      case 'get_store_analytics': { const res = await api.get('/api/ai-actions/store-analytics'); return res.data; }
      case 'apply_for_verification': { const res = await api.post('/api/ai-actions/apply-verification', {}); return res.data; }
      case 'get_shipping_methods': { const res = await api.get('/api/ai-actions/shipping-methods'); return res.data; }
      case 'update_shipping': { const res = await api.post('/api/ai-actions/update-shipping', args); return res.data; }
      case 'get_all_users': {
        let url = '/api/ai-actions/all-users?';
        if (args.search) url += `search=${encodeURIComponent(args.search)}&`;
        if (args.role) url += `role=${args.role}&`;
        if (args.limit) url += `limit=${args.limit}`;
        const res = await api.get(url);
        return res.data;
      }
      case 'delete_user': { const res = await api.post('/api/ai-actions/delete-user', args); return res.data; }
      case 'block_user': { const res = await api.post('/api/ai-actions/block-user', args); return res.data; }
      case 'change_user_role': { const res = await api.post('/api/ai-actions/change-user-role', args); return res.data; }
      case 'get_admin_analytics': { const res = await api.get('/api/ai-actions/admin-analytics'); return res.data; }
      case 'get_all_orders': {
        let url = '/api/ai-actions/all-orders?';
        if (args.status) url += `status=${args.status}&`;
        if (args.limit) url += `limit=${args.limit}`;
        const res = await api.get(url);
        return res.data;
      }
      case 'get_all_complaints': {
        let url = '/api/ai-actions/all-complaints?';
        if (args.category) url += `category=${args.category}&`;
        if (args.status) url += `status=${args.status}`;
        const res = await api.get(url);
        return res.data;
      }
      case 'update_complaint': { const res = await api.post('/api/ai-actions/update-complaint', args); return res.data; }
      case 'get_pending_verifications': { const res = await api.get('/api/ai-actions/pending-verifications'); return res.data; }
      case 'approve_verification': { const res = await api.post('/api/ai-actions/approve-verification', args); return res.data; }
      case 'reject_verification': { const res = await api.post('/api/ai-actions/reject-verification', args); return res.data; }
      case 'remove_verification': { const res = await api.post('/api/ai-actions/remove-verification', args); return res.data; }
      case 'get_all_stores': { const res = await api.get(`/api/ai-actions/all-stores${args.limit ? `?limit=${args.limit}` : ''}`); return res.data; }
      case 'update_tax_config': { const res = await api.post('/api/ai-actions/update-tax', args); return res.data; }
      case 'get_tax_config': { const res = await api.get('/api/ai-actions/tax-config'); return res.data; }

      // ─── User-side parity ───
      case 'get_wishlist': { const res = await api.get('/api/ai-actions/wishlist'); return res.data; }
      case 'add_to_wishlist': { const res = await api.post('/api/ai-actions/add-to-wishlist', { productId: args.productId }); return res.data; }
      case 'remove_from_wishlist': { const res = await api.post('/api/ai-actions/remove-from-wishlist', { productId: args.productId }); return res.data; }
      case 'get_addresses': { const res = await api.get('/api/ai-actions/addresses'); return res.data; }
      case 'add_address': { const res = await api.post('/api/ai-actions/add-address', { address: args.address }); return res.data; }
      case 'update_profile': { const res = await api.post('/api/ai-actions/update-profile', { updates: args.updates }); return res.data; }
      case 'get_notifications': { const res = await api.get('/api/ai-actions/notifications'); return res.data; }
      case 'mark_notifications_read': { const res = await api.post('/api/ai-actions/mark-notifications-read', {}); return res.data; }
      case 'get_available_coupons': {
        let url = '/api/ai-actions/available-coupons?';
        if (args.storeId) url += `storeId=${args.storeId}&`;
        if (args.productId) url += `productId=${args.productId}`;
        const res = await api.get(url);
        return res.data;
      }
      case 'validate_coupon': { const res = await api.post('/api/ai-actions/validate-coupon', { code: args.code, cartTotal: args.cartTotal }); return res.data; }
      case 'search_stores': {
        let url = '/api/ai-actions/search-stores?';
        if (args.query) url += `query=${encodeURIComponent(args.query)}&`;
        if (args.limit) url += `limit=${args.limit}`;
        const res = await api.get(url);
        return res.data;
      }
      case 'get_verified_stores': { const res = await api.get('/api/ai-actions/verified-stores'); return res.data; }
      case 'get_store_details': {
        let url = '/api/ai-actions/store-details?';
        if (args.storeId) url += `storeId=${args.storeId}&`;
        if (args.slug) url += `slug=${encodeURIComponent(args.slug)}`;
        const res = await api.get(url);
        return res.data;
      }

      // ─── Seller-side coupon parity ───
      case 'create_coupon': { const res = await api.post('/api/ai-actions/create-coupon', { coupon: args.coupon }); return res.data; }
      case 'get_my_coupons': { const res = await api.get('/api/ai-actions/my-coupons'); return res.data; }
      case 'update_coupon': { const res = await api.post('/api/ai-actions/update-coupon', args); return res.data; }
      case 'delete_coupon': { const res = await api.post('/api/ai-actions/delete-coupon', args); return res.data; }
      case 'toggle_coupon': { const res = await api.post('/api/ai-actions/toggle-coupon', args); return res.data; }
      case 'get_subscription_status': { const res = await api.get('/api/ai-actions/subscription-status'); return res.data; }

      // ─── Admin broadcast & subscriptions parity ───
      case 'send_broadcast': { const res = await api.post('/api/ai-actions/send-broadcast', args); return res.data; }
      case 'get_broadcasts': { const res = await api.get('/api/ai-actions/broadcasts'); return res.data; }
      case 'cancel_broadcast': { const res = await api.post('/api/ai-actions/cancel-broadcast', args); return res.data; }
      case 'get_all_subscriptions': { const res = await api.get('/api/ai-actions/all-subscriptions'); return res.data; }

      default: return {};
    }
  } catch (e) {
    return { error: e.response?.data?.msg || `Failed: ${name}` };
  }
}

// ─── Non-streaming AI call via our backend ───
// Uses /api/ai-chat/once which handles the tool execution loop server-side
// and returns the final response with tool results included.
async function callAI(messages) {
  const resp = await api.post('/api/ai-chat/once', { messages });
  return resp.data;
}

// ─── Main Component ───
export default function ChatBot({ embedded = false, dashboardRole = null, visible = true, onClose, navigation }) {
  const { currentUser } = useAuth();
  const { palette } = useTheme();
  const c = palette.colors;
  const styles = makeStyles(palette);
  const effectiveRole = dashboardRole || currentUser?.role || 'user';
  const roleInfo = ROLE_TITLES[effectiveRole] || ROLE_TITLES.user;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [contextualChips, setContextualChips] = useState([]);
  const [rateLimit, setRateLimit] = useState({ used: 0, limit: -1, remaining: -1 });
  const [userContext, setUserContext] = useState(null);

  const flatListRef = useRef(null);

  // Rate limit
  const checkRateLimit = useCallback(async () => {
    try {
      const res = await api.get('/api/ai-actions/rate-limit');
      setRateLimit(res.data);
      return res.data;
    } catch { return { used: 0, limit: -1, remaining: -1 }; }
  }, []);

  const incrementRateLimit = useCallback(async () => {
    try {
      const res = await api.post('/api/ai-actions/rate-limit/increment');
      setRateLimit(res.data);
      return res.data;
    } catch (err) {
      if (err.response?.status === 429) {
        Alert.alert('Limit Reached', 'Daily message limit reached. Resets at midnight.');
        return null;
      }
      return { used: 0, limit: -1, remaining: -1 };
    }
  }, []);

  // Init
  useEffect(() => {
    if (visible && messages.length === 0) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const name = currentUser?.username || currentUser?.name?.split(' ')[0] || '';
      const greetFn = ROLE_GREETINGS[effectiveRole] || ROLE_GREETINGS.user;
      setMessages([{ id: '0', role: 'assistant', content: greetFn(name, greeting) }]);
      setContextualChips(ROLE_CHIPS[effectiveRole] || ROLE_CHIPS.user);
    }
    if (visible) {
      checkRateLimit();
      if (currentUser && !userContext) fetchUserContext();
    }
  }, [visible, currentUser, effectiveRole]);

  const fetchUserContext = async () => {
    try {
      const res = await api.get('/api/chatbot/user-context');
      setUserContext(res.data);
    } catch {}
  };

  // TTS
  const speak = useCallback((text) => {
    if (!ttsEnabled) return;
    const clean = text.replace(/[*#_`~\[\]()>]/g, '').replace(/\n+/g, '. ').trim();
    if (!clean) return;
    Speech.speak(clean, { rate: 1.0, pitch: 1.0 });
  }, [ttsEnabled]);

  // Send
  const sendMessage = async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    if (rateLimit.remaining === 0 && rateLimit.limit !== -1) {
      Alert.alert('Limit', !currentUser ? 'Please log in for more messages!' : 'Daily message limit reached.');
      return;
    }

    const rl = await incrementRateLimit();
    if (!rl) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const aiMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        const toolMemory = summarizeToolResultsForPrompt(m.toolResults);
        return {
          role: m.role,
          content: toolMemory ? `${m.content}\n\n${toolMemory}` : m.content,
        };
      });
    aiMessages.push({ role: 'user', content: msgText });

    try {
      // The backend /api/ai-chat/once handles the ENTIRE tool execution loop
      // server-side and returns: { message, toolResults, clientActions, role }
      const response = await callAI(aiMessages);
      const assistantContent = response.message?.content || "Sorry, I couldn't process that.";
      const toolResults = (response.toolResults || []).map(tr => ({
        name: tr.tool,
        result: tr.result,
      }));
      const clientActions = response.clientActions || [];

      // Handle client-side actions (navigate, style advice, outfit suggestions)
      for (const ca of clientActions) {
        if (ca.action === 'navigate' && ca.args?.route) {
          if (navigation) {
            // Best-effort in-app navigation by route name match
            try {
              const route = String(ca.args.route).replace(/^\//, '');
              const map = {
                '': 'Home', 'home': 'Home', 'cart': 'Cart', 'wishlist': 'Wishlist',
                'orders': 'Orders', 'profile': 'Profile', 'settings': 'Settings',
                'notifications': 'Notifications', 'stores': 'Stores',
              };
              const target = map[route.toLowerCase()];
              if (target) navigation.navigate(target);
            } catch {}
          }
          toolResults.push({ name: 'navigate', result: { navigated: true, label: ca.args.label || ca.args.route } });
        } else if (ca.action === 'show_style_advice') {
          toolResults.push({ name: 'show_style_advice', result: { styleAdvice: ca.args } });
        } else if (ca.action === 'suggest_outfit') {
          toolResults.push({ name: 'suggest_outfit', result: { outfitSuggestion: ca.args } });
        }
      }

      // Update contextual chips based on tool results
      for (const tr of toolResults) {
        if (tr.name === 'search_products' && tr.result?.data?.products?.length > 0) {
          setContextualChips([
            { label: '🔍 More like this', msg: `Show me more products similar to ${tr.result.data.products[0].name}` },
            { label: '💰 Cheaper options', msg: 'Show me cheaper alternatives' },
          ]);
        } else if (['get_seller_analytics', 'get_admin_analytics'].includes(tr.name)) {
          setContextualChips([
            { label: '📈 More details', msg: 'Give me a deeper breakdown of the analytics' },
            { label: '🚀 Growth tips', msg: 'Based on this data, what should I do to grow?' },
          ]);
        }
      }

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        toolResults,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (ttsEnabled && assistantContent) speak(assistantContent);
    } catch (err) {
      const errorMsg = err.message?.includes('Rate limit') ? 'Too many requests — please try again shortly!'
        : 'Sorry, please try again! 🙏';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    api.delete('/api/chatbot/history').catch(() => {});
  };

  // ─── Render ───
  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={12} color="#fff" />
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.msgText, isUser && { color: '#fff' }]}>{item.content}</Text>
          {/* Tool results */}
          {item.toolResults?.map((tr, i) => (
            <View key={i}>
              {tr.name === 'search_products' && (tr.result?.data?.products || tr.result?.products)?.length > 0 && (
                <View style={styles.productResults}>
                  {(tr.result?.data?.products || tr.result?.products).map((p, pi) => (
                    <TouchableOpacity key={pi} style={styles.productItem}
                      onPress={() => navigation?.navigate('ProductDetail', { productId: p._id })}>
                      <View style={styles.productDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.productPrice}>${(p.discountedPrice || p.price || 0).toFixed(2)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={c.textLight} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {tr.name === 'send_product_image' && tr.result?.data?.imageUrl && (
                <View style={styles.productResults}>
                  <Image
                    source={{ uri: tr.result.data.imageUrl }}
                    style={{ width: '100%', height: 180, borderRadius: 12, backgroundColor: c.surfaceVariant }}
                    resizeMode="cover"
                  />
                  <Text style={[styles.productName, { marginTop: 8 }]} numberOfLines={1}>
                    {tr.result.data.caption || tr.result.data.name || 'Product image'}
                  </Text>
                </View>
              )}
              {tr.name === 'navigate' && tr.result.navigated && (
                <View style={styles.actionResult}>
                  <Ionicons name="arrow-forward-circle" size={14} color={c.primary} />
                  <Text style={styles.actionResultText}>Navigated to {tr.result.label}</Text>
                </View>
              )}
              {tr.name === 'show_style_advice' && tr.result.styleAdvice && (
                <View style={styles.styleCard}>
                  <View style={styles.styleCardHeader}>
                    <Ionicons name="color-palette" size={14} color={c.secondary} />
                    <Text style={styles.styleCardTitle}>Style Advice — {tr.result.styleAdvice.occasion}</Text>
                  </View>
                  <Text style={styles.styleCardText}>{tr.result.styleAdvice.advice}</Text>
                  {tr.result.styleAdvice.colorPalette?.length > 0 && (
                    <View style={styles.colorRow}>
                      {tr.result.styleAdvice.colorPalette.map((cl, ci) => (
                        <View key={ci} style={styles.colorSwatch}>
                          <View style={[styles.colorDot, { backgroundColor: cl.color }]} />
                          <Text style={styles.colorName}>{cl.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {tr.result.styleAdvice.tips?.map((tip, ti) => (
                    <View key={ti} style={styles.tipRow}>
                      <Ionicons name="sparkles" size={10} color={c.secondary} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
              {tr.name === 'suggest_outfit' && tr.result.outfitSuggestion && (
                <View style={styles.styleCard}>
                  <View style={styles.styleCardHeader}>
                    <Ionicons name="shirt" size={14} color={c.secondary} />
                    <Text style={styles.styleCardTitle}>
                      Outfit — {tr.result.outfitSuggestion.occasion || 'Suggested'}
                    </Text>
                  </View>
                  {tr.result.outfitSuggestion.pieces?.map((pc, pi) => (
                    <View key={pi} style={styles.tipRow}>
                      <Ionicons name="ellipse" size={8} color={c.secondary} />
                      <Text style={styles.tipText}>
                        <Text style={{ fontWeight: '700' }}>{pc.type}: </Text>
                        {pc.description}
                      </Text>
                    </View>
                  ))}
                  {tr.result.outfitSuggestion.reasoning && (
                    <Text style={[styles.styleCardText, { marginTop: 8 }]}>
                      {tr.result.outfitSuggestion.reasoning}
                    </Text>
                  )}
                </View>
              )}
              {!['search_products', 'send_product_image', 'navigate', 'show_style_advice', 'suggest_outfit', 'get_my_orders', 'get_order_detail', 'get_my_complaints'].includes(tr.name) && (tr.result?.msg || tr.result?.message || tr.result?.error) && (
                <View style={[styles.actionResult, {
                  backgroundColor: tr.result?.success === false ? c.errorSubtle : c.successSubtle,
                  borderColor: tr.result?.success === false ? c.error : c.successLighter,
                }]}>
                  <Ionicons name={tr.result?.success === false ? 'alert-circle' : 'checkmark-circle'} size={14} color={tr.result?.success === false ? c.error : c.success} />
                  <Text style={[styles.actionResultText, { color: tr.result?.success === false ? c.error : c.success }]}>
                    {tr.result.msg || tr.result.message || tr.result.error}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={12} color={c.textSecondary} />
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  const content = (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={embedded ? 0 : 90}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{roleInfo.title}</Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerSubtitle}>{roleInfo.subtitle}</Text>
            {rateLimit.limit > 0 && (
              <View style={[styles.rateBadge, rateLimit.remaining <= 3 && { backgroundColor: c.errorSubtle }]}>
                <Text style={[styles.rateBadgeText, rateLimit.remaining <= 3 && { color: c.error }]}>{rateLimit.remaining} left</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => setTtsEnabled(!ttsEnabled)} style={styles.headerBtn} accessibilityLabel="Toggle voice">
          <Ionicons name={ttsEnabled ? 'volume-high' : 'volume-mute'} size={16} color={ttsEnabled ? c.primary : c.textLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={clearChat} style={styles.headerBtn} accessibilityLabel="Clear chat">
          <Ionicons name="trash-outline" size={16} color={c.textLight} />
        </TouchableOpacity>
        {!embedded && onClose && (
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={c.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={loading ? (
          <View style={styles.typingRow}>
            <View style={styles.botAvatar}><Ionicons name="sparkles" size={12} color="#fff" /></View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          </View>
        ) : null}
      />

      {/* Contextual Chips */}
      {contextualChips.length > 0 && !loading && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
          {contextualChips.map((chip, i) => (
            <TouchableOpacity key={i} onPress={() => sendMessage(chip.msg)} style={styles.chip}>
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={effectiveRole === 'seller' ? 'Ask your business assistant...' : effectiveRole === 'admin' ? 'Command the platform...' : 'Ask your stylist...'}
          placeholderTextColor={c.textLight}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          editable={!loading}
          multiline={false}
        />
        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // Embedded mode (in dashboard)
  if (embedded) {
    return <View style={styles.embeddedContainer}>{content}</View>;
  }

  // Floating modal mode
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>{content}</View>
      </View>
    </Modal>
  );
}

const makeStyles = (palette) => {
  const c = palette.colors;
  const g = palette.glass;
  return StyleSheet.create({
    // Embedded
    embeddedContainer: { flex: 1, borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: c.surface },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { height: '85%', backgroundColor: c.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, overflow: 'hidden' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, backgroundColor: c.primarySubtle },
    headerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
    headerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: c.text },
    headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    headerSubtitle: { fontSize: 10, color: c.textSecondary },
    rateBadge: { backgroundColor: c.primarySubtle, paddingHorizontal: 6, paddingVertical: 1, borderRadius: borderRadius.full },
    rateBadgeText: { fontSize: 9, fontWeight: fontWeight.semibold, color: c.primary },
    headerBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: g.bgSubtle, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.xs },

    // Messages
    messageList: { padding: spacing.md, paddingBottom: spacing.lg },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm, gap: spacing.xs },
    msgRowUser: { justifyContent: 'flex-end' },
    botAvatar: { width: 24, height: 24, borderRadius: 8, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center' },
    userAvatar: { width: 24, height: 24, borderRadius: 8, backgroundColor: g.bgSubtle, justifyContent: 'center', alignItems: 'center' },
    msgBubble: { maxWidth: '78%', borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
    userBubble: { backgroundColor: c.primary, borderBottomRightRadius: borderRadius.xs },
    botBubble: { backgroundColor: g.bgSubtle, borderBottomLeftRadius: borderRadius.xs, borderWidth: 1, borderColor: g.borderSubtle },
    msgText: { fontSize: fontSize.sm, lineHeight: 20, color: c.text },

    // Tool results
    productResults: { marginTop: spacing.sm, gap: spacing.xs },
    productItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: g.bgSubtle },
    productDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
    productName: { fontSize: 11, fontWeight: fontWeight.medium, color: c.text },
    productPrice: { fontSize: 10, fontWeight: fontWeight.semibold, color: c.primary },
    actionResult: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: c.primarySubtle, borderWidth: 1, borderColor: c.primaryLighter },
    actionResultText: { fontSize: 11, fontWeight: fontWeight.medium, color: c.primary },

    // Style card
    styleCard: { marginTop: spacing.sm, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: c.secondarySubtle, borderWidth: 1, borderColor: c.secondaryLighter },
    styleCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, backgroundColor: c.secondarySubtle },
    styleCardTitle: { fontSize: 11, fontWeight: fontWeight.semibold, color: c.text },
    styleCardText: { fontSize: 11, color: c.text, padding: spacing.sm, lineHeight: 18 },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
    colorSwatch: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: c.border },
    colorName: { fontSize: 9, color: c.textSecondary },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, paddingHorizontal: spacing.sm, paddingBottom: 4 },
    tipText: { fontSize: 10, color: c.textSecondary, flex: 1 },

    // Typing
    typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: spacing.sm },
    typingBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.xl, backgroundColor: g.bgSubtle },
    typingText: { fontSize: 11, color: c.textSecondary },

    // Chips
    chipsContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
    chip: { backgroundColor: c.primarySubtle, borderWidth: 1, borderColor: c.primaryLighter, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full },
    chipText: { fontSize: 11, fontWeight: fontWeight.medium, color: c.primary },

    // Input
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, gap: spacing.sm, backgroundColor: c.surface },
    input: { flex: 1, backgroundColor: g.bgSubtle, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm, fontSize: fontSize.sm, color: c.text, borderWidth: 1, borderColor: g.borderSubtle },
    sendBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center' },
  });
};
