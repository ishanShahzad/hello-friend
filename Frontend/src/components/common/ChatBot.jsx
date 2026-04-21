import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Bot, User, ShoppingCart, Package,
  AlertCircle, Loader2, ExternalLink, Mic, MicOff, Phone, PhoneOff,
  Sparkles, Palette, Clock, ArrowRight, Volume2, VolumeX, ChevronDown, Trash2
} from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useGlobal } from '../../contexts/GlobalContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';

const AI_CHAT_URL = 'https://tveuvogqzovgsdfnexkw.supabase.co/functions/v1/ai-chat';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2ZXV2b2dxem92Z3NkZm5leGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjEzNzksImV4cCI6MjA5MDI5NzM3OX0.cxcLp93P2VGW4Zv_JVNKgNbZA135dEMkRaGaz_FnoZM';

const COMPLAINT_CATEGORIES = [
  { value: 'product_issue', label: 'Product Issue' },
  { value: 'order_issue', label: 'Order Issue' },
  { value: 'delivery', label: 'Delivery Problem' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'seller_complaint', label: 'Seller Complaint' },
  { value: 'website_bug', label: 'Website Bug' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'other', label: 'Other' },
];

const ROLE_CHIPS = {
  user: [
    { label: '👗 Help me find an outfit', msg: "I'm looking for a new outfit, can you help me?" },
    { label: '📦 Track my order', msg: 'Track my recent order' },
    { label: '🎨 Style advice', msg: 'Give me some fashion advice for this season' },
    { label: '🏪 Browse stores', msg: 'Show me popular stores' },
  ],
  seller: [
    { label: '📊 Show analytics', msg: 'Show me my store analytics — revenue, orders, top products' },
    { label: '📦 Add a product', msg: 'I want to add a new product to my store' },
    { label: '💰 Apply discount', msg: 'Help me apply a bulk discount to my products' },
    { label: '📋 Recent orders', msg: 'Show me my recent orders and their statuses' },
    { label: '🚀 Growth tips', msg: 'Give me strategies to grow my store and increase sales' },
    { label: '🚚 Shipping setup', msg: 'Show me my shipping configuration' },
  ],
  admin: [
    { label: '👥 User overview', msg: 'Show me a summary of all users on the platform' },
    { label: '📊 Platform stats', msg: 'Give me platform-wide analytics — users, revenue, orders' },
    { label: '🛡️ Complaints', msg: 'Show me all pending complaints' },
    { label: '🔍 Find user', msg: 'Search for a user by name or email' },
    { label: '🏪 Verifications', msg: 'Show me pending store verifications' },
    { label: '⚙️ Tax config', msg: 'Show me the current tax configuration' },
  ],
};

const ROLE_GREETINGS = {
  user: (name, greeting) => name
    ? `${greeting}, ${name}! 👋 I'm your personal shopping stylist at Rozare. I can help you find the perfect outfit, give color coordination advice, track orders, or just chat about fashion. What's on your mind?`
    : `${greeting}! 👋 I'm your personal shopping stylist at Rozare. Whether you need outfit advice, product recommendations, or help with orders — I'm here for you. What can I help with?`,
  seller: (name, greeting) => `${greeting}, ${name || 'Seller'}! 🚀 I'm your business assistant. I can manage your products, analyze store performance, handle orders, and suggest growth strategies. What would you like to do?`,
  admin: (name, greeting) => `${greeting}, ${name || 'Admin'}! 🛡️ I'm your platform command center. I can manage users, review analytics, handle complaints, approve verifications, and perform any platform operation. What do you need?`,
};

const ROLE_TITLES = {
  user: { title: 'Rozare AI Stylist', subtitle: 'Personal Shopping Assistant' },
  seller: { title: 'Business Assistant', subtitle: 'Store Management & Growth' },
  admin: { title: 'Platform Commander', subtitle: 'Full Admin Control' },
};

// ─── Stream parser ───
async function streamChat({ messages, userContext, role, onDelta, onToolCall, onDone }) {
  const resp = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ messages, userContext, role }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `AI request failed (${resp.status})`);
  }
  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let toolCalls = {};
  let done = false;

  while (!done) {
    const { done: rDone, value } = await reader.read();
    if (rDone) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { done = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) onDelta(delta.content);
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) toolCalls[idx] = { id: tc.id || '', name: tc.function?.name || '', arguments: '' };
            if (tc.function?.name) toolCalls[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
          }
        }
        if (parsed.choices?.[0]?.finish_reason === 'tool_calls') {
          for (const idx of Object.keys(toolCalls)) {
            const tc = toolCalls[idx];
            try { onToolCall(tc.name, JSON.parse(tc.arguments), tc.id); } catch {}
          }
          toolCalls = {};
        }
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  for (const idx of Object.keys(toolCalls)) {
    const tc = toolCalls[idx];
    try { onToolCall(tc.name, JSON.parse(tc.arguments), tc.id); } catch {}
  }
  onDone();
}

// ─── Voice Waveform ───
const VoiceWaveform = ({ isActive }) => (
  <div className="flex items-center justify-center gap-[3px] h-16">
    {[...Array(12)].map((_, i) => (
      <motion.div key={i} className="w-[3px] rounded-full"
        style={{ background: `hsl(${220 + i * 10}, 70%, ${55 + Math.sin(i) * 10}%)` }}
        animate={isActive ? { height: [8, 20 + Math.random() * 40, 12, 30 + Math.random() * 30, 8] } : { height: 8 }}
        transition={isActive ? { duration: 0.8 + Math.random() * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 } : { duration: 0.3 }}
      />
    ))}
  </div>
);

// ─── Style Advice Card ───
const StyleAdviceCard = ({ data }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden mt-2"
    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 50%, 0.15), hsl(320, 50%, 55%, 0.1))' }}>
      <Palette size={14} style={{ color: 'hsl(280, 60%, 60%)' }} />
      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Style Advice — {data.occasion}</span>
    </div>
    <div className="p-3 space-y-2">
      <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>{data.advice}</p>
      {data.colorPalette?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Colors:</span>
          {data.colorPalette.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: c.color }} />
              <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{c.name}</span>
            </div>
          ))}
        </div>
      )}
      {data.tips?.length > 0 && (
        <div className="space-y-1 mt-1">
          {data.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Sparkles size={10} className="mt-0.5 shrink-0" style={{ color: 'hsl(280, 60%, 60%)' }} />
              <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);

// ─── Outfit Card ───
const OutfitCard = ({ data, onSearchPiece }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden mt-2"
    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%, 0.15), hsl(170, 60%, 45%, 0.1))' }}>
      <Sparkles size={14} style={{ color: 'hsl(220, 70%, 55%)' }} />
      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Outfit Idea — {data.occasion}</span>
    </div>
    <div className="p-3 space-y-2">
      {data.pieces?.map((piece, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-xl glass-inner">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: piece.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>{piece.type}</p>
            <p className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{piece.description}</p>
          </div>
          {piece.searchQuery && (
            <button onClick={() => onSearchPiece(piece.searchQuery)} className="text-[10px] px-2 py-1 rounded-lg shrink-0"
              style={{ background: 'hsl(220, 70%, 55%, 0.15)', color: 'hsl(220, 70%, 55%)' }}>Find</button>
          )}
        </div>
      ))}
      <p className="text-[10px] italic mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>💡 {data.reasoning}</p>
    </div>
  </motion.div>
);

// ─── Navigation Card ───
const NavigationCard = ({ label }) => (
  <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-2 p-2 rounded-xl mt-1"
    style={{ background: 'hsl(220, 70%, 55%, 0.1)', border: '1px solid hsl(220, 70%, 55%, 0.2)' }}>
    <ArrowRight size={12} style={{ color: 'hsl(220, 70%, 55%)' }} />
    <span className="text-[11px] font-medium" style={{ color: 'hsl(220, 70%, 55%)' }}>Navigated to {label}</span>
  </motion.div>
);

// ─── Action Result Card ───
const ActionResultCard = ({ result, actionName }) => (
  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2 p-2 rounded-xl mt-1"
    style={{ background: 'hsl(150, 60%, 45%, 0.1)', border: '1px solid hsl(150, 60%, 45%, 0.2)' }}>
    <Package size={12} style={{ color: 'hsl(150, 60%, 45%)' }} />
    <span className="text-[11px] font-medium" style={{ color: 'hsl(150, 60%, 45%)' }}>
      {result?.msg || `${actionName} completed`}
    </span>
  </motion.div>
);

// ─── Main ChatBot ───
const ChatBot = ({ embedded = false, dashboardRole = null }) => {
  const { getCurrencySymbol, convertPrice } = useCurrency();
  const { cartItems, handleAddToCart, fetchCart } = useGlobal();
  const { currentUser, token } = useAuth();
  const navigate = useNavigate();

  const effectiveRole = dashboardRole || currentUser?.role || 'user';
  const roleInfo = ROLE_TITLES[effectiveRole] || ROLE_TITLES.user;

  const [isOpen, setIsOpen] = useState(embedded);
  const [isVoiceCallMode, setIsVoiceCallMode] = useState(false);
  const [messages, setMessages] = useState(() => {
    if (embedded) return [];
    try {
      const saved = localStorage.getItem('rozare_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaint, setComplaint] = useState({ category: 'product_issue', subject: '', message: '' });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [contextualChips, setContextualChips] = useState([]);
  const [rateLimit, setRateLimit] = useState({ used: 0, limit: -1, remaining: -1 });

  // Voice call state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [voiceHistory, setVoiceHistory] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const callTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const saveTimerRef = useRef(null);

  // ─── Rate limit check ───
  const checkRateLimit = useCallback(async () => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      const headers = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/ai-actions/rate-limit`, { headers });
      setRateLimit(res.data);
      return res.data;
    } catch { return { used: 0, limit: -1, remaining: -1 }; }
  }, []);

  const incrementRateLimit = useCallback(async () => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      const headers = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};
      const res = await axios.post(`${import.meta.env.VITE_API_URL}api/ai-actions/rate-limit/increment`, {}, { headers });
      setRateLimit(res.data);
      return res.data;
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('Daily message limit reached. Resets at midnight.');
        return null;
      }
      return { used: 0, limit: -1, remaining: -1 };
    }
  }, []);

  // ─── Persist messages ───
  useEffect(() => {
    if (messages.length > 0 && !embedded) {
      try {
        const toSave = messages.filter(m => !m._streaming).map(({ _streaming, toolResults, ...rest }) => ({ role: rest.role, content: rest.content }));
        localStorage.setItem('rozare_chat_history', JSON.stringify(toSave));
        if (currentUser) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            const jwtToken = localStorage.getItem('jwtToken');
            if (jwtToken) {
              axios.post(`${import.meta.env.VITE_API_URL}api/chatbot/history`, { messages: toSave }, {
                headers: { Authorization: `Bearer ${jwtToken}` }
              }).catch(() => {});
            }
          }, 2000);
        }
      } catch {}
    }
  }, [messages, currentUser, embedded]);

  // ─── Load history from DB ───
  useEffect(() => {
    if (currentUser && messages.length === 0 && !embedded) {
      const jwtToken = localStorage.getItem('jwtToken');
      if (jwtToken) {
        axios.get(`${import.meta.env.VITE_API_URL}api/chatbot/history`, {
          headers: { Authorization: `Bearer ${jwtToken}` }
        }).then(res => {
          if (res.data?.messages?.length > 0) {
            setMessages(res.data.messages);
            localStorage.setItem('rozare_chat_history', JSON.stringify(res.data.messages));
          }
        }).catch(() => {});
      }
    }
  }, [currentUser, embedded]);

  // Scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if ((isOpen || embedded) && !isVoiceCallMode) inputRef.current?.focus(); }, [isOpen, isVoiceCallMode, embedded]);

  // Fetch context & rate limit on open
  useEffect(() => {
    if ((isOpen || embedded) && currentUser && !userContext) fetchUserContext();
    if (isOpen || embedded) checkRateLimit();
  }, [isOpen, embedded, currentUser]);

  // Initial greeting
  useEffect(() => {
    if ((isOpen || embedded) && messages.length === 0) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const name = currentUser?.username || '';
      const greetFn = ROLE_GREETINGS[effectiveRole] || ROLE_GREETINGS.user;
      setMessages([{ role: 'assistant', content: greetFn(name, greeting) }]);
      setContextualChips(ROLE_CHIPS[effectiveRole] || ROLE_CHIPS.user);
    }
  }, [isOpen, embedded, currentUser, effectiveRole]);

  const fetchUserContext = async () => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) return;
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/chatbot/user-context`, { headers: { Authorization: `Bearer ${jwtToken}` } });
      setUserContext(res.data);
    } catch {}
  };

  // ─── TTS ───
  const speak = useCallback((text) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`~\[\]()>]/g, '').replace(/\n+/g, '. ');
    if (!clean.trim()) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05; utterance.pitch = 1.05;
    isSpeakingRef.current = true;
    utterance.onend = () => { isSpeakingRef.current = false; };
    utterance.onerror = () => { isSpeakingRef.current = false; };
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  // ─── Execute tool calls ───
  const executeToolCall = useCallback(async (name, args) => {
    const jwtToken = localStorage.getItem('jwtToken');
    const authHeaders = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};
    const apiUrl = import.meta.env.VITE_API_URL;

    switch (name) {
      case 'search_products': {
        try {
          let url = `${apiUrl}api/ai-actions/search-products?`;
          if (args.query) url += `query=${encodeURIComponent(args.query)}&`;
          if (args.category) url += `category=${encodeURIComponent(args.category)}&`;
          if (args.maxPrice) url += `maxPrice=${args.maxPrice}&`;
          if (args.minPrice) url += `minPrice=${args.minPrice}&`;
          url += 'limit=5';
          const res = await axios.get(url);
          return { products: res.data.products || [] };
        } catch { return { products: [], error: 'Could not search products' }; }
      }
      case 'navigate': {
        setTimeout(() => navigate(args.route), 500);
        return { navigated: true, label: args.label, route: args.route };
      }
      case 'show_style_advice': return { styleAdvice: args };
      case 'suggest_outfit': return { outfitSuggestion: args };

      // User actions
      case 'get_my_orders': {
        try {
          const res = await axios.get(`${apiUrl}api/order/get-user-orders${args.status ? `?status=${args.status}` : ''}`, { headers: authHeaders });
          return { orders: (res.data.orders || []).slice(0, 5).map(o => ({ orderId: o.orderId, status: o.orderStatus, total: o.orderSummary?.totalAmount, date: o.createdAt })) };
        } catch { return { error: 'Could not fetch orders' }; }
      }
      case 'get_order_detail': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/order-detail?orderId=${args.orderId}`, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Order not found' }; }
      }
      case 'cancel_order': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/cancel-order`, { orderId: args.orderId }, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Could not cancel order' }; }
      }
      case 'submit_complaint': {
        try {
          const res = await axios.post(`${apiUrl}api/chatbot/complaint`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Could not submit complaint' }; }
      }
      case 'get_my_complaints': {
        try {
          const res = await axios.get(`${apiUrl}api/chatbot/my-complaints`, { headers: authHeaders });
          return { complaints: (res.data.complaints || []).slice(0, 10).map(c => ({ subject: c.subject, category: c.category, status: c.status, date: c.createdAt })) };
        } catch { return { error: 'Could not fetch complaints' }; }
      }

      // Seller actions
      case 'add_product': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/add-product`, { product: args }, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed to add product', missingFields: e.response?.data?.missingFields }; }
      }
      case 'edit_product': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/edit-product`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed to edit product' }; }
      }
      case 'delete_product': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/delete-product`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed to delete product' }; }
      }
      case 'list_my_products': {
        try {
          let url = `${apiUrl}api/ai-actions/my-products?`;
          if (args.search) url += `search=${encodeURIComponent(args.search)}&`;
          if (args.category) url += `category=${encodeURIComponent(args.category)}&`;
          if (args.limit) url += `limit=${args.limit}`;
          const res = await axios.get(url, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch products' }; }
      }
      case 'bulk_discount': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/bulk-discount`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed to apply discount' }; }
      }
      case 'bulk_price_update': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/bulk-price-update`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed to update prices' }; }
      }
      case 'remove_discount': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/remove-discount`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'get_seller_analytics': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/seller-analytics`, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch analytics' }; }
      }
      case 'get_seller_orders': {
        try {
          let url = `${apiUrl}api/ai-actions/seller-orders?`;
          if (args.status) url += `status=${args.status}&`;
          if (args.limit) url += `limit=${args.limit}`;
          const res = await axios.get(url, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch orders' }; }
      }
      case 'update_order_status': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/update-order-status`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed to update status' }; }
      }
      case 'get_my_store': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/my-store`, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'No store found' }; }
      }
      case 'update_store': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/update-store`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed to update store' }; }
      }
      case 'get_store_analytics': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/store-analytics`, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch store analytics' }; }
      }
      case 'apply_for_verification': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/apply-verification`, {}, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'get_shipping_methods': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/shipping-methods`, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch shipping methods' }; }
      }
      case 'update_shipping': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/update-shipping`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }

      // Admin actions
      case 'get_all_users': {
        try {
          let url = `${apiUrl}api/ai-actions/all-users?`;
          if (args.search) url += `search=${encodeURIComponent(args.search)}&`;
          if (args.role) url += `role=${args.role}&`;
          if (args.status) url += `status=${args.status}&`;
          if (args.limit) url += `limit=${args.limit}`;
          const res = await axios.get(url, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch users' }; }
      }
      case 'delete_user': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/delete-user`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed to delete user' }; }
      }
      case 'block_user': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/block-user`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'change_user_role': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/change-user-role`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'get_admin_analytics': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/admin-analytics`, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch analytics' }; }
      }
      case 'get_all_orders': {
        try {
          let url = `${apiUrl}api/ai-actions/all-orders?`;
          if (args.status) url += `status=${args.status}&`;
          if (args.limit) url += `limit=${args.limit}`;
          const res = await axios.get(url, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch orders' }; }
      }
      case 'get_all_complaints': {
        try {
          let url = `${apiUrl}api/ai-actions/all-complaints?`;
          if (args.category) url += `category=${args.category}&`;
          if (args.status) url += `status=${args.status}`;
          const res = await axios.get(url, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch complaints' }; }
      }
      case 'update_complaint': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/update-complaint`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'get_pending_verifications': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/pending-verifications`, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch verifications' }; }
      }
      case 'approve_verification': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/approve-verification`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'reject_verification': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/reject-verification`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'remove_verification': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/remove-verification`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'get_all_stores': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/all-stores${args.limit ? `?limit=${args.limit}` : ''}`, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch stores' }; }
      }
      case 'update_tax_config': {
        try {
          const res = await axios.post(`${apiUrl}api/ai-actions/update-tax`, args, { headers: authHeaders });
          return res.data;
        } catch (e) { return { error: e.response?.data?.msg || 'Failed' }; }
      }
      case 'get_tax_config': {
        try {
          const res = await axios.get(`${apiUrl}api/ai-actions/tax-config`, { headers: authHeaders });
          return res.data;
        } catch { return { error: 'Could not fetch tax config' }; }
      }
      default: return {};
    }
  }, [navigate]);

  // ─── Send Message ───
  const sendMessage = async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    // Rate limit check
    if (rateLimit.remaining === 0 && rateLimit.limit !== -1) {
      toast.error(!currentUser ? 'Please log in for more messages!' : 'Daily message limit reached. Resets at midnight.');
      return;
    }

    // Increment rate limit
    const rl = await incrementRateLimit();
    if (!rl) return;

    const userMsg = { role: 'user', content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const aiMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));
    aiMessages.push({ role: 'user', content: msgText });

    let assistantText = '';

    const upsertAssistant = (chunk) => {
      assistantText += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last?._streaming) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
        }
        return [...prev, { role: 'assistant', content: assistantText, _streaming: true }];
      });
    };

    try {
      await streamChat({
        messages: aiMessages,
        userContext,
        role: effectiveRole,
        onDelta: (chunk) => upsertAssistant(chunk),
        onToolCall: async (name, args, id) => {
          const result = await executeToolCall(name, args);

          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx]._streaming) {
              updated[lastIdx] = { ...updated[lastIdx], toolResults: [...(updated[lastIdx].toolResults || []), { name, args, result }] };
            }
            return updated;
          });

          // Update chips based on tool
          if (name === 'search_products' && result.products?.length > 0) {
            setContextualChips([
              { label: '🔍 More like this', msg: `Show me more products similar to ${result.products[0].name}` },
              { label: '👕 What goes with this?', msg: `What would go well with a ${result.products[0].name}?` },
              { label: '💰 Cheaper options', msg: 'Show me cheaper alternatives' },
            ]);
          } else if (name === 'get_seller_analytics' || name === 'get_admin_analytics') {
            setContextualChips([
              { label: '📈 More details', msg: 'Give me a deeper breakdown of the analytics' },
              { label: '🚀 Growth tips', msg: 'Based on this data, what should I do to grow?' },
            ]);
          } else if (name === 'list_my_products') {
            setContextualChips([
              { label: '💰 Apply discount', msg: 'Apply a 10% discount to all my products' },
              { label: '📦 Low stock', msg: 'Which products are running low on stock?' },
            ]);
          } else if (effectiveRole !== 'user') {
            setContextualChips(ROLE_CHIPS[effectiveRole] || []);
          }
        },
        onDone: () => {
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, _streaming: false } : m));
          setLoading(false);
          if (isVoiceCallMode && assistantText) speak(assistantText);
        },
      });
    } catch (err) {
      console.error('AI Chat error:', err);
      const errorMsg = err.message?.includes('Rate limit') ? 'Too many requests — please try again shortly! 😅'
        : err.message?.includes('credits') ? 'AI credits need topping up.'
        : 'Sorry, please try again! 🙏';
      setMessages(prev => {
        const filtered = prev.filter(m => !m._streaming);
        return [...filtered, { role: 'assistant', content: errorMsg }];
      });
      setLoading(false);
    }
  };

  // ─── Voice Call Mode ───
  const startVoiceCall = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice not supported in this browser');
      return;
    }
    setIsVoiceCallMode(true); setCallDuration(0); setVoiceHistory([]); setVoiceTranscript('');
    callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    startRecognition();
  };

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '', finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }
      setVoiceTranscript(interimTranscript || finalTranscript);
      if (finalTranscript.trim()) {
        setVoiceHistory(prev => [...prev, { role: 'user', text: finalTranscript.trim() }]);
        sendMessage(finalTranscript.trim());
        setVoiceTranscript('');
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') { toast.error('Mic access denied'); endVoiceCall(); }
      else if (event.error !== 'aborted') setTimeout(() => { if (isVoiceCallMode) startRecognition(); }, 500);
    };

    recognition.onend = () => {
      if (isVoiceCallMode && recognitionRef.current) {
        setTimeout(() => { try { recognition.start(); } catch {} }, 200);
      }
    };

    try { recognition.start(); setIsListening(true); recognitionRef.current = recognition; }
    catch { toast.error('Could not start voice recognition'); }
  };

  const endVoiceCall = () => {
    if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); recognitionRef.current = null; }
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    window.speechSynthesis?.cancel();
    setIsVoiceCallMode(false); setIsListening(false); setVoiceTranscript('');
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); }
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const formatDuration = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ─── Complaint ───
  const submitComplaint = async () => {
    if (!complaint.subject.trim() || !complaint.message.trim()) return;
    const jwtToken = localStorage.getItem('jwtToken');
    if (!jwtToken) { setMessages(prev => [...prev, { role: 'assistant', content: 'Please log in to submit a complaint.' }]); return; }
    setSubmittingComplaint(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}api/chatbot/complaint`, complaint, { headers: { Authorization: `Bearer ${jwtToken}` } });
      setMessages(prev => [...prev, { role: 'assistant', content: `✅ ${res.data.msg}` }]);
      setShowComplaintForm(false); setComplaint({ category: 'product_issue', subject: '', message: '' });
    } catch (err) { setMessages(prev => [...prev, { role: 'assistant', content: err.response?.data?.msg || 'Failed to submit complaint.' }]); }
    finally { setSubmittingComplaint(false); }
  };

  const handleSearchPiece = (query) => sendMessage(`Find me ${query}`);

  // ─── Render Message ───
  const renderMessage = (msg) => (
    <>
      {msg.content && (
        <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none"
          style={{ color: msg.role === 'user' ? 'white' : 'hsl(var(--foreground))' }}>
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      )}
      {msg.toolResults?.map((tr, ti) => (
        <React.Fragment key={ti}>
          {tr.name === 'search_products' && tr.result.products?.length > 0 && (
            <div className="mt-2 space-y-2">
              {tr.result.products.map(p => (
                <Link key={p._id} to={`/single-product/${p._id}`} onClick={() => !embedded && setIsOpen(false)}>
                  <div className="flex items-center gap-2 p-2 rounded-xl glass-inner hover:bg-white/10 transition-all cursor-pointer">
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{p.name}</p>
                      <p className="text-[10px] font-semibold" style={{ color: 'hsl(220, 70%, 55%)' }}>
                        {getCurrencySymbol()}{convertPrice(p.discountedPrice || p.price).toFixed(2)}
                      </p>
                    </div>
                    <ExternalLink size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {tr.name === 'navigate' && tr.result.navigated && <NavigationCard label={tr.result.label} />}
          {tr.name === 'show_style_advice' && tr.result.styleAdvice && <StyleAdviceCard data={tr.result.styleAdvice} />}
          {tr.name === 'suggest_outfit' && tr.result.outfitSuggestion && <OutfitCard data={tr.result.outfitSuggestion} onSearchPiece={handleSearchPiece} />}
          {/* Generic action result for seller/admin tools */}
          {!['search_products', 'navigate', 'show_style_advice', 'suggest_outfit', 'get_my_orders', 'get_order_detail', 'get_my_complaints'].includes(tr.name) && tr.result?.msg && (
            <ActionResultCard result={tr.result} actionName={tr.name} />
          )}
        </React.Fragment>
      ))}
    </>
  );

  const hasSpeechSupport = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // ─── Chat Content (shared between embedded and floating) ───
  const chatContent = (
    <>
      {isVoiceCallMode ? (
        <div className="flex flex-col h-full" style={{ minHeight: 420 }}>
          <div className="p-4 text-center" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium" style={{ color: 'hsl(150, 60%, 50%)' }}>Live Call</span>
            </div>
            <p className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>{roleInfo.title}</p>
            <p className="text-sm font-mono" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <Clock size={12} className="inline mr-1" />{formatDuration(callDuration)}
            </p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <motion.div className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%, 0.2), hsl(260, 60%, 60%, 0.2))', boxShadow: isListening ? '0 0 60px hsl(220, 70%, 55%, 0.3)' : 'none' }}
              animate={isListening ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 2, repeat: Infinity }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                <Bot size={32} color="white" />
              </div>
            </motion.div>
            <VoiceWaveform isActive={isListening && !loading} />
            <p className="text-sm mt-4 text-center" style={{ color: 'hsl(var(--foreground))' }}>
              {loading ? '✨ Thinking...' : voiceTranscript ? `"${voiceTranscript}"` : isListening ? 'Listening to you...' : 'Starting...'}
            </p>
            <button onClick={() => setTtsEnabled(!ttsEnabled)} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs glass-inner"
              style={{ color: 'hsl(var(--muted-foreground))' }}>
              {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}{ttsEnabled ? 'Voice On' : 'Voice Off'}
            </button>
          </div>
          <div className="p-6 flex justify-center">
            <motion.button onClick={endVoiceCall} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(0, 70%, 55%), hsl(20, 70%, 50%))', boxShadow: '0 4px 24px hsl(0, 70%, 55%, 0.4)' }}>
              <PhoneOff size={24} color="white" />
            </motion.button>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--glass-border)', background: 'linear-gradient(135deg, hsl(220, 70%, 55%, 0.1), hsl(260, 60%, 60%, 0.1))' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
              <Bot size={18} color="white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{roleInfo.title}</p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] flex items-center gap-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <Sparkles size={8} /> {roleInfo.subtitle}
                </p>
                {rateLimit.limit > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: rateLimit.remaining <= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.1)', color: rateLimit.remaining <= 3 ? 'hsl(0,72%,55%)' : 'hsl(220,70%,55%)' }}>
                    {rateLimit.remaining} left
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setTtsEnabled(!ttsEnabled)} className="p-1.5 rounded-lg glass-inner"
              style={{ color: ttsEnabled ? 'hsl(220, 70%, 55%)' : 'hsl(var(--muted-foreground))' }} title={ttsEnabled ? 'Mute voice' : 'Enable voice'}>
              {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button onClick={() => {
              setMessages([]); localStorage.removeItem('rozare_chat_history');
              const jwtToken = localStorage.getItem('jwtToken');
              if (jwtToken) axios.delete(`${import.meta.env.VITE_API_URL}api/chatbot/history`, { headers: { Authorization: `Bearer ${jwtToken}` } }).catch(() => {});
            }} className="p-1.5 rounded-lg glass-inner" style={{ color: 'hsl(var(--muted-foreground))' }} title="Clear chat">
              <Trash2 size={14} />
            </button>
            {!embedded && (
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg glass-inner" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 250, maxHeight: embedded ? 'calc(100vh - 220px)' : 'calc(75vh - 160px)' }}>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-1"
                    style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                    <Bot size={12} color="white" />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                  style={msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }
                    : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'hsl(var(--foreground))' }}>
                  {renderMessage(msg)}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-1 glass-inner">
                    <User size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  </div>
                )}
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                  <Bot size={12} color="white" />
                </div>
                <div className="glass-inner rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="animate-pulse" style={{ color: 'hsl(220, 70%, 55%)' }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {showComplaintForm && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-inner rounded-2xl p-3 space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  <AlertCircle size={12} className="inline mr-1" /> Submit a Complaint
                </p>
                <select value={complaint.category} onChange={e => setComplaint({ ...complaint, category: e.target.value })} className="glass-input text-xs py-2">
                  {COMPLAINT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input type="text" placeholder="Subject" value={complaint.subject} onChange={e => setComplaint({ ...complaint, subject: e.target.value })} className="glass-input text-xs py-2" maxLength={200} />
                <textarea placeholder="Describe your issue..." value={complaint.message} onChange={e => setComplaint({ ...complaint, message: e.target.value })} className="glass-input text-xs py-2" rows={3} maxLength={2000} />
                <div className="flex gap-2">
                  <button onClick={() => setShowComplaintForm(false)} className="flex-1 text-xs py-2 rounded-xl glass-inner font-medium" style={{ color: 'hsl(var(--foreground))' }}>Cancel</button>
                  <button onClick={submitComplaint} disabled={submittingComplaint} className="flex-1 text-xs py-2 rounded-xl font-semibold text-white flex items-center justify-center gap-1"
                    style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                    {submittingComplaint ? <Loader2 size={12} className="animate-spin" /> : 'Submit'}
                  </button>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contextual Chips */}
          {contextualChips.length > 0 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {contextualChips.map((chip, i) => (
                <button key={i} onClick={() => sendMessage(chip.msg)}
                  className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(99,102,241,0.1)', color: 'hsl(220, 70%, 55%)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex gap-2">
              {hasSpeechSupport && (
                <motion.button onClick={startVoiceCall} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="p-2.5 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(150, 60%, 45%), hsl(170, 50%, 50%))', boxShadow: '0 2px 12px hsl(150, 60%, 45%, 0.3)' }}
                  title="Start voice call">
                  <Phone size={16} color="white" />
                </motion.button>
              )}
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={effectiveRole === 'seller' ? 'Ask your business assistant...' : effectiveRole === 'admin' ? 'Command the platform...' : 'Ask your stylist anything...'}
                className="glass-input flex-1 text-sm py-2.5" disabled={loading} />
              <motion.button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl flex items-center justify-center disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                <Send size={16} color="white" />
              </motion.button>
            </div>
          </div>
        </>
      )}
    </>
  );

  // ─── EMBEDDED MODE ───
  if (embedded) {
    return (
      <div className="flex flex-col h-full glass-panel-strong overflow-hidden" style={{ borderRadius: 20 }}>
        {chatContent}
      </div>
    );
  }

  // ─── FLOATING MODE ───
  return (
    <>
      <motion.button onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
        style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', boxShadow: '0 8px 32px hsl(220, 70%, 55%, 0.4)' }}
        whileHover={{ scale: 1.1, rotate: isOpen ? 0 : 5 }} whileTap={{ scale: 0.95 }}>
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={22} color="white" /></motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageCircle size={22} color="white" /></motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-[60] w-[380px] max-w-[calc(100vw-2rem)] glass-panel-strong overflow-hidden"
            style={{ maxHeight: '75vh', display: 'flex', flexDirection: 'column', borderRadius: 24 }}>
            {chatContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
