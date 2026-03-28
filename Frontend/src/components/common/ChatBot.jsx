import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Bot, User, ShoppingCart, Package,
  AlertCircle, Loader2, ExternalLink, Mic, MicOff, Phone, PhoneOff,
  Sparkles, Palette, Clock, ArrowRight, Volume2, VolumeX, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useGlobal } from '../../contexts/GlobalContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;

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

// ─── Stream parser ───
async function streamChat({ messages, userContext, onDelta, onToolCall, onDone }) {
  const resp = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ messages, userContext }),
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

        // Text content
        if (delta.content) onDelta(delta.content);

        // Tool calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = { id: tc.id || '', name: tc.function?.name || '', arguments: '' };
            }
            if (tc.function?.name) toolCalls[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
          }
        }

        // Finish reason
        if (parsed.choices?.[0]?.finish_reason === 'tool_calls') {
          for (const idx of Object.keys(toolCalls)) {
            const tc = toolCalls[idx];
            try {
              const args = JSON.parse(tc.arguments);
              onToolCall(tc.name, args, tc.id);
            } catch { /* partial */ }
          }
          toolCalls = {};
        }
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  // Flush remaining tool calls
  for (const idx of Object.keys(toolCalls)) {
    const tc = toolCalls[idx];
    try {
      const args = JSON.parse(tc.arguments);
      onToolCall(tc.name, args, tc.id);
    } catch { /* ignore */ }
  }

  onDone();
}

// ─── Voice Waveform Animation ───
const VoiceWaveform = ({ isActive }) => (
  <div className="flex items-center justify-center gap-[3px] h-16">
    {[...Array(24)].map((_, i) => (
      <motion.div
        key={i}
        className="w-[3px] rounded-full"
        style={{ background: `hsl(${220 + i * 5}, 70%, ${55 + Math.sin(i) * 10}%)` }}
        animate={isActive ? {
          height: [8, 20 + Math.random() * 40, 12, 30 + Math.random() * 30, 8],
        } : { height: 8 }}
        transition={isActive ? {
          duration: 0.8 + Math.random() * 0.4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: i * 0.04,
        } : { duration: 0.3 }}
      />
    ))}
  </div>
);

// ─── Style Advice Card ───
const StyleAdviceCard = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl overflow-hidden mt-2"
    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
  >
    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 50%, 0.15), hsl(320, 50%, 55%, 0.1))' }}>
      <Palette size={14} style={{ color: 'hsl(280, 60%, 60%)' }} />
      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
        Style Advice — {data.occasion}
      </span>
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

// ─── Outfit Suggestion Card ───
const OutfitCard = ({ data, onSearchPiece }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl overflow-hidden mt-2"
    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
  >
    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%, 0.15), hsl(170, 60%, 45%, 0.1))' }}>
      <Sparkles size={14} style={{ color: 'hsl(220, 70%, 55%)' }} />
      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
        Outfit Idea — {data.occasion}
      </span>
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
            <button
              onClick={() => onSearchPiece(piece.searchQuery)}
              className="text-[10px] px-2 py-1 rounded-lg shrink-0"
              style={{ background: 'hsl(220, 70%, 55%, 0.15)', color: 'hsl(220, 70%, 55%)' }}
            >
              Find
            </button>
          )}
        </div>
      ))}
      <p className="text-[10px] italic mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
        💡 {data.reasoning}
      </p>
    </div>
  </motion.div>
);

// ─── Navigation Action Card ───
const NavigationCard = ({ label, route }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-2 p-2 rounded-xl mt-1"
    style={{ background: 'hsl(220, 70%, 55%, 0.1)', border: '1px solid hsl(220, 70%, 55%, 0.2)' }}
  >
    <ArrowRight size={12} style={{ color: 'hsl(220, 70%, 55%)' }} />
    <span className="text-[11px] font-medium" style={{ color: 'hsl(220, 70%, 55%)' }}>
      Navigated to {label}
    </span>
  </motion.div>
);

// ─── Main ChatBot ───
const ChatBot = () => {
  const { getCurrencySymbol, convertPrice } = useCurrency();
  const { cartItems, handleAddToCart, fetchCart } = useGlobal();
  const { currentUser, token } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceCallMode, setIsVoiceCallMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaint, setComplaint] = useState({ category: 'product_issue', subject: '', message: '' });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [contextualChips, setContextualChips] = useState([]);

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

  // ─── Scroll to bottom ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isVoiceCallMode) inputRef.current?.focus();
  }, [isOpen, isVoiceCallMode]);

  // ─── Fetch user context on open ───
  useEffect(() => {
    if (isOpen && currentUser && !userContext) {
      fetchUserContext();
    }
  }, [isOpen, currentUser]);

  // ─── Set initial greeting ───
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const name = currentUser?.username || '';
      const welcomeText = name
        ? `${greeting}, ${name}! 👋 I'm your personal shopping stylist at Tortrose. I can help you find the perfect outfit, give color coordination advice, track orders, or just chat about fashion. What's on your mind?`
        : `${greeting}! 👋 I'm your personal shopping stylist at Tortrose. Whether you need outfit advice, product recommendations, or help with orders — I'm here for you. What can I help with?`;

      setMessages([{ role: 'assistant', content: welcomeText }]);
      setContextualChips([
        { label: '👗 Help me find an outfit', msg: "I'm looking for a new outfit, can you help me?" },
        { label: '📦 Track my order', msg: 'Track my recent order' },
        { label: '🎨 Style advice', msg: 'Give me some fashion advice for this season' },
        { label: '🏪 Browse stores', msg: 'Show me popular stores' },
      ]);
    }
  }, [isOpen, currentUser]);

  const fetchUserContext = async () => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) return;
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}api/chatbot/user-context`,
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );
      setUserContext(res.data);
    } catch {
      // Non-critical
    }
  };

  // ─── TTS ───
  const speak = useCallback((text) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`~\[\]()>]/g, '').replace(/\n+/g, '. ');
    if (!clean.trim()) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.05;
    isSpeakingRef.current = true;
    utterance.onend = () => { isSpeakingRef.current = false; };
    utterance.onerror = () => { isSpeakingRef.current = false; };
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  // ─── Handle Tool Calls ───
  const executeToolCall = useCallback(async (name, args) => {
    switch (name) {
      case 'search_products': {
        try {
          let searchUrl = `${import.meta.env.VITE_API_URL}api/products?`;
          if (args.query) searchUrl += `keyword=${encodeURIComponent(args.query)}&`;
          if (args.category) searchUrl += `category=${encodeURIComponent(args.category)}&`;
          if (args.maxPrice) searchUrl += `maxPrice=${args.maxPrice}&`;
          if (args.minPrice) searchUrl += `minPrice=${args.minPrice}&`;
          searchUrl += 'limit=5';
          const res = await axios.get(searchUrl);
          const products = res.data?.products || res.data || [];
          return { products: products.slice(0, 5).map(p => ({
            _id: p._id, name: p.name, price: p.price,
            discountedPrice: p.discountedPrice, image: p.image || p.images?.[0],
            rating: p.rating, category: p.category, brand: p.brand,
          })) };
        } catch {
          return { products: [], error: 'Could not search products right now' };
        }
      }
      case 'navigate': {
        const { route, label } = args;
        setTimeout(() => navigate(route), 500);
        return { navigated: true, label, route };
      }
      case 'show_style_advice': {
        return { styleAdvice: args };
      }
      case 'suggest_outfit': {
        return { outfitSuggestion: args };
      }
      default:
        return {};
    }
  }, [navigate]);

  // ─── Send Message (unified for text + voice) ───
  const sendMessage = async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    const userMsg = { role: 'user', content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build AI messages from history
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
      let toolResults = [];

      await streamChat({
        messages: aiMessages,
        userContext,
        onDelta: (chunk) => upsertAssistant(chunk),
        onToolCall: async (name, args, id) => {
          const result = await executeToolCall(name, args);
          toolResults.push({ name, args, result });

          // Add tool result to messages
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx]._streaming) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                toolResults: [...(updated[lastIdx].toolResults || []), { name, args, result }],
              };
            }
            return updated;
          });

          // Update contextual chips based on tool call
          if (name === 'search_products' && result.products?.length > 0) {
            setContextualChips([
              { label: '🔍 More like this', msg: `Show me more products similar to ${result.products[0].name}` },
              { label: '👕 What goes with this?', msg: `What would go well with a ${result.products[0].name}?` },
              { label: '💰 Cheaper options', msg: 'Show me cheaper alternatives' },
              { label: '🎨 Color advice', msg: `What colors go well with ${result.products[0].name}?` },
            ]);
          } else if (name === 'show_style_advice' || name === 'suggest_outfit') {
            setContextualChips([
              { label: '🛍️ Find these items', msg: 'Search for these outfit pieces' },
              { label: '🔄 Different style', msg: 'Show me a different style option' },
              { label: '💵 Budget-friendly', msg: 'Show me budget-friendly alternatives' },
              { label: '📸 More ideas', msg: 'Give me more outfit ideas' },
            ]);
          } else if (name === 'navigate') {
            setContextualChips([
              { label: '🏠 Go home', msg: 'Take me back home' },
              { label: '🔙 What else?', msg: 'What else can you help me with?' },
            ]);
          }
        },
        onDone: () => {
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, _streaming: false } : m));
          setLoading(false);

          // Speak the response in voice call mode
          if (isVoiceCallMode && assistantText) {
            speak(assistantText);
          }
        },
      });
    } catch (err) {
      console.error('AI Chat error:', err);
      const errorMsg = err.message?.includes('Rate limit') ? 'I\'m getting a lot of requests right now. Please try again in a moment! 😅'
        : err.message?.includes('credits') ? 'AI service needs more credits. Please check your workspace settings.'
        : 'Sorry, I\'m having a brief moment — please try again! 🙏';
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

    setIsVoiceCallMode(true);
    setCallDuration(0);
    setVoiceHistory([]);
    setVoiceTranscript('');

    // Start timer
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Start recognition
    startRecognition();
  };

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setVoiceTranscript(interimTranscript || finalTranscript);

      if (finalTranscript.trim()) {
        setVoiceHistory(prev => [...prev, { role: 'user', text: finalTranscript.trim() }]);
        sendMessage(finalTranscript.trim());
        setVoiceTranscript('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in browser settings.');
        endVoiceCall();
      } else if (event.error !== 'aborted') {
        // Restart on non-critical errors
        setTimeout(() => {
          if (isVoiceCallMode) startRecognition();
        }, 500);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still in call mode (continuous listening)
      if (isVoiceCallMode && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch { /* already started */ }
        }, 200);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
    } catch {
      toast.error('Could not start voice recognition');
    }
  };

  const endVoiceCall = () => {
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent auto-restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Stop TTS
    window.speechSynthesis?.cancel();

    setIsVoiceCallMode(false);
    setIsListening(false);
    setVoiceTranscript('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Complaint ───
  const submitComplaint = async () => {
    if (!complaint.subject.trim() || !complaint.message.trim()) return;
    const jwtToken = localStorage.getItem('jwtToken');
    if (!jwtToken) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Please log in to submit a complaint.' }]);
      return;
    }
    setSubmittingComplaint(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}api/chatbot/complaint`,
        complaint,
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );
      setMessages(prev => [...prev, { role: 'assistant', content: `✅ ${res.data.msg}` }]);
      setShowComplaintForm(false);
      setComplaint({ category: 'product_issue', subject: '', message: '' });
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.response?.data?.msg || 'Failed to submit complaint.' }]);
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const handleSearchPiece = (query) => {
    sendMessage(`Find me ${query}`);
  };

  // ─── Render Message Content ───
  const renderMessage = (msg) => {
    return (
      <>
        {msg.content && (
          <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none"
            style={{ color: msg.role === 'user' ? 'white' : 'hsl(var(--foreground))' }}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}

        {/* Product results from tool calls */}
        {msg.toolResults?.map((tr, ti) => (
          <React.Fragment key={ti}>
            {tr.name === 'search_products' && tr.result.products?.length > 0 && (
              <div className="mt-2 space-y-2">
                {tr.result.products.map(p => (
                  <Link key={p._id} to={`/single-product/${p._id}`} onClick={() => setIsOpen(false)}>
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
            {tr.name === 'navigate' && tr.result.navigated && (
              <NavigationCard label={tr.result.label} route={tr.result.route} />
            )}
            {tr.name === 'show_style_advice' && tr.result.styleAdvice && (
              <StyleAdviceCard data={tr.result.styleAdvice} />
            )}
            {tr.name === 'suggest_outfit' && tr.result.outfitSuggestion && (
              <OutfitCard data={tr.result.outfitSuggestion} onSearchPiece={handleSearchPiece} />
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  const hasSpeechSupport = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
        style={{
          background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))',
          boxShadow: '0 8px 32px hsl(220, 70%, 55%, 0.4)',
        }}
        whileHover={{ scale: 1.1, rotate: isOpen ? 0 : 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} color="white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={22} color="white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-[60] w-[380px] max-w-[calc(100vw-2rem)] glass-panel-strong overflow-hidden"
            style={{ maxHeight: '75vh', display: 'flex', flexDirection: 'column', borderRadius: 24 }}
          >
            {/* ─── VOICE CALL MODE ─── */}
            {isVoiceCallMode ? (
              <div className="flex flex-col h-full" style={{ minHeight: 420 }}>
                {/* Call Header */}
                <div className="p-4 text-center" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-medium" style={{ color: 'hsl(150, 60%, 50%)' }}>Live Call</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>Tortrose Stylist</p>
                  <p className="text-sm font-mono" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Clock size={12} className="inline mr-1" />{formatDuration(callDuration)}
                  </p>
                </div>

                {/* Waveform */}
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                  <motion.div
                    className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
                    style={{
                      background: 'linear-gradient(135deg, hsl(220, 70%, 55%, 0.2), hsl(260, 60%, 60%, 0.2))',
                      boxShadow: isListening ? '0 0 60px hsl(220, 70%, 55%, 0.3)' : 'none',
                    }}
                    animate={isListening ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                      <Bot size={32} color="white" />
                    </div>
                  </motion.div>

                  <VoiceWaveform isActive={isListening && !loading} />

                  <p className="text-sm mt-4 text-center" style={{ color: 'hsl(var(--foreground))' }}>
                    {loading ? '✨ Thinking...' : voiceTranscript ? `"${voiceTranscript}"` : isListening ? 'Listening to you...' : 'Starting...'}
                  </p>

                  {/* TTS toggle */}
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs glass-inner"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                    {ttsEnabled ? 'Voice On' : 'Voice Off'}
                  </button>
                </div>

                {/* End Call Button */}
                <div className="p-6 flex justify-center">
                  <motion.button
                    onClick={endVoiceCall}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, hsl(0, 70%, 55%), hsl(20, 70%, 50%))',
                      boxShadow: '0 4px 24px hsl(0, 70%, 55%, 0.4)',
                    }}
                  >
                    <PhoneOff size={24} color="white" />
                  </motion.button>
                </div>
              </div>
            ) : (
              /* ─── TEXT CHAT MODE ─── */
              <>
                {/* Header */}
                <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--glass-border)', background: 'linear-gradient(135deg, hsl(220, 70%, 55%, 0.1), hsl(260, 60%, 60%, 0.1))' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                    <Bot size={18} color="white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Tortrose AI Stylist</p>
                    <p className="text-[10px] flex items-center gap-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <Sparkles size={8} /> Personal Shopping Assistant
                    </p>
                  </div>
                  <button
                    onClick={() => { setTtsEnabled(!ttsEnabled); }}
                    className="p-1.5 rounded-lg glass-inner"
                    style={{ color: ttsEnabled ? 'hsl(220, 70%, 55%)' : 'hsl(var(--muted-foreground))' }}
                    title={ttsEnabled ? 'Mute voice' : 'Enable voice'}
                  >
                    {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg glass-inner" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 250, maxHeight: 'calc(75vh - 160px)' }}>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-1"
                          style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                          <Bot size={12} color="white" />
                        </div>
                      )}
                      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                        style={msg.role === 'user'
                          ? { background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }
                          : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'hsl(var(--foreground))' }
                        }>
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
                          <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Tortrose AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Complaint Form */}
                  {showComplaintForm && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-inner rounded-2xl p-3 space-y-2">
                      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        <AlertCircle size={12} className="inline mr-1" /> Submit a Complaint
                      </p>
                      <select
                        value={complaint.category}
                        onChange={e => setComplaint({ ...complaint, category: e.target.value })}
                        className="glass-input text-xs py-2"
                      >
                        {COMPLAINT_CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <input type="text" placeholder="Subject" value={complaint.subject}
                        onChange={e => setComplaint({ ...complaint, subject: e.target.value })}
                        className="glass-input text-xs py-2" maxLength={200} />
                      <textarea placeholder="Describe your issue..." value={complaint.message}
                        onChange={e => setComplaint({ ...complaint, message: e.target.value })}
                        className="glass-input text-xs py-2" rows={3} maxLength={2000} />
                      <div className="flex gap-2">
                        <button onClick={() => setShowComplaintForm(false)}
                          className="flex-1 text-xs py-2 rounded-xl glass-inner font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                          Cancel
                        </button>
                        <button onClick={submitComplaint} disabled={submittingComplaint}
                          className="flex-1 text-xs py-2 rounded-xl font-semibold text-white flex items-center justify-center gap-1"
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
                    {/* Voice Call Button */}
                    {hasSpeechSupport && (
                      <motion.button
                        onClick={startVoiceCall}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2.5 rounded-xl flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, hsl(150, 60%, 45%), hsl(170, 50%, 50%))',
                          boxShadow: '0 2px 12px hsl(150, 60%, 45%, 0.3)',
                        }}
                        title="Start voice call"
                      >
                        <Phone size={16} color="white" />
                      </motion.button>
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      placeholder="Ask your stylist anything..."
                      className="glass-input flex-1 text-sm py-2.5"
                      disabled={loading}
                    />
                    <motion.button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 rounded-xl flex items-center justify-center disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}
                    >
                      <Send size={16} color="white" />
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
