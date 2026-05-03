import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle, Bell, BellOff, Phone, CheckCircle2,
    ShoppingBag, CreditCard, Gift, Store, Shield,
    AlertTriangle, Loader2, Send, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import PhoneField, { isValidPhone } from '../common/PhoneField';

const API_URL = import.meta.env.VITE_API_URL;

const SellerWhatsAppSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [whatsappVerified, setWhatsappVerified] = useState(false);
    const [prefs, setPrefs] = useState({
        enabled: true,
        newOrders: true,
        orderUpdates: true,
        subscriptionAlerts: true,
        bonusAlerts: true,
        storeAlerts: true,
    });

    // OTP flow state
    const [showChangeNumber, setShowChangeNumber] = useState(false);
    const [newNumber, setNewNumber] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const otpRefs = useRef([]);
    const cooldownRef = useRef(null);

    const token = localStorage.getItem('jwtToken');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchPrefs();
        return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
    }, []);

    const fetchPrefs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}api/seller-whatsapp/prefs`, { headers });
            setWhatsappNumber(res.data.whatsappNumber || '');
            setWhatsappVerified(res.data.whatsappVerified || false);
            if (res.data.prefs) setPrefs(res.data.prefs);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load WhatsApp settings');
        } finally {
            setLoading(false);
        }
    };

    const savePrefs = async (updatedPrefs) => {
        setSaving(true);
        try {
            await axios.put(`${API_URL}api/seller-whatsapp/prefs`, updatedPrefs, { headers });
            toast.success('WhatsApp preferences saved');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (key) => {
        if (!whatsappNumber || !whatsappVerified) {
            toast.error('Please verify your WhatsApp number before changing preferences');
            return;
        }
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        savePrefs(updated);
    };

    const handleMasterToggle = () => {
        if (!whatsappNumber || !whatsappVerified) {
            toast.error('Please verify your WhatsApp number to enable notifications');
            return;
        }
        const updated = { ...prefs, enabled: !prefs.enabled };
        setPrefs(updated);
        savePrefs(updated);
    };

    // Improved mask: show first 3 chars + last 4, dots in between.
    // E.g. +923028588506 → +92•••••8506
    const maskNumber = (num) => {
        if (!num) return 'Not set';
        const s = String(num);
        if (s.length <= 4) return s;
        const prefix = s.length > 7 ? s.slice(0, 3) : s.slice(0, 1);
        const last4 = s.slice(-4);
        const middle = Math.max(3, s.length - prefix.length - 4);
        return `${prefix}${'•'.repeat(middle)}${last4}`;
    };

    // OTP Flow
    const startCooldown = () => {
        setCooldown(60);
        cooldownRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async () => {
        const numberToVerify = showChangeNumber ? newNumber : whatsappNumber;
        if (!numberToVerify || !isValidPhone(numberToVerify)) {
            toast.error('Please enter a valid WhatsApp number');
            return;
        }
        setSendingOtp(true);
        try {
            await axios.post(`${API_URL}api/seller-whatsapp/send-otp`, { whatsappNumber: numberToVerify }, { headers });
            setOtpSent(true);
            setOtp(['', '', '', '', '', '']);
            startCooldown();
            toast.success('OTP sent to your WhatsApp');
        } catch (err) {
            const status = err.response?.status;
            if (status === 429) {
                toast.error(err.response?.data?.msg || 'Too many attempts. Please try again in an hour.');
            } else if (status === 503) {
                toast.error('WhatsApp verification is temporarily unavailable. Please try again later.');
            } else {
                toast.error(err.response?.data?.msg || 'Failed to send OTP');
            }
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        const otpStr = otp.join('');
        if (otpStr.length !== 6) { toast.error('Please enter the full 6-digit OTP'); return; }
        const numberToVerify = showChangeNumber ? newNumber : whatsappNumber;
        setVerifyingOtp(true);
        try {
            await axios.post(`${API_URL}api/seller-whatsapp/verify-otp`, { whatsappNumber: numberToVerify, otp: otpStr }, { headers });
            toast.success('WhatsApp number verified successfully!');
            setWhatsappNumber(numberToVerify);
            setWhatsappVerified(true);
            setOtpSent(false);
            setShowChangeNumber(false);
            setNewNumber('');
            setOtp(['', '', '', '', '', '']);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Invalid OTP. Please try again.');
        } finally {
            setVerifyingOtp(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    const cancelOtpFlow = () => {
        setOtpSent(false);
        setShowChangeNumber(false);
        setNewNumber('');
        setOtp(['', '', '', '', '', '']);
        setCooldown(0);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="animate-spin" style={{ color: 'hsl(150, 60%, 45%)' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading WhatsApp settings...</p>
                </motion.div>
            </div>
        );
    }

    const notificationCategories = [
        { key: 'newOrders', label: 'New Orders', description: 'Get notified when a customer places an order', icon: <ShoppingBag size={18} /> },
        { key: 'orderUpdates', label: 'Order Updates', description: 'Buyer confirmations and cancellations', icon: <RefreshCw size={18} /> },
        { key: 'subscriptionAlerts', label: 'Subscription Alerts', description: 'Plan changes, renewals, and payment updates', icon: <CreditCard size={18} /> },
        { key: 'bonusAlerts', label: 'Bonus Alerts', description: 'Bonus feature expiry warnings', icon: <Gift size={18} /> },
        { key: 'storeAlerts', label: 'Store Alerts', description: 'Verification status and store updates', icon: <Store size={18} /> },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto"
        >
            {/* Page Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, hsl(142, 70%, 45%), hsl(160, 60%, 40%))' }}>
                    <MessageCircle size={22} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>WhatsApp Notifications</h1>
                    <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Manage your WhatsApp number and notification preferences</p>
                </div>
            </div>

            {/* Section 1: WhatsApp Number & Verification */}
            <div className="glass-panel-strong rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-5">
                    <Phone size={18} style={{ color: 'hsl(142, 70%, 45%)' }} />
                    <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>WhatsApp Number</h2>
                </div>

                {/* Current number display */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl glass-inner mb-4">
                    <div className="flex-1">
                        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Current Number</p>
                        <p className="text-lg font-semibold font-mono" style={{ color: 'hsl(var(--foreground))' }}>
                            {whatsappNumber ? maskNumber(whatsappNumber) : 'Not configured'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {whatsappVerified ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'hsl(150, 60%, 40%)' }}>
                                <CheckCircle2 size={14} /> Verified
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'hsl(45, 80%, 40%)' }}>
                                <AlertTriangle size={14} /> Not Verified
                            </span>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                {!showChangeNumber && !otpSent && (
                    <div className="flex flex-wrap gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowChangeNumber(true)}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
                            style={{ borderColor: 'var(--glass-border)', color: 'hsl(var(--foreground))' }}
                        >
                            {whatsappNumber ? 'Change Number' : 'Add Number'}
                        </motion.button>
                        {whatsappNumber && !whatsappVerified && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSendOtp}
                                disabled={sendingOtp}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2"
                                style={{ background: 'linear-gradient(135deg, hsl(142, 70%, 45%), hsl(160, 60%, 40%))' }}
                            >
                                {sendingOtp ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Verify Number
                            </motion.button>
                        )}
                    </div>
                )}

                {/* Change Number Input */}
                <AnimatePresence>
                    {showChangeNumber && !otpSent && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 p-4 rounded-2xl glass-inner space-y-4">
                                <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                    Enter your new WhatsApp number:
                                </p>
                                <PhoneField
                                    value={newNumber}
                                    onChange={setNewNumber}
                                    placeholder="Enter WhatsApp number"
                                />
                                <div className="flex gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp || !isValidPhone(newNumber)}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg, hsl(142, 70%, 45%), hsl(160, 60%, 40%))' }}
                                    >
                                        {sendingOtp ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        Send OTP
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={cancelOtpFlow}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium border"
                                        style={{ borderColor: 'var(--glass-border)', color: 'hsl(var(--muted-foreground))' }}
                                    >
                                        Cancel
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* OTP Input */}
                <AnimatePresence>
                    {otpSent && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 p-4 rounded-2xl glass-inner space-y-4">
                                <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                    Enter the 6-digit OTP sent to your WhatsApp:
                                </p>
                                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={el => otpRefs.current[i] = el}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-xl glass-input"
                                            style={{ color: 'hsl(var(--foreground))' }}
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleVerifyOtp}
                                        disabled={verifyingOtp || otp.join('').length !== 6}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg, hsl(142, 70%, 45%), hsl(160, 60%, 40%))' }}
                                    >
                                        {verifyingOtp ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        Verify
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSendOtp}
                                        disabled={cooldown > 0 || sendingOtp}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium border flex items-center gap-2 disabled:opacity-50"
                                        style={{ borderColor: 'var(--glass-border)', color: 'hsl(var(--muted-foreground))' }}
                                    >
                                        <RefreshCw size={14} />
                                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={cancelOtpFlow}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium"
                                        style={{ color: 'hsl(var(--muted-foreground))' }}
                                    >
                                        Cancel
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Section 2: Notification Preferences */}
            <div className="glass-panel-strong rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-5">
                    <Bell size={18} style={{ color: 'hsl(142, 70%, 45%)' }} />
                    <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>Notification Preferences</h2>
                </div>

                {/* Verify-first banner — shown when notifications cannot actually be delivered yet */}
                {(!whatsappNumber || !whatsappVerified) && (
                    <div className="mb-4 p-3.5 rounded-xl flex items-start gap-3"
                        style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'hsl(38, 92%, 50%)' }} />
                        <p className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>
                            <span className="font-semibold">Verify your WhatsApp number first.</span>
                            <span style={{ color: 'hsl(var(--muted-foreground))' }}> Toggles are disabled until your number is verified via OTP above.</span>
                        </p>
                    </div>
                )}

                {/* Master Toggle — visually dimmed when not verified */}
                <div
                    className="flex items-center justify-between p-4 rounded-2xl mb-4"
                    style={{
                        background: prefs.enabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(100, 100, 100, 0.08)',
                        border: `1px solid ${prefs.enabled ? 'rgba(16, 185, 129, 0.2)' : 'var(--glass-border)'}`,
                        opacity: (!whatsappNumber || !whatsappVerified) ? 0.5 : 1,
                    }}>
                    <div className="flex items-center gap-3">
                        {prefs.enabled ? <Bell size={20} style={{ color: 'hsl(150, 60%, 45%)' }} /> : <BellOff size={20} style={{ color: 'hsl(var(--muted-foreground))' }} />}
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>WhatsApp Notifications</p>
                            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {prefs.enabled ? 'You will receive WhatsApp notifications' : 'All WhatsApp notifications are paused'}
                            </p>
                        </div>
                    </div>
                    <ToggleSwitch value={prefs.enabled} onChange={handleMasterToggle} />
                </div>

                {/* Category Toggles */}
                <AnimatePresence>
                    {prefs.enabled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                            style={{ opacity: (!whatsappNumber || !whatsappVerified) ? 0.5 : 1 }}
                        >
                            <div className="space-y-2">
                                {notificationCategories.map((cat) => (
                                    <div key={cat.key} className="flex items-center justify-between p-3.5 rounded-xl transition-all hover:bg-white/5 glass-inner">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'hsl(150, 60%, 45%)' }}>
                                                {cat.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{cat.label}</p>
                                                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{cat.description}</p>
                                            </div>
                                        </div>
                                        <ToggleSwitch value={prefs[cat.key]} onChange={() => handleToggle(cat.key)} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Critical alerts note */}
                <div className="mt-4 p-3.5 rounded-xl flex items-start gap-3"
                    style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                    <Shield size={16} className="shrink-0 mt-0.5" style={{ color: 'hsl(45, 80%, 40%)' }} />
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <span className="font-semibold" style={{ color: 'hsl(45, 80%, 40%)' }}>Note:</span> Critical alerts (account blocks, trial expiry, payment failures) are always sent and cannot be disabled.
                    </p>
                </div>
            </div>

            {/* Saving indicator */}
            <AnimatePresence>
                {saving && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed bottom-6 right-6 px-4 py-2.5 rounded-xl glass-panel-strong flex items-center gap-2 shadow-lg"
                    >
                        <Loader2 size={14} className="animate-spin" style={{ color: 'hsl(150, 60%, 45%)' }} />
                        <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>Saving...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Toggle Switch Component
const ToggleSwitch = ({ value, onChange }) => {
    return (
        <button
            type="button"
            onClick={onChange}
            className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none shrink-0"
            style={{ background: value ? 'hsl(150, 70%, 40%)' : 'hsl(var(--muted))' }}
        >
            <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="inline-block w-5 h-5 rounded-full bg-white shadow-sm"
                style={{ marginLeft: value ? '22px' : '2px' }}
            />
        </button>
    );
};

export default SellerWhatsAppSettings;
