import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Check, Zap, Shield, Bot, Clock, AlertTriangle,
    CreditCard, ArrowRight, Sparkles, X, Lock, Store, Package,
    Users, Award, Star, MessageCircle, Gem
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';

const SellerSubscription = () => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(null); // 'starter' | 'elite' | null
    const [cancelLoading, setCancelLoading] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        fetchSubscription();
        if (searchParams.get('success') === 'true') {
            toast.success('Subscription activated! Your store is now live.');
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

    const handleSubscribe = async (plan = 'starter') => {
        setCheckoutLoading(plan);
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}api/subscription/create-checkout`, { plan }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.location.href = res.data.url;
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to create checkout');
            setCheckoutLoading(null);
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
            free_period: { label: subscription?.plan === 'elite' ? '45-Day Free' : '30-Day Free', color: 'hsl(150, 60%, 45%)', bg: 'rgba(16,185,129,0.12)', icon: <Sparkles size={12} /> },
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
    const isElite = subscription?.plan === 'elite';
    const showSubscribeButton = !isSubscribed;
    const bonusExpiredPermanently = subscription?.bonusFeaturesExpiredPermanently && !isElite;
    const hasGracePeriod = isBlocked && subscription?.bonusGraceDeadline && subscription?.bonusGraceDaysRemaining > 0 && !bonusExpiredPermanently;
    const bonusAboutToExpire = isSubscribed && subscription?.plan === 'starter' && subscription?.bonusFeaturesActive && subscription?.bonusExpiryDate && (() => {
        const daysLeft = Math.ceil((new Date(subscription.bonusExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 7 && daysLeft > 0;
    })();
    const bonusDaysUntilExpiry = subscription?.bonusExpiryDate ? Math.max(0, Math.ceil((new Date(subscription.bonusExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

    const starterFeatures = [
        'Store & products visible to all customers',
        '15 product listings',
        'Secure payment processing',
        'Custom subdomain for your store',
        '25 AI messages/day',
        'Order management & customer insights',
        'Rozare WhatsApp order confirmation automation',
    ];

    const bonusFeatures = [
        'Advanced analytics & growth insights',
        'Smart tag AI generator for products',
        'Featured product highlighting on the homepage',
        'Priority support & early access to new features',
        'Coupon & discount management system',
        'Bulk discount & promotional tools',
    ];

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

            {/* 3-Day Grace Period Banner — bonus features at risk */}
            {hasGracePeriod && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-5 rounded-2xl border"
                    style={{ background: 'rgba(249, 115, 22, 0.08)', borderColor: 'rgba(249, 115, 22, 0.25)' }}
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>
                            <Clock size={20} style={{ color: 'hsl(25, 90%, 50%)' }} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold" style={{ color: 'hsl(25, 90%, 45%)' }}>
                                {subscription.bonusGraceDaysRemaining} Day{subscription.bonusGraceDaysRemaining !== 1 ? 's' : ''} Left to Keep Bonus Features!
                            </h3>
                            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Re-subscribe now to keep your bonus features for the remaining time. After {subscription.bonusGraceDaysRemaining} day{subscription.bonusGraceDaysRemaining !== 1 ? 's' : ''}, bonus features will be <strong>permanently removed</strong> from the Starter plan.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSubscribe('starter')}
                                    disabled={checkoutLoading === 'starter'}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(250, 60%, 55%))' }}
                                >
                                    {checkoutLoading === 'starter' ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><CreditCard size={13} /> Re-subscribe Now</>
                                    )}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSubscribe('elite')}
                                    disabled={checkoutLoading === 'elite'}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(290, 50%, 50%))' }}
                                >
                                    {checkoutLoading === 'elite' ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><Gem size={13} /> Upgrade to Elite</>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Bonus Features About to Expire Banner (within 7 days) */}
            {bonusAboutToExpire && !isElite && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-5 rounded-2xl border"
                    style={{ background: 'rgba(249, 115, 22, 0.06)', borderColor: 'rgba(249, 115, 22, 0.2)' }}
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.12)' }}>
                            <AlertTriangle size={20} style={{ color: 'hsl(30, 90%, 50%)' }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'hsl(30, 85%, 45%)' }}>
                                Bonus Features Expiring in {bonusDaysUntilExpiry} Day{bonusDaysUntilExpiry !== 1 ? 's' : ''}
                            </h3>
                            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Your bonus features (analytics, smart tags, featured products, coupons, etc.) will expire on {new Date(subscription.bonusExpiryDate).toLocaleDateString()}. Upgrade to Rozare Elite to keep them permanently.
                            </p>
                            <button onClick={() => handleSubscribe('elite')} disabled={checkoutLoading === 'elite'}
                                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(290, 50%, 50%))' }}>
                                {checkoutLoading === 'elite' ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <><Gem size={13} /> Upgrade to Elite — Keep Bonus Forever</>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Bonus Features Expired Banner */}
            {bonusExpiredPermanently && isSubscribed && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-5 rounded-2xl border"
                    style={{ background: 'rgba(139, 92, 246, 0.06)', borderColor: 'rgba(139, 92, 246, 0.2)' }}
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                            <Award size={20} style={{ color: 'hsl(270, 60%, 55%)' }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'hsl(270, 60%, 55%)' }}>Bonus Features Expired</h3>
                            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Your 6-month bonus features have expired. Upgrade to Rozare Elite to get them permanently.
                            </p>
                            <button onClick={() => handleSubscribe('elite')} disabled={checkoutLoading === 'elite'}
                                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(290, 50%, 50%))' }}>
                                {checkoutLoading === 'elite' ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <><Gem size={13} /> Upgrade to Elite — 45 Days Free</>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                        {isElite ? 'Rozare Elite' : 'Rozare Starter'}
                    </h1>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Manage your seller plan</p>
                </div>
                {getStatusBadge()}
            </div>

            {/* Current Plan Card */}
            <div className="glass-panel-strong p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: isElite ? 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(290, 50%, 50%))' : isSubscribed ? 'linear-gradient(135deg, hsl(150, 60%, 45%), hsl(170, 50%, 40%))' : 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(250, 60%, 55%))' }}>
                            {isElite ? <Gem size={22} className="text-white" /> : <Crown size={22} className="text-white" />}
                        </div>
                         <div>
                            <h2 className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {isSubscribed ? (isElite ? 'Rozare Elite' : 'Rozare Starter') : isTrial ? 'Free Trial' : 'No Active Plan'}
                            </h2>
                            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {isSubscribed
                                    ? subscription?.status === 'free_period'
                                        ? `Free until ${new Date(subscription.freePeriodEndDate).toLocaleDateString()}, then ${isElite ? '$12.99' : '$5.99'}/mo`
                                        : `${isElite ? '$12.99' : '$5.99'}/month • Cancel anytime`
                                    : isTrial
                                        ? `${subscription?.trialDaysRemaining} day${subscription?.trialDaysRemaining !== 1 ? 's' : ''} remaining`
                                        : 'Subscribe to activate your store'
                                }
                            </p>
                            {isSubscribed && subscription?.bonusFeaturesActive && (
                                <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: bonusAboutToExpire ? 'hsl(30, 90%, 50%)' : 'hsl(270, 60%, 55%)' }}>
                                    <Award size={11} />
                                    {isElite
                                        ? 'Bonus features permanently included'
                                        : bonusAboutToExpire
                                            ? `Bonus features expire in ${bonusDaysUntilExpiry} day${bonusDaysUntilExpiry !== 1 ? 's' : ''}!`
                                            : subscription?.bonusExpiryDate
                                                ? `Bonus features active until ${new Date(subscription.bonusExpiryDate).toLocaleDateString()}`
                                                : 'Bonus features active'
                                    }
                                    {bonusAboutToExpire && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                            style={{ background: 'rgba(249, 115, 22, 0.15)', color: 'hsl(30, 90%, 50%)' }}>
                                            EXPIRING SOON
                                        </span>
                                    )}
                                </p>
                            )}
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

                {/* Trial Feature List */}
                {isTrial && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                            All features from every Rozare plan are available in your 15-day free trial
                        </p>

                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(150, 60%, 45%)' }}>Features from Starter</p>
                        <div className="space-y-1.5 mb-3">
                            {starterFeatures.map((f, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Check size={12} style={{ color: 'hsl(150, 60%, 45%)' }} />
                                    <span className="text-[11px]" style={{ color: 'hsl(var(--foreground))' }}>{f}</span>
                                </div>
                            ))}
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(270, 60%, 55%)' }}>Features from Elite</p>
                        <div className="space-y-1.5">
                            {bonusFeatures.map((f, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Check size={12} style={{ color: 'hsl(270, 60%, 55%)' }} />
                                    <span className="text-[11px]" style={{ color: 'hsl(var(--foreground))' }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Blocked — show what they lost */}
                {isBlocked && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                            <p className="text-xs font-semibold" style={{ color: 'hsl(0, 72%, 55%)' }}>
                                {subscription?.plan === 'free_trial' || subscription?.blockedReason?.includes('Trial')
                                    ? 'Your 15-day free trial has ended'
                                    : 'Your subscription has expired'}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Subscribe to get all these features back:
                            </p>
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(150, 60%, 45%)' }}>Features from Starter</p>
                        <div className="space-y-1.5 mb-3">
                            {starterFeatures.map((f, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <X size={12} style={{ color: 'hsl(0, 72%, 55%)' }} />
                                    <span className="text-[11px] line-through" style={{ color: 'hsl(var(--muted-foreground))' }}>{f}</span>
                                </div>
                            ))}
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(270, 60%, 55%)' }}>Features from Elite</p>
                        <div className="space-y-1.5">
                            {bonusFeatures.map((f, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <X size={12} style={{ color: 'hsl(0, 72%, 55%)' }} />
                                    <span className="text-[11px] line-through" style={{ color: 'hsl(var(--muted-foreground))' }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Pricing Cards */}
            {showSubscribeButton && (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {/* Rozare Starter Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-panel-strong p-6 border-2"
                        style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}
                    >
                        <div className="text-center mb-5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                                style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'hsl(150, 60%, 45%)' }}>
                                <Sparkles size={12} /> 30 DAYS FREE
                            </div>
                            <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                Rozare Starter
                            </h3>
                            <p className="text-lg font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>
                                <span style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through', fontSize: '0.9rem' }}>$5.99/mo</span>
                                {' '}$0<span className="text-sm font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>/first 30 days</span>
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Then $5.99/month • Cancel anytime
                            </p>
                        </div>

                        <div className="space-y-2 mb-5">
                            <p className="text-xs font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Core Features</p>
                            {[
                                { icon: <Store size={13} />, text: 'Store & products visible to all customers' },
                                { icon: <Package size={13} />, text: 'Unlimited product listings' },
                                { icon: <CreditCard size={13} />, text: 'Secure payment processing' },
                                { icon: <Shield size={13} />, text: 'Custom subdomain for your store' },
                                { icon: <Bot size={13} />, text: '100 AI messages/day' },
                                { icon: <Users size={13} />, text: 'Order management & insights' },
                                { icon: <MessageCircle size={13} />, text: 'WhatsApp order confirmation' },
                            ].map((f, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'hsl(150, 60%, 45%)' }}>
                                        {f.icon}
                                    </div>
                                    <span className="text-[11px]" style={{ color: 'hsl(var(--foreground))' }}>{f.text}</span>
                                </div>
                            ))}

                            <div className="border-t my-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }} />
                            <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: 'hsl(270, 60%, 55%)' }}>
                                <Award size={11} /> Bonus Features
                                <span className="text-[9px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'hsl(270, 60%, 55%)' }}>
                                    6 months only
                                </span>
                            </p>
                            {bonusFeatures.map((f, i) => (
                                <div key={`bonus-${i}`} className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'hsl(270, 60%, 55%)' }}>
                                        <Check size={11} />
                                    </div>
                                    <span className="text-[11px]" style={{ color: 'hsl(var(--foreground))' }}>{f}</span>
                                </div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSubscribe('starter')}
                            disabled={checkoutLoading === 'starter'}
                            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(250, 60%, 55%))' }}
                        >
                            {checkoutLoading === 'starter' ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CreditCard size={15} />
                                    Subscribe — 30 Days Free
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </motion.button>
                    </motion.div>

                    {/* Rozare Elite Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="glass-panel-strong p-6 border-2 relative overflow-hidden"
                        style={{ borderColor: 'rgba(139, 92, 246, 0.4)' }}
                    >
                        {/* Recommended badge */}
                        <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl"
                            style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(290, 50%, 50%))' }}>
                            RECOMMENDED
                        </div>

                        <div className="text-center mb-5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                                style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'hsl(270, 60%, 55%)' }}>
                                <Gem size={12} /> 45 DAYS FREE
                            </div>
                            <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                Rozare Elite
                            </h3>
                            <p className="text-lg font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>
                                <span style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through', fontSize: '0.9rem' }}>$12.99/mo</span>
                                {' '}$0<span className="text-sm font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>/first 45 days</span>
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Then $12.99/month • Cancel anytime
                            </p>
                        </div>

                        <div className="space-y-2 mb-5">
                            <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'hsl(150, 60%, 45%)' }}>
                                <Check size={13} /> All Starter Features
                            </p>
                            {[
                                { icon: <Store size={13} />, text: 'Store & products visible to all customers' },
                                { icon: <Package size={13} />, text: 'Unlimited product listings' },
                                { icon: <CreditCard size={13} />, text: 'Secure payment processing' },
                                { icon: <Shield size={13} />, text: 'Custom subdomain for your store' },
                                { icon: <Bot size={13} />, text: '100 AI messages/day' },
                                { icon: <Users size={13} />, text: 'Order management & insights' },
                                { icon: <MessageCircle size={13} />, text: 'WhatsApp order confirmation' },
                            ].map((f, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'hsl(150, 60%, 45%)' }}>
                                        {f.icon}
                                    </div>
                                    <span className="text-[11px]" style={{ color: 'hsl(var(--foreground))' }}>{f.text}</span>
                                </div>
                            ))}

                            <div className="border-t my-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }} />
                            <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'hsl(270, 60%, 55%)' }}>
                                <Award size={13} /> Bonus Features
                                <span className="text-[9px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'hsl(270, 60%, 55%)' }}>
                                    PERMANENT
                                </span>
                            </p>
                            {bonusFeatures.map((f, i) => (
                                <div key={`elite-bonus-${i}`} className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'hsl(270, 60%, 55%)' }}>
                                        <Check size={11} />
                                    </div>
                                    <span className="text-[11px]" style={{ color: 'hsl(var(--foreground))' }}>{f}</span>
                                </div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSubscribe('elite')}
                            disabled={checkoutLoading === 'elite'}
                            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, hsl(270, 60%, 55%), hsl(290, 50%, 50%))' }}
                        >
                            {checkoutLoading === 'elite' ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Gem size={15} />
                                    Subscribe Elite — 45 Days Free
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                </div>
            )}

            {/* Timeline */}
            <div className="glass-panel-strong p-6">
                <h3 className="text-sm font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>How it works</h3>
                <div className="space-y-4">
                    {[
                        { step: '1', title: 'Free Trial', desc: '15 days to set up your store, add products, and start selling', active: isTrial },
                        { step: '2', title: 'Subscribe', desc: 'Choose Rozare Starter ($5.99/mo) or Rozare Elite ($12.99/mo)', active: false },
                        { step: '3', title: 'Free Period', desc: isElite ? '45 days of full access at no cost' : '30 days of full access at no cost to grow your business', active: subscription?.status === 'free_period' },
                        { step: '4', title: 'Monthly Billing', desc: isElite ? '$12.99/month. Cancel anytime.' : '$5.99/month after free period. Cancel anytime.', active: subscription?.status === 'active' },
                        { step: '5', title: 'Bonus Features', desc: isElite ? 'Permanently included with your Elite plan.' : 'After 6 months, bonus features expire. Upgrade to Elite to keep them.', active: false },
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

            {/* Subscription comparison note */}
            <p className="text-center text-[10px] mt-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Secure checkout powered by Stripe. Cancel anytime with one click.
            </p>

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
                            className="glass-panel-strong p-6 max-w-md w-full"
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

                            {/* Bonus features grace period warning */}
                            {subscription?.plan === 'starter' && subscription?.bonusFeaturesActive && !subscription?.bonusFeaturesExpiredPermanently && subscription?.bonusExpiryDate && new Date(subscription.bonusExpiryDate) > new Date() && (
                                <div className="mb-4 p-3.5 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                                    <div className="flex items-start gap-2">
                                        <Clock size={14} className="shrink-0 mt-0.5" style={{ color: 'hsl(30, 90%, 50%)' }} />
                                        <div>
                                            <p className="text-xs font-bold" style={{ color: 'hsl(30, 85%, 45%)' }}>Bonus Features Warning</p>
                                            <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                Once your subscription period ends, you will have <strong>3 days</strong> to re-subscribe and keep your bonus features for the remaining {bonusDaysUntilExpiry} days. After 3 days, bonus features will be <strong>permanently removed</strong> from the Starter plan and you would need to upgrade to Elite to get them back.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

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
