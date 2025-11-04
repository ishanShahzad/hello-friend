import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Upload, X, Eye, Trash2, Loader2, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { uploadImageToCloudinary } from '../../utils/uploadToCloudinary';
import { Link } from 'react-router-dom';

const StoreSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasStore, setHasStore] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [storeData, setStoreData] = useState({
        storeName: '',
        description: '',
        logo: '',
        banner: '',
        storeSlug: ''
    });

    const [analytics, setAnalytics] = useState({
        views: 0,
        productCount: 0,
        totalSales: 0
    });

    useEffect(() => {
        fetchStoreData();
        fetchAnalytics();
    }, []);

    const fetchStoreData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/stores/my-store`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setStoreData({
                storeName: res.data.store.storeName,
                description: res.data.store.description,
                logo: res.data.store.logo,
                banner: res.data.store.banner,
                storeSlug: res.data.store.storeSlug
            });
            setHasStore(true);
        } catch (error) {
            if (error.response?.status === 404) {
                setHasStore(false);
            } else {
                console.error('Error fetching store:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/stores/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalytics(res.data.analytics);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setStoreData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Logo file size must be less than 5MB');
            return;
        }

        try {
            setUploadingLogo(true);
            const imageUrl = await uploadImageToCloudinary(file);
            setStoreData(prev => ({ ...prev, logo: imageUrl }));
            toast.success('Logo uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Banner file size must be less than 5MB');
            return;
        }

        try {
            setUploadingBanner(true);
            const imageUrl = await uploadImageToCloudinary(file);
            setStoreData(prev => ({ ...prev, banner: imageUrl }));
            toast.success('Banner uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload banner');
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleSave = async () => {
        if (!storeData.storeName || storeData.storeName.trim().length < 3) {
            toast.error('Store name must be at least 3 characters');
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('jwtToken');
            const endpoint = hasStore ? 'update' : 'create';
            
            const res = await axios[hasStore ? 'put' : 'post'](
                `${import.meta.env.VITE_API_URL}api/stores/${endpoint}`,
                storeData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(res.data.msg);
            setHasStore(true);
            if (!hasStore) {
                setStoreData(prev => ({ ...prev, storeSlug: res.data.store.storeSlug }));
            }
            fetchAnalytics();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to save store');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            await axios.delete(`${import.meta.env.VITE_API_URL}api/stores/delete`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success('Store deleted successfully');
            setHasStore(false);
            setStoreData({
                storeName: '',
                description: '',
                logo: '',
                banner: '',
                storeSlug: ''
            });
            setShowDeleteConfirm(false);
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to delete store');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <Store size={32} />
                    Store Settings
                </h1>
                <p className="text-gray-600 mt-2">
                    {hasStore ? 'Manage your store configuration' : 'Create your store to establish your brand'}
                </p>
            </div>

            {/* Analytics Cards */}
            {hasStore && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <p className="text-gray-600 text-sm">Total Views</p>
                        <p className="text-2xl font-bold text-blue-600">{analytics.views}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <p className="text-gray-600 text-sm">Products</p>
                        <p className="text-2xl font-bold text-green-600">{analytics.productCount}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <p className="text-gray-600 text-sm">Total Sales</p>
                        <p className="text-2xl font-bold text-purple-600">${analytics.totalSales?.toFixed(2)}</p>
                    </div>
                </div>
            )}

            {/* Store Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="space-y-6">
                    {/* Store Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Store Name *
                        </label>
                        <input
                            type="text"
                            name="storeName"
                            value={storeData.storeName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Enter your store name"
                            maxLength={50}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {storeData.storeName.length}/50 characters
                        </p>
                    </div>

                    {/* Store URL Preview */}
                    {storeData.storeSlug && (
                        <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">Store URL:</span>{' '}
                                <span className="text-green-600">
                                    {window.location.origin}/store/{storeData.storeSlug}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={storeData.description}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Tell customers about your store..."
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {storeData.description.length}/500 characters
                        </p>
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Store Logo
                        </label>
                        <div className="flex items-center gap-4">
                            {storeData.logo && (
                                <img
                                    src={storeData.logo}
                                    alt="Store logo"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                                />
                            )}
                            <label className="cursor-pointer">
                                <div className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                                    {uploadingLogo ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            Upload Logo
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    disabled={uploadingLogo}
                                />
                            </label>
                            {storeData.logo && (
                                <button
                                    onClick={() => setStoreData(prev => ({ ...prev, logo: '' }))}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Max 5MB, square image recommended</p>
                    </div>

                    {/* Banner Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Store Banner
                        </label>
                        {storeData.banner && (
                            <div className="mb-3 relative">
                                <img
                                    src={storeData.banner}
                                    alt="Store banner"
                                    className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                                />
                                <button
                                    onClick={() => setStoreData(prev => ({ ...prev, banner: '' }))}
                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                        <label className="cursor-pointer">
                            <div className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 w-fit">
                                {uploadingBanner ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Upload Banner
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerUpload}
                                className="hidden"
                                disabled={uploadingBanner}
                            />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Max 5MB, wide image recommended (1200x400)</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4 border-t">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSave}
                            disabled={saving || uploadingLogo || uploadingBanner}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                <>{hasStore ? 'Update Store' : 'Create Store'}</>
                            )}
                        </motion.button>

                        {hasStore && storeData.storeSlug && (
                            <Link
                                to={`/store/${storeData.storeSlug}`}
                                target="_blank"
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Eye size={20} />
                                Preview Store
                            </Link>
                        )}

                        {hasStore && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <Trash2 size={20} />
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
                    >
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Store?</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete your store? This action cannot be undone.
                            Your products will remain but won't be associated with a store.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Delete Store
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default StoreSettings;
