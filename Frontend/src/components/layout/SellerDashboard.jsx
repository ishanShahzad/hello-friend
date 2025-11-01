import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3,
    Package,
    X,
    Menu,
    LayoutPanelLeft,
    ShoppingBag,
    Star,
} from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { Link, Outlet, useLocation } from 'react-router-dom';

const SellerDashboard = () => {
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    const [activeTab, setActiveTab] = useState('overview');
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchFilters = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/products/get-filters`);
            setCategories(res.data.categories);
        } catch (error) {
            console.error(error);
            setCategories([]);
        }
    };

    useEffect(() => {
        fetchFilters();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const query = serializeFilters();
            const token = localStorage.getItem('jwtToken');
            // Fetch only seller's products
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/products/get-seller-products?${query}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts(res.data.products);
        } catch (err) {
            console.log(err);
            toast.error(err.response?.data?.msg || 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    const serializeFilters = () => {
        let params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('categories', selectedCategory);
        if (searchTerm !== '') params.append('search', searchTerm);
        return params.toString();
    };

    useEffect(() => {
        fetchProducts();
        fetchOrders();
    }, [searchTerm, selectedCategory]);

    const handleCreateProduct = () => {
        setEditingProduct({
            name: '',
            description: '',
            price: '',
            discountedPrice: "",
            category: '',
            brand: '',
            stock: "",
            image: '',
            images: [],
            tags: [],
            isFeatured: false
        });
        setIsFormOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct({ ...product });
        setIsFormOpen(true);
    };

    const handleSaveProduct = async () => {
        console.log('=== SAVE PRODUCT DEBUG ===');
        console.log('Editing product:', editingProduct);
        console.log('Has _id?', !!editingProduct._id);
        
        if (editingProduct._id) {
            try {
                const token = localStorage.getItem('jwtToken');
                console.log('Updating product with ID:', editingProduct._id);
                const res = await axios.put(`${import.meta.env.VITE_API_URL}api/products/edit/${editingProduct._id}`,
                    { product: editingProduct },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success(res.data.msg);
                fetchProducts();
                fetchFilters();
            } catch (error) {
                console.error('Update error:', error.response?.data);
                toast.error(error.response?.data?.msg || 'Failed to update product');
            }
        } else {
            try {
                const token = localStorage.getItem('jwtToken');
                console.log('Token from localStorage:', token ? 'exists' : 'missing');
                console.log('API URL:', import.meta.env.VITE_API_URL);
                console.log('Full URL:', `${import.meta.env.VITE_API_URL}api/products/add`);
                console.log('Adding new product');
                const res = await axios.post(`${import.meta.env.VITE_API_URL}api/products/add`,
                    { product: editingProduct },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log('Add product response:', res.data);
                toast.success(res.data.msg);
                fetchProducts();
                fetchFilters();
            } catch (error) {
                console.error('Add error full:', error);
                console.error('Add error response:', error.response);
                console.error('Add error data:', error.response?.data);
                toast.error(error.response?.data?.msg || 'Failed to add product');
            }
        }
        setIsFormOpen(false);
        setEditingProduct(null);
    };

    const handleDeleteProduct = async (id) => {
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.delete(`${import.meta.env.VITE_API_URL}api/products/delete/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(res.data.msg || 'Product deleted successfully');
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to delete product');
        }
        setDeleteConfirm(null);
    };

    const fetchOrders = async () => {
        const token = localStorage.getItem('jwtToken');
        try {
            const query = serializeFilters();
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/order/get?${query}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setOrders(res.data?.orders || []);
        } catch (error) {
            console.error(error);
        }
    };

    const outletContext = useMemo(() => ({
        products,
        orders,
        categories,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        deleteConfirm,
        setDeleteConfirm,
        handleEditProduct,
        handleCreateProduct,
        handleDeleteProduct,
        loading,
        fetchProducts
    }), [
        products, categories, searchTerm, selectedCategory, deleteConfirm,
        handleEditProduct, handleCreateProduct, handleDeleteProduct, loading
    ]);

    return (
        <div className="min-h-screen relative bg-gray-50 flex">
            <ToastContainer position='top-center' autoClose={2300} />
            
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className={`flex-1 ${!isMobile && 'ml-64'} `}>
                <div className="">
                    <Outlet context={outletContext} />
                </div>
            </div>

            <AnimatePresence>
                {isFormOpen && (
                    <ProductForm
                        product={editingProduct}
                        setProduct={setEditingProduct}
                        onSave={handleSaveProduct}
                        onClose={() => {
                            setIsFormOpen(false);
                            setEditingProduct(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SellerDashboard;


// Sidebar Component for Seller (without User Management)
const Sidebar = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'overview', label: 'Store Overview', icon: <BarChart3 size={20} />, link: '/seller-dashboard/store-overview' },
        { id: 'products', label: 'Product Management', icon: <Package size={20} />, link: '/seller-dashboard/product-management' },
        { id: 'orders', label: 'Order Management', icon: <ShoppingBag size={20} />, link: '/seller-dashboard/order-management' },
    ];

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        checkUrl();
        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    const location = useLocation();

    const checkUrl = () => {
        menuItems.forEach(item => {
            if (item.link === location.pathname) handleTabClick(item.id);
        });
    };

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <>
            {isMobile && (
                <button
                    onClick={toggleSidebar}
                    className="fixed top-3 left-3 z-1 bg-green-700 text-white p-2 rounded-md shadow-lg lg:hidden"
                    aria-label="Open menu"
                >
                    <Menu size={24} />
                </button>
            )}

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
                    <h1 className="text-xl font-bold text-gray-800">Seller Dashboard</h1>
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
                                <li>
                                    <button
                                        onClick={() => handleTabClick(item.id)}
                                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === item.id
                                            ? 'bg-green-100 text-green-700'
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
                            <li>
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


// Product Form Component (reused from Admin with green theme)
const ProductForm = ({ product, setProduct, onSave, onClose }) => {
    const [newTag, setNewTag] = useState("");
    const [newImage, setNewImage] = useState("");

    const handleAddTag = () => {
        if (newTag.trim() && !product.tags.includes(newTag.trim())) {
            setProduct({
                ...product,
                tags: [...product.tags, newTag.trim()],
            });
            setNewTag("");
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setProduct({
            ...product,
            tags: product.tags.filter((tag) => tag !== tagToRemove),
        });
    };

    const handleAddImage = () => {
        if (newImage.trim()) {
            setProduct({
                ...product,
                images: [...product.images, { url: newImage.trim() }],
            });
            setNewImage("");
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        setProduct({
            ...product,
            images: product.images.filter((_, index) => index !== indexToRemove),
        });
    };

    const handleSetMainImage = (url) => {
        setProduct({
            ...product,
            image: url,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                        {product._id ? "Edit Product" : "Add New Product"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                        }
                    }}
                    onSubmit={handleSubmit} className="p-6 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={product.name}
                                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Enter product name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Brand *
                            </label>
                            <input
                                type="text"
                                required
                                value={product.brand}
                                onChange={(e) => setProduct({ ...product, brand: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Enter brand name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <input
                                type="text"
                                required
                                value={product.category}
                                onChange={(e) =>
                                    setProduct({ ...product, category: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Enter category"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stock *
                            </label>
                            <input
                                type="number"
                                min={0}
                                required
                                value={product.stock}
                                onChange={(e) =>
                                    setProduct({ ...product, stock: Math.round(e.target.value) || 0 })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Enter stock quantity"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price ($) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={product.price}
                                onChange={(e) =>
                                    setProduct({
                                        ...product,
                                        price: parseFloat(e.target.value) || 0,
                                    })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Enter price"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discounted Price ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={product.discountedPrice}
                                onChange={(e) =>
                                    setProduct({
                                        ...product,
                                        discountedPrice: parseFloat(e.target.value) || 0,
                                    })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Enter discounted price (optional)"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            required
                            value={product.description}
                            onChange={(e) =>
                                setProduct({ ...product, description: e.target.value })
                            }
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Enter product description"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Main Image URL *
                        </label>
                        <input
                            type="text"
                            required
                            value={product.image}
                            onChange={(e) => setProduct({ ...product, image: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Enter main image URL"
                        />
                        {product.image && (
                            <div className="mt-2">
                                <img
                                    src={product.image}
                                    alt="Main preview"
                                    className="h-40 object-cover rounded-lg"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Additional Images
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newImage}
                                    onChange={(e) => setNewImage(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Enter image URL"
                                />
                                <motion.button
                                    type='button'
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleAddImage}
                                    className="bg-green-700 text-white px-3 py-2 rounded-lg"
                                >
                                    Add
                                </motion.button>
                            </div>
                        </div>

                        {product.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {product.images.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={img.url}
                                            alt={`Product view ${index + 1}`}
                                            className="h-32 w-full object-cover rounded-lg"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2 transition-opacity rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => handleSetMainImage(img.url)}
                                                className="p-1 bg-white rounded-full text-green-700"
                                                title="Set as main image"
                                            >
                                                <Star size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(index)}
                                                className="p-1 bg-white rounded-full text-red-600"
                                                title="Remove image"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        {img.url === product.image && (
                                            <div className="absolute top-2 left-2 bg-green-700 text-white text-xs px-2 py-1 rounded-full">
                                                Main
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Tags
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Enter tag"
                                />
                                <motion.button
                                    type='button'
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleAddTag}
                                    className="bg-green-700 text-white px-3 py-2 rounded-lg"
                                >
                                    Add
                                </motion.button>
                            </div>
                        </div>

                        {product.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {product.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1.5 rounded-full flex-shrink-0 text-green-700 hover:text-green-900"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center">
                        <input
                            id="featured"
                            type="checkbox"
                            checked={product.isFeatured}
                            onChange={(e) =>
                                setProduct({ ...product, isFeatured: e.target.checked })
                            }
                            className="h-4 w-4 text-green-700 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">
                            Feature this product on homepage
                        </label>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
                        >
                            {product._id ? "Update Product" : "Create Product"}
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </motion.div >
    );
};
