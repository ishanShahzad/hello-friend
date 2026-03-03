import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Truck, CheckCircle, XCircle, Clock, Package, RefreshCw, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import Loader from '../common/Loader';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';

const OrderManagement = () => {
    const { currentUser } = useAuth();
    const { formatPrice } = useCurrency();
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        const token = localStorage.getItem('jwtToken');
        setLoading(true);
        try {
            const query = serializeFilters();
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/order/get?${query}`, { headers: { Authorization: `Bearer ${token}` } });
            setOrders(res.data?.orders);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const serializeFilters = () => {
        let params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (dateRange.start && dateRange.end) { params.append('startDate', dateRange.start); params.append('endDate', dateRange.end); }
        return params.toString();
    };

    useEffect(() => { fetchOrders(); }, [searchTerm, statusFilter, paymentFilter, dateRange]);

    const getStatusIcon = (status) => {
        const icons = { pending: <Clock className="w-3.5 h-3.5" />, processing: <RefreshCw className="w-3.5 h-3.5" />, shipped: <Truck className="w-3.5 h-3.5" />, delivered: <CheckCircle className="w-3.5 h-3.5" />, cancelled: <XCircle className="w-3.5 h-3.5" /> };
        return icons[status] || <Package className="w-3.5 h-3.5" />;
    };

    const getStatusStyle = (status) => {
        const styles = {
            pending: { bg: 'rgba(249, 115, 22, 0.12)', color: 'hsl(30, 90%, 50%)' },
            processing: { bg: 'rgba(99, 102, 241, 0.12)', color: 'hsl(220, 70%, 55%)' },
            shipped: { bg: 'rgba(14, 165, 233, 0.12)', color: 'hsl(200, 80%, 50%)' },
            delivered: { bg: 'rgba(16, 185, 129, 0.12)', color: 'hsl(150, 60%, 40%)' },
            cancelled: { bg: 'rgba(239, 68, 68, 0.12)', color: 'hsl(0, 72%, 55%)' }
        };
        return styles[status] || { bg: 'rgba(255,255,255,0.08)', color: 'hsl(var(--muted-foreground))' };
    };

    return (
        <div className="min-h-screen p-3 sm:p-4 lg:p-6">
            <div className="glass-panel overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-6" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>Order Management</h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>View and manage all customer orders</p>
                </div>

                {/* Filters */}
                <div className="p-4 sm:p-6 glass-inner" style={{ borderBottom: '1px solid var(--glass-border)', borderRadius: 0 }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="search-input-wrapper sm:col-span-2 lg:col-span-1">
                            <div className="search-input-icon"><Search size={16} /></div>
                            <input type="text" placeholder="Search by ID or name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="glass-input glass-input-search" />
                        </div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-input cursor-pointer font-medium">
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="glass-input cursor-pointer font-medium">
                            <option value="all">All Payments</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>
                </div>

                {/* Orders */}
                <div className={`${loading && 'h-[280px] flex justify-center items-center'}`}>
                    {loading ? <Loader /> : orders.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="glass-inner p-4 rounded-2xl inline-block mb-3"><Package className="h-10 w-10" style={{ color: 'hsl(var(--muted-foreground))' }} /></div>
                            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No orders found matching your criteria</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <table className="w-full hidden md:table">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        {['Order ID', 'Customer', 'Date', 'Payment', 'Status', 'Total', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.reverse().map((order) => {
                                        const ss = getStatusStyle(order.orderStatus);
                                        return (
                                            <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition-colors hover:bg-white/5" style={{ borderBottom: '1px solid var(--glass-border-subtle)' }}>
                                                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{order.orderId}</td>
                                                <td className="px-4 py-3 text-sm truncate max-w-[150px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{order.shippingInfo.fullName}</td>
                                                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={order.isPaid ? { background: 'rgba(16, 185, 129, 0.12)', color: 'hsl(150, 60%, 40%)' } : { background: 'rgba(239, 68, 68, 0.12)', color: 'hsl(0, 72%, 55%)' }}>
                                                        {order.isPaid ? "Paid" : "Unpaid"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 text-xs rounded-full flex items-center gap-1 w-fit font-medium" style={{ background: ss.bg, color: ss.color }}>
                                                        {getStatusIcon(order.orderStatus)}
                                                        <span className="hidden xl:inline">{order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                                                    {(() => {
                                                        if (currentUser?.role === 'seller') return formatPrice(order.orderSummary.totalAmount || order.orderSummary.subtotal || 0);
                                                        const subtotal = order.orderSummary.subtotal || 0;
                                                        const tax = order.orderSummary.tax || 0;
                                                        let shipping = order.orderSummary.shippingCost || 0;
                                                        if (order.sellerShipping?.length > 0) shipping = order.sellerShipping.reduce((sum, s) => sum + (s.shippingMethod.price || 0), 0);
                                                        return formatPrice(subtotal + tax + shipping);
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link to={`/${currentUser?.role === 'seller' ? 'seller' : 'admin'}-dashboard/order/${order._id}`}>
                                                        <button className="text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>View</button>
                                                    </Link>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-3 p-3">
                                {orders.map((order) => {
                                    const ss = getStatusStyle(order.orderStatus);
                                    return (
                                        <motion.div key={order._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-inner rounded-xl p-4">
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <div className="min-w-0 flex-1">
                                                    <h2 className="font-semibold text-sm truncate" style={{ color: 'hsl(var(--foreground))' }}>{order.orderId}</h2>
                                                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{order.shippingInfo.fullName}</p>
                                                </div>
                                                <span className="px-2 py-0.5 text-xs rounded-full flex items-center gap-1 font-medium shrink-0" style={{ background: ss.bg, color: ss.color }}>
                                                    {getStatusIcon(order.orderStatus)}
                                                    {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{new Date(order.createdAt).toLocaleDateString()}</span>
                                                <Link to={`/${currentUser?.role === 'seller' ? 'seller' : 'admin'}-dashboard/order/${order._id}`}>
                                                    <button className="text-xs font-medium" style={{ color: 'hsl(var(--primary))' }}>View Details</button>
                                                </Link>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderManagement;
