import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Search, Loader2, Home, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import StoreCard from '../components/common/StoreCard';
import Loader from '../components/common/Loader';

const StoresListing = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    useEffect(() => {
        fetchStores();
    }, [sortBy]);

    const fetchStores = async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}api/stores/all?sort=${sortBy}`
            );
            setStores(res.data?.stores || []);
        } catch (error) {
            console.error('Error fetching stores:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStores = stores.filter(store =>
        store.storeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div 
            className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <motion.div
                    className="flex items-center text-sm text-gray-500 mb-6"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Link to="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                        <Home size={16} />
                        <span>Home</span>
                    </Link>
                    <ChevronRight size={16} className="mx-2" />
                    <span className="text-gray-800 font-medium">All Stores</span>
                </motion.div>

                {/* Header */}
                <motion.div 
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
                                <Store size={32} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                                    Discover Stores
                                </h1>
                                <p className="text-gray-600 mt-1">Explore amazing sellers and their unique products</p>
                            </div>
                        </div>
                        <Link
                            to="/stores/trusted"
                            className="hidden md:flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg font-medium"
                        >
                            <span>❤️</span>
                            <span>My Trusted Stores</span>
                        </Link>
                    </div>
                    {/* Mobile button */}
                    <Link
                        to="/stores/trusted"
                        className="md:hidden flex items-center justify-center gap-2 w-full px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg font-medium mt-4"
                    >
                        <span>❤️</span>
                        <span>My Trusted Stores</span>
                    </Link>
                </motion.div>

                {/* Search and Sort Card */}
                <motion.div 
                    className="bg-white rounded-2xl shadow-lg p-6 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for stores..."
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white transition-all cursor-pointer"
                        >
                            <option value="newest">✨ Newest First</option>
                            <option value="views">👁️ Most Viewed</option>
                            <option value="name">🔤 Name (A-Z)</option>
                        </select>
                    </div>
                </motion.div>

                {/* Stores Grid */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader />
                    </div>
                ) : filteredStores.length === 0 ? (
                    <motion.div 
                        className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl shadow-sm"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Store size={64} className="text-gray-300 mb-4" />
                        <p className="text-lg font-semibold text-gray-700">
                            {searchQuery ? 'No stores found' : 'No stores available yet'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {searchQuery ? 'Try a different search term' : 'Check back later for new stores'}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-gray-600 font-medium">
                                Showing <span className="text-gray-900 font-bold">{filteredStores.length}</span> {filteredStores.length === 1 ? 'store' : 'stores'}
                            </p>
                            {filteredStores.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Sparkles size={16} className="text-yellow-500" />
                                    <span>Find your favorite seller</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                            {filteredStores.map((store, idx) => (
                                <motion.div
                                    key={store._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                                >
                                    <StoreCard store={store} idx={idx} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default StoresListing;
