import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Check, Zap, Shield, Bot, Clock, AlertTriangle,
    CreditCard, ArrowRight, Sparkles, X, Lock, Store, Package
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';

const SellerSubscription = () => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        fetchSubscription();
        if (searchParams.get('success') === 'true') {
            toast.success('🎉 Subscription activated! Your store is now live.');
        }
        if (searchParams.get('cancelled') === 'true') {
            toast.info('Checkout was cancelled. You can subscribe anytime.');
        }
    }, []);

    const fetchSubscription = async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/subscription/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubscription(res.data.subscription);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        setCheckoutLoading(true);
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}api/subscription/create-checkout`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.location.href = res.data.url;
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to create checkout');
            setCheckoutLoading(false);
        }
    };

    const handleCancel = async () => {
        setCancelLoading(true);
        try {
            const token = localStorage.getItem('jwtToken');
            await axios.post(`${import.meta.env.VITE_API_URL}api/subscription/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Subscription will be cancelled at the end of the current period.');
            setShowCancelConfirm(false);
            fetchSubscription();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to cancel subscription');
        } finally {
            setCancelLoading(false);
        }
    };

    const getStatusBadge = () => {
        if (!subscription) return null;
        const map = {
            trial: { label: 'Free Trial', color: 'hsl(220, 70%, 55%)', bg: 'rgba(99,102,241,0.12)', icon: <Clock size={12} /> },
            free_period: { label: '90-Day Free', color: 'hsl(150, 60%, 45%)', bg: 'rgba(16,185,129,0.12)', icon: <Sparkles size={12} /> },
            active: { label: 'Active', color: 'hsl(150, 60%, 45%)', bg: 'rgba(16,185,129,0.12)', icon: <Check size={12} /> },
            past_due: { label: 'Past Due', color: 'hsl(30, 90%, 50%)', bg: 'rgba(249,115,22,0.12)', icon: <AlertTriangle size={12} /> },
            blocked: { label: 'Blocked', color: 'hsl(0, 72%, 55%)', bg: 'rgba(239,68,68,0.12)', icon: <Lock size={12} /> },
            cancelled: { label: 'Cancelled', color: 'hsl(var(--muted-foreground))', bg: 'rgba(0,0,0,0.06)', icon: <X size={12} /> },
        };
        const s = map[subscription.status] || map.trial;
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: s.bg, color: s.color }}>
                {s.icon} {s.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'hsl(var(--primary))', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    const isBlocked = subscription?.status === 'blocked';
    const isTrial = subscription?.status === 'trial';
    const isSubscribed = ['active', 'free_period'].includes(subscription?.status);
    const showSubscribeButton = !isSubscribed;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 max-w-4xl mx-auto">

            {/* Blocked Banner */}
            {isBlocked && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-5 rounded-2xl border"
                    style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                            <Lock size={20} style={{ color: 'hsl(0, 72%, 55%)' }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'hsl(0, 72%, 55%)' }}>Store Temporarily Blocked</h3>
                            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {subscription?.blockedReason || 'Your trial has expired. Subscribe to reactivate your store, products, and subdomain.'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: 'hsl(0, 72%, 55%)' }}>
                                    <Store size={11} /> Store hidden
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: 'hsl(0, 72%, 55%)' }}>
                                    <Package size={11} /> Products hidden
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Subscription</h1>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Manage your seller plan</p>
                </div>
                {getStatusBadge()}
            </div>

            {/* Current Plan Card */}
            <div className="glass-panel-strong p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: isSubscribed ? 'linear-gradient(135deg, hsl(150, 60%, 45%), hsl(170, 50%, 40%))' : 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(250, 60%, 55%))' }}>
                            <Crown size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {isSubscribed ? 'Starter Plan' : isTrial ? 'Free Trial' : 'No Active Plan'}
                            </h2>
                            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {isSubscribed
                                    ? subscription?.status === 'free_period'
                                        ? `Free until ${new Date(subscription.freePeriodEndDate).toLocaleDateString()}, then $5/mo`
                                        : '$5/month • Cancel anytime'
                                    : isTrial
                                        ? `${subscription?.trialDaysRemaining} day${subscription?.trialDaysRemaining !== 1 ? 's' : ''} remaining`
                                        : 'Subscribe to activate your store'
                                }
                            </p>
                        </div>
                    </div>
                    {isSubscribed && !subscription?.cancelledAt && (
                        <button onClick={() => setShowCancelConfirm(true)}
                            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                            style={{ color: 'hsl(0, 72%, 55%)', background: 'rgba(239, 68, 68, 0.08)' }}>
                            Cancel
                        </button>
                    )}
                </div>

                {/* AI Limit Info */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)' }}>
                    <Bot size={16} style={{ color: 'hsl(220, 70%, 55%)' }} />
                    <div className="flex-1">
                        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>AI Messages</p>
                        <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            {subscription?.aiMessageLimit || 25} messages/day
                            {isSubscribed && <span style={{ color: 'hsl(150, 60%, 45%)' }}> (4x boost!)</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Pricing Card */}
            {showSubscribeButton && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel-strong p-6 mb-6 border-2"
                    style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}
                >
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                            style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'hsl(150, 60%, 45%)' }}>
                            <Sparkles size={12} /> 90 DAYS FREE
                        </div>
                        <h3 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                            <span style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through', fontSize: '1rem' }}>$5/mo</span>
                            {' '}$0<span className="text-sm font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>/first 90 days</span>
                        </h3>
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Then $5/month • Cancel anytime
                        </p>
                    </div>

                    <div className="space-y-3 mb-6">
                        {[
                            { icon: <Store size={14} />, text: 'Keep your store & products visible to all customers' },
                            { icon: <Bot size={14} />, text: '100 AI messages/day (4x more than free)' },
                            { icon: <Shield size={14} />, text: 'Custom subdomain stays active' },
                            { icon: <CreditCard size={14} />, text: 'Priority support & new features early access' },
                            { icon: <Zap size={14} />, text: 'Advanced analytics & growth insights' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'hsl(150, 60%, 45%)' }}>
                                    {f.icon}
                                </div>
                                <span className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>{f.text}</span>
                            </div>
                        ))}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubscribe}
                        disabled={checkoutLoading}
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(250, 60%, 55%))' }}
                    >
                        {checkoutLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <CreditCard size={16} />
                                Subscribe Now — 90 Days Free
                                <ArrowRight size={16} />
                            </>
                        )}
                    </motion.button>

                    <p className="text-center text-[10px] mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Secure checkout powered by Stripe. Cancel anytime with one click.
                    </p>
                </motion.div>
            )}

            {/* Timeline */}
            <div className="glass-panel-strong p-6">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>How it works</h3>
                <div className="space-y-4">
                    {[
                        { step: '1', title: 'Free Trial', desc: '15 days to set up your store, add products, and start selling', active: isTrial },
                        { step: '2', title: 'Subscribe', desc: 'Choose the Starter plan — $0 for the first 90 days', active: false },
                        { step: '3', title: 'Free Period', desc: '90 days of full access at no cost to grow your business', active: subscription?.status === 'free_period' },
                        { step: '4', title: 'Monthly Billing', desc: 'Only $5/month after free period. Cancel anytime.', active: subscription?.status === 'active' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.active ? 'text-white' : ''}`}
                                style={{
                                    background: s.active ? 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(250, 60%, 55%))' : 'rgba(0,0,0,0.06)',
                                    color: s.active ? 'white' : 'hsl(var(--muted-foreground))',
                                }}>
                                {s.step}
                            </div>
                            <div>
                                <p className="text-xs font-bold" style={{ color: s.active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>{s.title}</p>
                                <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cancel Confirm Modal */}
            <AnimatePresence>
                {showCancelConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCancelConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-panel-strong p-6 max-w-sm w-full"
                        >
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: 'rgba(239, 68, 68, 0.12)' }}>
                                    <AlertTriangle size={22} style={{ color: 'hsl(0, 72%, 55%)' }} />
                                </div>
                                <h3 className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>Cancel Subscription?</h3>
                                <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    Your store and products will be hidden from customers after the current period ends. You can re-subscribe anytime.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowCancelConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold glass-inner"
                                    style={{ color: 'hsl(var(--foreground))' }}>
                                    Keep Plan
                                </button>
                                <button onClick={handleCancel} disabled={cancelLoading}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-60"
                                    style={{ background: 'hsl(0, 72%, 55%)' }}>
                                    {cancelLoading ? 'Cancelling...' : 'Cancel Plan'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default SellerSubscription;
