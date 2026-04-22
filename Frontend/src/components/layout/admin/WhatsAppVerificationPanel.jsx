import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
    MessageCircle, QrCode, Power, RefreshCw, X, AlertTriangle, CheckCircle2,
    Loader2, Phone, Clock, ShieldAlert, Activity, Inbox,
} from 'lucide-react';
import GlassBackground from '../../common/GlassBackground';

const API = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('jwtToken')}` });

const STATUS_META = {
    disconnected: { label: 'Disconnected', color: 'hsl(0, 0%, 55%)', bg: 'rgba(120,120,120,0.12)' },
    pending_qr:   { label: 'Awaiting QR scan', color: 'hsl(38, 92%, 50%)', bg: 'rgba(245,158,11,0.12)' },
    connecting:   { label: 'Connecting…', color: 'hsl(220, 70%, 55%)', bg: 'rgba(99,102,241,0.12)' },
    connected:    { label: 'Connected', color: 'hsl(150, 70%, 40%)', bg: 'rgba(34,197,94,0.12)' },
    error:        { label: 'Error', color: 'hsl(0, 72%, 55%)', bg: 'rgba(239,68,68,0.12)' },
};

const QUEUE_STATUS_META = {
    queued:    { label: 'Queued',     color: 'hsl(0,0%,55%)',     icon: Clock },
    sending:   { label: 'Sending',    color: 'hsl(220,70%,55%)',  icon: Loader2 },
    sent:      { label: 'Sent',       color: 'hsl(220,70%,55%)',  icon: CheckCircle2 },
    voted_yes: { label: 'Confirmed ✓',color: 'hsl(150,70%,40%)',  icon: CheckCircle2 },
    voted_no:  { label: 'Declined',   color: 'hsl(0,72%,55%)',    icon: X },
    failed:    { label: 'Failed',     color: 'hsl(0,72%,55%)',    icon: AlertTriangle },
    expired:   { label: 'Expired',    color: 'hsl(0,0%,55%)',     icon: Clock },
};

const formatTime = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return '—'; }
};

const WhatsAppVerificationPanel = () => {
    const [status, setStatus] = useState(null);
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrBase64, setQrBase64] = useState('');
    const [qrError, setQrError] = useState('');
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);
    const pollRef = useRef(null);

    const fetchStatus = useCallback(async () => {
        try {
            const [s, q] = await Promise.all([
                axios.get(`${API}api/whatsapp/status`, { headers: authHeaders() }),
                axios.get(`${API}api/whatsapp/queue`, { headers: authHeaders() }),
            ]);
            setStatus(s.data);
            setQueue(q.data.items || []);
        } catch (err) {
            console.error('whatsapp panel fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Refresh QR every 25s while modal is open and not yet connected
    useEffect(() => {
        if (showQrModal && status?.status !== 'connected') {
            const id = setInterval(() => requestQr(), 25000);
            return () => clearInterval(id);
        }
    }, [showQrModal, status?.status]);

    // Poll status every 5s while QR modal is open, every 30s otherwise
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        const interval = showQrModal ? 5000 : 30000;
        pollRef.current = setInterval(fetchStatus, interval);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [showQrModal, fetchStatus]);

    const requestQr = async () => {
        setQrLoading(true);
        setQrError('');
        try {
            const { data } = await axios.post(`${API}api/whatsapp/connect`, {}, { headers: authHeaders() });
            setQrBase64(data.qrBase64 || '');
            await fetchStatus();
        } catch (err) {
            setQrError(err.response?.data?.msg || 'Failed to fetch QR code');
        } finally {
            setQrLoading(false);
        }
    };

    const openQrModal = async () => {
        setShowQrModal(true);
        await requestQr();
    };

    const handleDisconnect = async () => {
        try {
            await axios.post(`${API}api/whatsapp/disconnect`, {}, { headers: authHeaders() });
            setConfirmDisconnect(false);
            await fetchStatus();
        } catch (err) {
            console.error(err);
        }
    };

    // Auto-close QR modal on connected
    useEffect(() => {
        if (showQrModal && status?.status === 'connected') {
            setTimeout(() => setShowQrModal(false), 1200);
        }
    }, [status?.status, showQrModal]);

    const meta = STATUS_META[status?.status] || STATUS_META.disconnected;

    return (
        <GlassBackground>
            <div className="min-h-screen p-4 lg:p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="glass-panel-strong rounded-3xl p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 40%), hsl(170, 70%, 38%))', color: '#fff' }}>
                            <MessageCircle size={26} />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                                WhatsApp Order Verification
                            </h1>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Link your WhatsApp once. Buyers automatically receive a poll to confirm their order — one tap, no typing.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status card */}
                <div className="glass-panel-strong rounded-3xl p-6 mb-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
                                style={{ background: meta.bg, color: meta.color }}>
                                <Activity size={12} /> {meta.label}
                            </span>
                            {status?.linkedNumber && (
                                <span className="text-sm font-medium inline-flex items-center gap-1.5"
                                    style={{ color: 'hsl(var(--foreground))' }}>
                                    <Phone size={14} /> {status.linkedNumber}
                                </span>
                            )}
                            {status?.lastSeen && (
                                <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    Last seen {formatTime(status.lastSeen)}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={fetchStatus} disabled={loading}
                                className="px-3 py-2 rounded-xl text-sm font-medium glass-inner inline-flex items-center gap-1.5 disabled:opacity-50"
                                style={{ color: 'hsl(var(--foreground))' }}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </button>
                            {status?.status === 'connected' ? (
                                <button onClick={() => setConfirmDisconnect(true)}
                                    className="px-3 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-1.5"
                                    style={{ background: 'rgba(239,68,68,0.12)', color: 'hsl(0,72%,55%)' }}>
                                    <Power size={14} /> Disconnect
                                </button>
                            ) : (
                                <button onClick={openQrModal}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-white inline-flex items-center gap-1.5"
                                    style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 40%), hsl(170, 70%, 38%))' }}>
                                    <QrCode size={14} /> Link WhatsApp
                                </button>
                            )}
                        </div>
                    </div>

                    {!status?.configured && (
                        <div className="mt-4 p-4 rounded-2xl flex items-start gap-3"
                            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)' }}>
                            <AlertTriangle size={18} style={{ color: 'hsl(38, 92%, 50%)' }} className="shrink-0 mt-0.5" />
                            <div className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>
                                <strong>Gateway not configured.</strong> Add <code>EVOLUTION_API_URL</code>, <code>EVOLUTION_API_KEY</code>, and <code>EVOLUTION_INSTANCE_NAME</code> in the backend secrets, then redeploy. See the deployment guide.
                            </div>
                        </div>
                    )}

                    {status?.lastError && (
                        <div className="mt-4 p-4 rounded-2xl text-xs"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'hsl(0,72%,55%)' }}>
                            <strong>Last error:</strong> {status.lastError}
                        </div>
                    )}
                </div>

                {/* Disclaimer */}
                <div className="glass-panel rounded-3xl p-5 mb-6 flex items-start gap-3">
                    <ShieldAlert size={20} style={{ color: 'hsl(38, 92%, 50%)' }} className="shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <strong style={{ color: 'hsl(var(--foreground))' }}>Heads up:</strong> This automates a personal WhatsApp account. Use a <strong>dedicated business number</strong> to avoid risking your personal account. Messages are sent with a random 8–25s delay and capped at 60/hour to mitigate ban risk.
                    </div>
                </div>

                {/* Recent activity */}
                <div className="glass-panel-strong rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2"
                            style={{ color: 'hsl(var(--muted-foreground))' }}>
                            <Inbox size={14} /> Recent Activity
                        </h2>
                    </div>

                    {queue.length === 0 ? (
                        <div className="text-center py-12 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            No messages yet. New orders will appear here once WhatsApp is linked.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {queue.map(item => {
                                const qm = QUEUE_STATUS_META[item.status] || QUEUE_STATUS_META.queued;
                                const Icon = qm.icon;
                                return (
                                    <div key={item._id} className="glass-inner rounded-2xl p-3 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: `${qm.color}1A`, color: qm.color }}>
                                            <Icon size={16} className={item.status === 'sending' ? 'animate-spin' : ''} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                                    #{item.orderId}
                                                </span>
                                                <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                    {item.phone}
                                                </span>
                                            </div>
                                            <div className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                {formatTime(item.repliedAt || item.sentAt || item.updatedAt)}
                                                {item.attempts > 0 && ` · ${item.attempts} attempt${item.attempts > 1 ? 's' : ''}`}
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                                            style={{ background: `${qm.color}1A`, color: qm.color }}>
                                            {qm.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* QR Modal */}
            {showQrModal && createPortal(
                <AnimatePresence>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
                        onClick={() => setShowQrModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-panel-strong rounded-3xl p-6 max-w-md w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-extrabold" style={{ color: 'hsl(var(--foreground))' }}>
                                    Link WhatsApp
                                </h3>
                                <button onClick={() => setShowQrModal(false)}
                                    className="p-1.5 rounded-lg glass-inner"><X size={16} /></button>
                            </div>

                            <ol className="text-xs mb-4 space-y-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <li>1. Open <strong>WhatsApp</strong> on your phone</li>
                                <li>2. Tap <strong>Settings</strong> → <strong>Linked Devices</strong></li>
                                <li>3. Tap <strong>Link a Device</strong></li>
                                <li>4. Scan the QR code below</li>
                            </ol>

                            <div className="aspect-square rounded-2xl glass-inner flex items-center justify-center overflow-hidden p-4">
                                {qrLoading && !qrBase64 ? (
                                    <Loader2 size={32} className="animate-spin" style={{ color: 'hsl(150,70%,40%)' }} />
                                ) : qrError ? (
                                    <div className="text-center text-xs px-4" style={{ color: 'hsl(0,72%,55%)' }}>
                                        {qrError}
                                    </div>
                                ) : qrBase64 ? (
                                    <img src={qrBase64} alt="WhatsApp QR" className="w-full h-full object-contain" />
                                ) : status?.status === 'connected' ? (
                                    <div className="text-center" style={{ color: 'hsl(150,70%,40%)' }}>
                                        <CheckCircle2 size={48} className="mx-auto mb-2" />
                                        <div className="text-sm font-bold">Connected!</div>
                                    </div>
                                ) : (
                                    <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Waiting for QR…</div>
                                )}
                            </div>

                            <button onClick={requestQr} disabled={qrLoading}
                                className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium glass-inner inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                                style={{ color: 'hsl(var(--foreground))' }}>
                                <RefreshCw size={14} className={qrLoading ? 'animate-spin' : ''} /> Refresh QR
                            </button>

                            <p className="text-[10px] text-center mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                QR refreshes automatically every 25s. Keep this window open until you see "Connected".
                            </p>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Disconnect confirm */}
            {confirmDisconnect && createPortal(
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
                    onClick={() => setConfirmDisconnect(false)}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className="glass-panel-strong rounded-3xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-extrabold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                            Disconnect WhatsApp?
                        </h3>
                        <p className="text-xs mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            New orders will stop sending WhatsApp confirmation polls until you re-link.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmDisconnect(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium glass-inner"
                                style={{ color: 'hsl(var(--foreground))' }}>Cancel</button>
                            <button onClick={handleDisconnect}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                                style={{ background: 'hsl(0,72%,55%)' }}>Disconnect</button>
                        </div>
                    </motion.div>
                </motion.div>,
                document.body
            )}
        </GlassBackground>
    );
};

export default WhatsAppVerificationPanel;
