import { motion } from 'framer-motion';
import { Store, Package, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StoreCard = ({ store, idx }) => {
    const navigate = useNavigate();

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                delay: idx * 0.1
            }
        }
    };

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/store/${store.storeSlug}`)}
            className="bg-white rounded-2xl shadow-md hover:shadow-2xl border border-gray-100 overflow-hidden cursor-pointer transition-all group"
        >
            {/* Banner or Gradient */}
            {store.banner ? (
                <div className="h-32 overflow-hidden relative">
                    <img
                        src={store.banner}
                        alt={store.storeName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
            ) : (
                <div className="h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                </div>
            )}

            {/* Store Info */}
            <div className="p-5 relative">
                {/* Logo */}
                <div className="-mt-14 mb-3">
                    {store.logo ? (
                        <img
                            src={store.logo}
                            alt={store.storeName}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-4 border-white shadow-xl ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all">
                            <Store size={32} className="text-white" />
                        </div>
                    )}
                </div>

                {/* Store Name */}
                <h3 className="font-bold text-lg text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors">
                    {store.storeName}
                </h3>

                {/* Description */}
                {store.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px] leading-relaxed">
                        {store.description}
                    </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <Package size={16} />
                        <span>{store.productCount || 0} items</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-purple-600 font-medium">
                        <Eye size={16} />
                        <span>{store.views || 0} views</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default StoreCard;
