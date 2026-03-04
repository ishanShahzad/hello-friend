import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, DollarSign, ShoppingBag, Package, BarChart3,
    Calendar, ArrowUp, ArrowDown, Sparkles, Star, Store, Users,
    CheckCircle, Clock, Loader2
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import axios from 'axios';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const AdminAnalytics = () => {
    const { products, orders } = useOutletContext();
    const { formatPrice, currency, exchangeRates, getCurrencySymbol } = useCurrency();
    const [timeRange, setTimeRange] = useState('30');
    const [stores, setStores] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const rate = exchangeRates[currency] || 1;
    const symbol = getCurrencySymbol();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const token = localStorage.getItem('jwtToken');
            try {
                const [storesRes, usersRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}api/store/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { stores: [] } })),
                    axios.get(`${import.meta.env.VITE_API_URL}api/user/get-all-users`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { users: [] } })),
                ]);
                setStores(storesRes.data?.stores || []);
                setUsers(usersRes.data?.users || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    // Revenue over time
    const revenueData = useMemo(() => {
        const days = parseInt(timeRange);
        const now = new Date();
        const buckets = {};
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            buckets[key] = { date: key, revenue: 0, orders: 0 };
        }
        orders.forEach(o => {
            const key = new Date(o.createdAt).toISOString().slice(0, 10);
            if (buckets[key]) {
                buckets[key].orders += 1;
                if (o.isPaid) buckets[key].revenue += (o.orderSummary?.totalAmount || 0);
            }
        });
        return Object.values(buckets).map(b => ({
            ...b,
            label: new Date(b.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            revenue: Math.round(b.revenue * rate * 100) / 100,
        }));
    }, [orders, timeRange, rate]);

    // Store stats
    const totalStores = stores.length;
    const verifiedStores = stores.filter(s => s.isVerified).length;
    const pendingVerification = stores.filter(s => !s.isVerified).length;

    // Top performing stores by product count & trust
    const topStores = useMemo(() => {
        return stores
            .map(s => ({
                name: s.storeName,
                logo: s.logo,
                verified: s.isVerified,
                trustCount: s.trustCount || 0,
                productCount: products.filter(p => p.seller === s.seller || p.store === s._id).length,
            }))
            .sort((a, b) => b.trustCount - a.trustCount)
            .slice(0, 8);
    }, [stores, products]);

    // User role breakdown
    const roleData = useMemo(() => {
        const counts = { user: 0, seller: 0, admin: 0 };
        users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [users]);

    const ROLE_COLORS = ['hsl(220,70%,55%)', 'hsl(150,60%,45%)', 'hsl(280,60%,55%)'];

    // Order status breakdown
    const statusData = useMemo(() => {
        const counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
        orders.forEach(o => { if (counts[o.orderStatus] !== undefined) counts[o.orderStatus]++; });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [orders]);

    const STATUS_COLORS = ['hsl(30,90%,50%)', 'hsl(220,70%,55%)', 'hsl(200,80%,50%)', 'hsl(150,60%,45%)', 'hsl(0,72%,55%)'];

    // Category breakdown
    const categoryData = useMemo(() => {
        const cats = {};
        products.forEach(p => {
            if (!cats[p.category]) cats[p.category] = { name: p.category, count: 0 };
            cats[p.category].count++;
        });
        return Object.values(cats).sort((a, b) => b.count - a.count).slice(0, 8);
    }, [products]);

    const CAT_COLORS = ['hsl(220,70%,55%)', 'hsl(150,60%,45%)', 'hsl(200,80%,50%)', 'hsl(280,60%,55%)', 'hsl(30,90%,50%)', 'hsl(340,65%,55%)', 'hsl(170,60%,45%)', 'hsl(260,55%,55%)'];

    // Summary
    const totalRevenue = orders.reduce((s, o) => o.isPaid ? s + (o.orderSummary?.totalAmount || 0) : s, 0);
    const paidOrders = orders.filter(o => o.isPaid).length;
    const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;
    const totalUnitsSold = orders.reduce((s, o) => o.isPaid ? s + o.orderItems.reduce((a, i) => a + i.quantity, 0) : s, 0);

    const summaryStats = [
        { label: 'Total Revenue', value: `${symbol}${(totalRevenue * rate).toFixed(2)}`, icon: <DollarSign size={20} />, color: 'hsl(150,60%,45%)', bg: 'rgba(16,185,129,0.12)', change: '+12%', up: true },
        { label: 'Total Orders', value: orders.length, icon: <ShoppingBag size={20} />, color: 'hsl(220,70%,55%)', bg: 'rgba(99,102,241,0.12)', change: '+8%', up: true },
        { label: 'Total Stores', value: totalStores, icon: <Store size={20} />, color: 'hsl(200,80%,50%)', bg: 'rgba(14,165,233,0.12)', change: `${verifiedStores} verified`, up: true },
        { label: 'Total Users', value: users.length, icon: <Users size={20} />, color: 'hsl(280,60%,55%)', bg: 'rgba(139,92,246,0.12)', change: `${users.filter(u => u.role === 'seller').length} sellers`, up: true },
        { label: 'Products', value: products.length, icon: <Package size={20} />, color: 'hsl(30,90%,50%)', bg: 'rgba(249,115,22,0.12)', change: `${products.filter(p => p.stock === 0).length} OOS`, up: false },
        { label: 'Avg Order Value', value: `${symbol}${(avgOrderValue * rate).toFixed(2)}`, icon: <TrendingUp size={20} />, color: 'hsl(340,65%,55%)', bg: 'rgba(244,63,94,0.12)', change: '+5%', up: true },
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="glass-panel p-3" style={{ minWidth: 140 }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-xs" style={{ color: p.color }}>
                        {p.name}: {p.name === 'revenue' ? `${symbol}${p.value}` : p.value}
                    </p>
                ))}
            </div>
        );
    };

    const ranges = [
        { label: '7 Days', value: '7' },
        { label: '30 Days', value: '30' },
        { label: '90 Days', value: '90' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 size={32} className="animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="tag-pill mb-2"><Sparkles size={12} /> Platform Analytics</div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        Admin Analytics
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Platform-wide performance overview
                    </p>
                </div>
                <div className="flex gap-2">
                    {ranges.map(r => (
                        <motion.button key={r.value} whileTap={{ scale: 0.95 }}
                            onClick={() => setTimeRange(r.value)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${timeRange === r.value ? 'border' : 'glass-inner'}`}
                            style={timeRange === r.value
                                ? { background: 'rgba(99,102,241,0.12)', color: 'hsl(220,70%,55%)', borderColor: 'rgba(99,102,241,0.3)' }
                                : { color: 'hsl(var(--muted-foreground))' }}>
                            <Calendar size={12} className="inline mr-1" />{r.label}
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {summaryStats.map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }} className="glass-card water-shimmer p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                            <span className="flex items-center gap-0.5 text-[11px] font-semibold"
                                style={{ color: s.up ? 'hsl(150,60%,45%)' : 'hsl(0,72%,55%)' }}>
                                {s.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{s.change}
                            </span>
                        </div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.label}</p>
                        <p className="text-2xl font-extrabold mt-1" style={{ color: 'hsl(var(--foreground))', letterSpacing: '-0.03em' }}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Revenue Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="glass-panel water-shimmer p-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Platform Revenue</h3>
                        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Total revenue over the last {timeRange} days</p>
                    </div>
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.12)', color: 'hsl(150,60%,45%)' }}>
                        <TrendingUp size={18} />
                    </div>
                </div>
                <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(150,60%,45%)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(150,60%,45%)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} tickFormatter={v => `${symbol}${v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="revenue" stroke="hsl(150,60%,45%)" strokeWidth={2.5} fill="url(#adminRevGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Order Volume + Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="glass-panel water-shimmer p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Order Volume</h3>
                            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Daily orders across the platform</p>
                        </div>
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.12)', color: 'hsl(220,70%,55%)' }}>
                            <BarChart3 size={18} />
                        </div>
                    </div>
                    <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 11, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="orders" fill="hsl(220,70%,55%)" radius={[6, 6, 0, 0]} barSize={revenueData.length > 30 ? 6 : 16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="glass-panel water-shimmer p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Order Status</h3>
                            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Breakdown by current status</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div style={{ width: 180, height: 180 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                                        {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2">
                            {statusData.map((s, i) => s.value > 0 && (
                                <div key={s.name} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[i] }} />
                                    <span className="text-xs capitalize flex-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.name}</span>
                                    <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Stores + User Roles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Stores */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="glass-panel water-shimmer p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Top Stores</h3>
                            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>By trust score</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(16,185,129,0.12)', color: 'hsl(150,60%,45%)' }}>
                                {verifiedStores} verified
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(249,115,22,0.12)', color: 'hsl(30,90%,50%)' }}>
                                {pendingVerification} pending
                            </span>
                        </div>
                    </div>
                    {topStores.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="glass-inner inline-flex p-3 rounded-xl mb-2"><Store size={28} style={{ color: 'hsl(var(--muted-foreground))' }} /></div>
                            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No stores yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {topStores.map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + i * 0.04 }}
                                    className="flex items-center gap-3 p-3 rounded-xl glass-inner">
                                    <span className="text-xs font-bold w-5 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>#{i + 1}</span>
                                    {s.logo ? (
                                        <img src={s.logo} alt="" className="w-9 h-9 rounded-lg object-cover" style={{ border: '1px solid var(--glass-border)' }} />
                                    ) : (
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
                                            <Store size={16} style={{ color: 'hsl(220,70%,55%)' }} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{s.name}</p>
                                            {s.verified && <CheckCircle size={12} style={{ color: 'hsl(150,60%,45%)' }} />}
                                        </div>
                                        <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                            {s.trustCount} trusts · {s.productCount} products
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* User Roles + Category Breakdown */}
                <div className="space-y-6">
                    {/* User Roles Pie */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="glass-panel water-shimmer p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>User Roles</h3>
                                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Distribution of user types</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div style={{ width: 140, height: 140 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={roleData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                                            {roleData.map((_, i) => <Cell key={i} fill={ROLE_COLORS[i]} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-2">
                                {roleData.map((r, i) => r.value > 0 && (
                                    <div key={r.name} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: ROLE_COLORS[i] }} />
                                        <span className="text-xs capitalize flex-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{r.name}s</span>
                                        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{r.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Category Breakdown */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="glass-panel water-shimmer p-5 sm:p-6">
                        <h3 className="text-base font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Category Breakdown</h3>
                        <div className="space-y-2">
                            {categoryData.map((c, i) => {
                                const max = categoryData[0]?.count || 1;
                                return (
                                    <div key={c.name} className="flex items-center gap-3">
                                        <span className="text-xs w-24 truncate font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{c.name}</span>
                                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${(c.count / max) * 100}%` }}
                                                transition={{ delay: 0.5 + i * 0.05 }}
                                                className="h-full rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                                        </div>
                                        <span className="text-xs font-semibold w-8 text-right" style={{ color: 'hsl(var(--foreground))' }}>{c.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminAnalytics;
