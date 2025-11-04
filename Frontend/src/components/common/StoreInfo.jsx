import { Store, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const StoreInfo = ({ storeName, storeSlug, storeLogo, sellerUsername }) => {
    // If no store configured, show seller username
    if (!storeName || !storeSlug) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">
                    Sold by <span className="font-medium text-gray-900">{sellerUsername || 'Seller'}</span>
                </p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4 shadow-sm"
        >
            <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Sold by</p>
            
            <Link to={`/store/${storeSlug}`} className="block group">
                <div className="flex items-center gap-3 mb-3">
                    {storeLogo ? (
                        <img
                            src={storeLogo}
                            alt={storeName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                            <Store size={24} className="text-white" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {storeName}
                        </h3>
                        <p className="text-xs text-gray-500">/{storeSlug}</p>
                    </div>
                </div>
            </Link>

            <Link to={`/store/${storeSlug}`}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-md"
                >
                    <Store size={16} />
                    Visit Store
                    <ExternalLink size={14} />
                </motion.button>
            </Link>
        </motion.div>
    );
};

export default StoreInfo;
