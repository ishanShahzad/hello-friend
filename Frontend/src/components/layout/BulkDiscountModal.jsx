import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Percent, DollarSign, Tag, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const BulkDiscountModal = ({ isOpen, onClose, selectedProducts, onSuccess }) => {
    const [activeOperation, setActiveOperation] = useState('discount'); // 'discount', 'price', 'remove'
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [priceUpdateType, setPriceUpdateType] = useState('percentage');
    const [priceValue, setPriceValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleApplyDiscount = async () => {
        if (!discountValue || discountValue <= 0) {
            toast.error('Please enter a valid discount value');
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('jwtToken');
            const productIds = selectedProducts.map(p => p._id);

            const res = await axios.post(
                'http://localhost:5000/api/products/bulk-discount',
                {
                    productIds,
                    discountType,
                    discountValue: parseFloat(discountValue)
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            toast.success(res.data.msg);
            onSuccess();
            handleClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || 'Failed to apply discount');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePrice = async () => {
        if (priceValue === '' || (priceUpdateType !== 'set' && priceValue == 0)) {
            toast.error('Please enter a valid price value');
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('jwtToken');
            const productIds = selectedProducts.map(p => p._id);

            const res = await axios.post(
                'http://localhost:5000/api/products/bulk-price-update',
                {
                    productIds,
                    updateType: priceUpdateType,
                    value: parseFloat(priceValue)
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            toast.success(res.data.msg);
            onSuccess();
            handleClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || 'Failed to update prices');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveDiscount = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('jwtToken');
            const productIds = selectedProducts.map(p => p._id);

            const res = await axios.post(
                'http://localhost:5000/api/products/remove-discount',
                { productIds },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            toast.success(res.data.msg);
            onSuccess();
            handleClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || 'Failed to remove discounts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setDiscountValue('');
        setPriceValue('');
        setActiveOperation('discount');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                Bulk Operations
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {selectedProducts.length} product(s) selected
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Operation Tabs */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setActiveOperation('discount')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                    activeOperation === 'discount'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Tag size={18} />
                                <span>Apply Discount</span>
                            </button>
                            <button
                                onClick={() => setActiveOperation('price')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                    activeOperation === 'price'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <DollarSign size={18} />
                                <span>Update Prices</span>
                            </button>
                            <button
                                onClick={() => setActiveOperation('remove')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                    activeOperation === 'remove'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Trash2 size={18} />
                                <span>Remove Discount</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Apply Discount */}
                        {activeOperation === 'discount' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Discount Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setDiscountType('percentage')}
                                            className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                                                discountType === 'percentage'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <Percent size={20} />
                                            <span>Percentage</span>
                                        </button>
                                        <button
                                            onClick={() => setDiscountType('fixed')}
                                            className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                                                discountType === 'fixed'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <DollarSign size={20} />
                                            <span>Fixed Amount</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Discount Value
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder={discountType === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'}
                                        />
                                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                                            {discountType === 'percentage' ? '%' : '$'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {discountType === 'percentage'
                                            ? 'Enter percentage to discount (e.g., 20 for 20% off)'
                                            : 'Enter fixed amount to discount (e.g., 10 for $10 off)'}
                                    </p>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleApplyDiscount}
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? 'Applying...' : 'Apply Discount'}
                                </motion.button>
                            </div>
                        )}

                        {/* Update Prices */}
                        {activeOperation === 'price' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Update Type
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setPriceUpdateType('percentage')}
                                            className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-lg border-2 transition-all ${
                                                priceUpdateType === 'percentage'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <Percent size={20} />
                                            <span className="text-xs">Percentage</span>
                                        </button>
                                        <button
                                            onClick={() => setPriceUpdateType('fixed')}
                                            className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-lg border-2 transition-all ${
                                                priceUpdateType === 'fixed'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <DollarSign size={20} />
                                            <span className="text-xs">Fixed</span>
                                        </button>
                                        <button
                                            onClick={() => setPriceUpdateType('set')}
                                            className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-lg border-2 transition-all ${
                                                priceUpdateType === 'set'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <Tag size={20} />
                                            <span className="text-xs">Set Price</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {priceUpdateType === 'set' ? 'New Price' : 'Change Value'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={priceValue}
                                            onChange={(e) => setPriceValue(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder={
                                                priceUpdateType === 'percentage'
                                                    ? 'e.g., 10 or -10'
                                                    : priceUpdateType === 'fixed'
                                                    ? 'e.g., 5 or -5'
                                                    : 'e.g., 99.99'
                                            }
                                        />
                                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                                            {priceUpdateType === 'percentage' ? '%' : '$'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {priceUpdateType === 'percentage' && 'Positive to increase, negative to decrease (e.g., 10 for +10%, -10 for -10%)'}
                                        {priceUpdateType === 'fixed' && 'Positive to increase, negative to decrease (e.g., 5 for +$5, -5 for -$5)'}
                                        {priceUpdateType === 'set' && 'Set all selected products to this specific price'}
                                    </p>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleUpdatePrice}
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? 'Updating...' : 'Update Prices'}
                                </motion.button>
                            </div>
                        )}

                        {/* Remove Discount */}
                        {activeOperation === 'remove' && (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm text-yellow-800">
                                        This will remove all discounts from the selected products and reset their discounted price to $0.
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Products:</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {selectedProducts.map((product) => (
                                            <div key={product._id} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600">{product.name}</span>
                                                {product.discountedPrice > 0 && (
                                                    <span className="text-red-600 font-medium">
                                                        ${product.discountedPrice.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleRemoveDiscount}
                                    disabled={isLoading}
                                    className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? 'Removing...' : 'Remove All Discounts'}
                                </motion.button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BulkDiscountModal;
