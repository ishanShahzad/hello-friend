import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassBackground from '../common/GlassBackground';
import {
    // ✅ User Dashboard essentials
    User,
    ShoppingCart,
    CreditCard,
    HelpCircle,
    LogOut,
    Home,

    // ✅ Extra icons (for Admin dashboard or other features)
    BarChart3,
    Package,
    Plus,
    Edit,
    Trash2,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    X,
    Tag,
    Star,
    Image as ImageIcon,
    DollarSign,
    Hash,
    BookOpen,
    Grid,
    CheckSquare,
    AlertCircle,
    Menu,
    TriangleAlert,
    TrafficCone,
    LayoutPanelLeft,
    ShoppingBag,
    Users,
    LayoutDashboard,
} from "lucide-react";

import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import OrderManagement from './orders';
import StoreOverview from './StoreOverview';
import ProductManagement from './ProductManagement';



const UserDashboard = () => {

    const [isMobile, setIsMobile] = useState(false);
    // Check if device is mobile on initial render and resize
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        // Initial check
        checkIsMobile();

        // Add event listener for window resize
        window.addEventListener('resize', checkIsMobile);

        // Cleanup
        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);




    const [activeTab, setActiveTab] = useState('account overview');
    const [orders, setOrders] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [loading, setLoading] = useState(true)



    const serializeFilters = () => {
        let params = new URLSearchParams()
        if (selectedCategory !== 'all') params.append('categories', selectedCategory)
        if (searchTerm !== '') params.append('search', searchTerm)

        // console.log(params.toString());
        return params.toString()
    }

    // useEffect(() => {
    //     fetchOrders()
    // }, [searchTerm, selectedCategory])





    // GET ORDERS
    // const fetchOrders = async () => {

    //     const token = localStorage.getItem('jwtToken')
    //     setLoading(true)
    //     try {
    //         const query = serializeFilters()
    //         // console.log(query);
    //         const res = await axios.get(`${import.meta.env.VITE_API_URL}api/order/get?${query}`,
    //             {
    //                 headers: {
    //                     Authorization: `Bearer ${token}`
    //                 }
    //             }
    //         )
    //         console.log(res.data);
    //         setOrders(res.data?.orders)
    //     } catch (error) {
    //         console.error(error);
    //     }
    //     finally {
    //         setLoading(false)
    //     }
    // }


    const outletContext = useMemo(() => ({
        // // orders,
        // categories,
        // searchTerm,
        // setSearchTerm,
        // selectedCategory,
        // setSelectedCategory,
        // deleteConfirm,
        // setDeleteConfirm,
        // loading
    }), [
        categories, searchTerm, selectedCategory
    ]);


    return (
        <div className="min-h-screen relative flex" style={{ background: 'linear-gradient(135deg, hsl(230, 35%, 88%) 0%, hsl(210, 40%, 90%) 25%, hsl(250, 30%, 92%) 50%, hsl(200, 35%, 88%) 75%, hsl(280, 25%, 90%) 100%)', backgroundAttachment: 'fixed' }}>
            <GlassBackground />

            {/* Sidebar */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Main Content */}
            <div className={`flex-1 ${!isMobile ? 'ml-64' : 'pt-8'} `}>
                <Outlet context={outletContext} />
            </div>


        </div>
    );
};

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab }) => {
    const { currentUser } = useAuth()

    const menuItems = [
        { id: 'account overview', label: 'Account Overview', icon: <LayoutDashboard size={18} />, link: '/user-dashboard/account-overview' },
        { id: 'profile', label: 'Profile', icon: <User size={18} />, link: '/user-dashboard/profile' },
        { id: 'orders', label: 'Your Orders', icon: <ShoppingCart size={18} />, link: '/user-dashboard/orders' },
    ];

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const location = useLocation()

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    useEffect(() => {
        menuItems.forEach(item => { if (item.link === location.pathname) setActiveTab(item.id) })
    }, [location])

    const handleTabClick = (tabId) => { setActiveTab(tabId); if (isMobile) setIsSidebarOpen(false); };

    const SidebarContent = () => (
        <div className="flex flex-col h-full glass-panel-strong water-shimmer" style={{ borderRadius: '0 28px 28px 0' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-6 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border"
                        style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                        {currentUser?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <p className="font-semibold text-sm leading-tight truncate max-w-[120px]" style={{ color: 'hsl(var(--foreground))' }}>{currentUser?.username || 'User'}</p>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'hsl(220, 70%, 55%)' }}>Member</span>
                    </div>
                </div>
                {isMobile && (
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg glass-inner transition-colors"
                        style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="mx-4 h-px" style={{ background: 'var(--glass-border)' }} />

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <p className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Menu</p>
                {menuItems.map(item => {
                    const isActive = activeTab === item.id
                    return (
                        <Link key={item.id} to={item.link}>
                            <motion.button whileHover={{ x: 2 }} onClick={() => handleTabClick(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'border shadow-sm' : 'hover:bg-white/8'}`}
                                style={isActive ? {
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    color: 'hsl(var(--foreground))',
                                    borderColor: 'rgba(99, 102, 241, 0.25)'
                                } : { color: 'hsl(var(--muted-foreground))' }}>
                                <span style={{ color: isActive ? 'hsl(220, 70%, 55%)' : 'hsl(var(--muted-foreground))' }}>{item.icon}</span>
                                {item.label}
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(220, 70%, 55%)' }} />}
                            </motion.button>
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 pb-5 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <Link to="/">
                    <motion.button whileHover={{ x: 2 }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <LayoutPanelLeft size={18} />
                        Back to Store
                    </motion.button>
                </Link>
            </div>
        </div>
    )

    return (
        <>
            {isMobile && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsSidebarOpen(true)}
                    className="fixed top-4 left-4 z-50 bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
                    <Menu size={20} />
                </motion.button>
            )}

            <AnimatePresence>
                {isMobile && isSidebarOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={() => setIsSidebarOpen(false)} />
                )}
            </AnimatePresence>

            <motion.div
                initial={isMobile ? { x: '-100%' } : false}
                animate={isMobile ? { x: isSidebarOpen ? 0 : '-100%' } : { x: 0 }}
                transition={{ type: 'tween', ease: 'easeInOut', duration: 0.28 }}
                className="fixed top-0 left-0 h-full w-64 z-50 shadow-2xl overflow-hidden">
                <SidebarContent />
            </motion.div>
        </>
    );
};

export default UserDashboard;