import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, Package, Tag, CheckSquare, Square } from "lucide-react";
import Loader from '../common/Loader'
import ProductCard from "./ProductCard";
import { useOutletContext } from "react-router-dom";
import BulkDiscountModal from "./BulkDiscountModal";

const ProductManagement = () => {
    const { products, loading, categories, searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, deleteConfirm, setDeleteConfirm, handleEditProduct, handleCreateProduct, handleDeleteProduct, fetchProducts } = useOutletContext();
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [selectMode, setSelectMode] = useState(false);

    const handleToggleSelectMode = () => { setSelectMode(!selectMode); setSelectedProducts([]); };
    const handleSelectProduct = (product) => { setSelectedProducts(prev => prev.find(p => p._id === product._id) ? prev.filter(p => p._id !== product._id) : [...prev, product]); };
    const handleSelectAll = () => { selectedProducts.length === products.length ? setSelectedProducts([]) : setSelectedProducts([...products]); };
    const handleBulkOperationSuccess = () => { setSelectedProducts([]); setSelectMode(false); fetchProducts(); };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className='p-3 sm:p-4 lg:p-6'>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 mt-4 sm:mt-6">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>Product Management</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {selectMode && selectedProducts.length > 0 && (
                        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setIsBulkModalOpen(true)}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base font-semibold text-white"
                            style={{ background: 'hsl(150, 60%, 45%)' }}>
                            <Tag size={16} className="sm:w-5 sm:h-5" /> <span className="hidden xs:inline">Bulk</span> ({selectedProducts.length})
                        </motion.button>
                    )}
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleToggleSelectMode}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base font-semibold"
                        style={selectMode ? { background: 'rgba(255,255,255,0.08)', color: 'hsl(var(--foreground))', border: '1px solid var(--glass-border)' } : { background: 'linear-gradient(135deg, hsl(260, 60%, 55%), hsl(280, 50%, 55%))', color: 'white' }}>
                        {selectMode ? <Square size={16} className="sm:w-5 sm:h-5" /> : <CheckSquare size={16} className="sm:w-5 sm:h-5" />}
                        <span>{selectMode ? 'Cancel' : 'Select'}</span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreateProduct}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base font-semibold text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }}>
                        <Plus size={16} className="sm:w-5 sm:h-5" /> <span>Add</span>
                    </motion.button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="search-input-wrapper flex-1">
                        <div className="search-input-icon"><Search size={16} /></div>
                        <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="glass-input glass-input-search" />
                    </div>
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 flex-1">
                            <Filter size={18} style={{ color: 'hsl(var(--muted-foreground))' }} className="flex-shrink-0" />
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="glass-input cursor-pointer font-medium flex-1">
                                {['all', ...categories].map(category => (<option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>))}
                            </select>
                        </div>
                        {selectMode && products.length > 0 && (
                            <button onClick={handleSelectAll} className="px-3 sm:px-4 py-2 rounded-xl text-sm whitespace-nowrap font-medium"
                                style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'hsl(220, 70%, 55%)' }}>
                                {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="glass-panel flex justify-center items-center min-h-[300px]"><Loader /></div>
            ) : (
                <div className="glass-panel p-4 sm:p-6 overflow-hidden">
                    {products.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="glass-inner inline-flex p-4 rounded-2xl mb-3"><Package size={40} style={{ color: 'hsl(var(--muted-foreground))' }} /></div>
                            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No products found. Try adjusting your search or add a new product.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.map((product, index) => (
                                <div key={index} className="relative">
                                    {selectMode && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSelectProduct(product)}
                                                className="p-2 rounded-xl shadow-lg"
                                                style={selectedProducts.find(p => p._id === product._id)
                                                    ? { background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }
                                                    : { background: 'rgba(255,255,255,0.9)', color: 'hsl(var(--foreground))' }}>
                                                {selectedProducts.find(p => p._id === product._id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </motion.button>
                                        </div>
                                    )}
                                    <ProductCard product={product} index={index} onEditProduct={handleEditProduct} setDeleteConfirm={setDeleteConfirm} selectMode={selectMode} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel p-6 max-w-md w-full">
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Confirm Deletion</h3>
                            <p className="text-sm mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>Are you sure you want to delete this product? This action cannot be undone.</p>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl glass-inner font-medium" style={{ color: 'hsl(var(--foreground))' }}>Cancel</button>
                                <button onClick={() => handleDeleteProduct(deleteConfirm)} className="px-4 py-2 rounded-xl text-white font-medium" style={{ background: 'hsl(0, 72%, 55%)' }}>Delete</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <BulkDiscountModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} selectedProducts={selectedProducts} onSuccess={handleBulkOperationSuccess} />
        </motion.div>
    );
};
export default ProductManagement
