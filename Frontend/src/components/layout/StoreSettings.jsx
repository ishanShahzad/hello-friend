import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Store, Upload, X, Eye, Trash2, Loader2, ExternalLink, BarChart3, ShoppingBag, Heart, DollarSign, CheckCircle, Clock, AlertTriangle, Info, Mail, Phone, Globe, Lock, AlertCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { uploadImageToCloudinary } from '../../utils/uploadToCloudinary';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../contexts/CurrencyContext';
import Loader from '../common/Loader';

const StoreSettings = () => {
    const { formatPrice, currency, exchangeRates, getCurrencySymbol } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasStore, setHasStore] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    // Subdomain state
    const [customSubdomain, setCustomSubdomain] = useState('');
    const [subdomainAvailable, setSubdomainAvailable] = useState(null);
    const [subdomainChecking, setSubdomainChecking] = useState(false);
    const [subdomainMessage, setSubdomainMessage] = useState('');
    const [subdomainOwned, setSubdomainOwned] = useState(false);

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

    const [storeData, setStoreData] = useState({
        storeName: '', description: '', logo: '', banner: '', storeSlug: '', sellerType: 'store',
        address: { street: '', city: '', state: '', country: '', postalCode: '' },
        socialLinks: { website: '', facebook: '', instagram: '', twitter: '', youtube: '', tiktok: '' },
        returnPolicy: { returnsEnabled: false, returnDuration: 0, refundType: 'none', warrantyEnabled: false, warrantyDuration: 0, warrantyDescription: '', policyDescription: '' }
    });

    const [analytics, setAnalytics] = useState({ views: 0, productCount: 0, totalSales: 0, trustCount: 0 });
    const [verification, setVerification] = useState({ isVerified: false, status: 'none', appliedAt: null, rejectionReason: '' });
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [applicationMessage, setApplicationMessage] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [applyingVerification, setApplyingVerification] = useState(false);

    useEffect(() => { fetchStoreData(); fetchAnalytics(); fetchVerificationStatus(); }, []);

    const fetchStoreData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/stores/my-store`, { headers: { Authorization: `Bearer ${token}` } });
            const defaultSocialLinks = { website: '', facebook: '', instagram: '', twitter: '', youtube: '', tiktok: '' };
            const defaultAddress = { street: '', city: '', state: '', country: '', postalCode: '' };
            const defaultReturnPolicy = { returnsEnabled: false, returnDuration: 0, refundType: 'none', warrantyEnabled: false, warrantyDuration: 0, warrantyDescription: '', policyDescription: '' };
            const slug = res.data.store.storeSlug || '';
            setStoreData({
                storeName: res.data.store.storeName, description: res.data.store.description,
                logo: res.data.store.logo, banner: res.data.store.banner, storeSlug: slug,
                sellerType: res.data.store.sellerType || 'store',
                address: { ...defaultAddress, ...(res.data.store.address || {}) },
                socialLinks: { ...defaultSocialLinks, ...(res.data.store.socialLinks || {}) },
                returnPolicy: { ...defaultReturnPolicy, ...(res.data.store.returnPolicy || {}) }
            });
            setCustomSubdomain(slug);
            setSubdomainOwned(true);
            setSubdomainAvailable(true);
            setSubdomainMessage('This is your current subdomain');
            setHasStore(true);
        } catch (error) {
            if (error.response?.status === 404) setHasStore(false);
            else console.error('Error fetching store:', error);
        } finally { setLoading(false); }
    };

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/stores/analytics`, { headers: { Authorization: `Bearer ${token}` } });
            setAnalytics(res.data.analytics);
        } catch (error) { console.error('Error fetching analytics:', error); }
    };

    const fetchVerificationStatus = async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/stores/verification/status`, { headers: { Authorization: `Bearer ${token}` } });
            setVerification(res.data.verification);
        } catch (error) { console.error('Error fetching verification status:', error); }
    };

    const handleApplyVerification = async () => {
        if (!applicationMessage.trim()) { toast.error('Please provide a message'); return; }
        if (!contactEmail.trim()) { toast.error('Please provide your contact email'); return; }
        if (!contactPhone.trim()) { toast.error('Please provide your contact phone'); return; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) { toast.error('Please provide a valid email'); return; }
        try {
            setApplyingVerification(true);
            const token = localStorage.getItem('jwtToken');
            await axios.post(`${import.meta.env.VITE_API_URL}api/stores/verification/apply`, { applicationMessage, contactEmail: contactEmail.trim(), contactPhone: contactPhone.trim() }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Verification application submitted!');
            setShowVerificationModal(false); setApplicationMessage(''); setContactEmail(''); setContactPhone('');
            fetchVerificationStatus();
        } catch (error) { toast.error(error.response?.data?.msg || 'Failed to submit'); }
        finally { setApplyingVerification(false); }
    };

    const handleInputChange = (e) => { const { name, value } = e.target; setStoreData(prev => ({ ...prev, [name]: value })); };
    const handleSocialLinkChange = (platform, value) => { setStoreData(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [platform]: value } })); };
    const handleAddressChange = (field, value) => { setStoreData(prev => ({ ...prev, address: { ...prev.address, [field]: value } })); };

    // Sanitize subdomain input: lowercase, alphanumeric + hyphens only
    const sanitizeSubdomain = (val) =>
        val.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');

    const checkSubdomainAvailability = useCallback(async (slug) => {
        if (!slug || slug.length < 3) {
            setSubdomainAvailable(null);
            setSubdomainMessage('');
            setSubdomainOwned(false);
            return;
        }
        try {
            setSubdomainChecking(true);
            const token = localStorage.getItem('jwtToken');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/stores/check-subdomain/${slug}`, { headers: { Authorization: `Bearer ${token}` } });
            setSubdomainAvailable(res.data.available);
            setSubdomainOwned(res.data.isOwned || false);
            setSubdomainMessage(res.data.msg);
        } catch (e) {
            setSubdomainAvailable(null);
            setSubdomainMessage('Could not check availability');
        } finally {
            setSubdomainChecking(false);
        }
    }, []);

    // Debounce subdomain check
    useEffect(() => {
        if (!customSubdomain || customSubdomain === storeData.storeSlug) return;
        const timer = setTimeout(() => checkSubdomainAvailability(customSubdomain), 600);
        return () => clearTimeout(timer);
    }, [customSubdomain, storeData.storeSlug, checkSubdomainAvailability]);

    const handleSubdomainChange = (e) => {
        const val = sanitizeSubdomain(e.target.value);
        setCustomSubdomain(val);
        setSubdomainAvailable(null);
        setSubdomainMessage('');
        setSubdomainOwned(false);
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Logo must be less than 5MB'); return; }
        try { setUploadingLogo(true); const imageUrl = await uploadImageToCloudinary(file); setStoreData(prev => ({ ...prev, logo: imageUrl })); toast.success('Logo uploaded'); }
        catch (error) { toast.error('Failed to upload logo'); } finally { setUploadingLogo(false); }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Banner must be less than 5MB'); return; }
        try { setUploadingBanner(true); const imageUrl = await uploadImageToCloudinary(file); setStoreData(prev => ({ ...prev, banner: imageUrl })); toast.success('Banner uploaded'); }
        catch (error) { toast.error('Failed to upload banner'); } finally { setUploadingBanner(false); }
    };

    const handleSave = async () => {
        if (!storeData.storeName || storeData.storeName.trim().length < 3) { toast.error('Store name must be at least 3 characters'); return; }
        try {
            setSaving(true);
            const token = localStorage.getItem('jwtToken');
            const endpoint = hasStore ? 'update' : 'create';
            
            const payload = { ...storeData };
            // Include the custom subdomain if it's set and valid
            if (customSubdomain && customSubdomain.length >= 3) {
                payload.storeSlug = customSubdomain;
            }

            const res = await axios[hasStore ? 'put' : 'post'](`${import.meta.env.VITE_API_URL}api/stores/${endpoint}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(res.data.msg);
            setHasStore(true);
            
            // Update local state with whatever the server returned
            if (res.data.store) {
                setStoreData(prev => ({ ...prev, storeSlug: res.data.store.storeSlug }));
                setCustomSubdomain(res.data.store.storeSlug);
            }
            
            fetchAnalytics();
        } catch (error) { toast.error(error.response?.data?.msg || 'Failed to save store'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            await axios.delete(`${import.meta.env.VITE_API_URL}api/stores/delete`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Store deleted'); setHasStore(false);
            setStoreData({ storeName: '', description: '', logo: '', banner: '', storeSlug: '' });
            setShowDeleteConfirm(false);
        } catch (error) { toast.error(error.response?.data?.msg || 'Failed to delete store'); }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><Loader /></div>;

    const statCards = [
        { label: 'Total Views', value: analytics.views, icon: <BarChart3 size={18} />, color: 'hsl(220, 70%, 55%)' },
        { label: 'Products', value: analytics.productCount, icon: <ShoppingBag size={18} />, color: 'hsl(150, 60%, 45%)' },
        { label: 'Trusters', value: analytics.trustCount || 0, icon: <Heart size={18} />, color: 'hsl(330, 70%, 55%)' },
        { label: 'Total Sales', value: formatCompactPrice(analytics.totalSales || 0), icon: <DollarSign size={18} />, color: 'hsl(200, 80%, 50%)' },
    ];

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                    <Store size={28} className="md:w-8 md:h-8" />
                    Store Settings
                </h1>
                <p className="text-sm md:text-base mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {hasStore ? 'Manage your store configuration' : 'Create your store to establish your brand'}
                </p>
            </div>

            {/* Analytics Cards */}
            {hasStore && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {statCards.map((card, i) => (
                        <motion.div key={i} whileHover={{ y: -3 }} className="glass-card p-5">
                            <div className="glass-inner inline-flex p-2.5 rounded-xl mb-3" style={{ color: card.color }}>{card.icon}</div>
                            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{card.label}</p>
                            <p className="text-2xl font-extrabold" style={{ color: 'hsl(var(--foreground))' }}>{card.value}</p>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Verification Status */}
            {hasStore && (
                <div className="glass-panel p-6 md:p-8 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                            {verification.isVerified ? <><CheckCircle size={22} style={{ color: 'hsl(150, 60%, 45%)' }} /> Verified Store</> : <><CheckCircle size={22} style={{ color: 'hsl(var(--muted-foreground))' }} /> Store Verification</>}
                        </h2>
                        {!verification.isVerified && verification.status === 'none' && (
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowVerificationModal(true)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }}>
                                Apply for Verification
                            </motion.button>
                        )}
                    </div>

                    {verification.isVerified && (
                        <div className="glass-inner rounded-xl p-4" style={{ borderLeft: '3px solid hsl(150, 60%, 45%)' }}>
                            <p className="font-medium" style={{ color: 'hsl(150, 60%, 40%)' }}><CheckCircle size={16} className="inline mr-1" /> Your store is verified!</p>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Your store displays a verification badge.</p>
                        </div>
                    )}
                    {verification.status === 'pending' && (
                        <div className="glass-inner rounded-xl p-4" style={{ borderLeft: '3px solid hsl(45, 93%, 47%)' }}>
                            <p className="font-medium" style={{ color: 'hsl(45, 80%, 40%)' }}><Clock size={16} className="inline mr-1" /> Verification Pending</p>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Your application is under review.</p>
                            <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Applied: {new Date(verification.appliedAt).toLocaleDateString()}</p>
                        </div>
                    )}
                    {verification.status === 'rejected' && (
                        <div className="glass-inner rounded-xl p-4" style={{ borderLeft: '3px solid hsl(0, 72%, 55%)' }}>
                            <p className="font-medium" style={{ color: 'hsl(0, 72%, 50%)' }}><AlertTriangle size={16} className="inline mr-1" /> Verification Rejected</p>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Reason: {verification.rejectionReason}</p>
                            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowVerificationModal(true)}
                                className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'hsl(0, 72%, 55%)' }}>
                                Reapply
                            </motion.button>
                        </div>
                    )}
                    {verification.status === 'none' && (
                        <div className="glass-inner rounded-xl p-4">
                            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <Info size={16} className="inline mr-1" /> Get verified to build trust with customers and stand out.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Store Form */}
            <div className="glass-panel p-6 md:p-8">
                <div className="space-y-4 md:space-y-6">
                    {/* Seller Type — Store / Brand */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Listing Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'store', label: 'Store', desc: 'Independent shop / reseller', Icon: Store },
                                { value: 'brand', label: 'Brand', desc: 'Own products / label', Icon: Sparkles },
                            ].map(opt => {
                                const active = (storeData.sellerType || 'store') === opt.value;
                                const Icon = opt.Icon;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setStoreData(prev => ({ ...prev, sellerType: opt.value }))}
                                        className="p-3 rounded-xl text-left transition-all border"
                                        style={{
                                            background: active ? 'linear-gradient(135deg, hsla(220, 70%, 55%, 0.15), hsla(260, 60%, 60%, 0.15))' : 'hsla(0,0%,100%,0.04)',
                                            borderColor: active ? 'hsl(220, 70%, 55%)' : 'hsla(0,0%,100%,0.12)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 font-bold text-sm" style={{ color: active ? 'hsl(220, 70%, 55%)' : 'hsl(var(--foreground))' }}>
                                            <Icon size={14} /> {opt.label}
                                        </div>
                                        <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{opt.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>You can change this anytime. It controls where you appear in the marketplace.</p>
                    </div>

                    {/* Store Name */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{(storeData.sellerType || 'store') === 'brand' ? 'Brand' : 'Store'} Name *</label>
                        <input type="text" name="storeName" value={storeData.storeName} onChange={handleInputChange} className="glass-input" placeholder={`Enter your ${(storeData.sellerType || 'store') === 'brand' ? 'brand' : 'store'} name`} maxLength={50} />
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{storeData.storeName.length}/50 characters</p>
                    </div>

                    {/* Store URL (path-based, always active) */}
                    {storeData.storeSlug && (
                        <div className="glass-inner rounded-xl p-3 flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Store URL:</span>
                            <a href={`/store/${storeData.storeSlug}`} target="_blank" rel="noreferrer"
                                className="text-sm font-medium hover:underline flex items-center gap-1"
                                style={{ color: 'hsl(var(--primary))' }}>
                                {window.location.origin}/store/{storeData.storeSlug}
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    )}

                    {/* ─── Subdomain Section ─── */}
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Globe size={18} style={{ color: 'hsl(var(--primary))' }} />
                            <h3 className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                Custom Subdomain
                            </h3>
                            {verification.isVerified ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: 'hsl(150, 60%, 40%)', border: '1px solid rgba(34,197,94,0.25)' }}>
                                    ✓ Active
                                </span>
                            ) : (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(234,179,8,0.12)', color: 'hsl(45, 80%, 40%)', border: '1px solid rgba(234,179,8,0.25)' }}>
                                    <Lock size={10} /> Not Active — Verification Required
                                </span>
                            )}
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Choose a unique subdomain for your branded store link. Only verified stores get an active subdomain.
                        </p>

                        {/* Subdomain Input */}
                        <div className="flex items-center gap-0 rounded-xl overflow-hidden mb-2" style={{ border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
                            <span className="px-3 py-3 text-sm font-medium select-none" style={{ background: 'var(--glass-inner)', color: 'hsl(var(--muted-foreground))', borderRight: '1px solid var(--glass-border)', whiteSpace: 'nowrap' }}>
                                rozare.com/
                            </span>
                            <input
                                type="text"
                                value={customSubdomain}
                                onChange={handleSubdomainChange}
                                className="flex-1 px-3 py-3 bg-transparent text-sm outline-none font-mono"
                                style={{ color: 'hsl(var(--foreground))' }}
                                placeholder="your-store-name"
                                maxLength={50}
                            />
                            <span className="px-3 py-3" style={{ minWidth: '28px' }}>
                                {subdomainChecking ? (
                                    <Loader2 size={16} className="animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
                                ) : subdomainAvailable === true ? (
                                    <CheckCircle size={16} style={{ color: 'hsl(150, 60%, 45%)' }} />
                                ) : subdomainAvailable === false ? (
                                    <AlertCircle size={16} style={{ color: 'hsl(0, 72%, 55%)' }} />
                                ) : null}
                            </span>
                        </div>

                        {/* Availability message */}
                        {subdomainMessage && customSubdomain.length >= 3 && (
                            <p className="text-xs mb-3" style={{ color: subdomainAvailable ? 'hsl(150, 60%, 45%)' : 'hsl(0, 72%, 55%)' }}>
                                {subdomainMessage}
                            </p>
                        )}

                        {/* Live subdomain preview */}
                        {customSubdomain.length >= 3 && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl p-4 mb-4"
                                style={{ background: 'var(--glass-inner)', border: '1px solid var(--glass-border)' }}
                            >
                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    Subdomain Preview
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Globe size={14} style={{ color: 'hsl(var(--primary))' }} />
                                    <span className="text-sm font-mono font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                                        {customSubdomain}.rozare.com
                                    </span>
                                    {verification.isVerified ? (
                                        <span className="text-xs" style={{ color: 'hsl(150, 60%, 45%)' }}>← Will route to your store</span>
                                    ) : (
                                        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>← Will be active once verified</span>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Status banner based on verification */}
                        {!verification.isVerified && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl p-4 space-y-3"
                                style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.25)' }}
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: 'hsl(45, 80%, 45%)' }} />
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: 'hsl(45, 70%, 38%)' }}>
                                            Subdomain not active — Verification required
                                        </p>
                                        {customSubdomain.length >= 3 && (
                                            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                <strong className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{customSubdomain}.rozare.com</strong> is your chosen address. It won't go live until your store is verified.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Urgency: subdomain availability warning */}
                                {subdomainAvailable && !subdomainOwned && customSubdomain.length >= 3 && (
                                    <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'hsl(0, 72%, 55%)' }} />
                                        <p className="text-xs" style={{ color: 'hsl(0, 72%, 50%)' }}>
                                            <strong>This subdomain is currently available</strong> but is not assigned to your brand yet. Other sellers can claim it before you. Apply for verification to secure it.
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-1">
                                    {verification.status === 'none' && (
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                            onClick={() => setShowVerificationModal(true)}
                                            className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                                            style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))' }}>
                                            Apply for Brand Verification
                                        </motion.button>
                                    )}
                                    <a href="mailto:support@rozare.com"
                                        className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                                        style={{ background: 'var(--glass-inner)', color: 'hsl(var(--foreground))', border: '1px solid var(--glass-border)' }}>
                                        <Mail size={12} /> Contact Support
                                    </a>
                                </div>

                                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    Need help? Contact <a href="mailto:support@rozare.com" className="underline">support@rozare.com</a> for more information about getting verified.
                                </p>
                            </motion.div>
                        )}

                        {/* Verified: subdomain is active */}
                        {verification.isVerified && customSubdomain.length >= 3 && (
                            <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(150, 60%, 40%)' }}>
                                    <CheckCircle size={15} /> Your subdomain is live!
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    Customers can reach your store at <strong className="font-mono">{customSubdomain}.rozare.com</strong>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Description</label>
                        <textarea name="description" value={storeData.description} onChange={handleInputChange} rows={4} className="glass-input" placeholder="Tell customers about your store..." maxLength={500} />
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{storeData.description.length}/500 characters</p>
                    </div>

                    {/* Store Address */}
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Store Address (Optional)</h3>
                        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>Add your store's physical address</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Street Address</label>
                                <input type="text" value={storeData.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} className="glass-input" placeholder="123 Main Street" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>City</label>
                                    <input type="text" value={storeData.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} className="glass-input" placeholder="New York" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>State/Province</label>
                                    <input type="text" value={storeData.address.state} onChange={(e) => handleAddressChange('state', e.target.value)} className="glass-input" placeholder="NY" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Country</label>
                                    <input type="text" value={storeData.address.country} onChange={(e) => handleAddressChange('country', e.target.value)} className="glass-input" placeholder="United States" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Postal Code</label>
                                    <input type="text" value={storeData.address.postalCode} onChange={(e) => handleAddressChange('postalCode', e.target.value)} className="glass-input" placeholder="10001" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Store Logo</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {storeData.logo && (
                                <img src={storeData.logo} alt="Store logo" className="w-24 h-24 rounded-2xl object-cover" style={{ border: '3px solid var(--glass-border-strong)' }} />
                            )}
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer">
                                    <motion.div whileHover={{ scale: 1.02 }} className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold text-white"
                                        style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                                        {uploadingLogo ? <><Loader2 className="animate-spin" size={16} /><span className="hidden sm:inline">Uploading...</span></> : <><Upload size={16} /><span className="hidden sm:inline">Upload Logo</span><span className="sm:hidden">Upload</span></>}
                                    </motion.div>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                                </label>
                                {storeData.logo && (
                                    <button onClick={() => setStoreData(prev => ({ ...prev, logo: '' }))} className="p-2 rounded-xl" style={{ color: 'hsl(0, 72%, 55%)', background: 'rgba(239, 68, 68, 0.1)' }}>
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Max 5MB, square image recommended</p>
                    </div>

                    {/* Banner Upload */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Store Banner</label>
                        {storeData.banner && (
                            <div className="mb-3 relative">
                                <img src={storeData.banner} alt="Store banner" className="w-full h-40 object-cover rounded-2xl" style={{ border: '3px solid var(--glass-border-strong)' }} />
                                <button onClick={() => setStoreData(prev => ({ ...prev, banner: '' }))} className="absolute top-2 right-2 p-2 rounded-xl text-white" style={{ background: 'hsl(0, 72%, 55%)' }}>
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                        <label className="cursor-pointer">
                            <motion.div whileHover={{ scale: 1.02 }} className="px-4 py-2 rounded-xl flex items-center gap-2 w-fit text-sm font-semibold text-white"
                                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' }}>
                                {uploadingBanner ? <><Loader2 className="animate-spin" size={16} /><span className="hidden sm:inline">Uploading...</span></> : <><Upload size={16} /><span className="hidden sm:inline">Upload Banner</span><span className="sm:hidden">Upload</span></>}
                            </motion.div>
                            <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={uploadingBanner} />
                        </label>
                        <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Max 5MB, wide image recommended (1200x400)</p>
                    </div>

                    {/* Return & Warranty Policy */}
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                            🔄 Return & Warranty Policy
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>Set your store's default return and warranty policy. Products can override this individually.</p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 glass-inner rounded-xl p-4">
                                <input type="checkbox" checked={storeData.returnPolicy.returnsEnabled} onChange={e => setStoreData(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, returnsEnabled: e.target.checked } }))} className="h-4 w-4 rounded" style={{ accentColor: 'hsl(150, 60%, 45%)' }} />
                                <div><p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Enable Returns</p><p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Allow customers to return products</p></div>
                            </div>
                            {storeData.returnPolicy.returnsEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Return Window (Days)</label>
                                        <input type="number" min={1} max={365} value={storeData.returnPolicy.returnDuration} onChange={e => setStoreData(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, returnDuration: parseInt(e.target.value) || 0 } }))} className="glass-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Refund Type</label>
                                        <select value={storeData.returnPolicy.refundType} onChange={e => setStoreData(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, refundType: e.target.value } }))} className="glass-input cursor-pointer">
                                            <option value="none">No Refund</option>
                                            <option value="full_refund">Full Money Back</option>
                                            <option value="replacement_only">Replacement Only</option>
                                            <option value="store_credit">Store Credit</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 glass-inner rounded-xl p-4">
                                <input type="checkbox" checked={storeData.returnPolicy.warrantyEnabled} onChange={e => setStoreData(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, warrantyEnabled: e.target.checked } }))} className="h-4 w-4 rounded" style={{ accentColor: 'hsl(45, 80%, 45%)' }} />
                                <div><p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Enable Warranty</p><p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Offer warranty on products</p></div>
                            </div>
                            {storeData.returnPolicy.warrantyEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Warranty Duration (Months)</label>
                                        <input type="number" min={1} max={120} value={storeData.returnPolicy.warrantyDuration} onChange={e => setStoreData(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, warrantyDuration: parseInt(e.target.value) || 0 } }))} className="glass-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Warranty Description</label>
                                        <input type="text" value={storeData.returnPolicy.warrantyDescription} onChange={e => setStoreData(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, warrantyDescription: e.target.value } }))} className="glass-input" placeholder="e.g. Covers manufacturing defects" maxLength={200} />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Policy Description (Optional)</label>
                                <textarea value={storeData.returnPolicy.policyDescription} onChange={e => setStoreData(prev => ({ ...prev, returnPolicy: { ...prev.returnPolicy, policyDescription: e.target.value } }))} rows={2} className="glass-input" placeholder="Additional policy details..." maxLength={500} />
                            </div>
                        </div>
                    </div>

                    {/* Social Links */}
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                            <ExternalLink size={20} /> Social Links & Website
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { key: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
                                { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
                                { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourprofile' },
                                { key: 'twitter', label: 'Twitter/X', placeholder: 'https://twitter.com/yourhandle' },
                                { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
                                { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourusername' },
                            ].map(social => (
                                <div key={social.key}>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{social.label}</label>
                                    <input type="url" value={storeData.socialLinks[social.key]} onChange={(e) => handleSocialLinkChange(social.key, e.target.value)} className="glass-input" placeholder={social.placeholder} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave}
                            disabled={saving || uploadingLogo || uploadingBanner}
                            className="flex-1 px-4 sm:px-6 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                            style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }}>
                            {saving ? <><Loader2 className="animate-spin" size={20} /> Saving...</> : <>{hasStore ? 'Update Store' : 'Create Store'}</>}
                        </motion.button>

                        {hasStore && storeData.storeSlug && (
                            <Link to={`/store/${storeData.storeSlug}`} target="_blank"
                                className="px-4 sm:px-6 py-3 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                                style={{ background: 'linear-gradient(135deg, hsl(260, 60%, 55%), hsl(280, 50%, 55%))', boxShadow: '0 0 20px -4px hsl(260, 60%, 55%, 0.3)' }}>
                                <Eye size={20} /><span className="hidden sm:inline">Preview Store</span><span className="sm:hidden">Preview</span>
                            </Link>
                        )}

                        {hasStore && (
                            <button onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                                style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'hsl(0, 72%, 55%)' }}>
                                <Trash2 size={20} /><span>Delete</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>


            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Delete Store?</h3>
                        <p className="mb-6 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Are you sure? This action cannot be undone. Products will remain but won't be associated with a store.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-xl glass-inner font-medium" style={{ color: 'hsl(var(--foreground))' }}>Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 rounded-xl text-white font-medium" style={{ background: 'hsl(0, 72%, 55%)' }}>Delete Store</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Verification Modal */}
            {showVerificationModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                            <CheckCircle size={22} style={{ color: 'hsl(var(--primary))' }} /> Apply for Verification
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>Tell us why your store should be verified.</p>

                        <div className="mb-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Contact Email *</label>
                            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="glass-input" placeholder="your@email.com" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Contact Phone *</label>
                            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="glass-input" placeholder="+1 234 567 8900" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Application Message *</label>
                            <textarea value={applicationMessage} onChange={(e) => setApplicationMessage(e.target.value)} rows={4} className="glass-input" placeholder="Explain why your store should be verified..." maxLength={500} required />
                            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{applicationMessage.length}/500</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setShowVerificationModal(false); setApplicationMessage(''); setContactEmail(''); setContactPhone(''); }}
                                className="flex-1 px-4 py-2 rounded-xl glass-inner font-medium" style={{ color: 'hsl(var(--foreground))' }} disabled={applyingVerification}>Cancel</button>
                            <button onClick={handleApplyVerification} disabled={applyingVerification || !applicationMessage.trim() || !contactEmail.trim() || !contactPhone.trim()}
                                className="flex-1 px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))' }}>
                                {applyingVerification ? <><Loader2 className="animate-spin" size={16} /> Submitting...</> : 'Submit Application'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default StoreSettings;
