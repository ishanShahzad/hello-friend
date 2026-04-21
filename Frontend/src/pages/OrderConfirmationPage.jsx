import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Loader2, Package, MapPin } from 'lucide-react';
import axios from 'axios';
import SEOHead from '../components/common/SEOHead';

const API = import.meta.env.VITE_API_URL;

export default function OrderConfirmationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState(null); // 'confirmed' | 'declined'

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
      setActionDone('confirmed');
    } catch (err) {
      setError(err.response?.data?.msg || 'Could not confirm order');
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
      setActionDone('declined');
    } catch (err) {
      setError(err.response?.data?.msg || 'Could not decline order');
    } finally {
      setSubmitting(false);
    }
  };

  const expired = order?.confirmation?.expired;

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
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading order…</p>
          </div>
        )}

        {!loading && error && !order && (
          <div className="text-center py-12">
            <div className="glass-inner p-3 rounded-2xl inline-block mb-4"><XCircle size={28} style={{ color: 'hsl(0, 72%, 55%)' }} /></div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Link Invalid</h2>
            <p className="text-sm mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>{error}</p>
            <Link to="/" className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>← Back to home</Link>
          </div>
        )}

        {!loading && order && (
          <>
            {/* States */}
            {actionDone === 'confirmed' && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <CheckCircle2 size={20} style={{ color: 'hsl(150, 60%, 40%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(150, 60%, 35%)' }}>Order confirmed!</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>The seller has been notified and will begin processing your order.</p>
                </div>
              </div>
            )}
            {actionDone === 'declined' && (
              <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <XCircle size={20} style={{ color: 'hsl(0, 72%, 55%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(0, 72%, 50%)' }}>Order declined</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>This order has been cancelled.</p>
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
                      <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Qty: {it.quantity} × ${Number(it.price).toFixed(2)}</p>
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

            {/* Action buttons */}
            {!actionDone && !expired && (
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
                <Link to="/" className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>← Back to Rozare</Link>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
