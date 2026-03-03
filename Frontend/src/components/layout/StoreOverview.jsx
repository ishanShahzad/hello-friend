import React from "react";
import { motion } from "framer-motion";
import { Package, TriangleAlert, AlertCircle, Star, DollarSign } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useCurrency } from "../../contexts/CurrencyContext";

const StoreOverview = () => {
    const { formatPrice, currency, exchangeRates, getCurrencySymbol } = useCurrency();
    const { products, orders } = useOutletContext();

    const formatCompactPrice = (amount) => {
        const usdAmount = Number(amount) || 0;
        const rate = exchangeRates[currency] || 1;
        const convertedAmount = usdAmount * rate;
        const symbol = getCurrencySymbol();
        if (convertedAmount >= 1000000000) return `${symbol}${(convertedAmount / 1000000000).toFixed(1)}B`;
        if (convertedAmount >= 1000000) return `${symbol}${(convertedAmount / 1000000).toFixed(1)}M`;
        if (convertedAmount >= 10000) return `${symbol}${(convertedAmount / 1000).toFixed(1)}K`;
        return formatPrice(usdAmount);
    };

    const totalProducts = products.length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock <= 10 && p.stock !== 0).length;
    const featuredProducts = products.filter(p => p.isFeatured).length;
    const totalRevenue = orders.reduce((sum, order) => order.isPaid ? sum + order.orderSummary.totalAmount : sum, 0);

    const stats = [
        { label: 'Total Products', value: totalProducts, icon: <Package size={20} />, color: 'hsl(220, 70%, 55%)' },
        { label: 'Out of Stock', value: outOfStock, icon: <TriangleAlert size={20} />, color: 'hsl(0, 72%, 55%)' },
        { label: 'Low Stock', value: lowStock, icon: <AlertCircle size={20} />, color: 'hsl(30, 90%, 50%)' },
        { label: 'Featured', value: featuredProducts, icon: <Star size={20} />, color: 'hsl(45, 93%, 47%)' },
        { label: 'Revenue', value: formatCompactPrice(totalRevenue), icon: <DollarSign size={20} />, color: 'hsl(150, 60%, 40%)' }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className='p-6'>
            <h2 className="text-2xl font-extrabold tracking-tight mb-6 mt-6" style={{ color: 'hsl(var(--foreground))' }}>Store Overview</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                {stats.map((stat, index) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ y: -3 }} className="glass-card p-5">
                        <div className="glass-inner inline-flex p-2.5 rounded-xl mb-3" style={{ color: stat.color }}>{stat.icon}</div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{stat.label}</p>
                        <p className="text-2xl font-extrabold" style={{ color: 'hsl(var(--foreground))' }}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="glass-panel p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Recent Products</h3>
                    <div className="space-y-4">
                        {products.length === 0 ? (
                            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No products yet. Try adding a new product.</p>
                        ) : products.slice(0, 3).map(product => (
                            <div key={product._id} className="flex items-center gap-4">
                                <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-xl" style={{ border: '1px solid var(--glass-border)' }} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate" style={{ color: 'hsl(var(--foreground))' }}>{product.name}</p>
                                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{formatPrice(product.price)}</p>
                                </div>
                                <span className="tag-pill text-[10px] font-medium" style={product.stock > 0
                                    ? { background: 'rgba(16, 185, 129, 0.1)', color: 'hsl(150, 60%, 40%)', borderColor: 'rgba(16, 185, 129, 0.2)' }
                                    : { background: 'rgba(239, 68, 68, 0.1)', color: 'hsl(0, 72%, 55%)', borderColor: 'rgba(239, 68, 68, 0.2)' }
                                }>
                                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }} className="glass-panel p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Top Rated Products</h3>
                    <div className="space-y-4">
                        {products.length === 0 ? (
                            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No products yet.</p>
                        ) : products.filter(p => p.rating >= 4).length === 0 ? (
                            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No products with 4+ rating yet.</p>
                        ) : products.filter(p => p.rating >= 4).sort((a, b) => b.rating - a.rating).slice(0, 3).map(product => (
                            <div key={product._id} className="flex items-center gap-4">
                                <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-xl" style={{ border: '1px solid var(--glass-border)' }} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate" style={{ color: 'hsl(var(--foreground))' }}>{product.name}</p>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} size={12} style={{ color: star <= product.rating ? 'hsl(45, 93%, 47%)' : 'hsl(var(--muted-foreground))', fill: star <= product.rating ? 'hsl(45, 93%, 47%)' : 'none' }} />
                                        ))}
                                        <span className="text-xs ml-1" style={{ color: 'hsl(var(--muted-foreground))' }}>({product.numReviews})</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default StoreOverview;
