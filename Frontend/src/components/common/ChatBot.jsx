import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, ShoppingCart, Package, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';

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

const ChatBot = () => {
    const { getCurrencySymbol, convertPrice } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! 👋 I'm Tortrose AI, your shopping assistant. I can help you find products, track orders, or handle any issues. What can I do for you?",
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showComplaintForm, setShowComplaintForm] = useState(false);
    const [complaint, setComplaint] = useState({ category: 'product_issue', subject: '', message: '' });
    const [submittingComplaint, setSubmittingComplaint] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('jwtToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}api/chatbot/chat`,
                { message: userMsg.content },
                { headers }
            );

            const botMsg = { role: 'assistant', content: res.data.reply, data: res.data };

            // Handle special actions
            if (res.data.action?.type === 'show_complaint_form') {
                setShowComplaintForm(true);
            }

            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const submitComplaint = async () => {
        if (!complaint.subject.trim() || !complaint.message.trim()) return;
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Please log in to submit a complaint.'
            }]);
            return;
        }

        setSubmittingComplaint(true);
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}api/chatbot/complaint`,
                complaint,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ ${res.data.msg}`
            }]);
            setShowComplaintForm(false);
            setComplaint({ category: 'product_issue', subject: '', message: '' });
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: err.response?.data?.msg || 'Failed to submit complaint. Please try again.'
            }]);
        } finally {
            setSubmittingComplaint(false);
        }
    };

    const quickActions = [
        { label: '🔍 Find products', msg: 'Show me popular products' },
        { label: '📦 Track order', msg: 'Track my order' },
        { label: '📝 Report issue', msg: 'I want to report a complaint' },
    ];

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
                        className="fixed bottom-24 right-6 z-[60] w-[360px] max-w-[calc(100vw-2rem)] glass-panel-strong overflow-hidden"
                        style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column', borderRadius: 24 }}
                    >
                        {/* Header */}
                        <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--glass-border)', background: 'linear-gradient(135deg, hsl(220, 70%, 55%, 0.1), hsl(260, 60%, 60%, 0.1))' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                                <Bot size={18} color="white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Tortrose AI</p>
                                <p className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Shopping Assistant</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg glass-inner" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 250, maxHeight: 'calc(70vh - 140px)' }}>
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
                                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                                        style={msg.role === 'user'
                                            ? { background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }
                                            : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'hsl(var(--foreground))' }
                                        }>
                                        <p style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>

                                        {/* Product results */}
                                        {msg.data?.products && (
                                            <div className="mt-2 space-y-2">
                                                {msg.data.products.map(p => (
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

                                        {/* Order results */}
                                        {msg.data?.orders && (
                                            <div className="mt-2 space-y-2">
                                                {msg.data.orders.map(o => (
                                                    <div key={o.orderId} className="flex items-center gap-2 p-2 rounded-xl glass-inner">
                                                        <Package size={14} style={{ color: 'hsl(220, 70%, 55%)' }} />
                                                        <div className="flex-1">
                                                            <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>#{o.orderId}</p>
                                                            <p className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                                {o.status} • {getCurrencySymbol()}{convertPrice(o.total || 0).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                                        <Bot size={12} color="white" />
                                    </div>
                                    <div className="glass-inner rounded-2xl rounded-bl-md px-4 py-3">
                                        <div className="flex gap-1.5">
                                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(var(--muted-foreground))', animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(var(--muted-foreground))', animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(var(--muted-foreground))', animationDelay: '300ms' }} />
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
                                    <input
                                        type="text"
                                        placeholder="Subject"
                                        value={complaint.subject}
                                        onChange={e => setComplaint({ ...complaint, subject: e.target.value })}
                                        className="glass-input text-xs py-2"
                                        maxLength={200}
                                    />
                                    <textarea
                                        placeholder="Describe your issue..."
                                        value={complaint.message}
                                        onChange={e => setComplaint({ ...complaint, message: e.target.value })}
                                        className="glass-input text-xs py-2"
                                        rows={3}
                                        maxLength={2000}
                                    />
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

                        {/* Quick Actions (only when few messages) */}
                        {messages.length <= 2 && (
                            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                                {quickActions.map((qa, i) => (
                                    <button key={i} onClick={() => { setInput(qa.msg); }}
                                        className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all hover:scale-[1.02]"
                                        style={{ background: 'rgba(99,102,241,0.1)', color: 'hsl(220, 70%, 55%)', border: '1px solid rgba(99,102,241,0.15)' }}>
                                        {qa.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                    placeholder="Ask me anything..."
                                    className="glass-input flex-1 text-sm py-2.5"
                                    disabled={loading}
                                />
                                <motion.button
                                    onClick={sendMessage}
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
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatBot;
