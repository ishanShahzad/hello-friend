import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { toast, ToastContainer } from 'react-toastify';
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
    //         const res = await axios.get(`http://localhost:5000/api/order/get?${query}`,
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
        <div className="min-h-screen relative bg-gray-50 flex">

            <ToastContainer position='top-center' autoClose={2300} />
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
// import React, { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { BarChart3, Package, X, Menu } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {

    const {
        currentUser
    } = useAuth()

    const menuItems = [
        {
            id: 'account overview',
            label: 'Account Overview',
            icon: <LayoutDashboard size={20} />,
            link: '/user-dashboard/account-overview'
        },
        {
            id: 'profile',
            label: 'Profile',
            icon: <User size={20} />,
            link: '/user-dashboard/profile'
        },
        {
            id: 'orders',
            label: 'Your Orders',
            icon: <ShoppingCart size={20} />,
            link: '/user-dashboard/orders'
        },
    ];


    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        checkUrl()

        // Cleanup
        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    const location = useLocation()
    // console.log(location);

    const checkUrl = () => {
        menuItems.forEach(item => {
            if (item.link === location.pathname) handleTabClick(item.id)
        })
    }

    useEffect(() => {
        checkUrl()
    }, [location])


    // Close sidebar when switching tabs on mobile
    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    };

    // Toggle sidebar visibility on mobile
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <>
            {/* Mobile menu button */}
            {isMobile && (
                <button
                    onClick={toggleSidebar}
                    className="fixed top-3 left-3 z-1 bg-blue-600 text-white p-2 rounded-md shadow-lg lg:hidden"
                    aria-label="Open menu"
                >
                    <Menu size={24} />
                </button>
            )}

            {/* Overlay for mobile when sidebar is open */}
            <AnimatePresence>
                {isMobile && isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 bg-opacity-50 z-40 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.div
                initial={isMobile ? { x: '-100%' } : false}
                animate={
                    isMobile
                        ? { x: isSidebarOpen ? 0 : '-100%' }
                        : { x: 0 }
                }
                transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
                className={`fixed top-0 left-0 min-h-full w-64 bg-white shadow-lg flex flex-col z-40 ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'
                    } lg:translate-x-0`}
            >
                <div className="flex justify-between items-center p-6 border-b">
                    <h1 className="text-xl font-bold text-gray-800">{currentUser.username || 'User Dashboard'}</h1>
                    {isMobile && (
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                            aria-label="Close menu"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 p-4 overflow-y-auto">
                    <ul className="space-y-2">
                        {menuItems.map(item => (
                            <Link key={item.id} to={item.link}>
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleTabClick(item.id)}
                                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === item.id
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {item.icon}
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                </li>
                            </Link>

                        ))}
                        <Link to={'/'}>
                            <li >
                                <button
                                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-gray-600 hover:bg-gray-100`}
                                >
                                    <LayoutPanelLeft size={20} />
                                    <span className="font-medium">Home Page</span>
                                </button>
                            </li>
                        </Link>

                    </ul>
                </nav>
            </motion.div>
        </>
    );
};

export default UserDashboard;