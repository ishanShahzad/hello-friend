import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Megaphone, Send, Calendar, Repeat, Users, User as UserIcon, ShoppingBag,
    Search, X, Check, Clock, AlertTriangle, CheckCircle2, Loader2, Trash2,
    Bell, Tag, Info, Link as LinkIcon,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('jwtToken')}` });

const CATEGORIES = [
    { id: 'announcement', label: 'Announcement', icon: Megaphone, color: 'hsl(220,70%,55%)' },
    { id: 'promo', label: 'Promotion', icon: Tag, color: 'hsl(280,70%,55%)' },
    { id: 'system', label: 'System', icon: Info, color: 'hsl(220,15%,55%)' },
];

const AUDIENCES = [
    { id: 'all_users', label: 'All Users', icon: UserIcon, desc: 'Everyone with a buyer account' },
    { id: 'all_sellers', label: 'All Sellers', icon: ShoppingBag, desc: 'Everyone with a seller account' },
    { id: 'both', label: 'Users + Sellers', icon: Users, desc: 'Everyone on the platform' },
    { id: 'specific', label: 'Specific People', icon: Search, desc: 'Pick individuals by name or email' },
];

const formatTime = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return '—'; }
};

const STATUS_META = {
    scheduled: { label: 'Scheduled', color: 'hsl(38,92%,50%)', bg: 'rgba(245,158,11,0.12)', icon: Clock },
    sending:   { label: 'Sending…',  color: 'hsl(220,70%,55%)', bg: 'rgba(99,102,241,0.12)', icon: Loader2 },
    sent:      { label: 'Sent',      color: 'hsl(150,70%,40%)', bg: 'rgba(34,197,94,0.12)',  icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', color: 'hsl(0,0%,55%)',    bg: 'rgba(120,120,120,0.12)', icon: X },
    failed:    { label: 'Failed',    color: 'hsl(0,72%,55%)',   bg: 'rgba(239,68,68,0.12)',   icon: AlertTriangle },
};

const AdminBroadcastPanel = () => {
    // Form
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState('announcement');
    const [linkTo, setLinkTo] = useState('');
    const [audience, setAudience] = useState('all_users');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [scheduleType, setScheduleType] = useState('immediate');
    const [scheduledAt, setScheduledAt] = useState('');
    const [recurrence, setRecurrence] = useState('daily');
    const [endsAt, setEndsAt] = useState('');

    // UI state
    const [audienceCount, setAudienceCount] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type, msg }
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);

    const fetchJobs = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}api/notifications/broadcasts`, { headers: authHeaders() });
            setJobs(data.jobs || []);
        } catch (err) {
            console.error('fetchJobs:', err);
        } finally {
            setLoadingJobs(false);
        }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    // Audience preview (debounced)
    useEffect(() => {
        const t = setTimeout(async () => {
            try {
                const params = { audience };
                if (audience === 'specific') params.userIds = selectedUsers.map(u => u._id).join(',');
                const { data } = await axios.get(`${API}api/notifications/audience-preview`, {
                    headers: authHeaders(), params,
                });
                setAudienceCount(data.count ?? 0);
            } catch {
                setAudienceCount(null);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [audience, selectedUsers]);

    // User search (debounced)
    useEffect(() => {
        if (audience !== 'specific' || !searchQuery.trim()) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await axios.get(`${API}api/notifications/users-search`, {
                    headers: authHeaders(), params: { q: searchQuery },
                });
                setSearchResults(data.users || []);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery, audience]);

    const addUser = (user) => {
        if (selectedUsers.find(u => u._id === user._id)) return;
        setSelectedUsers([...selectedUsers, user]);
        setSearchQuery('');
        setSearchResults([]);
    };
    const removeUser = (id) => setSelectedUsers(selectedUsers.filter(u => u._id !== id));

    const canSubmit = useMemo(() => {
        if (!title.trim() || !body.trim()) return false;
        if (audience === 'specific' && selectedUsers.length === 0) return false;
        if ((scheduleType === 'one_time' || scheduleType === 'recurring') && !scheduledAt) return false;
        return true;
    }, [title, body, audience, selectedUsers, scheduleType, scheduledAt]);

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setFeedback(null);
        try {
            const payload = {
                title, body, category, linkTo,
                audience,
                userIds: audience === 'specific' ? selectedUsers.map(u => u._id) : [],
                scheduleType,
                scheduledAt: scheduleType !== 'immediate' ? new Date(scheduledAt).toISOString() : null,
                recurrence: scheduleType === 'recurring' ? recurrence : 'none',
                endsAt: scheduleType === 'recurring' && endsAt ? new Date(endsAt).toISOString() : null,
            };
            const { data } = await axios.post(`${API}api/notifications/broadcast`, payload, { headers: authHeaders() });
            const stats = data.job?.stats;
            setFeedback({
                type: 'success',
                msg: scheduleType === 'immediate'
                    ? `Sent to ${stats?.recipients ?? 0} recipient(s) — ${stats?.pushSent ?? 0} push(es) dispatched.`
                    : 'Broadcast scheduled successfully.',
            });
            // Reset light fields
            setTitle(''); setBody(''); setLinkTo('');
            setSelectedUsers([]); setScheduledAt(''); setEndsAt('');
            fetchJobs();
        } catch (err) {
            setFeedback({ type: 'error', msg: err.response?.data?.msg || 'Failed to send broadcast' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id) => {
        try {
            await axios.post(`${API}api/notifications/broadcasts/${id}/cancel`, {}, { headers: authHeaders() });
            fetchJobs();
        } catch (err) {
            console.error('cancel:', err);
        }
    };

    return (
        <div className="min-h-screen p-4 lg:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="glass-panel-strong rounded-3xl p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, hsl(260,70%,55%), hsl(220,70%,55%))', color: '#fff' }}>
                        <Megaphone size={26} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                            Push Notification Broadcaster
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Send announcements to users and sellers across the website and the mobile app — instantly, scheduled, or on a recurring cadence.
                        </p>
                    </div>
                </div>
            </div>

            {/* Compose */}
            <div className="glass-panel-strong rounded-3xl p-6 mb-6 space-y-6">
                <h2 className="text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Send size={14} /> Compose Message
                </h2>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(var(--muted-foreground))' }}>Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 140))}
                            placeholder="e.g. Weekend flash sale — 30% off everything"
                            className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                            style={{ color: 'hsl(var(--foreground))' }}
                        />
                        <div className="text-[10px] mt-1 text-right" style={{ color: 'hsl(var(--muted-foreground))' }}>{title.length} / 140</div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(var(--muted-foreground))' }}>Message</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value.slice(0, 1000))}
                            placeholder="Write the message your audience will read on web and mobile…"
                            rows={4}
                            className="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none"
                            style={{ color: 'hsl(var(--foreground))' }}
                        />
                        <div className="text-[10px] mt-1 text-right" style={{ color: 'hsl(var(--muted-foreground))' }}>{body.length} / 1000</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(var(--muted-foreground))' }}>Category</label>
                            <div className="flex gap-2 flex-wrap">
                                {CATEGORIES.map(c => {
                                    const Icon = c.icon;
                                    const active = category === c.id;
                                    return (
                                        <button key={c.id} onClick={() => setCategory(c.id)}
                                            className="px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                            style={{
                                                background: active ? `${c.color}1F` : 'rgba(255,255,255,0.04)',
                                                color: active ? c.color : 'hsl(var(--muted-foreground))',
                                                border: `1px solid ${active ? c.color : 'transparent'}`,
                                            }}>
                                            <Icon size={12} /> {c.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block inline-flex items-center gap-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <LinkIcon size={11} /> Link (optional)
                            </label>
                            <input
                                value={linkTo}
                                onChange={(e) => setLinkTo(e.target.value)}
                                placeholder="/marketplace?promo=summer"
                                className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                                style={{ color: 'hsl(var(--foreground))' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Audience */}
            <div className="glass-panel-strong rounded-3xl p-6 mb-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Users size={14} /> Audience
                    {audienceCount != null && (
                        <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full"
                            style={{ background: 'rgba(99,102,241,0.12)', color: 'hsl(220,70%,55%)' }}>
                            {audienceCount.toLocaleString()} recipient{audienceCount === 1 ? '' : 's'}
                        </span>
                    )}
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {AUDIENCES.map(a => {
                        const Icon = a.icon;
                        const active = audience === a.id;
                        return (
                            <button key={a.id} onClick={() => setAudience(a.id)}
                                className="text-left p-4 rounded-2xl transition-all"
                                style={{
                                    background: active ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${active ? 'hsl(220,70%,55%)' : 'transparent'}`,
                                }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                                    style={{ background: active ? 'hsl(220,70%,55%)' : 'rgba(255,255,255,0.06)', color: active ? '#fff' : 'hsl(var(--foreground))' }}>
                                    <Icon size={16} />
                                </div>
                                <div className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{a.label}</div>
                                <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{a.desc}</div>
                            </button>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {audience === 'specific' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users by name or email…"
                                    className="glass-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                                    style={{ color: 'hsl(var(--foreground))' }}
                                />
                            </div>

                            {searching && (
                                <div className="text-xs inline-flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    <Loader2 size={12} className="animate-spin" /> Searching…
                                </div>
                            )}

                            {searchResults.length > 0 && (
                                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                    {searchResults.map(u => (
                                        <button key={u._id} onClick={() => addUser(u)}
                                            className="w-full glass-inner rounded-xl p-2.5 flex items-center gap-3 hover:opacity-80 transition-opacity">
                                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{u.username}</div>
                                                <div className="text-[11px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{u.email} · {u.role}</div>
                                            </div>
                                            <Check size={14} style={{ color: 'hsl(150,70%,40%)' }} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {selectedUsers.map(u => (
                                        <span key={u._id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                            style={{ background: 'rgba(99,102,241,0.12)', color: 'hsl(220,70%,55%)' }}>
                                            {u.username}
                                            <button onClick={() => removeUser(u._id)}><X size={11} /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Schedule */}
            <div className="glass-panel-strong rounded-3xl p-6 mb-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Calendar size={14} /> Schedule
                </h2>

                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'immediate', label: 'Send Now', icon: Send },
                        { id: 'one_time',  label: 'Schedule Once', icon: Clock },
                        { id: 'recurring', label: 'Recurring', icon: Repeat },
                    ].map(s => {
                        const Icon = s.icon;
                        const active = scheduleType === s.id;
                        return (
                            <button key={s.id} onClick={() => setScheduleType(s.id)}
                                className="p-3 rounded-xl text-xs font-bold inline-flex flex-col items-center gap-1.5 transition-all"
                                style={{
                                    background: active ? 'hsl(260,70%,55%)' : 'rgba(255,255,255,0.04)',
                                    color: active ? '#fff' : 'hsl(var(--foreground))',
                                }}>
                                <Icon size={16} /> {s.label}
                            </button>
                        );
                    })}
                </div>

                {scheduleType !== 'immediate' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {scheduleType === 'recurring' ? 'First run at' : 'Send at'}
                            </label>
                            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                                className="glass-input w-full px-4 py-3 rounded-xl text-sm" style={{ color: 'hsl(var(--foreground))' }} />
                        </div>
                        {scheduleType === 'recurring' && (
                            <>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(var(--muted-foreground))' }}>Repeat every</label>
                                    <div className="flex gap-2">
                                        {['daily', 'weekly', 'monthly'].map(r => (
                                            <button key={r} onClick={() => setRecurrence(r)}
                                                className="flex-1 px-3 py-3 rounded-xl text-xs font-bold capitalize"
                                                style={{
                                                    background: recurrence === r ? 'hsl(260,70%,55%)' : 'rgba(255,255,255,0.04)',
                                                    color: recurrence === r ? '#fff' : 'hsl(var(--foreground))',
                                                }}>
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'hsl(var(--muted-foreground))' }}>End date (optional)</label>
                                    <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                                        className="glass-input w-full px-4 py-3 rounded-xl text-sm" style={{ color: 'hsl(var(--foreground))' }} />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Submit */}
            <div className="glass-panel-strong rounded-3xl p-6 mb-6">
                <AnimatePresence>
                    {feedback && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mb-4 p-3 rounded-2xl text-sm flex items-start gap-2"
                            style={{
                                background: feedback.type === 'success' ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                                color: feedback.type === 'success' ? 'hsl(150,70%,40%)' : 'hsl(0,72%,55%)',
                                border: `1px solid ${feedback.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            }}>
                            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{feedback.msg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button onClick={handleSubmit} disabled={!canSubmit || submitting}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, hsl(260,70%,55%), hsl(220,70%,55%))' }}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {scheduleType === 'immediate' ? 'Send Broadcast Now' : 'Schedule Broadcast'}
                </button>
            </div>

            {/* Recent broadcasts */}
            <div className="glass-panel-strong rounded-3xl p-6">
                <h2 className="text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2 mb-4"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Bell size={14} /> Recent Broadcasts
                </h2>

                {loadingJobs ? (
                    <div className="text-center py-8 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <Loader2 size={18} className="animate-spin inline" />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-12 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        No broadcasts yet. Compose your first message above.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {jobs.map(job => {
                            const meta = STATUS_META[job.status] || STATUS_META.scheduled;
                            const Icon = meta.icon;
                            const canCancel = job.status === 'scheduled';
                            return (
                                <div key={job._id} className="glass-inner rounded-2xl p-3.5">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: meta.bg, color: meta.color }}>
                                            <Icon size={15} className={job.status === 'sending' ? 'animate-spin' : ''} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{job.title}</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                    style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                                                {job.scheduleType === 'recurring' && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                                                        style={{ background: 'rgba(260,70%,55%,0.12)', color: 'hsl(260,70%,55%)' }}>
                                                        <Repeat size={9} /> {job.recurrence}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs mt-0.5 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{job.body}</div>
                                            <div className="text-[10px] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                <span>Audience: <strong>{job.audience.replace('_', ' ')}</strong></span>
                                                {job.stats?.recipients > 0 && <span>{job.stats.recipients} recipient(s)</span>}
                                                {job.stats?.pushSent > 0 && <span>{job.stats.pushSent} push(es)</span>}
                                                {job.runCount > 0 && <span>Ran {job.runCount}×</span>}
                                                {job.nextRunAt && <span>Next: {formatTime(job.nextRunAt)}</span>}
                                                {job.lastRunAt && <span>Last: {formatTime(job.lastRunAt)}</span>}
                                            </div>
                                        </div>
                                        {canCancel && (
                                            <button onClick={() => handleCancel(job._id)}
                                                className="p-2 rounded-lg shrink-0"
                                                style={{ background: 'rgba(239,68,68,0.10)', color: 'hsl(0,72%,55%)' }}
                                                title="Cancel scheduled broadcast">
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBroadcastPanel;
