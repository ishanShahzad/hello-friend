import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Edit, MoreHorizontal,
    Truck, CheckCircle, XCircle, Clock,
    Package, ArrowLeft, RefreshCw, X,
    SeparatorVertical,

} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom';
import Loader from '../common/Loader';
import { useAuth } from '../../contexts/AuthContext';

const OrderManagement = () => {
    const { currentUser } = useAuth();

    const fetchOrders = async () => {

        const token = localStorage.getItem('jwtToken')
        setLoading(true)
        try {
            const query = serializeFilters()
            console.log(query);

            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/order/get?${query}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            console.log(res.data);
            setOrders(res.data?.orders)
        } catch (error) {
            console.error(error);
        }
        finally {
            setLoading(false)
        }
    }


    const serializeFilters = () => {
        let params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter)
        if (statusFilter !== 'all') params.append('status', statusFilter)
        if (dateRange.start !== '' && dateRange.end !== '') {
            params.append('startDate', dateRange.start)
            params.append('endDate', dateRange.end)
        }

        return params.toString()
    }



    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    // const [filteredOrders, setFilteredOrders] = useState(orders);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(true)

    // useEffect(()=>{
    //     const {}
    // },[selectedOrder])

    useEffect(() => {
        fetchOrders()
    }, [searchTerm, statusFilter, paymentFilter, dateRange]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'processing': return <RefreshCw className="w-4 h-4" />;
            case 'shipped': return <Truck className="w-4 h-4" />;
            case 'delivered': return <CheckCircle className="w-4 h-4" />;
            case 'cancelled': return <XCircle className="w-4 h-4" />;
            default: return <Package className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'processing': return 'bg-blue-100 text-blue-800';
            case 'shipped': return 'bg-indigo-100 text-indigo-800';
            case 'delivered': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 p-6 ">
            <OrderList
                orders={orders}
                onSelectOrder={setSelectedOrder}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                paymentFilter={paymentFilter}
                onPaymentFilterChange={setPaymentFilter}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                loading={loading}
                currentUser={currentUser}
            />
            {/* {selectedOrder ? (
                <OrderDetail
                    order={selectedOrder}
                    onBack={() => setSelectedOrder(null)}
                    onCancelOrder={cancelOrder}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                />
            ) : (
            )} */}
        </div>
    );
};

const OrderList = ({
    orders,
    onSelectOrder,
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    paymentFilter,
    onPaymentFilterChange,
    dateRange,
    onDateRangeChange,
    getStatusIcon,
    getStatusColor,
    loading,
    currentUser
}) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full bg-white rounded-lg shadow"
        >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
                <p className="text-gray-600">View and manage all customer orders</p>
            </div>

            {/* Filters */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by ID or name"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pr-9 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex-1 min-w-[150px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Payment Filter */}
                    <div className="flex-1 min-w-[150px]">
                        <select
                            value={paymentFilter}
                            onChange={(e) => onPaymentFilterChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Payments</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    {/* <div className="flex flex-col sm:flex-row gap-2 flex-1">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div> */}
                </div>
            </div>

            {/* Orders Table */}
            <div className={`${loading && 'h-[280px] flex justify-center items-center'} overflow-x-auto`}>
                {
                    loading ? <Loader /> :
                        orders.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Package className="mx-auto h-12 w-12" />
                                <p className="mt-4">No orders found matching your criteria</p>
                            </div>
                        )
                    :
                (
                <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Customer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        <AnimatePresence>
                            {orders.reverse().map((order) => (
                                <motion.tr
                                    key={order._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div className="flex flex-col gap-1">
                                            <span>{order.orderId}</span>
                                            {order.spinDiscount?.applied && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-[10px] font-semibold rounded-full border border-purple-200 w-fit">
                                                    🎉 Spin Discount
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.shippingInfo.fullName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${order.isPaid
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {order.isPaid ? "Paid" : "Unpaid"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 w-fit ${getStatusColor(
                                                order.orderStatus
                                            )}`}
                                        >
                                            {getStatusIcon(order.orderStatus)}
                                            <span>
                                                {order.orderStatus.charAt(0).toUpperCase() +
                                                    order.orderStatus.slice(1)}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${order.orderSummary.totalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link to={`/${currentUser?.role === 'seller' ? 'seller' : 'admin'}-dashboard/order/${order._id}`}>
                                            <button
                                                // onClick={() => onSelectOrder(order)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View Details
                                            </button>
                                        </Link>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                )
                }

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                    {orders.map((order) => (
                        <motion.div
                            key={order._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="border rounded-lg p-4 bg-white shadow-sm"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="font-semibold text-gray-800">{order.orderId}</h2>
                                    {order.spinDiscount?.applied && (
                                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-[10px] font-semibold rounded-full border border-purple-200">
                                            🎉 Spin Discount
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`px-2 py-1 text-xs rounded-full ${order.isPaid
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                        }`}
                                >
                                    {order.isPaid ? "Paid" : "Unpaid"}
                                </span>
                            </div>
                            <p className="text-gray-600">{order.shippingInfo.fullName}</p>
                            <p className="text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex justify-between items-center mt-2">
                                <span
                                    className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getStatusColor(
                                        order.orderStatus
                                    )}`}
                                >
                                    {getStatusIcon(order.orderStatus)}
                                    <span>
                                        {order.orderStatus.charAt(0).toUpperCase() +
                                            order.orderStatus.slice(1)}
                                    </span>
                                </span>
                                <span className="text-sm font-medium text-gray-700">
                                    ${order.orderSummary.totalAmount.toLocaleString()}
                                </span>
                            </div>
                            <button
                                onClick={() => onSelectOrder(order)}
                                className="mt-3 w-full text-blue-600 hover:text-blue-900 text-sm"
                            >
                                View Details
                            </button>
                        </motion.div>
                    ))}
                </div>


            </div>
        </motion.div>


    );
};



export default OrderManagement;