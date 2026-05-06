import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Plus, Trash2, Edit3, Check, X, ChevronLeft,
  Bot, Sparkles, Clock, Search, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChatBot from '../components/common/ChatBot';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/';

function AIChatPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const authToken = localStorage.getItem('jwtToken');

  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [loadedMessages, setLoadedMessages] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}api/ai-chat/conversations`, { headers });
      const data = await res.json();
      setConversations(data.conversations || []);
      if (data.activeConversationId && !activeConvoId) {
        setActiveConvoId(data.activeConversationId);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }, [authToken]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load a specific conversation
  const loadConversation = useCallback(async (convoId) => {
    if (!authToken || !convoId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}api/ai-chat/conversations/${convoId}`, { headers });
      const data = await res.json();
      setActiveConvoId(convoId);
      setLoadedMessages(data.messages || []);
    } catch (e) {
      console.error('Failed to load conversation:', e);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  // Create new conversation
  const createNewChat = async () => {
    try {
      const res = await fetch(`${API_BASE}api/ai-chat/conversations`, {
        method: 'POST', headers, body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await res.json();
      setActiveConvoId(data._id);
      setLoadedMessages([]);
      await loadConversations();
    } catch (e) {
      console.error('Failed to create conversation:', e);
    }
  };

  // Delete conversation
  const deleteConversation = async (convoId) => {
    try {
      await fetch(`${API_BASE}api/ai-chat/conversations/${convoId}`, { method: 'DELETE', headers });
      if (activeConvoId === convoId) {
        setActiveConvoId(null);
        setLoadedMessages(null);
      }
      await loadConversations();
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  // Rename conversation
  const saveRename = async (convoId) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`${API_BASE}api/ai-chat/conversations/${convoId}/rename`, {
        method: 'PATCH', headers, body: JSON.stringify({ title: editTitle }),
      });
      setEditingId(null);
      setEditTitle('');
      await loadConversations();
    } catch (e) {
      console.error('Failed to rename:', e);
    }
  };

  // Filter conversations by search
  const filtered = conversations.filter(c =>
    !searchQuery || c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const grouped = {};
  filtered.forEach(c => {
    const d = new Date(c.lastActive);
    const now = new Date();
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    let label = 'Older';
    if (diff < 1) label = 'Today';
    else if (diff < 2) label = 'Yesterday';
    else if (diff < 7) label = 'This Week';
    else if (diff < 30) label = 'This Month';
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(c);
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="text-center space-y-4">
          <Bot size={48} className="mx-auto" style={{ color: 'hsl(220, 70%, 55%)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Sign in to use AI Chat</h2>
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Log in to start chatting with Rozare AI and save your conversations.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 rounded-xl font-medium text-white"
            style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(280, 60%, 55%))' }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      {/* ─── Sidebar ─── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col border-r overflow-hidden shrink-0"
            style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.2)' }}
          >
            {/* Sidebar Header */}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10 transition"
                  style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <ChevronLeft size={18} />
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <Bot size={18} style={{ color: 'hsl(220, 70%, 55%)' }} />
                  <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>AI Chat</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition lg:hidden"
                  style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <X size={16} />
                </button>
              </div>

              {/* New Chat Button */}
              <button onClick={createNewChat}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(280, 60%, 55%))',
                  color: 'white',
                }}>
                <Plus size={16} />
                New Chat
              </button>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--muted-foreground))' }} />
                <input
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
                  style={{
                    background: 'hsl(var(--muted) / 0.3)',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
              {Object.keys(grouped).length === 0 && (
                <div className="text-center py-8">
                  <Sparkles size={24} className="mx-auto mb-2" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>No conversations yet</p>
                </div>
              )}

              {Object.entries(grouped).map(([label, convos]) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase px-2 mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {label}
                  </p>
                  {convos.map(c => (
                    <div key={c._id}
                      onClick={() => { if (editingId !== c._id) loadConversation(c._id); }}
                      className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all mb-0.5 ${
                        activeConvoId === c._id ? 'ring-1' : 'hover:bg-white/5'
                      }`}
                      style={{
                        background: activeConvoId === c._id ? 'hsl(220, 70%, 55%, 0.12)' : 'transparent',
                        ringColor: activeConvoId === c._id ? 'hsl(220, 70%, 55%, 0.3)' : 'transparent',
                      }}
                    >
                      <MessageCircle size={14} style={{ color: activeConvoId === c._id ? 'hsl(220, 70%, 55%)' : 'hsl(var(--muted-foreground))' }} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        {editingId === c._id ? (
                          <div className="flex items-center gap-1">
                            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                              className="flex-1 text-xs px-1.5 py-0.5 rounded outline-none"
                              style={{ background: 'hsl(var(--muted) / 0.5)', color: 'hsl(var(--foreground))' }}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveRename(c._id); if (e.key === 'Escape') setEditingId(null); }}
                              autoFocus onClick={(e) => e.stopPropagation()}
                            />
                            <button onClick={(e) => { e.stopPropagation(); saveRename(c._id); }} className="p-0.5"><Check size={12} style={{ color: 'hsl(150, 60%, 50%)' }} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-0.5"><X size={12} style={{ color: 'hsl(0, 60%, 55%)' }} /></button>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{c.title}</p>
                            <p className="text-[10px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              {c.preview || `${c.messageCount} messages`}
                            </p>
                          </>
                        )}
                      </div>
                      {editingId !== c._id && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setEditingId(c._id); setEditTitle(c.title); }}
                            className="p-1 rounded hover:bg-white/10"><Edit3 size={11} style={{ color: 'hsl(var(--muted-foreground))' }} /></button>
                          <button onClick={(e) => { e.stopPropagation(); deleteConversation(c._id); }}
                            className="p-1 rounded hover:bg-white/10"><Trash2 size={11} style={{ color: 'hsl(0, 60%, 55%)' }} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─── Main Chat Area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        {!sidebarOpen && (
          <div className="flex items-center gap-2 p-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <Menu size={18} />
            </button>
            <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
              {conversations.find(c => c._id === activeConvoId)?.title || 'AI Chat'}
            </span>
          </div>
        )}

        {/* Embedded ChatBot filling the main area */}
        <div className="flex-1 overflow-hidden">
          <ChatBot
            embedded={true}
            conversationId={activeConvoId}
            initialMessages={loadedMessages}
            onConversationCreated={(convoId) => {
              setActiveConvoId(convoId);
              loadConversations();
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default AIChatPage;
