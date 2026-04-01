import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Ticket, Plus, Trash2, Edit3, ToggleLeft, ToggleRight, Search, 
    Calendar, Percent, DollarSign, Package, Users, Copy, Check, 
    AlertTriangle, Clock, X, Loader2, ChevronDown, ChevronUp, Tag,
    BarChart3, TrendingUp, Eye, Award, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useCurrency } from '../../contexts/CurrencyContext';

const CouponManagement = () => {
    const { formatPrice } = useCurrency();
    const [coupons, setCoupons] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedCode, setCopiedCode] = useState(null);
    const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'analytics'
    const [analyticsData, setAnalyticsData] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);

    const [form, setForm] = useState({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        applicableTo: 'all',
        applicableProducts: [],
        maxUses: '',
        maxUsesPerUser: '1',
        minOrderAmount: '',
        maxDiscountAmount: '',
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        description: '',
    });

    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);

    useEffect(() => {
        fetchCoupons();
        fetchProducts();
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/coupons/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalyticsData(res.data);
        } catch (err) {
            console.error('Failed to load coupon analytics:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const fetchCoupons = async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/coupons/seller`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCoupons(res.data.coupons || []);
        } catch (err) {
            toast.error('Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/products/get-seller-products`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(res.data.products || []);
        } catch (err) {
            console.error('Failed to load products:', err);
        }
    };

    const resetForm = () => {
        setForm({
            code: '',
            discountType: 'percentage',
            discountValue: '',
            applicableTo: 'all',
            applicableProducts: [],
            maxUses: '',
            maxUsesPerUser: '1',
            minOrderAmount: '',
            maxDiscountAmount: '',
            startDate: new Date().toISOString().split('T')[0],
            expiryDate: '',
            description: '',
        });
        setFormErrors({});
        setEditingCoupon(null);
    };

    const openCreate = () => {
        resetForm();
        setShowForm(true);
    };

    const openEdit = (coupon) => {
        setEditingCoupon(coupon);
        setForm({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue.toString(),
            applicableTo: coupon.applicableTo,
            applicableProducts: coupon.applicableProducts?.map(p => p._id || p) || [],
            maxUses: coupon.maxUses?.toString() || '',
            maxUsesPerUser: coupon.maxUsesPerUser?.toString() || '1',
            minOrderAmount: coupon.minOrderAmount?.toString() || '',
            maxDiscountAmount: coupon.maxDiscountAmount?.toString() || '',
            startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
            expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
            description: coupon.description || '',
        });
        setFormErrors({});
        setShowForm(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!form.code.trim()) errors.code = 'Coupon code is required';
        if (!form.discountValue || Number(form.discountValue) <= 0) errors.discountValue = 'Discount value must be > 0';
        if (form.discountType === 'percentage' && Number(form.discountValue) > 100) errors.discountValue = 'Max 100%';
        if (!form.expiryDate) errors.expiryDate = 'Expiry date is required';
        if (new Date(form.expiryDate) <= new Date()) errors.expiryDate = 'Must be in the future';
        if (form.applicableTo === 'selected' && form.applicableProducts.length === 0) {
            errors.applicableProducts = 'Select at least one product';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('jwtToken');
            const payload = {
                ...form,
                discountValue: Number(form.discountValue),
                maxUses: form.maxUses ? Number(form.maxUses) : null,
                maxUsesPerUser: form.maxUsesPerUser ? Number(form.maxUsesPerUser) : 1,
                minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
                maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
            };

            if (editingCoupon) {
                await axios.put(`${import.meta.env.VITE_API_URL}api/coupons/update/${editingCoupon._id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Coupon updated!');
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}api/coupons/create`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Coupon created!');
            }
            setShowForm(false);
            resetForm();
            fetchCoupons();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to save coupon');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('jwtToken');
            await axios.delete(`${import.meta.env.VITE_API_URL}api/coupons/delete/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Coupon deleted!');
            fetchCoupons();
        } catch (err) {
            toast.error('Failed to delete coupon');
        }
        setDeleteConfirm(null);
    };

    const handleToggle = async (id) => {
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.patch(`${import.meta.env.VITE_API_URL}api/coupons/toggle/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.msg);
            fetchCoupons();
        } catch (err) {
            toast.error('Failed to toggle coupon');
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success('Coupon code copied!');
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        setForm(f => ({ ...f, code }));
    };

    const toggleProductSelection = (productId) => {
        setForm(f => ({
            ...f,
            applicableProducts: f.applicableProducts.includes(productId)
                ? f.applicableProducts.filter(id => id !== productId)
                : [...f.applicableProducts, productId]
        }));
    };

    const filteredCoupons = useMemo(() => {
        if (!searchTerm) return coupons;
        const s = searchTerm.toLowerCase();
        return coupons.filter(c => c.code.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s));
    }, [coupons, searchTerm]);

    const getStatusBadge = (coupon) => {
        const now = new Date();
        if (!coupon.isActive) return { label: 'Inactive', color: 'rgba(107,114,128,0.15)', textColor: 'hsl(var(--muted-foreground))' };
        if (now > new Date(coupon.expiryDate)) return { label: 'Expired', color: 'rgba(239,68,68,0.12)', textColor: 'hsl(0, 72%, 55%)' };
        if (now < new Date(coupon.startDate)) return { label: 'Scheduled', color: 'rgba(59,130,246,0.12)', textColor: 'hsl(220, 70%, 55%)' };
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { label: 'Exhausted', color: 'rgba(245,158,11,0.12)', textColor: 'hsl(45, 80%, 40%)' };
        return { label: 'Active', color: 'rgba(16,185,129,0.12)', textColor: 'hsl(150, 60%, 45%)' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(220, 70%, 55%)' }} />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                        <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 55%), hsl(320, 50%, 55%))', color: 'white' }}>
                            <Ticket size={20} />
                        </div>
                        Coupon Management
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Create & manage discount coupons for your products
                    </p>
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 55%), hsl(320, 50%, 55%))', boxShadow: '0 4px 15px -3px hsla(280, 60%, 55%, 0.3)' }}>
                    <Plus size={16} /> Create Coupon
                </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { id: 'manage', label: 'Manage Coupons', icon: <Ticket size={15} /> },
                    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} /> },
                ].map(tab => (
                    <button key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={activeTab === tab.id
                            ? { background: 'linear-gradient(135deg, hsl(280, 60%, 55%), hsl(320, 50%, 55%))', color: 'white', boxShadow: '0 4px 15px -3px hsla(280, 60%, 55%, 0.3)' }
                            : { background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))', border: '1px solid var(--glass-border)' }
                        }>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'analytics' ? (
                /* ═══════ ANALYTICS TAB ═══════ */
                analyticsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(280, 60%, 55%)' }} />
                    </div>
                ) : !analyticsData || analyticsData.analytics?.length === 0 ? (
                    <div className="glass-panel p-12 text-center">
                        <BarChart3 size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'hsl(var(--muted-foreground))' }} />
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>No Analytics Data Yet</h3>
                        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Create coupons and wait for customers to use them to see analytics.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: 'Total Coupons', value: analyticsData.summary.totalCoupons, icon: <Ticket size={16} />, color: 'hsl(280, 60%, 55%)' },
                                { label: 'Active', value: analyticsData.summary.activeCoupons, icon: <Check size={16} />, color: 'hsl(150, 60%, 45%)' },
                                { label: 'Total Uses', value: analyticsData.summary.totalUses, icon: <Users size={16} />, color: 'hsl(220, 70%, 55%)' },
                                { label: 'Revenue Generated', value: formatPrice(analyticsData.summary.totalRevenueFromCoupons), icon: <TrendingUp size={16} />, color: 'hsl(45, 80%, 45%)' },
                                { label: 'Total Discounts', value: formatPrice(analyticsData.summary.totalDiscountGiven), icon: <ArrowDownRight size={16} />, color: 'hsl(0, 72%, 55%)' },
                                { label: 'Top Coupon', value: analyticsData.summary.topCouponCode || 'N/A', icon: <Award size={16} />, color: 'hsl(320, 50%, 55%)' },
                            ].map((stat, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    className="glass-panel p-3 sm:p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 rounded-lg" style={{ background: `${stat.color}15`, color: stat.color }}>{stat.icon}</div>
                                        <span className="text-[10px] sm:text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{stat.label}</span>
                                    </div>
                                    <p className="text-sm sm:text-lg font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{stat.value}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Coupon Performance Table */}
                        <div className="glass-panel overflow-hidden">
                            <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                                    <BarChart3 size={18} style={{ color: 'hsl(280, 60%, 55%)' }} />
                                    Coupon Performance
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                            {['Coupon', 'Type', 'Uses', 'Orders', 'Revenue', 'Discount Given', 'Avg Order', 'Unique Users', 'Conversion', 'Status'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analyticsData.analytics.map((c, i) => {
                                            const now = new Date();
                                            const isExpired = now > new Date(c.expiryDate);
                                            const isExhausted = c.maxUses && c.usedCount >= c.maxUses;
                                            let statusLabel = 'Active', statusColor = 'hsl(150, 60%, 45%)';
                                            if (!c.isActive) { statusLabel = 'Inactive'; statusColor = 'hsl(var(--muted-foreground))'; }
                                            else if (isExpired) { statusLabel = 'Expired'; statusColor = 'hsl(0, 72%, 55%)'; }
                                            else if (isExhausted) { statusLabel = 'Exhausted'; statusColor = 'hsl(45, 80%, 40%)'; }
                                            return (
                                                <tr key={c._id} className="transition-colors" style={{ borderBottom: '1px solid var(--glass-border)' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono font-bold text-xs tracking-wider" style={{ color: 'hsl(280, 60%, 55%)' }}>{c.code}</span>
                                                        {c.description && <p className="text-[10px] mt-0.5 truncate max-w-[120px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{c.description}</p>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        {c.discountType === 'percentage' ? `${c.discountValue}%` : formatPrice(c.discountValue)}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</td>
                                                    <td className="px-4 py-3">{c.ordersGenerated}</td>
                                                    <td className="px-4 py-3 font-semibold" style={{ color: 'hsl(150, 60%, 45%)' }}>{formatPrice(c.totalRevenue)}</td>
                                                    <td className="px-4 py-3" style={{ color: 'hsl(0, 72%, 55%)' }}>{formatPrice(c.totalDiscount)}</td>
                                                    <td className="px-4 py-3">{formatPrice(c.avgOrderValue)}</td>
                                                    <td className="px-4 py-3">{c.uniqueUsers}</td>
                                                    <td className="px-4 py-3">
                                                        {c.conversionRate !== null ? (
                                                            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: c.conversionRate > 50 ? 'hsl(150, 60%, 45%)' : 'hsl(45, 80%, 40%)' }}>
                                                                {c.conversionRate > 50 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                                {c.conversionRate}%
                                                            </span>
                                                        ) : <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>∞</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                                            style={{ background: `${statusColor}15`, color: statusColor }}>
                                                            {statusLabel}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Top Performing Coupons */}
                        <div className="glass-panel p-4 sm:p-5">
                            <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                                <Award size={18} style={{ color: 'hsl(45, 80%, 45%)' }} />
                                Top Performing Coupons
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {[...analyticsData.analytics]
                                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                                    .slice(0, 6)
                                    .map((c, i) => (
                                        <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            className="glass-inner rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono font-bold text-sm tracking-wider" style={{ color: 'hsl(280, 60%, 55%)' }}>{c.code}</span>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(16,185,129,0.1)', color: 'hsl(150, 60%, 45%)' }}>
                                                    #{i + 1}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>Revenue</span>
                                                    <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{formatPrice(c.totalRevenue)}</p>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>Uses</span>
                                                    <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{c.usedCount}</p>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>Orders</span>
                                                    <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{c.ordersGenerated}</p>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>Users</span>
                                                    <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{c.uniqueUsers}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )
            ) : (
            /* ═══════ MANAGE TAB ═══════ */
            <>


            {/* Search */}
            {coupons.length > 0 && (
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                    <input
                        type="text"
                        placeholder="Search coupons..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-input w-full pl-10 text-sm"
                    />
                </div>
            )}

            {/* Stats Cards */}
            {coupons.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Total Coupons', value: coupons.length, icon: <Ticket size={16} />, color: 'hsl(280, 60%, 55%)' },
                        { label: 'Active', value: coupons.filter(c => c.isActive && new Date() <= new Date(c.expiryDate)).length, icon: <Check size={16} />, color: 'hsl(150, 60%, 45%)' },
                        { label: 'Total Uses', value: coupons.reduce((s, c) => s + c.usedCount, 0), icon: <Users size={16} />, color: 'hsl(220, 70%, 55%)' },
                        { label: 'Expired', value: coupons.filter(c => new Date() > new Date(c.expiryDate)).length, icon: <Clock size={16} />, color: 'hsl(0, 72%, 55%)' },
                    ].map((stat, i) => (
                        <div key={i} className="glass-panel p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 rounded-lg" style={{ background: `${stat.color}15`, color: stat.color }}>{stat.icon}</div>
                                <span className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{stat.label}</span>
                            </div>
                            <p className="text-lg sm:text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {filteredCoupons.length === 0 && (
                <div className="glass-panel p-12 text-center">
                    <Ticket size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'hsl(var(--muted-foreground))' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                        {coupons.length === 0 ? 'No Coupons Yet' : 'No matching coupons'}
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {coupons.length === 0 ? 'Create your first coupon to boost sales!' : 'Try a different search term'}
                    </p>
                    {coupons.length === 0 && (
                        <motion.button whileTap={{ scale: 0.97 }} onClick={openCreate}
                            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                            style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 55%), hsl(320, 50%, 55%))' }}>
                            <Plus size={16} className="inline mr-1" /> Create First Coupon
                        </motion.button>
                    )}
                </div>
            )}

            {/* Coupons List */}
            <div className="space-y-4">
                {filteredCoupons.map((coupon) => {
                    const status = getStatusBadge(coupon);
                    return (
                        <motion.div key={coupon._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="glass-panel p-4 sm:p-5 hover:shadow-lg transition-shadow">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 55%), hsl(320, 50%, 55%))', color: 'white' }}>
                                        <Tag size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button onClick={() => copyCode(coupon.code)}
                                                className="font-mono text-base sm:text-lg font-bold tracking-wider flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                                                style={{ color: 'hsl(280, 60%, 55%)' }}>
                                                {coupon.code}
                                                {copiedCode === coupon.code ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                                style={{ background: status.color, color: status.textColor }}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                            <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'hsl(var(--foreground))' }}>
                                                {coupon.discountType === 'percentage' ? <Percent size={12} /> : <DollarSign size={12} />}
                                                {coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `${formatPrice(coupon.discountValue)} off`}
                                            </span>
                                            <span className="text-xs flex items-center gap-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                <Package size={12} />
                                                {coupon.applicableTo === 'all' ? 'All products' : `${coupon.applicableProducts?.length || 0} product(s)`}
                                            </span>
                                            <span className="text-xs flex items-center gap-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                <Users size={12} />
                                                {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ''} used
                                            </span>
                                            <span className="text-xs flex items-center gap-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                <Calendar size={12} />
                                                Expires {new Date(coupon.expiryDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {coupon.description && (
                                            <p className="text-xs mt-1 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{coupon.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleToggle(coupon._id)}
                                        className="p-2 rounded-lg glass-inner" title={coupon.isActive ? 'Deactivate' : 'Activate'}
                                        style={{ color: coupon.isActive ? 'hsl(150, 60%, 45%)' : 'hsl(var(--muted-foreground))' }}>
                                        {coupon.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                    </motion.button>
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => openEdit(coupon)}
                                        className="p-2 rounded-lg glass-inner" style={{ color: 'hsl(220, 70%, 55%)' }}>
                                        <Edit3 size={16} />
                                    </motion.button>
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDeleteConfirm(coupon._id)}
                                        className="p-2 rounded-lg glass-inner" style={{ color: 'hsl(0, 72%, 55%)' }}>
                                        <Trash2 size={16} />
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Delete Confirm Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="glass-panel-strong p-6 max-w-sm w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-full" style={{ background: 'rgba(239,68,68,0.12)' }}>
                                    <AlertTriangle size={20} style={{ color: 'hsl(0, 72%, 55%)' }} />
                                </div>
                                <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Delete Coupon?</h3>
                            </div>
                            <p className="text-sm mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                This action cannot be undone. The coupon will be permanently removed.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 rounded-xl glass-inner text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                    Cancel
                                </button>
                                <button onClick={() => handleDelete(deleteConfirm)}
                                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                                    style={{ background: 'hsl(0, 72%, 55%)' }}>
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                        onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="glass-panel-strong p-5 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                                    <Ticket size={20} style={{ color: 'hsl(280, 60%, 55%)' }} />
                                    {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                                </h3>
                                <button onClick={() => { setShowForm(false); resetForm(); }}
                                    className="p-1.5 rounded-lg glass-inner" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Code */}
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Coupon Code *</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={form.code}
                                            onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                            placeholder="e.g. SAVE20" className="glass-input flex-1 text-sm font-mono uppercase tracking-wider" />
                                        <button type="button" onClick={generateRandomCode}
                                            className="px-3 py-2 rounded-xl glass-inner text-xs font-medium whitespace-nowrap"
                                            style={{ color: 'hsl(280, 60%, 55%)' }}>
                                            Generate
                                        </button>
                                    </div>
                                    {formErrors.code && <p className="text-xs mt-1" style={{ color: 'hsl(0, 72%, 55%)' }}>{formErrors.code}</p>}
                                </div>

                                {/* Discount Type & Value */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Discount Type *</label>
                                        <select value={form.discountType} onChange={(e) => setForm(f => ({ ...f, discountType: e.target.value }))}
                                            className="glass-input w-full text-sm">
                                            <option value="percentage">Percentage (%)</option>
                                            <option value="fixed">Fixed Amount ($)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
                                            Discount Value * {form.discountType === 'percentage' ? '(%)' : '($)'}
                                        </label>
                                        <input type="number" min="0" max={form.discountType === 'percentage' ? 100 : undefined}
                                            value={form.discountValue} onChange={(e) => setForm(f => ({ ...f, discountValue: e.target.value }))}
                                            placeholder={form.discountType === 'percentage' ? '10' : '5.00'}
                                            className="glass-input w-full text-sm" />
                                        {formErrors.discountValue && <p className="text-xs mt-1" style={{ color: 'hsl(0, 72%, 55%)' }}>{formErrors.discountValue}</p>}
                                    </div>
                                </div>

                                {/* Applicable Products */}
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Apply To *</label>
                                    <div className="flex gap-3">
                                        <label className={`flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all text-center text-sm font-medium ${form.applicableTo === 'all' ? 'border-purple-500 bg-purple-50/50' : 'border-transparent glass-inner'}`}
                                            style={{ color: form.applicableTo === 'all' ? 'hsl(280, 60%, 55%)' : 'hsl(var(--muted-foreground))' }}>
                                            <input type="radio" className="sr-only" checked={form.applicableTo === 'all'}
                                                onChange={() => setForm(f => ({ ...f, applicableTo: 'all', applicableProducts: [] }))} />
                                            All Products
                                        </label>
                                        <label className={`flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all text-center text-sm font-medium ${form.applicableTo === 'selected' ? 'border-purple-500 bg-purple-50/50' : 'border-transparent glass-inner'}`}
                                            style={{ color: form.applicableTo === 'selected' ? 'hsl(280, 60%, 55%)' : 'hsl(var(--muted-foreground))' }}>
                                            <input type="radio" className="sr-only" checked={form.applicableTo === 'selected'}
                                                onChange={() => setForm(f => ({ ...f, applicableTo: 'selected' }))} />
                                            Selected Products
                                        </label>
                                    </div>
                                    {formErrors.applicableProducts && <p className="text-xs mt-1" style={{ color: 'hsl(0, 72%, 55%)' }}>{formErrors.applicableProducts}</p>}
                                </div>

                                {/* Product Picker */}
                                {form.applicableTo === 'selected' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                {form.applicableProducts.length} product(s) selected
                                            </span>
                                            <button type="button" onClick={() => setShowProductPicker(!showProductPicker)}
                                                className="text-xs font-semibold flex items-center gap-1"
                                                style={{ color: 'hsl(280, 60%, 55%)' }}>
                                                {showProductPicker ? 'Hide' : 'Select Products'}
                                                {showProductPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        </div>
                                        <AnimatePresence>
                                            {showProductPicker && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden">
                                                    <div className="max-h-48 overflow-y-auto space-y-1 glass-inner rounded-xl p-2">
                                                        {products.map(product => (
                                                            <label key={product._id}
                                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${form.applicableProducts.includes(product._id) ? 'bg-purple-50/70' : 'hover:bg-white/10'}`}>
                                                                <input type="checkbox" className="accent-purple-500 rounded"
                                                                    checked={form.applicableProducts.includes(product._id)}
                                                                    onChange={() => toggleProductSelection(product._id)} />
                                                                <img src={product.image} alt="" className="w-8 h-8 rounded object-cover" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{product.name}</p>
                                                                    <p className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{formatPrice(product.price)}</p>
                                                                </div>
                                                            </label>
                                                        ))}
                                                        {products.length === 0 && (
                                                            <p className="text-center text-xs py-4" style={{ color: 'hsl(var(--muted-foreground))' }}>No products found</p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Usage Limits */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
                                            Total Uses Limit
                                        </label>
                                        <input type="number" min="1" value={form.maxUses}
                                            onChange={(e) => setForm(f => ({ ...f, maxUses: e.target.value }))}
                                            placeholder="Unlimited" className="glass-input w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
                                            Uses Per User
                                        </label>
                                        <input type="number" min="1" value={form.maxUsesPerUser}
                                            onChange={(e) => setForm(f => ({ ...f, maxUsesPerUser: e.target.value }))}
                                            placeholder="1" className="glass-input w-full text-sm" />
                                    </div>
                                </div>

                                {/* Min Order & Max Discount */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
                                            Min. Order Amount
                                        </label>
                                        <input type="number" min="0" value={form.minOrderAmount}
                                            onChange={(e) => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                                            placeholder="No minimum" className="glass-input w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
                                            Max Discount Cap
                                        </label>
                                        <input type="number" min="0" value={form.maxDiscountAmount}
                                            onChange={(e) => setForm(f => ({ ...f, maxDiscountAmount: e.target.value }))}
                                            placeholder="No cap" className="glass-input w-full text-sm" />
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Start Date</label>
                                        <input type="date" value={form.startDate}
                                            onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                                            className="glass-input w-full text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Expiry Date *</label>
                                        <input type="date" value={form.expiryDate}
                                            onChange={(e) => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                                            className="glass-input w-full text-sm" />
                                        {formErrors.expiryDate && <p className="text-xs mt-1" style={{ color: 'hsl(0, 72%, 55%)' }}>{formErrors.expiryDate}</p>}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Description (optional)</label>
                                    <textarea value={form.description}
                                        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="e.g. Summer sale - 20% off all products"
                                        className="glass-input w-full text-sm h-20 resize-none" />
                                </div>

                                {/* Save Button */}
                                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                                    className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 55%), hsl(320, 50%, 55%))', boxShadow: '0 4px 15px -3px hsla(280, 60%, 55%, 0.3)' }}>
                                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> 
                                        : <>{editingCoupon ? 'Update Coupon' : 'Create Coupon'}</>}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            </>
            )}
        </div>
    );
};

export default CouponManagement;
