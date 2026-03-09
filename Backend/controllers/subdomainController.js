// Controller to handle subdomain store requests
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// Get store data for subdomain
exports.getSubdomainStore = async (req, res) => {
    try {
        if (!req.subdomainStore) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        const store = req.subdomainStore;

        res.status(200).json({
            msg: 'Store fetched successfully',
            store,
            isSubdomain: true
        });
    } catch (error) {
        console.error('Get subdomain store error:', error);
        res.status(500).json({ msg: 'Server error while fetching store' });
    }
};

// Get products for subdomain store
exports.getSubdomainProducts = async (req, res) => {
    try {
        if (!req.subdomainStore) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        const { categories, brands, priceRange, search, page = 1, limit = 20 } = req.query;
        const store = req.subdomainStore;

        // Build query for products
        let query = { seller: store.seller };

        // Apply filters
        if (categories) {
            const categoryArray = Array.isArray(categories) ? categories : [categories];
            query.category = { $in: categoryArray };
        }

        if (brands) {
            const brandArray = Array.isArray(brands) ? brands : [brands];
            query.brand = { $in: brandArray };
        }

        if (priceRange) {
            const [min, max] = priceRange.split(',').map(Number);
            query.price = { $gte: min, $lte: max };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (page - 1) * limit;

        const products = await Product.find(query)
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await Product.countDocuments(query);

        res.status(200).json({
            msg: 'Products fetched successfully',
            products,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get subdomain products error:', error);
        res.status(500).json({ msg: 'Server error while fetching products' });
    }
};

// ============================
// SELLER SUBDOMAIN ANALYTICS
// ============================
exports.getSellerSubdomainAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        // Get product count and order data
        const products = await Product.find({ seller: sellerId }).select('_id');
        const productIds = products.map(p => p._id);

        const orders = await Order.find({
            'orderItems.productId': { $in: productIds },
            isPaid: true
        });

        const totalRevenue = orders.reduce((sum, o) => sum + (o.orderSummary?.totalAmount || 0), 0);
        const totalOrders = orders.length;

        // Simulate subdomain traffic data (views is the closest proxy)
        const totalViews = store.views || 0;

        // Monthly traffic simulation from views
        const now = new Date();
        const monthlyTraffic = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
            // Distribute views proportionally with some variance
            const baseViews = Math.floor(totalViews / 6);
            const variance = Math.floor(Math.random() * Math.max(baseViews * 0.3, 5));
            monthlyTraffic.push({
                month: monthLabel,
                views: Math.max(0, baseViews + (i === 0 ? variance : -variance + Math.floor(Math.random() * variance * 2))),
            });
        }

        res.status(200).json({
            msg: 'Subdomain analytics fetched',
            subdomain: {
                slug: store.storeSlug,
                url: `${store.storeSlug}.tortrose.com`,
                isActive: store.verification?.isVerified || false,
                verificationStatus: store.verification?.status || 'none',
                createdAt: store.createdAt,
                storeName: store.storeName,
                logo: store.logo,
            },
            analytics: {
                totalViews,
                totalOrders,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                productCount: products.length,
                trustCount: store.trustCount || 0,
                monthlyTraffic,
                conversionRate: totalViews > 0 ? Math.round((totalOrders / totalViews) * 10000) / 100 : 0,
            }
        });
    } catch (error) {
        console.error('Seller subdomain analytics error:', error);
        res.status(500).json({ msg: 'Server error fetching subdomain analytics' });
    }
};

// ============================
// ADMIN: GET ALL SUBDOMAINS
// ============================
exports.getAllSubdomains = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;

        let query = {};

        // Filter by verification status
        if (status === 'active') {
            query['verification.isVerified'] = true;
        } else if (status === 'inactive') {
            query['verification.isVerified'] = { $ne: true };
        } else if (status === 'pending') {
            query['verification.status'] = 'pending';
        }

        // Search by store name or slug
        if (search) {
            query.$or = [
                { storeName: { $regex: search, $options: 'i' } },
                { storeSlug: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const stores = await Store.find(query)
            .populate('seller', 'username email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Store.countDocuments(query);

        // Enrich with product count and revenue
        const enrichedStores = await Promise.all(stores.map(async (store) => {
            const products = await Product.find({ seller: store.seller?._id }).select('_id');
            const productIds = products.map(p => p._id);

            const orders = await Order.find({
                'orderItems.productId': { $in: productIds },
                isPaid: true
            });

            const totalRevenue = orders.reduce((sum, o) => sum + (o.orderSummary?.totalAmount || 0), 0);

            return {
                _id: store._id,
                storeName: store.storeName,
                storeSlug: store.storeSlug,
                logo: store.logo,
                seller: store.seller,
                views: store.views || 0,
                trustCount: store.trustCount || 0,
                isActive: store.isActive,
                verification: store.verification,
                createdAt: store.createdAt,
                subdomainUrl: `${store.storeSlug}.tortrose.com`,
                isSubdomainActive: store.verification?.isVerified || false,
                productCount: products.length,
                totalOrders: orders.length,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
            };
        }));

        // Summary stats
        const allStores = await Store.find({});
        const totalStores = allStores.length;
        const activeSubdomains = allStores.filter(s => s.verification?.isVerified).length;
        const inactiveSubdomains = totalStores - activeSubdomains;
        const pendingVerifications = allStores.filter(s => s.verification?.status === 'pending').length;
        const totalViewsAll = allStores.reduce((sum, s) => sum + (s.views || 0), 0);

        res.status(200).json({
            msg: 'All subdomains fetched',
            stores: enrichedStores,
            summary: {
                totalStores,
                activeSubdomains,
                inactiveSubdomains,
                pendingVerifications,
                totalViews: totalViewsAll,
            },
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            }
        });
    } catch (error) {
        console.error('Admin get all subdomains error:', error);
        res.status(500).json({ msg: 'Server error fetching subdomains' });
    }
};

// ============================
// ADMIN: UPDATE SUBDOMAIN SLUG
// ============================
exports.adminUpdateSubdomain = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { newSlug } = req.body;

        if (!newSlug || newSlug.trim().length < 3) {
            return res.status(400).json({ msg: 'Subdomain must be at least 3 characters' });
        }

        const sanitized = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');

        const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'shop', 'store', 'blog'];
        if (reserved.includes(sanitized)) {
            return res.status(400).json({ msg: 'This subdomain is reserved' });
        }

        const existing = await Store.findOne({ storeSlug: sanitized, _id: { $ne: storeId } });
        if (existing) {
            return res.status(409).json({ msg: 'This subdomain is already taken' });
        }

        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        store.storeSlug = sanitized;
        await store.save();

        res.status(200).json({ msg: 'Subdomain updated successfully', store });
    } catch (error) {
        console.error('Admin update subdomain error:', error);
        res.status(500).json({ msg: 'Server error updating subdomain' });
    }
};
