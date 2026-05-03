import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
    MessageCircle, QrCode, Power, RefreshCw, X, AlertTriangle, CheckCircle2,
    Loader2, Phone, Clock, ShieldAlert, Activity, Inbox, Send, ThumbsUp, ThumbsDown,
    TrendingUp, BarChart3, Timer, RotateCcw,
} from 'lucide-react';
import PhoneField, { isValidPhone } from '../../common/PhoneField';


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
    failed_invalid_number: { label: 'Invalid Number', color: 'hsl(0,72%,55%)', icon: AlertTriangle },
    expired:   { label: 'Expired',    color: 'hsl(0,0%,55%)',     icon: Clock },
};

const formatTime = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return '—'; }
};

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
    <div className="glass-panel-strong rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}1A`, color }}>
                <Icon size={14} />
            </div>
        </div>
        <div className="text-2xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>{value ?? 0}</div>
        {sub && <div className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{sub}</div>}
    </div>
);

const Timeline = ({ data }) => {
    const max = Math.max(1, ...data.map(d => d.sent));
    return (
        <div className="flex items-end gap-2 h-32">
            {data.map((d, i) => {
                const sentH = (d.sent / max) * 100;
                const confirmedH = (d.confirmed / max) * 100;
                const declinedH = (d.declined / max) * 100;
                const dayLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full flex-1 flex items-end gap-0.5">
                            <div className="flex-1 rounded-t-md transition-all" style={{ height: `${sentH}%`, background: 'hsl(220,70%,55%)', minHeight: d.sent ? 4 : 0 }} title={`${d.sent} sent`} />
                            <div className="flex-1 rounded-t-md transition-all" style={{ height: `${confirmedH}%`, background: 'hsl(150,70%,40%)', minHeight: d.confirmed ? 4 : 0 }} title={`${d.confirmed} confirmed`} />
                            <div className="flex-1 rounded-t-md transition-all" style={{ height: `${declinedH}%`, background: 'hsl(0,72%,55%)', minHeight: d.declined ? 4 : 0 }} title={`${d.declined} declined`} />
                        </div>
                        <span className="text-[9px] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{dayLabel}</span>
                    </div>
                );
            })}
        </div>
    );
};

const WhatsAppVerificationPanel = () => {
    const [status, setStatus] = useState(null);
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrBase64, setQrBase64] = useState('');
    const [qrError, setQrError] = useState('');
    const [qrHint, setQrHint] = useState('');
    const [qrDiagnostic, setQrDiagnostic] = useState('');
    const [pairingCode, setPairingCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showPairingInput, setShowPairingInput] = useState(false);
    const [pairingLoading, setPairingLoading] = useState(false);
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resetMsg, setResetMsg] = useState('');
    const pollRef = useRef(null);

    const fetchStatus = useCallback(async () => {
        try {
            const [s, q, st] = await Promise.all([
                axios.get(`${API}api/whatsapp/status`, { headers: authHeaders() }),
                axios.get(`${API}api/whatsapp/queue`, { headers: authHeaders() }),
                axios.get(`${API}api/whatsapp/stats`, { headers: authHeaders() }).catch(() => ({ data: null })),
            ]);
            setStatus(s.data);
            if (s.data?.qrBase64) {
                setQrBase64(s.data.qrBase64);
                setQrError('');
            }
            setQrDiagnostic(s.data?.lastError || '');
            if (s.data?.status === 'connected') {
                setQrHint('');
                setQrDiagnostic('');
                setPairingCode('');
            }
            setQueue(q.data.items || []);
            if (st.data) setStats(st.data);
        } catch (err) {
            console.error('whatsapp panel fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const requestQr = useCallback(async () => {
        setQrLoading(true);
        setQrError('');
        try {
            const { data } = await axios.post(
                `${API}api/whatsapp/connect`,
                {},
                { headers: authHeaders(), timeout: 25000 }
            );
            setQrBase64(data.qrBase64 || '');
            setPairingCode(data.code || '');
            setQrDiagnostic(data.gatewayDiagnostic || '');
            setQrHint(data.fallback || data.msg ? (data.msg || 'Waiting for QR…') : '');
            if (data.recovered) {
                setResetMsg('The previous stuck link session was recreated automatically.');
            }
            if (data.alreadyLinked) {
                setQrError('');
                setQrHint('');
                setQrDiagnostic('');
                setPairingCode('');
            }
            await fetchStatus();
        } catch (err) {
            setQrHint('');
            setPairingCode('');
            const offline =
                err.code === 'ECONNABORTED' ||
                err.message === 'Network Error' ||
                err.response?.status === 503 ||
                err.response?.status === 502;
            setQrError(
                err.response?.data?.msg ||
                (offline
                    ? 'WhatsApp gateway is temporarily unavailable. Try again or reset the instance below.'
                    : 'Failed to fetch QR code')
            );
        } finally {
            setQrLoading(false);
        }
    }, [fetchStatus]);

    // Refresh QR every 25s while modal is open and not yet connected
    useEffect(() => {
        if (showQrModal && status?.status !== 'connected') {
            const id = setInterval(() => requestQr(), 25000);
            return () => clearInterval(id);
        }
    }, [showQrModal, status?.status, requestQr]);

    // Poll status every 5s while QR modal is open, every 30s otherwise
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        const interval = showQrModal ? 5000 : 30000;
        pollRef.current = setInterval(fetchStatus, interval);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [showQrModal, fetchStatus]);

    const requestPairingCode = async () => {
        if (!isValidPhone(phoneNumber)) {
            setQrError('Please enter a valid phone number (pick your country and type the number).');
            return;
        }
        // Backend expects digits only (e.g. 923001234567)
        const digitsOnly = String(phoneNumber).replace(/\D/g, '');

        setPairingLoading(true);
        setQrError('');
        try {
            const { data } = await axios.post(
                `${API}api/whatsapp/pairing-code`,
                { phoneNumber: digitsOnly },
                { headers: authHeaders(), timeout: 15000 }
            );
            
            if (data.code) {
                setPairingCode(data.code);
                setQrHint('Enter this code in WhatsApp when prompted');
                setShowPairingInput(false);
            } else {
                setQrHint(data.msg || 'Pairing code requested. Check status in a moment.');
            }
            
            await fetchStatus();
        } catch (err) {
            setQrError(err.response?.data?.msg || 'Failed to request pairing code');
        } finally {
            setPairingLoading(false);
        }
    };

    const openQrModal = async () => {
        setShowQrModal(true);
        setQrBase64(status?.qrBase64 || '');
        setQrError('');
        setQrHint(status?.status === 'connected' ? '' : 'Starting WhatsApp link session…');
        setQrDiagnostic(status?.lastError || '');
        setPairingCode('');
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

    const handleReset = async () => {
        setResetting(true);
        setResetMsg('');
        try {
            const { data } = await axios.post(
                `${API}api/whatsapp/reset`,
                {},
                { headers: authHeaders(), timeout: 30000 }
            );
            setQrBase64('');
            setPairingCode('');
            setQrError('');
            setQrHint('Instance reset. Click "Link WhatsApp" to scan a new QR.');
            setResetMsg(data?.msg || 'Instance reset.');
            setConfirmReset(false);
            setShowQrModal(false);
            await fetchStatus();
        } catch (err) {
            setResetMsg(err.response?.data?.msg || 'Failed to reset WhatsApp instance.');
        } finally {
            setResetting(false);
        }
    };

    // Show reset only when the link flow is stuck: status pending_qr/connecting/error
    // AND we currently have no usable QR or pairing code on screen.
    const isStuckLinking =
        ['pending_qr', 'connecting', 'error'].includes(status?.status) &&
        !qrBase64 &&
        !pairingCode &&
        !qrLoading &&
        status?.status !== 'connected';

    // Auto-close QR modal on connected
    useEffect(() => {
        if (showQrModal && status?.status === 'connected') {
            setTimeout(() => setShowQrModal(false), 1200);
        }
    }, [status?.status, showQrModal]);

    const meta = STATUS_META[status?.status] || STATUS_META.disconnected;

    return (
        <>
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
                            {isStuckLinking && (
                                <button onClick={() => { setResetMsg(''); setConfirmReset(true); }}
                                    className="px-3 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-1.5"
                                    style={{ background: 'rgba(245,158,11,0.14)', color: 'hsl(38,92%,45%)' }}
                                    title="Reset the WhatsApp instance — only when stuck waiting for QR">
                                    <RotateCcw size={14} /> Reset instance
                                </button>
                            )}
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

                    {resetMsg && !confirmReset && (
                        <div className="mt-4 p-4 rounded-2xl text-xs"
                            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: 'hsl(var(--foreground))' }}>
                            {resetMsg}
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

                {/* Analytics */}
                {stats && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2 mb-3 px-1"
                            style={{ color: 'hsl(var(--muted-foreground))' }}>
                            <BarChart3 size={14} /> Analytics
                        </h2>

                        {/* Top KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <StatCard icon={Send} label="Messages Sent" value={stats.sent} sub={`${stats.last24h} in last 24h`} color="hsl(220,70%,55%)" />
                            <StatCard icon={ThumbsUp} label="Confirmed" value={stats.confirmed} sub={`${stats.confirmationRate}% of replies`} color="hsl(150,70%,40%)" />
                            <StatCard icon={ThumbsDown} label="Declined" value={stats.declined} sub="Orders rejected by buyer" color="hsl(0,72%,55%)" />
                            <StatCard icon={TrendingUp} label="Response Rate" value={`${stats.responseRate}%`} sub={`${stats.last7d} sent this week`} color="hsl(38,92%,50%)" />
                        </div>

                        {/* Secondary KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <StatCard icon={Clock} label="In Queue" value={stats.queued} color="hsl(220,15%,55%)" />
                            <StatCard icon={AlertTriangle} label="Failed" value={stats.failed} color="hsl(0,72%,55%)" sub={stats.neverQueued > 0 ? `${stats.neverQueued} never queued` : undefined} />
                            <StatCard icon={Timer} label="Avg Reply Time" value={stats.avgResponseMinutes != null ? `${stats.avgResponseMinutes}m` : '—'} color="hsl(260,60%,60%)" />
                            <StatCard icon={MessageCircle} label="Total All Time" value={stats.total} color="hsl(180,60%,40%)" />
                        </div>

                        {/* 7-day timeline sparkline */}
                        {stats.timeline && stats.timeline.length > 0 && (
                            <div className="glass-panel-strong rounded-3xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Last 7 Days</h3>
                                    <div className="flex gap-3 text-[10px]">
                                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(220,70%,55%)' }} />Sent</span>
                                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(150,70%,40%)' }} />Confirmed</span>
                                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'hsl(0,72%,55%)' }} />Declined</span>
                                    </div>
                                </div>
                                <Timeline data={stats.timeline} />
                            </div>
                        )}
                    </div>
                )}

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
                                // Override display when order was confirmed on WA but then cancelled from email
                                let qm = QUEUE_STATUS_META[item.status] || QUEUE_STATUS_META.queued;
                                let overrideLabel = null;
                                if (item.status === 'voted_yes' && item.cancelledAfterConfirm) {
                                    qm = { label: 'Cancelled', color: 'hsl(0,72%,55%)', icon: X };
                                    overrideLabel = 'Confirmed → then cancelled from email';
                                } else if (item.status === 'voted_yes' && item.currentOrderStatus === 'cancelled') {
                                    qm = { label: 'Cancelled', color: 'hsl(0,72%,55%)', icon: X };
                                    overrideLabel = 'Confirmed → then cancelled';
                                }
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
                                            {overrideLabel && (
                                                <div className="text-[10px] mt-0.5 font-medium" style={{ color: 'hsl(0,72%,55%)' }}>
                                                    {overrideLabel}
                                                </div>
                                            )}
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
                                <li>4. {pairingCode ? 'Enter the pairing code below' : 'Scan the QR code below'}</li>
                            </ol>

                            <div className="aspect-square rounded-2xl glass-inner flex items-center justify-center overflow-hidden p-4">
                                {qrLoading && !qrBase64 && !pairingCode ? (
                                    <div className="text-center">
                                        <Loader2 size={32} className="animate-spin mx-auto mb-2" style={{ color: 'hsl(150,70%,40%)' }} />
                                        <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                            Starting WhatsApp connection...
                                        </div>
                                    </div>
                                ) : qrError ? (
                                    <div className="text-center text-xs px-4" style={{ color: 'hsl(0,72%,55%)' }}>
                                        {qrError}
                                    </div>
                                ) : pairingCode ? (
                                    <div className="text-center w-full">
                                        <div className="mb-3">
                                            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                Pairing Code
                                            </div>
                                            <div className="text-4xl font-extrabold tracking-[0.3em] py-4 px-6 rounded-xl glass-panel-strong" 
                                                style={{ color: 'hsl(150,70%,40%)', fontFamily: 'monospace' }}>
                                                {pairingCode}
                                            </div>
                                        </div>
                                        <div className="text-[10px] leading-relaxed px-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                            Enter this code in WhatsApp when prompted. The code expires in a few minutes.
                                        </div>
                                        {qrBase64 && (
                                            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                                                <div className="text-[10px] mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                    Or scan QR code:
                                                </div>
                                                <img src={qrBase64} alt="WhatsApp QR" className="w-48 h-48 mx-auto object-contain" />
                                            </div>
                                        )}
                                    </div>
                                ) : qrBase64 ? (
                                    <img src={qrBase64} alt="WhatsApp QR" className="w-full h-full object-contain" />
                                ) : status?.status === 'connected' ? (
                                    <div className="text-center" style={{ color: 'hsl(150,70%,40%)' }}>
                                        <CheckCircle2 size={48} className="mx-auto mb-2" />
                                        <div className="text-sm font-bold">Connected!</div>
                                    </div>
                                ) : (
                                    <div className="text-center px-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        <div className="text-xs">{qrHint || 'Waiting for QR or pairing code...'}</div>
                                        {qrDiagnostic && (
                                            <div className="mt-3 text-[10px] leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
                                                {qrDiagnostic}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button onClick={requestQr} disabled={qrLoading}
                                className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium glass-inner inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                                style={{ color: 'hsl(var(--foreground))' }}>
                                <RefreshCw size={14} className={qrLoading ? 'animate-spin' : ''} /> Refresh QR
                            </button>

                            {!showPairingInput && !pairingCode && status?.status !== 'connected' && (
                                <button
                                    onClick={() => setShowPairingInput(true)}
                                    className="w-full mt-2 py-2.5 rounded-xl text-sm font-medium glass-inner inline-flex items-center justify-center gap-1.5"
                                    style={{ color: 'hsl(var(--foreground))' }}
                                >
                                    <Phone size={14} /> Get Pairing Code Instead
                                </button>
                            )}

                            {showPairingInput && (
                                <div className="mt-4 p-4 rounded-2xl glass-inner">
                                    <div className="text-xs font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                                        Request Pairing Code
                                    </div>
                                    <div className="text-[10px] mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        Pick your country, then enter your WhatsApp number.
                                    </div>
                                    <PhoneField
                                        value={phoneNumber}
                                        onChange={(v) => setPhoneNumber(v || '')}
                                        placeholder="Phone number"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowPairingInput(false)}
                                            className="flex-1 py-2 rounded-lg text-xs font-medium glass-inner"
                                            style={{ color: 'hsl(var(--foreground))' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={requestPairingCode}
                                            disabled={pairingLoading || !phoneNumber}
                                            className="flex-1 py-2 rounded-lg text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 40%), hsl(170, 70%, 38%))' }}
                                        >
                                            {pairingLoading ? <Loader2 size={12} className="animate-spin" /> : <Phone size={12} />}
                                            {pairingLoading ? 'Requesting...' : 'Get Code'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <p className="text-[10px] text-center mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                QR refreshes automatically every 25s. Keep this window open until you see "Connected".
                            </p>

                            {!qrBase64 && !pairingCode && !qrLoading && status?.status !== 'connected' && (
                                <div className="mt-4 p-4 rounded-2xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'hsl(var(--foreground))' }}>
                                    <div className="font-bold mb-2">QR Code Not Generating?</div>
                                    <div className="text-[10px] leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        This usually means the Evolution API gateway on your Oracle Cloud VM cannot reach WhatsApp servers. Check:
                                        <ul className="list-disc ml-4 mt-1">
                                            <li>Oracle VM container logs (<code>docker compose logs -f evolution-api</code>) for "Connection Failure" or "error in validating connection"</li>
                                            <li>Oracle VCN security list and Ubuntu UFW allow inbound TCP 8080 and outbound to WhatsApp</li>
                                            <li>The VM has a public IP and <code>EVOLUTION_API_URL</code> on Heroku points to it</li>
                                            <li>Try clicking "Reset instance" below to recreate the session</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {isStuckLinking && (
                                <button
                                    onClick={() => { setResetMsg(''); setConfirmReset(true); }}
                                    className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5"
                                    style={{ background: 'rgba(245,158,11,0.14)', color: 'hsl(38,92%,45%)' }}
                                >
                                    <RotateCcw size={14} /> Reset stuck instance
                                </button>
                            )}
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

            {/* Reset instance confirm — only ever opened when stuck without a QR */}
            {confirmReset && createPortal(
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
                    onClick={() => !resetting && setConfirmReset(false)}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className="glass-panel-strong rounded-3xl p-6 max-w-sm w-full">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(245,158,11,0.14)', color: 'hsl(38,92%,45%)' }}>
                                <RotateCcw size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold" style={{ color: 'hsl(var(--foreground))' }}>
                                    Reset WhatsApp instance?
                                </h3>
                                <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    Use this only when the link flow is stuck without a QR.
                                </p>
                            </div>
                        </div>

                        <div className="text-xs mb-4 p-3 rounded-2xl"
                            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', color: 'hsl(var(--foreground))' }}>
                            This will <strong>log out, delete and recreate</strong> the gateway instance. No customer data is touched, but you'll need to scan a fresh QR. It's blocked while WhatsApp is currently linked.
                        </div>

                        {resetMsg && (
                            <div className="text-xs mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {resetMsg}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={() => setConfirmReset(false)}
                                disabled={resetting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium glass-inner disabled:opacity-50"
                                style={{ color: 'hsl(var(--foreground))' }}>Cancel</button>
                            <button onClick={handleReset}
                                disabled={resetting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                                style={{ background: 'hsl(38,92%,45%)' }}>
                                {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                {resetting ? 'Resetting…' : 'Reset instance'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>,
                document.body
            )}
        </>
    );
};

export default WhatsAppVerificationPanel;
