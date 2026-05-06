import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Bot, User, Package,
  AlertCircle, Loader2, ExternalLink, Phone, PhoneOff,
  Sparkles, Palette, Clock, ArrowRight, Volume2, VolumeX, Trash2,
  Heart, MapPin, Bell, Ticket, CheckCircle, XCircle, Search,
  ShoppingBag, BarChart3, Shield, Megaphone, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';

// ─── Endpoint (our own backend — no Supabase) ───
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/';
const AI_CHAT_URL = `${API_BASE}api/ai-chat/stream`;

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
    { label: '📦 Track my orders', msg: 'Show me my recent orders and their status' },
    { label: '💝 My wishlist', msg: "Show me what's in my wishlist" },
    { label: '🎨 Style advice', msg: 'Give me some fashion advice for this season' },
    { label: '🎟️ Find coupons', msg: 'Show me available coupons I can use' },
    { label: '🏪 Browse stores', msg: 'Show me popular stores' },
  ],
  seller: [
    { label: '📊 Show analytics', msg: 'Show me my store analytics — revenue, orders, top products' },
    { label: '📦 Add a product', msg: 'I want to add a new product to my store' },
    { label: '💰 Apply discount', msg: 'Help me apply a bulk discount to my products' },
    { label: '🎟️ Create coupon', msg: 'Help me create a coupon for my store' },
    { label: '📋 Recent orders', msg: 'Show me my recent orders and their statuses' },
    { label: '🚀 Growth tips', msg: 'Give me strategies to grow my store and increase sales' },
  ],
  admin: [
    { label: '👥 User overview', msg: 'Show me a summary of all users on the platform' },
    { label: '📊 Platform stats', msg: 'Give me platform-wide analytics — users, revenue, orders' },
    { label: '🛡️ Complaints', msg: 'Show me all pending complaints' },
    { label: '📣 Send broadcast', msg: 'Help me send a broadcast notification to users' },
    { label: '🏪 Verifications', msg: 'Show me pending store verifications' },
    { label: '⚙️ Tax config', msg: 'Show me the current tax configuration' },
  ],
};

const ROLE_GREETINGS = {
  user: (name, greeting) => name
    ? `${greeting}, ${name}! 👋 I'm your personal shopping stylist. I can help you find products, manage your wishlist & addresses, track orders, and give outfit advice. What's on your mind?`
    : `${greeting}! 👋 I'm your Rozare shopping stylist. I can help you find products, give style advice, and help with orders. What can I do for you?`,
  seller: (name, greeting) => `${greeting}, ${name || 'Seller'}! 🚀 I'm your business partner. I can manage your products, run analytics, handle orders, create coupons, and give you growth strategies. What would you like to do?`,
  admin: (name, greeting) => `${greeting}, ${name || 'Admin'}! 🛡️ I'm your platform commander. Users, stores, complaints, verifications, broadcasts, tax — I can do it all. What's the priority?`,
};

const ROLE_TITLES = {
  user: { title: 'Rozare AI Stylist', subtitle: 'Personal Shopping Assistant' },
  seller: { title: 'Business Partner', subtitle: 'Store Management & Growth' },
  admin: { title: 'Platform Commander', subtitle: 'Full Admin Control' },
};

// Action icon mapping
const TOOL_ICONS = {
  search_products: Search, get_my_orders: Package, get_order_detail: Package,
  cancel_order: XCircle, get_wishlist: Heart, add_to_wishlist: Heart,
  remove_from_wishlist: Heart, get_addresses: MapPin, add_address: MapPin,
  get_notifications: Bell, mark_notifications_read: Bell,
  get_available_coupons: Ticket, validate_coupon: Ticket,
  add_product: ShoppingBag, edit_product: ShoppingBag, delete_product: Trash2,
  list_my_products: ShoppingBag, get_seller_analytics: BarChart3,
  get_seller_orders: Package, update_order_status: CheckCircle,
  get_my_store: Settings, update_store: Settings, get_store_analytics: BarChart3,
  get_all_users: User, get_admin_analytics: BarChart3,
  get_pending_verifications: Shield, approve_verification: Shield,
  send_broadcast: Megaphone, get_broadcasts: Megaphone,
  submit_complaint: AlertCircle, get_my_complaints: AlertCircle,
};

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
        <div key={i} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
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
const ActionResultCard = ({ result, actionName, icon: Icon = Package, color = 'hsl(150, 60%, 45%)' }) => {
  const bgColor = color.replace('hsl(', 'hsla(').replace(')', ', 0.1)');
  const borderColor = color.replace('hsl(', 'hsla(').replace(')', ', 0.2)');
  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 p-2.5 rounded-xl mt-1"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      <Icon size={14} style={{ color }} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium block" style={{ color }}>
          {result?.message || result?.error || `${actionName} completed`}
        </span>
        {result?.success === false && result?.error && (
          <span className="text-[10px] block mt-0.5" style={{ color: 'hsl(0, 70%, 55%)' }}>⚠️ {result.error}</span>
        )}
      </div>
    </motion.div>
  );
};

// ─── Data List Card ───
const DataListCard = ({ title, items, renderItem, icon: Icon = Package, color = 'hsl(220, 70%, 55%)', emptyText = 'No items' }) => {
  const bgColor = color.replace('hsl(', 'hsla(').replace(')', ', 0.15)');
  const bgColor2 = color.replace('hsl(', 'hsla(').replace(')', ', 0.05)');
  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden mt-2"
      style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor2})` }}>
        <Icon size={14} style={{ color }} />
        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{title}</span>
        <span className="text-[10px] ml-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[11px] text-center py-3" style={{ color: 'hsl(var(--muted-foreground))' }}>{emptyText}</p>
        ) : (
          items.slice(0, 10).map((item, i) => <div key={i}>{renderItem(item, i)}</div>)
        )}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════
//  MAIN CHATBOT COMPONENT
// ═══════════════════════════════════════════════════════

function ChatBot({ embedded = false, conversationId = null, initialMessages = null, onConversationCreated = null }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State
  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [pendingTools, setPendingTools] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(conversationId);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const hasLoadedHistory = useRef(false);

  // Derived
  const role = currentUser?.role || 'user';
  const userName = currentUser?.username || '';
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null;
  const chips = ROLE_CHIPS[role] || ROLE_CHIPS.user;
  const titles = ROLE_TITLES[role] || ROLE_TITLES.user;

  // ─── Load initial messages from parent (AI Chat page) ───
  useEffect(() => {
    if (initialMessages !== null) {
      if (initialMessages.length > 0) {
        setMessages(initialMessages.map(m => ({ role: m.role, content: m.content })));
        setShowChips(false);
      } else {
        // New empty conversation — show greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const greetFn = ROLE_GREETINGS[role] || ROLE_GREETINGS.user;
        setMessages([{ role: 'assistant', content: greetFn(userName, greeting) }]);
        setShowChips(true);
      }
    }
  }, [initialMessages, conversationId]);

  // ─── Track conversationId from parent ───
  useEffect(() => {
    setActiveConvoId(conversationId);
  }, [conversationId]);

  // ─── Greeting on open (floating mode only) ───
  useEffect(() => {
    if (isOpen && messages.length === 0 && initialMessages === null) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const greetFn = ROLE_GREETINGS[role] || ROLE_GREETINGS.user;
      setMessages([{ role: 'assistant', content: greetFn(userName, greeting) }]);
      setShowChips(true);
    }
  }, [isOpen]);

  // ─── Auto-scroll ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTools]);

  // ─── Focus input on open ───
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // ─── Handle client-side actions from the server ───
  const handleClientAction = useCallback((action, args) => {
    switch (action) {
      case 'navigate':
        if (args.route) {
          setTimeout(() => navigate(args.route), 400);
          return { type: 'navigation', label: args.label || args.route };
        }
        break;
      case 'show_style_advice':
        return { type: 'style_advice', data: args };
      case 'suggest_outfit':
        return { type: 'outfit', data: args };
      default:
        return null;
    }
    return null;
  }, [navigate]);

  // ─── Send message (SSE streaming with server-side tool execution) ───
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || isLoading) return;
    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowChips(false);
    setIsLoading(true);
    setPendingTools([]);

    // Build conversation history for the API (only user/assistant text messages)
    const apiMessages = [...messages, userMsg]
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role, content: m.content }));

    // Add assistant placeholder for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true, toolEvents: [] }]);

    try {
      const resp = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${resp.status})`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);

            // Error event
            if (parsed.error) {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.isStreaming) {
                  last.content = parsed.error;
                  last.isStreaming = false;
                  last.isError = true;
                }
                return copy;
              });
              continue;
            }

            // Standard text delta
            if (parsed.choices?.[0]?.delta?.content) {
              const chunk = parsed.choices[0].delta.content;
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.isStreaming) last.content += chunk;
                return copy;
              });
              continue;
            }

            // Tool start event (server is executing a tool)
            if (parsed.type === 'tool_start') {
              setPendingTools(prev => [...prev, { tool: parsed.tool, status: 'running', id: parsed.id }]);
              continue;
            }

            // Tool result event
            if (parsed.type === 'tool_result') {
              setPendingTools(prev =>
                prev.map(t => t.id === parsed.id ? { ...t, status: 'done', result: parsed.result } : t)
              );
              // Add tool result to the current assistant message
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.isStreaming) {
                  if (!last.toolEvents) last.toolEvents = [];
                  last.toolEvents.push({
                    type: 'tool_result',
                    tool: parsed.tool,
                    result: parsed.result,
                  });
                }
                return copy;
              });
              continue;
            }

            // Client action event (navigate, style advice, outfit)
            if (parsed.type === 'client_action') {
              const actionResult = handleClientAction(parsed.action, parsed.args);
              if (actionResult) {
                setMessages(prev => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.isStreaming) {
                    if (!last.toolEvents) last.toolEvents = [];
                    last.toolEvents.push(actionResult);
                  }
                  return copy;
                });
              }
              continue;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Finalize streaming message
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.isStreaming) last.isStreaming = false;
        return copy;
      });

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.isStreaming) {
          last.content = last.content || err.message || 'Something went wrong. Please try again.';
          last.isStreaming = false;
          last.isError = !last.content || last.content === err.message;
        } else {
          copy.push({ role: 'assistant', content: err.message || 'Something went wrong.', isError: true });
        }
        return copy;
      });
    } finally {
      setIsLoading(false);
      setPendingTools([]);
    }
  }, [messages, isLoading, authToken, handleClientAction]);

  // ─── Clear chat ───
  const clearChat = () => {
    setMessages([]);
    setShowChips(true);
    setPendingTools([]);
    // Re-trigger greeting
    setTimeout(() => {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const greetFn = ROLE_GREETINGS[role] || ROLE_GREETINGS.user;
      setMessages([{ role: 'assistant', content: greetFn(userName, greeting) }]);
      setShowChips(true);
    }, 100);
  };

  // ─── Render a message ───
  const renderMessage = (msg, idx) => {
    const isAssistant = msg.role === 'assistant';
    const isUser = msg.role === 'user';

    return (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {isAssistant && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(280, 60%, 55%))' }}>
            <Bot size={14} className="text-white" />
          </div>
        )}

        <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'rounded-br-md'
              : 'rounded-bl-md'
          }`} style={{
            background: isUser
              ? 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(250, 60%, 55%))'
              : msg.isError
                ? 'hsl(0, 50%, 15%)'
                : 'hsl(var(--muted) / 0.5)',
            color: isUser ? 'white' : 'hsl(var(--foreground))',
            border: msg.isError ? '1px solid hsl(0, 50%, 30%)' : 'none',
          }}>
            {msg.isStreaming && !msg.content ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs opacity-70">Thinking...</span>
              </div>
            ) : isAssistant ? (
              <ReactMarkdown
                className="prose prose-sm prose-invert max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 [&>ul]:mb-1 [&>ol]:mb-1 [&_li]:text-sm"
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} className="text-blue-400 underline" target="_blank" rel="noopener noreferrer" />
                  ),
                  p: ({ node, ...props }) => <p {...props} className="mb-1" />,
                }}
              >
                {msg.content || ''}
              </ReactMarkdown>
            ) : (
              msg.content
            )}
            {msg.isStreaming && msg.content && (
              <span className="inline-block w-1.5 h-4 ml-0.5 rounded-sm animate-pulse"
                style={{ background: 'hsl(var(--foreground))' }} />
            )}
          </div>

          {/* Tool Events: actions executed, navigation, style cards */}
          {msg.toolEvents?.map((event, i) => {
            if (event.type === 'navigation') {
              return <NavigationCard key={i} label={event.label} />;
            }
            if (event.type === 'style_advice') {
              return <StyleAdviceCard key={i} data={event.data} />;
            }
            if (event.type === 'outfit') {
              return <OutfitCard key={i} data={event.data} onSearchPiece={(q) => sendMessage(`Search for: ${q}`)} />;
            }
            if (event.type === 'tool_result') {
              const ToolIcon = TOOL_ICONS[event.tool] || Package;
              const isSuccess = event.result?.success !== false;
              const color = isSuccess ? 'hsl(150, 60%, 45%)' : 'hsl(0, 60%, 55%)';
              return (
                <ActionResultCard
                  key={i}
                  result={event.result}
                  actionName={event.tool?.replace(/_/g, ' ')}
                  icon={ToolIcon}
                  color={color}
                />
              );
            }
            return null;
          })}
        </div>

        {isUser && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'hsl(var(--muted))' }}>
            <User size={14} style={{ color: 'hsl(var(--foreground))' }} />
          </div>
        )}
      </motion.div>
    );
  };

  // ─── Chat Window ───
  const chatWindow = (
    <motion.div
      initial={embedded ? false : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`flex flex-col ${embedded ? 'h-full' : 'h-[560px] w-[380px]'} rounded-2xl overflow-hidden shadow-2xl`}
      style={{
        background: 'hsl(var(--background))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, hsl(220, 70%, 50%), hsl(280, 60%, 50%))',
          color: 'white',
        }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Bot size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold">{titles.title}</h3>
          <p className="text-[10px] opacity-80">{titles.subtitle}</p>
        </div>
        <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Clear chat">
          <Trash2 size={16} />
        </button>
        {!embedded && (
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollBehavior: 'smooth' }}>
        {messages.map(renderMessage)}

        {/* Pending tool executions */}
        {pendingTools.filter(t => t.status === 'running').map((t, i) => (
          <motion.div key={`pending-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-2 rounded-xl"
            style={{ background: 'hsl(220, 70%, 55%, 0.08)', border: '1px solid hsl(220, 70%, 55%, 0.15)' }}>
            <Loader2 size={12} className="animate-spin" style={{ color: 'hsl(220, 70%, 55%)' }} />
            <span className="text-[11px]" style={{ color: 'hsl(220, 70%, 55%)' }}>
              Executing {t.tool?.replace(/_/g, ' ')}...
            </span>
          </motion.div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Chips */}
      <AnimatePresence>
        {showChips && messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-2"
          >
            <div className="flex gap-1.5 flex-wrap">
              {chips.slice(0, 4).map((chip, i) => (
                <button key={i} onClick={() => sendMessage(chip.msg)}
                  className="text-[10px] px-2.5 py-1.5 rounded-full transition-all hover:scale-105"
                  style={{
                    background: 'hsl(var(--muted) / 0.5)',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}>
                  {chip.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? 'AI is thinking...' : 'Ask me anything...'}
            disabled={isLoading}
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'hsl(var(--muted) / 0.3)',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-xl transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(280, 60%, 55%))',
              color: 'white',
            }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        <p className="text-[9px] text-center mt-1.5 opacity-40" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Powered by Rozare AI • Actions are role-secured
        </p>
      </div>
    </motion.div>
  );

  // ─── Embedded mode ───
  if (embedded) return chatWindow;

  // ─── Floating mode ───
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && chatWindow}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(280, 60%, 55%))',
            color: 'white',
          }}
        >
          <MessageCircle size={24} />
        </motion.button>
      )}
    </div>
  );
}

export default ChatBot;
