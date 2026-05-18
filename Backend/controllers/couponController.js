const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const Store = require('../models/Store');
const mongoose = require('mongoose');

const isObjectId = (value) => (
    typeof value === 'string' &&
    mongoose.Types.ObjectId.isValid(value) &&
    String(new mongoose.Types.ObjectId(value)) === value.toLowerCase()
);

const isMissingIdentifier = (value) => {
    const normalized = String(value || '').trim();
    return !normalized || ['undefined', 'null', '[object Object]'].includes(normalized);
};

const stripInternalCouponFields = (coupon) => {
    const obj = coupon.toObject ? coupon.toObject() : { ...coupon };
    delete obj.maxUses;
    delete obj.usedCount;
    return obj;
};

const resolveSellerIdForStoreCoupons = async (identifier) => {
    if (isMissingIdentifier(identifier)) return null;

    const value = decodeURIComponent(String(identifier).trim());

    if (isObjectId(value)) {
        const store = await Store.findOne({
            isActive: true,
            $or: [{ _id: value }, { seller: value }],
        }).select('seller');

        return store?.seller || value;
    }

    const store = await Store.findOne({
        isActive: true,
        storeSlug: value.toLowerCase(),
    }).select('seller');

    return store?.seller || null;
};

// ─── Create a coupon ───
exports.createCoupon = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const {
            code, discountType, discountValue, applicableTo, applicableProducts,
            maxUses, maxUsesPerUser, minOrderAmount, maxDiscountAmount,
            startDate, expiryDate, description,
        } = req.body;

        if (!code || !discountType || discountValue === undefined || !expiryDate) {
            return res.status(400).json({ msg: 'Code, discount type, discount value and expiry date are required.' });
        }

        if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
            return res.status(400).json({ msg: 'Percentage discount must be between 1 and 100.' });
        }

        if (discountType === 'fixed' && discountValue <= 0) {
            return res.status(400).json({ msg: 'Fixed discount must be greater than 0.' });
        }

        if (new Date(expiryDate) <= new Date()) {
            return res.status(400).json({ msg: 'Expiry date must be in the future.' });
        }

        // If selected products, verify they belong to this seller
        if (applicableTo === 'selected' && applicableProducts?.length > 0) {
            const products = await Product.find({ _id: { $in: applicableProducts }, seller: sellerId });
            if (products.length !== applicableProducts.length) {
                return res.status(400).json({ msg: 'Some products do not belong to you.' });
            }
        }

        const coupon = await Coupon.create({
            seller: sellerId,
            code: code.toUpperCase().trim(),
            discountType,
            discountValue,
            applicableTo: applicableTo || 'all',
            applicableProducts: applicableTo === 'selected' ? applicableProducts : [],
            maxUses: maxUses || null,
            maxUsesPerUser: maxUsesPerUser || 1,
            minOrderAmount: minOrderAmount || 0,
            maxDiscountAmount: maxDiscountAmount || null,
            startDate: startDate || new Date(),
            expiryDate,
            description: description || '',
        });

        res.status(201).json({ msg: 'Coupon created successfully!', coupon });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ msg: 'You already have a coupon with this code.' });
        }
        console.error('Create coupon error:', error);
        res.status(500).json({ msg: 'Failed to create coupon.' });
    }
};

// ─── Get seller's coupons ───
exports.getSellerCoupons = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const coupons = await Coupon.find({ seller: sellerId })
            .populate('applicableProducts', 'name image price')
            .sort({ createdAt: -1 });

        res.json({ coupons });
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({ msg: 'Failed to fetch coupons.' });
    }
};

// ─── Update a coupon ───
exports.updateCoupon = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { id } = req.params;
        const updates = req.body;

        const coupon = await Coupon.findOne({ _id: id, seller: sellerId });
        if (!coupon) return res.status(404).json({ msg: 'Coupon not found.' });

        // Validate applicable products if changed
        if (updates.applicableTo === 'selected' && updates.applicableProducts?.length > 0) {
            const products = await Product.find({ _id: { $in: updates.applicableProducts }, seller: sellerId });
            if (products.length !== updates.applicableProducts.length) {
                return res.status(400).json({ msg: 'Some products do not belong to you.' });
            }
        }

        const allowedFields = [
            'code', 'discountType', 'discountValue', 'applicableTo', 'applicableProducts',
            'maxUses', 'maxUsesPerUser', 'minOrderAmount', 'maxDiscountAmount',
            'startDate', 'expiryDate', 'isActive', 'description',
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                coupon[field] = updates[field];
            }
        });

        if (updates.applicableTo === 'all') {
            coupon.applicableProducts = [];
        }

        await coupon.save();
        res.json({ msg: 'Coupon updated successfully!', coupon });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ msg: 'You already have a coupon with this code.' });
        }
        console.error('Update coupon error:', error);
        res.status(500).json({ msg: 'Failed to update coupon.' });
    }
};

// ─── Delete a coupon ───
exports.deleteCoupon = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { id } = req.params;

        const coupon = await Coupon.findOneAndDelete({ _id: id, seller: sellerId });
        if (!coupon) return res.status(404).json({ msg: 'Coupon not found.' });

        res.json({ msg: 'Coupon deleted successfully!' });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ msg: 'Failed to delete coupon.' });
    }
};

// ─── Toggle coupon active/inactive ───
exports.toggleCoupon = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { id } = req.params;

        const coupon = await Coupon.findOne({ _id: id, seller: sellerId });
        if (!coupon) return res.status(404).json({ msg: 'Coupon not found.' });

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({ msg: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}!`, coupon });
    } catch (error) {
        console.error('Toggle coupon error:', error);
        res.status(500).json({ msg: 'Failed to toggle coupon.' });
    }
};

// ─── Validate & apply coupon at checkout (called from frontend) ───
exports.validateCoupon = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code, productIds } = req.body;
        // productIds = array of product IDs the user is trying to apply this coupon to

        if (!code) return res.status(400).json({ msg: 'Coupon code is required.' });

        const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() })
            .populate('applicableProducts', '_id');

        if (!coupon) return res.status(404).json({ msg: 'Invalid coupon code.' });

        // Check active
        if (!coupon.isActive) return res.status(400).json({ msg: 'This coupon is no longer active.' });

        // Check dates
        const now = new Date();
        if (now < coupon.startDate) return res.status(400).json({ msg: 'This coupon is not yet valid.' });
        if (now > coupon.expiryDate) return res.status(400).json({ msg: 'This coupon has expired.' });

        // Check total usage limit
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            return res.status(400).json({ msg: 'This coupon has reached its usage limit.' });
        }

        // Check per-user usage limit
        const userUsage = coupon.usedBy.find(u => u.user.toString() === userId);
        if (userUsage && userUsage.count >= coupon.maxUsesPerUser) {
            return res.status(400).json({ msg: 'You have already used this coupon the maximum number of times.' });
        }

        // Determine which products the coupon applies to
        let applicableProductIds = [];
        if (coupon.applicableTo === 'all') {
            // All products from this seller — filter productIds by seller
            const sellerProducts = await Product.find({ seller: coupon.seller, _id: { $in: productIds } }).select('_id');
            applicableProductIds = sellerProducts.map(p => p._id.toString());
        } else {
            // Only selected products
            const couponProductIds = coupon.applicableProducts.map(p => p._id.toString());
            applicableProductIds = productIds.filter(pid => couponProductIds.includes(pid));
        }

        if (applicableProductIds.length === 0) {
            return res.status(400).json({ msg: 'This coupon does not apply to any of your selected products.' });
        }

        res.json({
            valid: true,
            coupon: {
                _id: coupon._id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                applicableTo: coupon.applicableTo,
                applicableProductIds,
                minOrderAmount: coupon.minOrderAmount,
                maxDiscountAmount: coupon.maxDiscountAmount,
                seller: coupon.seller,
                description: coupon.description,
            },
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({ msg: 'Failed to validate coupon.' });
    }
};

// ─── Get available coupons for checkout (by seller IDs in cart) ───
exports.getCheckoutCoupons = async (req, res) => {
    try {
        const { sellerIds } = req.body;
        if (!sellerIds || sellerIds.length === 0) {
            return res.json({ sellerCoupons: {} });
        }

        const now = new Date();
        const coupons = await Coupon.find({
            seller: { $in: sellerIds },
            isActive: true,
            startDate: { $lte: now },
            expiryDate: { $gte: now },
        }).populate('applicableProducts', '_id name');

        // Filter out fully used coupons
        const validCoupons = coupons.filter(c => c.maxUses === null || c.usedCount < c.maxUses);

        // Group by seller
        const sellerCoupons = {};
        validCoupons.forEach(c => {
            const sid = c.seller.toString();
            if (!sellerCoupons[sid]) sellerCoupons[sid] = [];
            sellerCoupons[sid].push({
                _id: c._id,
                code: c.code,
                discountType: c.discountType,
                discountValue: c.discountValue,
                applicableTo: c.applicableTo,
                applicableProducts: c.applicableProducts.map(p => p._id.toString()),
                minOrderAmount: c.minOrderAmount,
                maxDiscountAmount: c.maxDiscountAmount,
                description: c.description,
                expiryDate: c.expiryDate,
            });
        });

        res.json({ sellerCoupons });
    } catch (error) {
        console.error('Get checkout coupons error:', error);
        res.status(500).json({ msg: 'Failed to fetch coupons.' });
    }
};

// ─── Coupon Analytics for Sellers ───
exports.getCouponAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const Order = require('../models/Order');

        const coupons = await Coupon.find({ seller: sellerId })
            .populate('applicableProducts', 'name image price')
            .sort({ usedCount: -1 });

        // Get all orders with this seller's coupons
        const sellerCouponIds = coupons.map(c => c._id.toString());
        const ordersWithCoupons = await Order.find({
            'appliedCoupons.couponId': { $in: sellerCouponIds }
        });

        // Calculate per-coupon analytics
        const couponAnalytics = coupons.map(coupon => {
            const couponOrders = ordersWithCoupons.filter(order =>
                order.appliedCoupons.some(ac => ac.couponId?.toString() === coupon._id.toString())
            );

            const totalRevenue = couponOrders.reduce((sum, order) => {
                const sellerItems = order.orderItems.filter(item => {
                    if (coupon.applicableTo === 'all') return true;
                    return coupon.applicableProducts.some(p => p._id.toString() === item.productId.toString());
                });
                return sum + sellerItems.reduce((s, i) => s + i.price * i.quantity, 0);
            }, 0);

            const totalDiscount = couponOrders.reduce((sum, order) => {
                return sum + (order.orderSummary?.couponDiscount || 0);
            }, 0);

            const conversionRate = coupon.maxUses
                ? Math.round((coupon.usedCount / coupon.maxUses) * 100)
                : null;

            return {
                _id: coupon._id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                applicableTo: coupon.applicableTo,
                applicableProducts: coupon.applicableProducts,
                isActive: coupon.isActive,
                usedCount: coupon.usedCount,
                maxUses: coupon.maxUses,
                expiryDate: coupon.expiryDate,
                startDate: coupon.startDate,
                description: coupon.description,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalDiscount: Math.round(totalDiscount * 100) / 100,
                ordersGenerated: couponOrders.length,
                conversionRate,
                avgOrderValue: couponOrders.length > 0
                    ? Math.round((totalRevenue / couponOrders.length) * 100) / 100
                    : 0,
                uniqueUsers: coupon.usedBy?.length || 0,
            };
        });

        // Summary stats
        const totalCoupons = coupons.length;
        const activeCoupons = coupons.filter(c => c.isActive && new Date() <= new Date(c.expiryDate)).length;
        const totalUses = coupons.reduce((s, c) => s + c.usedCount, 0);
        const totalRevenueFromCoupons = couponAnalytics.reduce((s, c) => s + c.totalRevenue, 0);
        const totalDiscountGiven = couponAnalytics.reduce((s, c) => s + c.totalDiscount, 0);
        const topCoupon = couponAnalytics.length > 0
            ? couponAnalytics.reduce((best, c) => c.usedCount > best.usedCount ? c : best, couponAnalytics[0])
            : null;

        res.json({
            analytics: couponAnalytics,
            summary: {
                totalCoupons,
                activeCoupons,
                totalUses,
                totalRevenueFromCoupons: Math.round(totalRevenueFromCoupons * 100) / 100,
                totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
                topCouponCode: topCoupon?.code || null,
            }
        });
    } catch (error) {
        console.error('Coupon analytics error:', error);
        res.status(500).json({ msg: 'Failed to fetch coupon analytics.' });
    }
};

// ─── Get public coupons for a product ───
exports.getProductCoupons = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!isObjectId(productId)) {
            return res.status(400).json({ coupons: [], msg: 'Invalid product id.' });
        }

        const product = await Product.findById(productId).select('seller');
        if (!product) return res.status(404).json({ msg: 'Product not found.' });

        const now = new Date();
        const coupons = await Coupon.find({
            seller: product.seller,
            isActive: true,
            startDate: { $lte: now },
            expiryDate: { $gte: now },
            $or: [
                { applicableTo: 'all' },
                { applicableTo: 'selected', applicableProducts: productId }
            ]
        }).select('code discountType discountValue applicableTo description expiryDate minOrderAmount maxDiscountAmount maxUses usedCount');

        const validCoupons = coupons
            .filter(c => c.maxUses === null || c.usedCount < c.maxUses)
            .map(stripInternalCouponFields);

        res.json({ coupons: validCoupons });
    } catch (error) {
        console.error('Get product coupons error:', error);
        res.status(500).json({ msg: 'Failed to fetch coupons.' });
    }
};

// ─── Get public coupons for a store ───
exports.getStoreCoupons = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const resolvedSellerId = await resolveSellerIdForStoreCoupons(sellerId);
        if (!resolvedSellerId) return res.json({ coupons: [] });

        const now = new Date();
        const coupons = await Coupon.find({
            seller: resolvedSellerId,
            isActive: true,
            startDate: { $lte: now },
            expiryDate: { $gte: now },
        })
            .populate('applicableProducts', 'name image')
            .select('code discountType discountValue applicableTo applicableProducts description expiryDate minOrderAmount maxDiscountAmount maxUses usedCount');

        const validCoupons = coupons
            .filter(c => c.maxUses === null || c.usedCount < c.maxUses)
            .map(stripInternalCouponFields);

        res.json({ coupons: validCoupons });
    } catch (error) {
        console.error('Get store coupons error:', error);
        res.status(500).json({ msg: 'Failed to fetch coupons.' });
    }
};

// ─── Record coupon usage (called after order is placed) ───
exports.recordCouponUsage = async (couponId, userId) => {
    try {
        const coupon = await Coupon.findById(couponId);
        if (!coupon) return;

        coupon.usedCount += 1;

        const existingUser = coupon.usedBy.find(u => u.user.toString() === userId);
        if (existingUser) {
            existingUser.count += 1;
        } else {
            coupon.usedBy.push({ user: userId, count: 1 });
        }

        await coupon.save();
    } catch (error) {
        console.error('Record coupon usage error:', error);
    }
};
