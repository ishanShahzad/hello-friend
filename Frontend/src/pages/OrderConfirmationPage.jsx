import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Loader2, Package, MapPin, MessageCircle, Mail, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import SEOHead from '../components/common/SEOHead';

const API = import.meta.env.VITE_API_URL;

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

export default function OrderConfirmationPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState(null); // 'confirmed' | 'declined'
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API}api/order-confirm/${token}`);
        if (cancelled) return;
        setOrder(res.data.order);
        if (res.data.order?.confirmation?.confirmedAt) setActionDone('confirmed');
        else if (res.data.order?.confirmation?.declinedAt) setActionDone('declined');
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.msg || 'Confirmation link is invalid or expired');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}api/order-confirm/${token}/confirm`);
      setOrder(res.data.order);
      // Handle cross-channel: API may return 'Already declined' or 'Already confirmed'
      if (res.data.msg === 'Already declined') {
        setActionDone('declined');
      } else if (res.data.msg === 'Already confirmed') {
        setActionDone('confirmed');
      } else {
        setActionDone('confirmed');
      }
    } catch (err) {
      // If API returns order data in error response, use it for cross-channel display
      if (err.response?.data?.order) {
        setOrder(err.response.data.order);
        if (err.response.data.order?.confirmation?.confirmedAt) setActionDone('confirmed');
        else if (err.response.data.order?.confirmation?.declinedAt) setActionDone('declined');
      } else {
        setError(err.response?.data?.msg || 'Could not confirm order');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this order?')) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}api/order-confirm/${token}/decline`);
      setOrder(res.data.order);
      // Handle cross-channel: API may return 'Already confirmed' or 'Already declined'
      if (res.data.msg === 'Already confirmed') {
        setActionDone('confirmed');
      } else if (res.data.msg === 'Already declined') {
        setActionDone('declined');
      } else {
        setActionDone('declined');
      }
    } catch (err) {
      if (err.response?.data?.order) {
        setOrder(err.response.data.order);
        if (err.response.data.order?.confirmation?.confirmedAt) setActionDone('confirmed');
        else if (err.response.data.order?.confirmation?.declinedAt) setActionDone('declined');
      } else {
        setError(err.response?.data?.msg || 'Could not decline order');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAfterWhatsApp = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}api/order-confirm/${token}/decline`);
      setOrder(res.data.order);
      // Handle cross-channel: backend may return 'Already confirmed' if state changed
      if (res.data.msg === 'Already confirmed') {
        setActionDone('confirmed');
      } else {
        setActionDone('declined');
      }
      setShowCancelDialog(false);
    } catch (err) {
      if (err.response?.data?.order) {
        setOrder(err.response.data.order);
        if (err.response.data.order?.confirmation?.confirmedAt) setActionDone('confirmed');
        else if (err.response.data.order?.confirmation?.declinedAt) setActionDone('declined');
        setShowCancelDialog(false);
      } else {
        setError(err.response?.data?.msg || 'Could not cancel order');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const expired = order?.confirmation?.expired;
  const conf = order?.confirmation;
  const confirmedVia = conf?.confirmedVia;
  const decidedVia = conf?.decidedVia;
  const maskedPhone = order?.shippingInfo?.maskedPhone;

  // Determine which state to show — use decidedVia for more accuracy when available
  const effectiveVia = decidedVia || confirmedVia;
  const confirmedViaWhatsApp = effectiveVia === 'whatsapp' && conf?.confirmedAt && !conf?.declinedAt;
  const cancelledViaWhatsApp = effectiveVia === 'whatsapp' && conf?.declinedAt;
  const confirmedViaEmail = effectiveVia === 'email' && conf?.confirmedAt && !conf?.declinedAt;
  const cancelledViaEmail = effectiveVia === 'email' && conf?.declinedAt;
  const confirmedByAdmin = (effectiveVia === 'admin' || effectiveVia === 'manual') && conf?.confirmedAt;
  const cancelledByAdmin = (effectiveVia === 'admin' || effectiveVia === 'manual') && conf?.declinedAt;
  const cancelledFromDashboard = conf?.cancelledFromDashboardAt;
  const notYetDecided = !actionDone && !expired;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'hsl(var(--background))' }}>
      <SEOHead title="Confirm Your Order · Rozare" description="Confirm your Cash on Delivery order with Rozare." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl glass-panel p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="glass-inner p-2.5 rounded-xl"><ShieldCheck size={22} style={{ color: 'hsl(var(--primary))' }} /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>Order Confirmation</h1>
            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Cash on Delivery · Rozare</p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="animate-spin" size={28} style={{ color: 'hsl(var(--primary))' }} />
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading order...</p>
          </div>
        )}

        {!loading && error && !order && (
          <div className="text-center py-12">
            <div className="glass-inner p-3 rounded-2xl inline-block mb-4"><XCircle size={28} style={{ color: 'hsl(0, 72%, 55%)' }} /></div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Link Invalid</h2>
            <p className="text-sm mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>{error}</p>
            <Link to="/" className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>Back to home</Link>
          </div>
        )}

        {!loading && order && (
          <>
            {/* Already confirmed via WhatsApp — show with cancel option */}
            {confirmedViaWhatsApp && !cancelledFromDashboard && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <MessageCircle size={20} style={{ color: 'hsl(150, 60%, 40%)', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'hsl(150, 60%, 35%)' }}>
                    You have already confirmed this order via your WhatsApp {maskedPhone ? `(+${maskedPhone})` : ''}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Status: <span className="font-medium capitalize">{order.orderStatus}</span> · Confirmed {timeAgo(conf.confirmedAt)}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => setShowCancelDialog(true)}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(239, 68, 68, 0.10)', color: 'hsl(0, 72%, 55%)', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                      Want to cancel this order?
                    </button>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    You can also visit your Rozare account to cancel this order.
                  </p>
                </div>
              </div>
            )}

            {/* Already cancelled via WhatsApp — show with re-order option */}
            {cancelledViaWhatsApp && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <MessageCircle size={20} style={{ color: 'hsl(0, 72%, 55%)', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'hsl(0, 72%, 50%)' }}>
                    You have already cancelled this order via your WhatsApp {maskedPhone ? `(+${maskedPhone})` : ''}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Cancelled {timeAgo(conf.declinedAt)}
                  </p>
                  <button
                    onClick={() => setShowReorderDialog(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    style={{ background: 'rgba(99, 102, 241, 0.10)', color: 'hsl(var(--primary))', border: '1px solid rgba(99,102,241,0.25)' }}
                  >
                    <ShoppingCart size={12} /> Want to place this order again?
                  </button>
                </div>
              </div>
            )}

            {/* Already confirmed via email (returning visitor) */}
            {confirmedViaEmail && !cancelledFromDashboard && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <Mail size={20} style={{ color: 'hsl(150, 60%, 40%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(150, 60%, 35%)' }}>You confirmed this order via email</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Confirmed {timeAgo(conf.confirmedAt)} · The seller has been notified and will begin processing your order.
                  </p>
                </div>
              </div>
            )}

            {/* Already cancelled via email (returning visitor) */}
            {cancelledViaEmail && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <Mail size={20} style={{ color: 'hsl(0, 72%, 55%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(0, 72%, 50%)' }}>Order cancelled via email</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Cancelled {timeAgo(conf.declinedAt)} · No charges applied.
                  </p>
                </div>
              </div>
            )}

            {/* Confirmed by admin/seller */}
            {confirmedByAdmin && !cancelledFromDashboard && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <CheckCircle2 size={20} style={{ color: 'hsl(150, 60%, 40%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(150, 60%, 35%)' }}>This order has been confirmed by the seller</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Confirmed {timeAgo(conf.confirmedAt)} · Your order is being processed.
                  </p>
                </div>
              </div>
            )}

            {/* Cancelled by admin/seller */}
            {cancelledByAdmin && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <XCircle size={20} style={{ color: 'hsl(0, 72%, 55%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(0, 72%, 50%)' }}>This order has been cancelled by the seller</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Cancelled {timeAgo(conf.declinedAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Cancelled from dashboard after WhatsApp confirm */}
            {cancelledFromDashboard && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <XCircle size={20} style={{ color: 'hsl(0, 72%, 55%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(0, 72%, 50%)' }}>Order cancelled</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    This order was cancelled · {timeAgo(conf.cancelledFromDashboardAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Generic confirmed/declined (fallback for when confirmedVia is null or other) */}
            {actionDone === 'confirmed' && !confirmedViaWhatsApp && !confirmedViaEmail && !confirmedByAdmin && !cancelledFromDashboard && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <CheckCircle2 size={20} style={{ color: 'hsl(150, 60%, 40%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(150, 60%, 35%)' }}>Order confirmed!</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>The seller has been notified and will begin processing your order.</p>
                </div>
              </div>
            )}
            {actionDone === 'declined' && !cancelledViaWhatsApp && !cancelledViaEmail && !cancelledByAdmin && !cancelledFromDashboard && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <XCircle size={20} style={{ color: 'hsl(0, 72%, 55%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(0, 72%, 50%)' }}>Order declined</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>This order has been cancelled. No charges applied.</p>
                </div>
              </div>
            )}
            {!actionDone && expired && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(249, 115, 22, 0.10)', border: '1px solid rgba(249,115,22,0.25)' }}>
                <Clock size={20} style={{ color: 'hsl(30, 90%, 50%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(30, 90%, 45%)' }}>Link expired</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Please contact the seller to verify your order.</p>
                </div>
              </div>
            )}

            {/* Order summary */}
            <div className="glass-inner rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>Order ID</span>
                <span className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>{order.orderId}</span>
              </div>
              <div className="space-y-2.5 mb-3">
                {order.orderItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {it.image ? <img src={it.image} alt={it.name} className="w-full h-full object-cover" /> : <Package size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{it.name}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Qty: {it.quantity} x ${Number(it.price).toFixed(2)}</p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>${(it.price * it.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="pt-3 mt-1 space-y-1.5" style={{ borderTop: '1px solid var(--glass-border-subtle)' }}>
                <div className="flex justify-between text-xs"><span style={{ color: 'hsl(var(--muted-foreground))' }}>Subtotal</span><span style={{ color: 'hsl(var(--foreground))' }}>${order.orderSummary.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span style={{ color: 'hsl(var(--muted-foreground))' }}>Shipping</span><span style={{ color: 'hsl(var(--foreground))' }}>${order.orderSummary.shippingCost.toFixed(2)}</span></div>
                {order.orderSummary.tax > 0 && (
                  <div className="flex justify-between text-xs"><span style={{ color: 'hsl(var(--muted-foreground))' }}>Tax</span><span style={{ color: 'hsl(var(--foreground))' }}>${order.orderSummary.tax.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1.5" style={{ borderTop: '1px solid var(--glass-border-subtle)', color: 'hsl(var(--foreground))' }}>
                  <span>Total</span><span style={{ color: 'hsl(var(--primary))' }}>${order.orderSummary.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="glass-inner rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>Shipping to</span>
              </div>
              <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{order.shippingInfo.fullName}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {order.shippingInfo.address}, {order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.postalCode}, {order.shippingInfo.country}
              </p>
            </div>

            {/* Action buttons — only show for undecided, non-expired orders */}
            {notYetDecided && !confirmedViaWhatsApp && !cancelledViaWhatsApp && !confirmedViaEmail && !cancelledViaEmail && !confirmedByAdmin && !cancelledByAdmin && !cancelledFromDashboard && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleConfirm} disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263, 70%, 60%))', color: '#fff', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirm Order
                </button>
                <button onClick={handleDecline} disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: 'rgba(239, 68, 68, 0.10)', color: 'hsl(0, 72%, 55%)', border: '1px solid rgba(239,68,68,0.25)', opacity: submitting ? 0.6 : 1 }}>
                  <XCircle size={16} /> Decline
                </button>
              </div>
            )}

            {actionDone && (
              <div className="text-center mt-4">
                <Link to="/" className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>Back to Rozare</Link>
              </div>
            )}

            {/* Cancel after WhatsApp confirm dialog */}
            {showCancelDialog && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowCancelDialog(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Cancel this order?</h3>
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    You confirmed this order via WhatsApp {maskedPhone ? `(+${maskedPhone})` : ''} {timeAgo(conf.confirmedAt)}.
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Are you sure you want to cancel it now?
                  </p>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowCancelDialog(false)} className="px-4 py-2 rounded-xl glass-inner font-medium text-sm" style={{ color: 'hsl(var(--foreground))' }}>Keep Order</button>
                    <button onClick={handleCancelAfterWhatsApp} disabled={submitting} className="px-4 py-2 rounded-xl text-white font-medium text-sm" style={{ background: 'hsl(0, 72%, 55%)', opacity: submitting ? 0.6 : 1 }}>
                      {submitting ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                      Yes, Cancel Order
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Re-order dialog after WhatsApp cancel */}
            {showReorderDialog && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowReorderDialog(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Place this order again?</h3>
                  <div className="glass-inner rounded-xl p-3 mb-4 space-y-2">
                    {order.orderItems.map((it, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {it.image ? <img src={it.image} alt={it.name} className="w-full h-full object-cover" /> : <Package size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />}
                        </div>
                        <span className="text-xs flex-1 truncate" style={{ color: 'hsl(var(--foreground))' }}>{it.name} x{it.quantity}</span>
                        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>${(it.price * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between text-sm font-bold" style={{ borderTop: '1px solid var(--glass-border-subtle)' }}>
                      <span style={{ color: 'hsl(var(--foreground))' }}>Total</span>
                      <span style={{ color: 'hsl(var(--primary))' }}>${order.orderSummary.totalAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Shipping to {order.shippingInfo.city}, {order.shippingInfo.country}
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowReorderDialog(false)} className="px-4 py-2 rounded-xl glass-inner font-medium text-sm" style={{ color: 'hsl(var(--foreground))' }}>Close</button>
                    <Link to="/" className="px-4 py-2 rounded-xl text-white font-medium text-sm inline-flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263, 70%, 60%))' }}>
                      <ShoppingCart size={14} /> Browse & Re-order
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
