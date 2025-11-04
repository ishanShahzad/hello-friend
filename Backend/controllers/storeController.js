const Store = require('../models/Store');
const User = require('../models/User');

// Helper function to generate unique slug
const generateUniqueSlug = async (storeName) => {
    let slug = storeName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen

    // Check if slug exists
    let existingStore = await Store.findOne({ storeSlug: slug });
    let counter = 1;

    while (existingStore) {
        slug = `${slug}-${counter}`;
        existingStore = await Store.findOne({ storeSlug: slug });
        counter++;
    }

    return slug;
};

// Create a new store
exports.createStore = async (req, res) => {
    try {
        const { storeName, description, logo, banner } = req.body;
        const sellerId = req.user.id;

        // Check if seller already has a store
        const existingStore = await Store.findOne({ seller: sellerId });
        if (existingStore) {
            return res.status(409).json({ msg: 'You already have a store. Please update your existing store.' });
        }

        // Validate store name
        if (!storeName || storeName.trim().length < 3) {
            return res.status(400).json({ msg: 'Store name must be at least 3 characters long' });
        }

        if (storeName.length > 50) {
            return res.status(400).json({ msg: 'Store name cannot exceed 50 characters' });
        }

        // Generate unique slug
        const storeSlug = await generateUniqueSlug(storeName);

        // Create store
        const newStore = new Store({
            seller: sellerId,
            storeName: storeName.trim(),
            storeSlug,
            description: description || '',
            logo: logo || '',
            banner: banner || ''
        });

        await newStore.save();

        res.status(201).json({
            msg: 'Store created successfully',
            store: newStore
        });
    } catch (error) {
        console.error('Create store error:', error);
        res.status(500).json({ msg: 'Server error while creating store' });
    }
};

// Get seller's own store
exports.getMyStore = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'You have not created a store yet' });
        }

        res.status(200).json({
            msg: 'Store fetched successfully',
            store
        });
    } catch (error) {
        console.error('Get my store error:', error);
        res.status(500).json({ msg: 'Server error while fetching store' });
    }
};

// Update store
exports.updateStore = async (req, res) => {
    try {
        const { storeName, description, logo, banner } = req.body;
        const sellerId = req.user.id;

        // Find seller's store
        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found. Please create a store first.' });
        }

        // Validate store name if provided
        if (storeName) {
            if (storeName.trim().length < 3) {
                return res.status(400).json({ msg: 'Store name must be at least 3 characters long' });
            }
            if (storeName.length > 50) {
                return res.status(400).json({ msg: 'Store name cannot exceed 50 characters' });
            }

            // Generate new slug if store name changed
            if (storeName !== store.storeName) {
                store.storeSlug = await generateUniqueSlug(storeName);
            }

            store.storeName = storeName.trim();
        }

        // Update other fields
        if (description !== undefined) store.description = description;
        if (logo !== undefined) store.logo = logo;
        if (banner !== undefined) store.banner = banner;

        await store.save();

        res.status(200).json({
            msg: 'Store updated successfully',
            store
        });
    } catch (error) {
        console.error('Update store error:', error);
        res.status(500).json({ msg: 'Server error while updating store' });
    }
};

// Delete store
exports.deleteStore = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const store = await Store.findOneAndDelete({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        res.status(200).json({
            msg: 'Store deleted successfully'
        });
    } catch (error) {
        console.error('Delete store error:', error);
        res.status(500).json({ msg: 'Server error while deleting store' });
    }
};

// Search stores
exports.searchStores = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ msg: 'Search query is required' });
        }

        // Text search on storeName and description
        const stores = await Store.find(
            { $text: { $search: q }, isActive: true },
            { score: { $meta: 'textScore' } }
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(20)
        .populate('seller', 'username email');

        res.status(200).json({
            msg: 'Stores fetched successfully',
            stores,
            count: stores.length
        });
    } catch (error) {
        console.error('Search stores error:', error);
        res.status(500).json({ msg: 'Server error while searching stores' });
    }
};

// Get store suggestions for autocomplete (limit 5)
exports.getStoreSuggestions = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(200).json({ suggestions: [] });
        }

        // Use regex for partial matching
        const stores = await Store.find({
            storeName: { $regex: q, $options: 'i' },
            isActive: true
        })
        .select('storeName storeSlug logo')
        .limit(5);

        res.status(200).json({
            suggestions: stores
        });
    } catch (error) {
        console.error('Get store suggestions error:', error);
        res.status(500).json({ msg: 'Server error while fetching suggestions' });
    }
};

// Get store by slug (public)
exports.getStoreBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const store = await Store.findOne({ storeSlug: slug, isActive: true })
            .populate('seller', 'username email avatar');

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        res.status(200).json({
            msg: 'Store fetched successfully',
            store
        });
    } catch (error) {
        console.error('Get store by slug error:', error);
        res.status(500).json({ msg: 'Server error while fetching store' });
    }
};

// Get store by seller ID (public)
exports.getStoreBySellerId = async (req, res) => {
    try {
        const { id } = req.params;

        const store = await Store.findOne({ seller: id, isActive: true })
            .populate('seller', 'username email avatar');

        if (!store) {
            return res.status(404).json({ msg: 'Store not found for this seller' });
        }

        res.status(200).json({
            msg: 'Store fetched successfully',
            store
        });
    } catch (error) {
        console.error('Get store by seller ID error:', error);
        res.status(500).json({ msg: 'Server error while fetching store' });
    }
};

// Get products from a specific store
exports.getStoreProducts = async (req, res) => {
    try {
        const { slug } = req.params;
        const { categories, brands, priceRange, search, page = 1, limit = 20 } = req.query;

        // Find store
        const store = await Store.findOne({ storeSlug: slug, isActive: true });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        // Build query for products
        const Product = require('../models/Product');
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
        console.error('Get store products error:', error);
        res.status(500).json({ msg: 'Server error while fetching store products' });
    }
};

// Get all stores (paginated)
exports.getAllStores = async (req, res) => {
    try {
        const { page = 1, limit = 12, sort = 'newest' } = req.query;

        let sortOption = {};
        switch (sort) {
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'views':
                sortOption = { views: -1 };
                break;
            case 'name':
                sortOption = { storeName: 1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const skip = (page - 1) * limit;

        const stores = await Store.find({ isActive: true })
            .populate('seller', 'username')
            .sort(sortOption)
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Store.countDocuments({ isActive: true });

        // Get product count for each store
        const Product = require('../models/Product');
        const storesWithProductCount = await Promise.all(
            stores.map(async (store) => {
                const productCount = await Product.countDocuments({ seller: store.seller._id });
                return {
                    ...store.toObject(),
                    productCount
                };
            })
        );

        res.status(200).json({
            msg: 'Stores fetched successfully',
            stores: storesWithProductCount,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all stores error:', error);
        res.status(500).json({ msg: 'Server error while fetching stores' });
    }
};

// Increment store view count
exports.incrementStoreView = async (req, res) => {
    try {
        const { slug } = req.params;

        const store = await Store.findOneAndUpdate(
            { storeSlug: slug, isActive: true },
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        res.status(200).json({
            msg: 'View count updated',
            views: store.views
        });
    } catch (error) {
        console.error('Increment store view error:', error);
        res.status(500).json({ msg: 'Server error while updating view count' });
    }
};

// Get store analytics (seller only)
exports.getStoreAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        // Get product count
        const Product = require('../models/Product');
        const productCount = await Product.countDocuments({ seller: sellerId });

        // Get total sales (from orders)
        const Order = require('../models/Order');
        const orders = await Order.find({
            'orderItems.productId': { $in: await Product.find({ seller: sellerId }).distinct('_id') },
            isPaid: true
        });

        const totalSales = orders.reduce((sum, order) => sum + order.orderSummary.totalAmount, 0);

        res.status(200).json({
            msg: 'Analytics fetched successfully',
            analytics: {
                views: store.views || 0,
                productCount: productCount || 0,
                totalSales: totalSales || 0,
                storeName: store.storeName,
                createdAt: store.createdAt
            }
        });
    } catch (error) {
        console.error('Get store analytics error:', error);
        res.status(500).json({ msg: 'Server error while fetching analytics' });
    }
};
