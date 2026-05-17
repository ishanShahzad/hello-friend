import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import PhoneField, { isValidPhone } from '../common/PhoneField';
import { getAuthToken } from '../../utils/cookieHelper';

const API_URL = import.meta.env.VITE_API_URL;

const maskNumber = (num) => {
  if (!num) return 'Not linked';
  const s = String(num);
  if (s.length <= 5) return s;
  return `${s.slice(0, 3)}${'*'.repeat(Math.max(3, s.length - 7))}${s.slice(-4)}`;
};

const UserWhatsAppSettings = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [number, setNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef([]);
  const cooldownRef = useRef(null);

  const headers = { Authorization: `Bearer ${getAuthToken()}` };

  useEffect(() => {
    fetchStatus();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}api/user-whatsapp/status`, { headers });
      setStatus(data);
      setNumber(data.whatsappNumber || '');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to load WhatsApp status');
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    if (!number || !isValidPhone(number)) {
      toast.error('Enter a valid WhatsApp number with country code');
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API_URL}api/user-whatsapp/send-otp`, { whatsappNumber: number }, { headers });
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']);
      startCooldown();
      toast.success('Verification code sent on WhatsApp');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Could not send verification code');
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== 6) {
      toast.error('Enter the 6-digit verification code');
      return;
    }
    setVerifying(true);
    try {
      const { data } = await axios.post(`${API_URL}api/user-whatsapp/verify-otp`, { whatsappNumber: number, otp: otpStr }, { headers });
      toast.success(data.msg || 'WhatsApp connected');
      setOtpSent(false);
      setOtp(['', '', '', '', '', '']);
      await fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Invalid verification code');
    } finally {
      setVerifying(false);
    }
  };

  const unlink = async () => {
    if (!window.confirm('Unlink this WhatsApp number from your buyer account?')) return;
    setUnlinking(true);
    try {
      await axios.post(`${API_URL}api/user-whatsapp/unlink`, {}, { headers });
      toast.success('WhatsApp number unlinked');
      setOtpSent(false);
      setOtp(['', '', '', '', '', '']);
      await fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to unlink WhatsApp');
    } finally {
      setUnlinking(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const copyAiNumber = async () => {
    if (!status?.aiWhatsAppNumber) return;
    await navigator.clipboard.writeText(status.aiWhatsAppNumber);
    toast.success('AI WhatsApp number copied');
  };

  const aiLink = status?.aiWhatsAppNumber
    ? `https://wa.me/${String(status.aiWhatsAppNumber).replace(/\D/g, '')}`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: 'hsl(150, 60%, 45%)' }} />
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading WhatsApp settings...</p>
        </div>
      </div>
    );
  }

  const verified = !!status?.verified;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 42%), hsl(200, 70%, 48%))' }}>
          <MessageCircle size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>WhatsApp AI</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Connect your number to shop with Rozare AI on WhatsApp</p>
        </div>
      </div>

      <div className="glass-panel-strong rounded-3xl p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl glass-inner mb-5">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Linked Number</p>
            <p className="text-lg font-semibold font-mono" style={{ color: 'hsl(var(--foreground))' }}>{maskNumber(status?.whatsappNumber)}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold w-fit"
            style={verified ? { background: 'rgba(16, 185, 129, 0.15)', color: 'hsl(150, 60%, 38%)' } : { background: 'rgba(245, 158, 11, 0.15)', color: 'hsl(38, 85%, 40%)' }}>
            {verified ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {verified ? 'Verified' : 'Not verified'}
          </span>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <PhoneField value={number} onChange={(v) => { setNumber(v || ''); setOtpSent(false); }} placeholder="WhatsApp number with country code" />
          <button onClick={sendOtp} disabled={sending || cooldown > 0 || !isValidPhone(number)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 42%), hsl(200, 70%, 48%))' }}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : cooldown > 0 ? <RefreshCw size={14} /> : <Send size={14} />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : verified ? 'Change Number' : 'Send Code'}
          </button>
        </div>

        <AnimatePresence>
          {otpSent && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-5 p-4 rounded-2xl glass-inner">
                <p className="text-sm font-medium mb-3" style={{ color: 'hsl(var(--foreground))' }}>Enter the 6-digit code sent to your WhatsApp</p>
                <div className="flex justify-center gap-2 sm:gap-3 mb-4" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={(el) => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
                      value={digit} onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-xl glass-input"
                      style={{ color: 'hsl(var(--foreground))' }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={verifyOtp} disabled={verifying || otp.join('').length !== 6}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 42%), hsl(200, 70%, 48%))' }}>
                    {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Verify
                  </button>
                  <button onClick={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']); }} className="px-4 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ borderColor: 'var(--glass-border)', color: 'hsl(var(--muted-foreground))' }}>Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {verified && (
          <button onClick={unlink} disabled={unlinking} className="mt-4 px-4 py-2.5 rounded-xl text-sm font-medium border flex items-center gap-2"
            style={{ borderColor: 'rgba(239, 68, 68, 0.25)', color: 'hsl(0, 72%, 52%)' }}>
            {unlinking ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Unlink WhatsApp
          </button>
        )}
      </div>

      <div className="glass-panel-strong rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck size={18} style={{ color: 'hsl(200, 70%, 48%)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>Buyer AI Line</h2>
        </div>
        <div className="p-4 rounded-2xl glass-inner flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Rozare AI WhatsApp</p>
            <p className="font-mono font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{status?.aiWhatsAppNumber || 'Temporarily unavailable'}</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {status?.instanceConnected ? 'Connected and ready for verified buyers.' : 'The AI WhatsApp line is currently offline. Web chat still works.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyAiNumber} disabled={!status?.aiWhatsAppNumber} className="p-2.5 rounded-xl border disabled:opacity-50"
              style={{ borderColor: 'var(--glass-border)', color: 'hsl(var(--foreground))' }} title="Copy number">
              <Copy size={16} />
            </button>
            {aiLink && (
              <a href={aiLink} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 42%), hsl(200, 70%, 48%))' }}>
                Open WhatsApp <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserWhatsAppSettings;
