/**
 * ChatBot — Mobile AI Assistant
 * Role-aware with tool calling, rate limits, contextual chips, TTS, and embedded dashboard mode
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal,
  KeyboardAvoidingView, Platform, Animated, Alert, ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import api from '../config/api';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import GlassPanel from './common/GlassPanel';
import {
  colors, spacing, fontSize, borderRadius, fontWeight,
} from '../styles/theme';

const AI_CHAT_URL = 'https://tveuvogqzovgsdfnexkw.supabase.co/functions/v1/ai-chat';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2ZXV2b2dxem92Z3NkZm5leGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjEzNzksImV4cCI6MjA5MDI5NzM3OX0.cxcLp93P2VGW4Zv_JVNKgNbZA135dEMkRaGaz_FnoZM';

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
      default: return {};
    }
  } catch (e) {
    return { error: e.response?.data?.msg || `Failed: ${name}` };
  }
}

// ─── Non-streaming AI call (RN doesn't support ReadableStream well) ───
async function callAI(messages, userContext, role) {
  const resp = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ messages, userContext, role, stream: false }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `AI request failed (${resp.status})`);
  }
  return resp.json();
}

// ─── Main Component ───
export default function ChatBot({ embedded = false, dashboardRole = null, visible = true, onClose, navigation }) {
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();
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
      .map(m => ({ role: m.role, content: m.content }));
    aiMessages.push({ role: 'user', content: msgText });

    try {
      let response = await callAI(aiMessages, userContext, effectiveRole);
      let assistantContent = '';
      let toolResults = [];

      // Handle tool calls
      if (response.choices?.[0]?.message?.tool_calls) {
        const toolCalls = response.choices[0].message.tool_calls;
        for (const tc of toolCalls) {
          try {
            const args = JSON.parse(tc.function.arguments);
            const result = await executeToolCall(tc.function.name, args);
            toolResults.push({ name: tc.function.name, args, result });

            // Update chips contextually
            if (tc.function.name === 'search_products' && result.products?.length > 0) {
              setContextualChips([
                { label: '🔍 More like this', msg: `Show me more products similar to ${result.products[0].name}` },
                { label: '💰 Cheaper options', msg: 'Show me cheaper alternatives' },
              ]);
            } else if (['get_seller_analytics', 'get_admin_analytics'].includes(tc.function.name)) {
              setContextualChips([
                { label: '📈 More details', msg: 'Give me a deeper breakdown of the analytics' },
                { label: '🚀 Growth tips', msg: 'Based on this data, what should I do to grow?' },
              ]);
            }

            // Follow up with tool results
            aiMessages.push(response.choices[0].message);
            aiMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
          } catch {}
        }
        // Get final response after tool execution
        try {
          const followUp = await callAI(aiMessages, userContext, effectiveRole);
          assistantContent = followUp.choices?.[0]?.message?.content || '';
        } catch {
          assistantContent = 'Action completed! Let me know if you need anything else.';
        }
      } else {
        assistantContent = response.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
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
            <Ionicons name="sparkles" size={12} color={colors.white} />
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.msgText, isUser && { color: colors.white }]}>{item.content}</Text>
          {/* Tool results */}
          {item.toolResults?.map((tr, i) => (
            <View key={i}>
              {tr.name === 'search_products' && tr.result.products?.length > 0 && (
                <View style={styles.productResults}>
                  {tr.result.products.map((p, pi) => (
                    <TouchableOpacity key={pi} style={styles.productItem}
                      onPress={() => navigation?.navigate('ProductDetail', { productId: p._id })}>
                      <View style={styles.productDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.productPrice}>${(p.discountedPrice || p.price || 0).toFixed(2)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.grayLight} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {tr.name === 'navigate' && tr.result.navigated && (
                <View style={styles.actionResult}>
                  <Ionicons name="arrow-forward-circle" size={14} color={colors.primary} />
                  <Text style={styles.actionResultText}>Navigated to {tr.result.label}</Text>
                </View>
              )}
              {tr.name === 'show_style_advice' && tr.result.styleAdvice && (
                <View style={styles.styleCard}>
                  <View style={styles.styleCardHeader}>
                    <Ionicons name="color-palette" size={14} color="#8b5cf6" />
                    <Text style={styles.styleCardTitle}>Style Advice — {tr.result.styleAdvice.occasion}</Text>
                  </View>
                  <Text style={styles.styleCardText}>{tr.result.styleAdvice.advice}</Text>
                  {tr.result.styleAdvice.colorPalette?.length > 0 && (
                    <View style={styles.colorRow}>
                      {tr.result.styleAdvice.colorPalette.map((c, ci) => (
                        <View key={ci} style={styles.colorSwatch}>
                          <View style={[styles.colorDot, { backgroundColor: c.color }]} />
                          <Text style={styles.colorName}>{c.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {tr.result.styleAdvice.tips?.map((tip, ti) => (
                    <View key={ti} style={styles.tipRow}>
                      <Ionicons name="sparkles" size={10} color="#8b5cf6" />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!['search_products', 'navigate', 'show_style_advice', 'suggest_outfit', 'get_my_orders', 'get_order_detail', 'get_my_complaints'].includes(tr.name) && tr.result?.msg && (
                <View style={[styles.actionResult, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}25` }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.actionResultText, { color: colors.success }]}>{tr.result.msg}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={12} color={colors.grayLight} />
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
          <Ionicons name="sparkles" size={18} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{roleInfo.title}</Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerSubtitle}>{roleInfo.subtitle}</Text>
            {rateLimit.limit > 0 && (
              <View style={[styles.rateBadge, rateLimit.remaining <= 3 && { backgroundColor: `${colors.error}15` }]}>
                <Text style={[styles.rateBadgeText, rateLimit.remaining <= 3 && { color: colors.error }]}>{rateLimit.remaining} left</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => setTtsEnabled(!ttsEnabled)} style={styles.headerBtn}>
          <Ionicons name={ttsEnabled ? 'volume-high' : 'volume-mute'} size={16} color={ttsEnabled ? colors.primary : colors.grayLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={clearChat} style={styles.headerBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.grayLight} />
        </TouchableOpacity>
        {!embedded && onClose && (
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={18} color={colors.grayLight} />
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
            <View style={styles.botAvatar}><Ionicons name="sparkles" size={12} color={colors.white} /></View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={colors.primary} />
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
          placeholderTextColor={colors.grayLight}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          editable={!loading}
          multiline={false}
        />
        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
        >
          <Ionicons name="send" size={16} color={colors.white} />
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

const styles = StyleSheet.create({
  // Embedded
  embeddedContainer: { flex: 1, borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: colors.white },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { height: '85%', backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, overflow: 'hidden' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)', backgroundColor: `${colors.primary}06` },
  headerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  headerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerSubtitle: { fontSize: 10, color: colors.textSecondary },
  rateBadge: { backgroundColor: `${colors.primary}12`, paddingHorizontal: 6, paddingVertical: 1, borderRadius: borderRadius.full },
  rateBadgeText: { fontSize: 9, fontWeight: fontWeight.semibold, color: colors.primary },
  headerBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', marginLeft: spacing.xs },

  // Messages
  messageList: { padding: spacing.md, paddingBottom: spacing.lg },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm, gap: spacing.xs },
  msgRowUser: { justifyContent: 'flex-end' },
  botAvatar: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  userAvatar: { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' },
  msgBubble: { maxWidth: '78%', borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: borderRadius.xs },
  botBubble: { backgroundColor: 'rgba(0,0,0,0.04)', borderBottomLeftRadius: borderRadius.xs },
  msgText: { fontSize: fontSize.sm, lineHeight: 20, color: colors.text },

  // Tool results
  productResults: { marginTop: spacing.sm, gap: spacing.xs },
  productItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: 'rgba(0,0,0,0.03)' },
  productDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  productName: { fontSize: 11, fontWeight: fontWeight.medium, color: colors.text },
  productPrice: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.primary },
  actionResult: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, padding: spacing.sm, borderRadius: borderRadius.md, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}15` },
  actionResultText: { fontSize: 11, fontWeight: fontWeight.medium, color: colors.primary },

  // Style card
  styleCard: { marginTop: spacing.sm, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: 'rgba(139,92,246,0.06)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)' },
  styleCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, backgroundColor: 'rgba(139,92,246,0.08)' },
  styleCardTitle: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.text },
  styleCardText: { fontSize: 11, color: colors.text, padding: spacing.sm, lineHeight: 18 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  colorSwatch: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  colorName: { fontSize: 9, color: colors.textSecondary },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, paddingHorizontal: spacing.sm, paddingBottom: 4 },
  tipText: { fontSize: 10, color: colors.textSecondary, flex: 1 },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: spacing.sm },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.xl, backgroundColor: 'rgba(0,0,0,0.04)' },
  typingText: { fontSize: 11, color: colors.textSecondary },

  // Chips
  chipsContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
  chip: { backgroundColor: `${colors.primary}10`, borderWidth: 1, borderColor: `${colors.primary}18`, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full },
  chipText: { fontSize: 11, fontWeight: fontWeight.medium, color: colors.primary },

  // Input
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)', gap: spacing.sm },
  input: { flex: 1, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm, fontSize: fontSize.sm, color: colors.text },
  sendBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
});
