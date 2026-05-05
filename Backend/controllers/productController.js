// const { default: Fuse } = require("fuse.js")
const Product = require("../models/Product")
const Fuse = require('fuse.js')


exports.getProducts = async (req, res) => {
    const { categories, brands, priceRange, search, page = 1, limit = 12 } = { ...req.query }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    try {
        let query = {}
        if (categories) query.category = Array.isArray(categories) ? { $in: categories } : categories
        if (brands) query.brand = Array.isArray(brands) ? { $in: brands } : brands
        if (priceRange) {
            const [min, max] = priceRange.split(',')
            query.price = { $gte: Number(min), $lte: Number(max) }
        }

        // Only show products from active stores (hides blocked/expired seller products)
        const Store = require('../models/Store');
        const activeStores = await Store.find({ isActive: true }).select('seller').lean();
        const activeSellerIds = activeStores.map(s => s.seller).filter(Boolean);
        // Include products with no seller (admin products) + products from active sellers
        query.$or = [
            { seller: null },
            { seller: { $in: activeSellerIds } },
        ];

        let products = await Product.find(query)

        // Apply fuzzy search with Fuse.js if search term is present
        if (search) {
            const fuse = new Fuse(products, {
                threshold: 0.4,
                keys: ['name', 'description', 'brand', 'tags', 'category']
            })
            const results = fuse.search(search)
            products = results.map(r => r.item)
        }

        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / limitNum);
        const paginatedProducts = products.slice(skip, skip + limitNum);

        res.status(200).json({
            msg: 'fetched products successfully.',
            products: paginatedProducts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalProducts,
                totalPages,
                hasMore: pageNum < totalPages,
            }
        })
    } catch (error) {
        console.error('Server error while fetching products:::', error.message);
        res.status(500).json({ msg: 'Server error while fetching products.' })
    }
}

exports.getSingleProduct = async (req, res) => {
    const { id } = req.params
    try {
        const singleProduct = await Product.findById(id)
        if (!singleProduct) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // Check if seller's store is active (hide products from blocked sellers)
        if (singleProduct.seller) {
            const Store = require('../models/Store');
            const store = await Store.findOne({ seller: singleProduct.seller, isActive: true });
            if (!store) {
                return res.status(404).json({ msg: 'Product not available' });
            }
        }

        await singleProduct.populate({
            path: 'reviews.user',
            select: 'avatar username email'
        })
        res.status(200).json({ msg: 'fetched single product', product: singleProduct })
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: 'Server error' })
    }
}


exports.getFilters = async (req, res) => {
    try {
        const categories = await Product.distinct('category')
        const brands = await Product.distinct('brand')
        // console.log('categories:', categories, 'brands:', brands);
        res.status(200).json({ categories, brands })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err })
    }
}

// Add Review to Product (Authenticated Users) 
exports.addReview = async (req, res) => {
    const { rating, comment } = req.body
    const { id: prodId } = req.params 
    

    const userId = req.user.id

    try {
        const product = await Product.findById(prodId)

        product.reviews.push({
            user: userId,
            rating: rating,
            comment: comment
        })

        await product.populate({
            path: 'reviews.user',
            select: 'username email'
        })


        product.calculateRating()
        await product.save()
        res.status(200).json({ msg: 'Review added', product: product })
    } catch (error) {
        console.error('Error while adding review:::', error.message);
        res.status(500).json({ msg: 'Server error while adding review.' })
    }
};


exports.deleteProduct = async (req, res) => {
    console.log(req.user);
    const { role, id: userId } = req.user
    const { id } = req.params
    console.log('delete product id:::', req.params.id);
    
    if (role !== 'admin' && role !== 'seller') {
        return res.status(403).json({ msg: 'Unauthorized to delete product' })
    }

    try {
        const product = await Product.findById(id)
        
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' })
        }
        
        // Sellers can only delete their own products
        if (role === 'seller' && product.seller?.toString() !== userId) {
            return res.status(403).json({ msg: 'You can only delete your own products' })
        }
        
        await Product.findByIdAndDelete({ _id: id })
        console.log('product:::', product);
        res.status(200).json({ msg: 'Product deleted successfully' })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error while deleting product' })
    }

}

// ── Featured product limits by plan tier ──
const FEATURED_LIMITS = {
    free_trial: 3,
    starter: 6,
    elite: 12,
};

/**
 * Check if a seller can feature a product. Returns:
 * { allowed: boolean, current: number, max: number, plan: string, reason?: string }
 */
async function sellerCanFeatureProduct(userId, excludeProductId = null) {
    try {
        const SellerSubscription = require('../models/SellerSubscription');
        const sub = await SellerSubscription.findOne({ seller: userId });

        // Determine plan tier and entitlement
        let plan = 'free_trial';
        let entitled = false;

        if (!sub) {
            // No subscription record — trial-grace
            plan = 'free_trial';
            entitled = true;
        } else if (sub.status === 'trial') {
            plan = 'free_trial';
            entitled = true;
        } else if (sub.plan === 'elite' && ['active', 'free_period'].includes(sub.status)) {
            plan = 'elite';
            entitled = true;
        } else if (['active', 'free_period'].includes(sub.status)) {
            plan = sub.plan || 'starter';
            // Starter: needs bonus features active OR just allow (featured is a core feature per tier now)
            entitled = true;
        } else if (sub.bonusFeaturesActive && (!sub.bonusExpiryDate || new Date() < sub.bonusExpiryDate)) {
            plan = sub.plan || 'starter';
            entitled = true;
        } else {
            plan = sub.plan || 'free_trial';
            entitled = false;
        }

        if (!entitled) {
            return { allowed: false, current: 0, max: 0, plan, reason: 'not_entitled' };
        }

        const max = FEATURED_LIMITS[plan] || FEATURED_LIMITS.free_trial;

        // Count current featured products for this seller
        const query = { seller: userId, isFeatured: true };
        if (excludeProductId) {
            query._id = { $ne: excludeProductId };
        }
        const current = await Product.countDocuments(query);

        if (current >= max) {
            return { allowed: false, current, max, plan, reason: 'limit_reached' };
        }

        return { allowed: true, current, max, plan };
    } catch (e) {
        console.error('sellerCanFeatureProduct error:', e);
        return { allowed: false, current: 0, max: 0, plan: 'free_trial', reason: 'error' };
    }
}

/**
 * GET /api/products/featured-stats — returns the seller's featured product count and limit.
 */
exports.getFeaturedStats = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        if (role !== 'seller' && role !== 'admin') {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        const stats = await sellerCanFeatureProduct(userId);
        res.json({ current: stats.current, max: stats.max, plan: stats.plan, allowed: stats.allowed });
    } catch (err) {
        console.error('getFeaturedStats:', err);
        res.status(500).json({ msg: 'Failed to fetch featured stats' });
    }
};

exports.editProduct = async (req, res) => {
    try {
        const { id } = req.params
        const { product } = req.body
        const { role, id: userId } = req.user
        console.log(role);

        if (role !== 'admin' && role !== 'seller') {
            return res.status(403).json({ msg: 'Unauthorized to edit product' })
        }
        
        const existingProduct = await Product.findById(id)
        
        if (!existingProduct) {
            return res.status(404).json({ msg: 'Product not found' })
        }
        
        // Sellers can only edit their own products
        if (role === 'seller' && existingProduct.seller?.toString() !== userId) {
            return res.status(403).json({ msg: 'You can only edit your own products' })
        }

        // Gate: enforce featured product limits based on subscription tier.
        if (role === 'seller' && product && product.isFeatured === true) {
            // Exclude this product from the count (since we're editing it)
            const featCheck = await sellerCanFeatureProduct(userId, id);
            if (!featCheck.allowed) {
                if (featCheck.reason === 'limit_reached') {
                    return res.status(403).json({ msg: `You've reached your featured product limit (${featCheck.max}). Upgrade your plan to feature more products.`, featuredStats: featCheck });
                }
                product.isFeatured = false;
            }
        }
        
        console.log(req.body);
        const updatedProduct = await Product.findByIdAndUpdate(id,
            { $set: product },
            { new: true, runValidators: true }
        )

        res.status(200).json({ msg: 'Product updated successfully.' })

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error while editing product.' })
    }
}

exports.addProduct = async (req, res) => {
    const { product } = req.body
    const { role, id: userId } = req.user

    try {
        if (role !== 'admin' && role !== 'seller') {
            return res.status(403).json({ msg: 'Unauthorized to add product' })
        }

        // Sellers must have a store before adding products
        if (role === 'seller') {
            const Store = require('../models/Store');
            const store = await Store.findOne({ seller: userId });
            if (!store) {
                return res.status(403).json({ msg: 'You must create a store before adding products. Go to Store Settings to set up your store.' });
            }

            // Enforce product limit for trial sellers (15 products max)
            const SellerSubscription = require('../models/SellerSubscription');
            const sub = await SellerSubscription.findOne({ seller: userId });
            if (sub && sub.status === 'trial') {
                const productCount = await Product.countDocuments({ seller: userId });
                if (productCount >= 15) {
                    return res.status(403).json({ msg: 'You have reached the maximum of 15 product listings during your free trial. Subscribe to add unlimited products.' });
                }
            }
        }
        
        // Gate: enforce featured product limits based on subscription tier.
        let safeProduct = product;
        if (role === 'seller' && product?.isFeatured === true) {
            const featCheck = await sellerCanFeatureProduct(userId);
            if (!featCheck.allowed) {
                if (featCheck.reason === 'limit_reached') {
                    return res.status(403).json({ msg: `You've reached your featured product limit (${featCheck.max}). Upgrade your plan to feature more products.`, featuredStats: featCheck });
                }
                safeProduct = { ...product, isFeatured: false };
            }
        }

        const newProduct = new Product({
            ...safeProduct,
            seller: role === 'seller' ? userId : null // Only set seller for seller role
        })
        console.log('New product object:', newProduct);
        await newProduct.save()
        console.log('Product saved successfully');
        res.status(200).json({ msg: 'Product added successfully.' })

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error while adding new product.' })
    }
}

exports.bulkDiscount = async (req, res) => {
    const { role, id: userId } = req.user
    const { productIds, discountType, discountValue } = req.body

    try {
        if (role !== 'admin' && role !== 'seller') {
            return res.status(403).json({ msg: 'Unauthorized to apply bulk discount' })
        }

        // Validate input
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ msg: 'Product IDs array is required' })
        }

        if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
            return res.status(400).json({ msg: 'Discount type must be "percentage" or "fixed"' })
        }

        if (discountValue === undefined || discountValue < 0) {
            return res.status(400).json({ msg: 'Valid discount value is required' })
        }

        // Build query - sellers can only update their own products
        const query = { _id: { $in: productIds } }
        if (role === 'seller') {
            query.seller = userId
        }

        // Fetch all products to update
        const products = await Product.find(query)

        if (products.length === 0) {
            return res.status(404).json({ msg: 'No products found or you do not have permission to update these products' })
        }

        // Apply discount to each product
        const updatePromises = products.map(async (product) => {
            let newDiscountedPrice

            if (discountType === 'percentage') {
                // Apply percentage discount
                const discountAmount = (product.price * discountValue) / 100
                newDiscountedPrice = Math.max(0, product.price - discountAmount)
            } else {
                // Apply fixed amount discount
                newDiscountedPrice = Math.max(0, product.price - discountValue)
            }

            product.discountedPrice = Math.round(newDiscountedPrice * 100) / 100
            return product.save()
        })

        await Promise.all(updatePromises)

        res.status(200).json({ 
            msg: `Bulk discount applied successfully to ${products.length} product(s)`,
            updatedCount: products.length
        })

    } catch (error) {
        console.error('Error while applying bulk discount:::', error.message);
        res.status(500).json({ msg: 'Server error while applying bulk discount.' })
    }
}

exports.bulkPriceUpdate = async (req, res) => {
    const { role, id: userId } = req.user
    const { productIds, updateType, value } = req.body

    try {
        if (role !== 'admin' && role !== 'seller') {
            return res.status(403).json({ msg: 'Unauthorized to update bulk prices' })
        }

        // Validate input
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ msg: 'Product IDs array is required' })
        }

        if (!updateType || !['percentage', 'fixed', 'set'].includes(updateType)) {
            return res.status(400).json({ msg: 'Update type must be "percentage", "fixed", or "set"' })
        }

        if (value === undefined) {
            return res.status(400).json({ msg: 'Value is required' })
        }

        // Build query - sellers can only update their own products
        const query = { _id: { $in: productIds } }
        if (role === 'seller') {
            query.seller = userId
        }

        // Fetch all products to update
        const products = await Product.find(query)

        if (products.length === 0) {
            return res.status(404).json({ msg: 'No products found or you do not have permission to update these products' })
        }

        // Update price for each product
        const updatePromises = products.map(async (product) => {
            let newPrice

            if (updateType === 'percentage') {
                // Increase/decrease by percentage
                const changeAmount = (product.price * value) / 100
                newPrice = Math.max(0, product.price + changeAmount)
            } else if (updateType === 'fixed') {
                // Increase/decrease by fixed amount
                newPrice = Math.max(0, product.price + value)
            } else {
                // Set to specific price
                newPrice = Math.max(0, value)
            }

            product.price = Math.round(newPrice * 100) / 100
            
            // Reset discounted price if it's higher than new price
            if (product.discountedPrice > 0 && product.discountedPrice >= product.price) {
                product.discountedPrice = 0
            }

            return product.save()
        })

        await Promise.all(updatePromises)

        res.status(200).json({ 
            msg: `Bulk price update applied successfully to ${products.length} product(s)`,
            updatedCount: products.length
        })

    } catch (error) {
        console.error('Error while updating bulk prices:::', error.message);
        res.status(500).json({ msg: 'Server error while updating bulk prices.' })
    }
}

exports.removeDiscount = async (req, res) => {
    const { role, id: userId } = req.user
    const { productIds } = req.body

    try {
        if (role !== 'admin' && role !== 'seller') {
            return res.status(403).json({ msg: 'Unauthorized to remove discounts' })
        }

        // Validate input
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ msg: 'Product IDs array is required' })
        }

        // Build query - sellers can only update their own products
        const query = { _id: { $in: productIds } }
        if (role === 'seller') {
            query.seller = userId
        }

        // Update all products to remove discount
        const result = await Product.updateMany(
            query,
            { $set: { discountedPrice: 0 } }
        )

        res.status(200).json({ 
            msg: `Discounts removed successfully from ${result.modifiedCount} product(s)`,
            updatedCount: result.modifiedCount
        })

    } catch (error) {
        console.error('Error while removing discounts:::', error.message);
        res.status(500).json({ msg: 'Server error while removing discounts.' })
    }
}

// Get seller's products
exports.getSellerProducts = async (req, res) => {
    const { role, id: userId } = req.user
    const { categories, brands, priceRange, search } = { ...req.query }

    try {
        if (role !== 'seller') {
            return res.status(403).json({ msg: 'Only sellers can access this endpoint' })
        }

        let query = { seller: userId }
        
        if (categories) query.category = Array.isArray(categories) ? { $in: categories } : categories
        if (brands) query.brand = Array.isArray(brands) ? { $in: brands } : brands
        if (priceRange) {
            const [min, max] = priceRange.split(',')
            query.price = { $gte: Number(min), $lte: Number(max) }
        }

        let products = await Product.find(query)

        if (search) {
            const fuse = new Fuse(products, {
                threshold: 0.4,
                keys: ['name', 'description', 'brand', 'tags', 'category']
            })

            const results = fuse.search(search)
            products = results.map(r => r.item)
        }

        res.status(200).json({ msg: 'Fetched seller products successfully.', products: products })
    } catch (error) {
        console.error('Server error while fetching seller products:::', error.message);
        res.status(500).json({ msg: 'Server error while fetching seller products.' })
    }
}