import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, AlertTriangle, CheckCircle, Info, Package, ShoppingBag,
    Store, Shield, Filter, Loader2, Trash2, Eye, EyeOff, Search
} from 'lucide-react';
import { useOutletContext, Link, useLocation } from 'react-router-dom';
import axios from 'axios';

const NotificationsPage = () => {
    const { products, orders } = useOutletContext();
    const location = useLocation();
    const isAdmin = location.pathname.includes('admin-dashboard');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [readIds, setReadIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('readNotifIds') || '[]'); } catch { return []; }
    });
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            setLoading(true);
            const token = localStorage.getItem('jwtToken');
            axios.get(`${import.meta.env.VITE_API_URL}api/store/all`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setStores(res.data?.stores || []))
                .catch(() => setStores([]))
                .finally(() => setLoading(false));
        }
    }, [isAdmin]);

    const notifications = useMemo(() => {
        const notifs = [];
        const now = new Date().toISOString();

        // Stock alerts
        products.filter(p => p.stock === 0).forEach(p => {
            notifs.push({ id: `stock-oos-${p._id}`, type: 'critical', category: 'stock', title: `${p.name} is out of stock`, description: 'Update inventory to avoid lost sales', time: now, icon: 'package' });
        });
        products.filter(p => p.stock > 0 && p.stock <= 10).forEach(p => {
            notifs.push({ id: `stock-low-${p._id}`, type: 'warning', category: 'stock', title: `${p.name} running low`, description: `Only ${p.stock} units remaining`, time: now, icon: 'package' });
        });

        // Order notifications
        orders.filter(o => o.orderStatus === 'pending').forEach(o => {
            notifs.push({ id: `order-pending-${o._id}`, type: 'info', category: 'order', title: `New order #${o.orderId || 'N/A'}`, description: `${o.shippingInfo?.fullName || 'Customer'} · ${o.orderItems?.length || 0} item(s)`, time: o.createdAt, icon: 'order', linkTo: isAdmin ? `/admin-dashboard/order/${o._id}` : `/seller-dashboard/order/${o._id}` });
        });
        orders.filter(o => o.isPaid && o.orderStatus === 'confirmed').forEach(o => {
            notifs.push({ id: `order-paid-${o._id}`, type: 'success', category: 'payment', title: `Payment received for #${o.orderId || 'N/A'}`, description: `$${o.orderSummary?.totalAmount?.toFixed(2) || '0.00'}`, time: o.paidAt || o.createdAt, icon: 'order', linkTo: isAdmin ? `/admin-dashboard/order/${o._id}` : `/seller-dashboard/order/${o._id}` });
        });
        orders.filter(o => o.orderStatus === 'delivered').slice(0, 5).forEach(o => {
            notifs.push({ id: `order-delivered-${o._id}`, type: 'success', category: 'order', title: `Order #${o.orderId || 'N/A'} delivered`, description: 'Successfully completed', time: o.updatedAt || o.createdAt, icon: 'order' });
        });

        // Admin-specific: Store notifications
        if (isAdmin) {
            const recentStores = stores.filter(s => {
                const created = new Date(s.createdAt);
                return (Date.now() - created.getTime()) < 30 * 24 * 60 * 60 * 1000;
            });
            recentStores.forEach(s => {
                notifs.push({ id: `store-new-${s._id}`, type: 'info', category: 'store', title: `New store: ${s.storeName}`, description: `Created by a seller`, time: s.createdAt, icon: 'store' });
            });

            stores.filter(s => !s.isVerified).forEach(s => {
                notifs.push({ id: `store-verify-${s._id}`, type: 'warning', category: 'store', title: `${s.storeName} pending verification`, description: 'Review and verify this store', time: s.createdAt, icon: 'shield', linkTo: '/admin-dashboard/store-verifications' });
            });

            stores.filter(s => s.isVerified).forEach(s => {
                notifs.push({ id: `store-verified-${s._id}`, type: 'success', category: 'store', title: `${s.storeName} is verified`, description: 'Store verification approved', time: s.updatedAt || s.createdAt, icon: 'store' });
            });
        }

        // Sort by time descending
        notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
        return notifs;
    }, [products, orders, stores, isAdmin]);

    const markAsRead = (id) => {
        const newRead = [...readIds, id];
        setReadIds(newRead);
        localStorage.setItem('readNotifIds', JSON.stringify(newRead));
    };

    const markAllRead = () => {
        const allIds = notifications.map(n => n.id);
        setReadIds(allIds);
        localStorage.setItem('readNotifIds', JSON.stringify(allIds));
    };

    const categories = ['all', 'stock', 'order', 'payment', ...(isAdmin ? ['store'] : [])];

    const filtered = notifications.filter(n => {
        if (filter !== 'all' && n.category !== filter) return false;
        if (searchTerm && !n.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

    const iconMap = {
        package: <Package size={16} />,
        order: <ShoppingBag size={16} />,
        store: <Store size={16} />,
        shield: <Shield size={16} />,
    };
    const typeIconMap = { critical: <AlertTriangle size={16} />, warning: <AlertTriangle size={16} />, info: <Info size={16} />, success: <CheckCircle size={16} /> };
    const colorMap = {
        critical: { bg: 'rgba(239,68,68,0.12)', color: 'hsl(0,72%,55%)' },
        warning: { bg: 'rgba(245,158,11,0.12)', color: 'hsl(45,80%,40%)' },
        info: { bg: 'rgba(99,102,241,0.12)', color: 'hsl(220,70%,55%)' },
        success: { bg: 'rgba(16,185,129,0.12)', color: 'hsl(150,60%,45%)' },
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="tag-pill mb-2"><Bell size={12} /> Notifications</div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        Notification Center
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={markAllRead}
                        className="px-4 py-2 rounded-xl text-xs font-semibold glass-inner" style={{ color: 'hsl(220,70%,55%)' }}>
                        <Eye size={14} className="inline mr-1" /> Mark all read
                    </motion.button>
                )}
            </motion.div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-wrap">
                    {categories.map(c => (
                        <motion.button key={c} whileTap={{ scale: 0.95 }}
                            onClick={() => setFilter(c)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${filter === c ? 'border' : 'glass-inner'}`}
                            style={filter === c
                                ? { background: 'rgba(99,102,241,0.12)', color: 'hsl(220,70%,55%)', borderColor: 'rgba(99,102,241,0.3)' }
                                : { color: 'hsl(var(--muted-foreground))' }}>
                            {c}
                        </motion.button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--muted-foreground))' }} />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="glass-input pl-9 text-xs" placeholder="Search notifications..." />
                </div>
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
                </div>
            ) : filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 text-center">
                    <Bell size={40} style={{ color: 'hsl(var(--muted-foreground))' }} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>No notifications found</p>
                </motion.div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {filtered.map((n, i) => {
                            const cs = colorMap[n.type] || colorMap.info;
                            const isRead = readIds.includes(n.id);
                            const content = (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    onClick={() => markAsRead(n.id)}
                                    className={`glass-panel p-4 flex items-start gap-4 cursor-pointer transition-all hover:scale-[1.005] ${isRead ? 'opacity-60' : ''}`}>
                                    <div className="p-2 rounded-xl shrink-0" style={{ background: cs.bg, color: cs.color }}>
                                        {iconMap[n.icon] || typeIconMap[n.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{n.title}</p>
                                            {!isRead && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'hsl(220,70%,55%)' }} />}
                                        </div>
                                        {n.description && <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{n.description}</p>}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: cs.bg, color: cs.color }}>
                                                {n.category}
                                            </span>
                                            <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                {n.time ? new Date(n.time).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );

                            return n.linkTo ? <Link key={n.id} to={n.linkTo}>{content}</Link> : <div key={n.id}>{content}</div>;
                        })}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
};

export default NotificationsPage;
