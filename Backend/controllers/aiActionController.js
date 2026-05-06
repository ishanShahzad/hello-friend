const Product = require('../models/Product');
const Order = require('../models/Order');
const Store = require('../models/Store');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const TaxConfig = require('../models/TaxConfig');
const ShippingMethod = require('../models/ShippingMethod');
const AIRateLimit = require('../models/AIRateLimit');

// Helper: get today's date string
const getToday = () => new Date().toISOString().split('T')[0];

// Rate limits per role (base limits - subscribed sellers get more)
const RATE_LIMITS = {
    guest: 5,
    user: 20,
    seller: 25,       // Free/trial sellers
    seller_sub: 100,   // Subscribed sellers
    admin: Infinity,
};

// Helper to get effective rate limit for seller
const getSellerRateLimit = async (userId) => {
    try {
        const SellerSubscription = require('../models/SellerSubscription');
        const sub = await SellerSubscription.findOne({ seller: userId });
        if (sub && ['active', 'free_period'].includes(sub.status)) {
            return sub.aiMessageLimit || RATE_LIMITS.seller_sub;
        }
    } catch (e) { /* fallback */ }
    return RATE_LIMITS.seller;
};

// ─── Rate Limit ───
exports.getRateLimit = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role || 'guest';
        const ip = req.headers['cf-connecting-ip'] || req.ip || req.socket?.remoteAddress || 'unknown';
        const today = getToday();

        const query = userId ? { userId, date: today } : { ip, date: today, userId: null };
        const record = await AIRateLimit.findOne(query);
        const used = record?.messageCount || 0;
        const limit = role === 'seller' ? await getSellerRateLimit(userId) : (RATE_LIMITS[role] || RATE_LIMITS.guest);

        res.json({
            used,
            limit: limit === Infinity ? -1 : limit, // -1 means unlimited
            remaining: limit === Infinity ? -1 : Math.max(0, limit - used),
            role,
        });
    } catch (error) {
        console.error('Get rate limit error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.incrementRateLimit = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role || 'guest';
        const ip = req.headers['cf-connecting-ip'] || req.ip || req.socket?.remoteAddress || 'unknown';
        const today = getToday();
        const limit = role === 'seller' ? await getSellerRateLimit(userId) : (RATE_LIMITS[role] || RATE_LIMITS.guest);

        const query = userId ? { userId, date: today } : { ip, date: today, userId: null };

        // Check current count
        let record = await AIRateLimit.findOne(query);
        const currentCount = record?.messageCount || 0;

        if (limit !== Infinity && currentCount >= limit) {
            return res.status(429).json({
                msg: 'Daily message limit reached. Resets at midnight.',
                used: currentCount,
                limit,
                remaining: 0,
            });
        }

        // Increment
        record = await AIRateLimit.findOneAndUpdate(
            query,
            { $inc: { messageCount: 1 }, $setOnInsert: { userId: userId || null, ip: userId ? null : ip, date: today } },
            { upsert: true, new: true }
        );

        res.json({
            used: record.messageCount,
            limit: limit === Infinity ? -1 : limit,
            remaining: limit === Infinity ? -1 : Math.max(0, limit - record.messageCount),
        });
    } catch (error) {
        console.error('Increment rate limit error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// ─── SELLER ACTIONS ───

exports.addProduct = async (req, res) => {
    const { product } = req.body;
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        // Validate required fields
        const missing = [];
        if (!product?.name) missing.push('name');
        if (!product?.price && product?.price !== 0) missing.push('price');
        if (!product?.category) missing.push('category');
        if (!product?.brand) missing.push('brand');
        if (product?.stock === undefined) missing.push('stock');

        if (missing.length > 0) {
            return res.status(400).json({ msg: `Missing required fields: ${missing.join(', ')}`, missingFields: missing });
        }

        const newProduct = new Product({ ...product, seller: role === 'seller' ? userId : null });
        await newProduct.save();
        res.json({ msg: 'Product added successfully', product: { _id: newProduct._id, name: newProduct.name, price: newProduct.price } });
    } catch (error) {
        console.error('AI add product error:', error);
        res.status(500).json({ msg: 'Server error while adding product' });
    }
};

exports.editProduct = async (req, res) => {
    const { productId, updates } = req.body;
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ msg: 'Product not found' });
        if (role === 'seller' && product.seller?.toString() !== userId) return res.status(403).json({ msg: 'You can only edit your own products' });

        Object.assign(product, updates);
        await product.save();
        res.json({ msg: `Product "${product.name}" updated successfully` });
    } catch (error) {
        console.error('AI edit product error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.deleteProduct = async (req, res) => {
    const { productId } = req.body;
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ msg: 'Product not found' });
        if (role === 'seller' && product.seller?.toString() !== userId) return res.status(403).json({ msg: 'You can only delete your own products' });

        await Product.findByIdAndDelete(productId);
        res.json({ msg: `Product "${product.name}" deleted successfully` });
    } catch (error) {
        console.error('AI delete product error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.listMyProducts = async (req, res) => {
    const { role, id: userId } = req.user;
    const { search, category, page = 1, limit = 10 } = req.query;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        let query = role === 'seller' ? { seller: userId } : {};
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query).skip(skip).limit(parseInt(limit)).select('name price stock category brand discountedPrice image');
        const total = await Product.countDocuments(query);

        res.json({ products, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        console.error('AI list products error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.bulkDiscount = async (req, res) => {
    const { productIds, discountType, discountValue } = req.body;
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        const query = { _id: { $in: productIds } };
        if (role === 'seller') query.seller = userId;

        const products = await Product.find(query);
        if (products.length === 0) return res.status(404).json({ msg: 'No products found' });

        for (const product of products) {
            if (discountType === 'percentage') {
                product.discountedPrice = Math.max(0, product.price - (product.price * discountValue / 100));
            } else {
                product.discountedPrice = Math.max(0, product.price - discountValue);
            }
            product.discountedPrice = Math.round(product.discountedPrice * 100) / 100;
            await product.save();
        }

        res.json({ msg: `Discount applied to ${products.length} product(s)`, updatedCount: products.length });
    } catch (error) {
        console.error('AI bulk discount error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.bulkPriceUpdate = async (req, res) => {
    const { productIds, updateType, value } = req.body;
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        const query = { _id: { $in: productIds } };
        if (role === 'seller') query.seller = userId;

        const products = await Product.find(query);
        if (products.length === 0) return res.status(404).json({ msg: 'No products found' });

        for (const product of products) {
            if (updateType === 'percentage') product.price = Math.max(0, product.price + (product.price * value / 100));
            else if (updateType === 'fixed') product.price = Math.max(0, product.price + value);
            else product.price = Math.max(0, value);
            product.price = Math.round(product.price * 100) / 100;
            if (product.discountedPrice >= product.price) product.discountedPrice = 0;
            await product.save();
        }

        res.json({ msg: `Prices updated for ${products.length} product(s)`, updatedCount: products.length });
    } catch (error) {
        console.error('AI bulk price update error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.removeDiscount = async (req, res) => {
    const { productIds } = req.body;
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        const query = { _id: { $in: productIds } };
        if (role === 'seller') query.seller = userId;

        const result = await Product.updateMany(query, { $set: { discountedPrice: 0 } });
        res.json({ msg: `Discounts removed from ${result.modifiedCount} product(s)` });
    } catch (error) {
        console.error('AI remove discount error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getSellerAnalytics = async (req, res) => {
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        const products = await Product.find(role === 'seller' ? { seller: userId } : {});
        const productIds = products.map(p => p._id.toString());

        const allOrders = await Order.find({});
        let revenue = 0, unitsSold = 0, orderCount = 0;
        
        allOrders.forEach(order => {
            const items = order.orderItems.filter(i => productIds.includes(i.productId.toString()));
            if (items.length > 0) {
                orderCount++;
                items.forEach(i => { revenue += i.price * i.quantity; unitsSold += i.quantity; });
            }
        });

        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10);
        const outOfStock = products.filter(p => p.stock === 0);

        res.json({
            totalProducts: products.length,
            totalRevenue: Math.round(revenue * 100) / 100,
            totalOrders: orderCount,
            totalUnitsSold: unitsSold,
            avgOrderValue: orderCount > 0 ? Math.round((revenue / orderCount) * 100) / 100 : 0,
            lowStockProducts: lowStock.map(p => ({ name: p.name, stock: p.stock })),
            outOfStockProducts: outOfStock.map(p => ({ name: p.name })),
            topProducts: products.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5).map(p => ({ name: p.name, price: p.price, rating: p.rating, stock: p.stock })),
        });
    } catch (error) {
        console.error('AI seller analytics error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getSellerOrders = async (req, res) => {
    const { role, id: userId } = req.user;
    const { status, limit = 20 } = req.query;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });

        let query = {};
        if (status) query.orderStatus = status;

        const allOrders = await Order.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));

        if (role === 'seller') {
            const sellerProducts = await Product.find({ seller: userId }).select('_id');
            const spIds = sellerProducts.map(p => p._id.toString());

            const filtered = allOrders.filter(o => o.orderItems.some(i => spIds.includes(i.productId.toString())));
            return res.json({ orders: filtered.map(o => ({ orderId: o.orderId, _id: o._id, status: o.orderStatus, isPaid: o.isPaid, total: o.orderSummary?.totalAmount, date: o.createdAt, itemCount: o.orderItems.length })) });
        }

        res.json({ orders: allOrders.map(o => ({ orderId: o.orderId, _id: o._id, status: o.orderStatus, isPaid: o.isPaid, total: o.orderSummary?.totalAmount, date: o.createdAt, customer: o.shippingInfo?.fullName, itemCount: o.orderItems.length })) });
    } catch (error) {
        console.error('AI seller orders error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { orderId, newStatus } = req.body;
    const { role, id: userId } = req.user;
    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        if (role === 'seller') {
            const sellerProducts = await Product.find({ seller: userId }).select('_id');
            const spIds = sellerProducts.map(p => p._id.toString());
            if (!order.orderItems.some(i => spIds.includes(i.productId.toString()))) {
                return res.status(403).json({ msg: 'This order does not contain your products' });
            }
            if (newStatus === 'cancelled') return res.status(403).json({ msg: 'Sellers cannot cancel orders' });
        }

        order.orderStatus = newStatus;
        if (newStatus === 'delivered') order.isPaid = true;
        await order.save();

        res.json({ msg: `Order ${order.orderId} status updated to ${newStatus}` });
    } catch (error) {
        console.error('AI update order status error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getMyStore = async (req, res) => {
    const { id: userId } = req.user;
    try {
        const store = await Store.findOne({ seller: userId });
        if (!store) return res.status(404).json({ msg: 'No store found' });
        res.json({
            storeName: store.storeName, storeSlug: store.storeSlug, description: store.description,
            logo: store.logo, banner: store.banner, trustCount: store.trustCount,
            verification: store.verification, isActive: store.isActive,
            socialLinks: store.socialLinks, address: store.address, returnPolicy: store.returnPolicy,
        });
    } catch (error) {
        console.error('AI get store error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.updateStore = async (req, res) => {
    const { updates } = req.body;
    const { id: userId } = req.user;
    try {
        const store = await Store.findOne({ seller: userId });
        if (!store) return res.status(404).json({ msg: 'No store found' });

        const allowed = ['storeName', 'description', 'logo', 'banner', 'socialLinks', 'address', 'returnPolicy'];
        allowed.forEach(key => { if (updates[key] !== undefined) { store[key] = updates[key]; store.markModified(key); } });
        await store.save();

        res.json({ msg: `Store "${store.storeName}" updated successfully` });
    } catch (error) {
        console.error('AI update store error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getStoreAnalytics = async (req, res) => {
    const { id: userId } = req.user;
    try {
        const store = await Store.findOne({ seller: userId });
        if (!store) return res.status(404).json({ msg: 'No store found' });

        const productCount = await Product.countDocuments({ seller: userId });
        res.json({
            storeName: store.storeName, trustCount: store.trustCount, productCount,
            isVerified: store.verification?.isVerified || false, isActive: store.isActive,
        });
    } catch (error) {
        console.error('AI store analytics error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.applyForVerification = async (req, res) => {
    const { id: userId } = req.user;
    try {
        const store = await Store.findOne({ seller: userId });
        if (!store) return res.status(404).json({ msg: 'No store found' });
        if (store.verification?.isVerified) return res.json({ msg: 'Store is already verified' });
        if (store.verification?.status === 'pending') return res.json({ msg: 'Verification already pending' });

        store.verification = { ...(store.verification || {}), status: 'pending', appliedAt: new Date() };
        store.markModified('verification');
        await store.save();

        res.json({ msg: 'Verification application submitted successfully' });
    } catch (error) {
        console.error('AI apply verification error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getShippingMethods = async (req, res) => {
    const { id: userId } = req.user;
    try {
        const methods = await ShippingMethod.find({ seller: userId });
        res.json({ shippingMethods: methods });
    } catch (error) {
        console.error('AI get shipping error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.updateShipping = async (req, res) => {
    const { methodId, updates } = req.body;
    const { id: userId } = req.user;
    try {
        const method = await ShippingMethod.findOne({ _id: methodId, seller: userId });
        if (!method) return res.status(404).json({ msg: 'Shipping method not found' });

        Object.assign(method, updates);
        await method.save();
        res.json({ msg: `Shipping method "${method.name}" updated` });
    } catch (error) {
        console.error('AI update shipping error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// ─── ADMIN ACTIONS ───

exports.getAllUsers = async (req, res) => {
    const { role: userRole } = req.user;
    const { search, role, status, limit = 20 } = req.query;
    try {
        if (userRole !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        let query = {};
        if (role) query.role = role;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await User.find(query).limit(parseInt(limit)).select('username email role status avatar createdAt');
        const total = await User.countDocuments(query);

        res.json({ users, total });
    } catch (error) {
        console.error('AI get all users error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    const { userId } = req.body;
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const username = user.username;
        await User.findByIdAndDelete(userId);
        res.json({ msg: `User "${username}" deleted successfully` });
    } catch (error) {
        console.error('AI delete user error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.blockUser = async (req, res) => {
    const { userId } = req.body;
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.status = user.status === 'blocked' ? 'active' : 'blocked';
        await user.save();
        res.json({ msg: `User "${user.username}" is now ${user.status}` });
    } catch (error) {
        console.error('AI block user error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.changeUserRole = async (req, res) => {
    const { userId, newRole } = req.body;
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });
        if (!['user', 'seller', 'admin'].includes(newRole)) return res.status(400).json({ msg: 'Invalid role' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.role = newRole;
        await user.save();
        res.json({ msg: `${user.username}'s role changed to ${newRole}` });
    } catch (error) {
        console.error('AI change role error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getAdminAnalytics = async (req, res) => {
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const totalUsers = await User.countDocuments();
        const usersByRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalStores = await Store.countDocuments();
        const verifiedStores = await Store.countDocuments({ 'verification.isVerified': true });
        const pendingVerifications = await Store.countDocuments({ 'verification.status': 'pending' });

        const orders = await Order.find({ isPaid: true });
        const totalRevenue = orders.reduce((sum, o) => sum + (o.orderSummary?.totalAmount || 0), 0);

        res.json({
            totalUsers, usersByRole: usersByRole.reduce((a, r) => ({ ...a, [r._id]: r.count }), {}),
            totalProducts, totalOrders, totalStores, verifiedStores, pendingVerifications,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
        });
    } catch (error) {
        console.error('AI admin analytics error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getAllOrders = async (req, res) => {
    const { role } = req.user;
    const { status, limit = 20 } = req.query;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        let query = {};
        if (status) query.orderStatus = status;

        const orders = await Order.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
        res.json({
            orders: orders.map(o => ({
                orderId: o.orderId, _id: o._id, status: o.orderStatus, isPaid: o.isPaid,
                total: o.orderSummary?.totalAmount, date: o.createdAt,
                customer: o.shippingInfo?.fullName, itemCount: o.orderItems.length,
            })),
        });
    } catch (error) {
        console.error('AI get all orders error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getOrderDetail = async (req, res) => {
    const { orderId } = req.query;
    const { role } = req.user;
    try {
        if (role !== 'admin' && role !== 'seller') return res.status(403).json({ msg: 'Unauthorized' });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        res.json({
            orderId: order.orderId, status: order.orderStatus, isPaid: order.isPaid,
            orderItems: order.orderItems, shippingInfo: order.shippingInfo,
            orderSummary: order.orderSummary, paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
        });
    } catch (error) {
        console.error('AI order detail error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.cancelOrder = async (req, res) => {
    const { orderId } = req.body;
    const { role } = req.user;
    try {
        if (role === 'seller') return res.status(403).json({ msg: 'Sellers cannot cancel orders' });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        order.orderStatus = 'cancelled';
        await order.save();
        res.json({ msg: `Order ${order.orderId} cancelled` });
    } catch (error) {
        console.error('AI cancel order error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getAllComplaints = async (req, res) => {
    const { role } = req.user;
    const { category, status, limit = 20 } = req.query;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        let query = {};
        if (category) query.category = category;
        if (status) query.status = status;

        const complaints = await Complaint.find(query).sort({ createdAt: -1 }).limit(parseInt(limit))
            .populate('user', 'username email');

        res.json({ complaints: complaints.map(c => ({ _id: c._id, category: c.category, subject: c.subject, message: c.message, status: c.status, priority: c.priority, user: c.user?.username || 'Unknown', adminResponse: c.adminResponse, createdAt: c.createdAt })) });
    } catch (error) {
        console.error('AI get complaints error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.updateComplaint = async (req, res) => {
    const { complaintId, status, adminResponse, priority } = req.body;
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) return res.status(404).json({ msg: 'Complaint not found' });

        if (status) complaint.status = status;
        if (adminResponse) complaint.adminResponse = adminResponse;
        if (priority) complaint.priority = priority;
        await complaint.save();

        res.json({ msg: `Complaint updated — status: ${complaint.status}` });
    } catch (error) {
        console.error('AI update complaint error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getPendingVerifications = async (req, res) => {
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const stores = await Store.find({ 'verification.status': 'pending' }).populate('seller', 'username email');
        res.json({
            stores: stores.map(s => ({
                _id: s._id, storeName: s.storeName, storeSlug: s.storeSlug,
                seller: s.seller?.username, sellerEmail: s.seller?.email,
                appliedAt: s.verification?.appliedAt,
            })),
        });
    } catch (error) {
        console.error('AI pending verifications error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.approveVerification = async (req, res) => {
    const { storeId } = req.body;
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const store = await Store.findById(storeId);
        if (!store) return res.status(404).json({ msg: 'Store not found' });

        store.verification = { isVerified: true, status: 'approved', verifiedAt: new Date() };
        store.markModified('verification');
        await store.save();

        res.json({ msg: `Store "${store.storeName}" verified successfully` });
    } catch (error) {
        console.error('AI approve verification error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.rejectVerification = async (req, res) => {
    const { storeId, reason } = req.body;
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const store = await Store.findById(storeId);
        if (!store) return res.status(404).json({ msg: 'Store not found' });

        store.verification = { isVerified: false, status: 'rejected', rejectedAt: new Date(), rejectionReason: reason || '' };
        store.markModified('verification');
        await store.save();

        res.json({ msg: `Store "${store.storeName}" verification rejected` });
    } catch (error) {
        console.error('AI reject verification error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.removeVerification = async (req, res) => {
    const { storeId } = req.body;
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const store = await Store.findById(storeId);
        if (!store) return res.status(404).json({ msg: 'Store not found' });

        store.verification = { isVerified: false, status: 'none' };
        store.markModified('verification');
        await store.save();

        res.json({ msg: `Verification removed from "${store.storeName}"` });
    } catch (error) {
        console.error('AI remove verification error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getAllStores = async (req, res) => {
    const { role } = req.user;
    const { limit = 20 } = req.query;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        const stores = await Store.find().limit(parseInt(limit)).populate('seller', 'username email');
        res.json({
            stores: stores.map(s => ({
                _id: s._id, storeName: s.storeName, storeSlug: s.storeSlug,
                seller: s.seller?.username, isVerified: s.verification?.isVerified,
                trustCount: s.trustCount, isActive: s.isActive,
            })),
        });
    } catch (error) {
        console.error('AI get all stores error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.updateTaxConfig = async (req, res) => {
    const { type, value, isActive } = req.body;
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });

        let config = await TaxConfig.findOne();
        if (!config) config = new TaxConfig();

        if (type) config.type = type;
        if (value !== undefined) config.value = value;
        if (isActive !== undefined) config.isActive = isActive;
        await config.save();

        res.json({ msg: `Tax config updated: ${config.type} ${config.value}${config.type === 'percentage' ? '%' : ' USD'}` });
    } catch (error) {
        console.error('AI update tax error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getTaxConfig = async (req, res) => {
    try {
        const config = await TaxConfig.findOne();
        res.json({ config: config || { type: 'percentage', value: 0, isActive: false } });
    } catch (error) {
        console.error('AI get tax error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.searchProducts = async (req, res) => {
    const { query: searchQuery, category, maxPrice, minPrice, limit = 10 } = req.query;
    try {
        let query = {};
        if (category) query.category = category;
        if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };
        if (minPrice) query.price = { ...query.price, $gte: parseFloat(minPrice) };

        let products = await Product.find(query).limit(parseInt(limit));

        if (searchQuery) {
            const Fuse = require('fuse.js');
            const fuse = new Fuse(products, { threshold: 0.4, keys: ['name', 'description', 'brand', 'tags', 'category'] });
            products = fuse.search(searchQuery).map(r => r.item);
        }

        res.json({
            products: products.slice(0, parseInt(limit)).map(p => ({
                _id: p._id, name: p.name, price: p.price, discountedPrice: p.discountedPrice,
                image: p.image || p.images?.[0]?.url, rating: p.rating, category: p.category, brand: p.brand, stock: p.stock,
            })),
        });
    } catch (error) {
        console.error('AI search products error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// ─── USER ACTIONS ───

exports.getWishlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist', 'name price discountedPrice image category brand stock');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json({ 
            wishlist: (user.wishlist || []).map(p => ({
                _id: p._id, name: p.name, price: p.price, 
                discountedPrice: p.discountedPrice, image: p.image,
                category: p.category, brand: p.brand, inStock: p.stock > 0
            })),
            count: (user.wishlist || []).length
        });
    } catch (error) {
        console.error('AI get wishlist error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.addToWishlist = async (req, res) => {
    const { productId } = req.body;
    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ msg: 'Product not found' });
        
        const user = await User.findById(req.user.id);
        if (user.wishlist.includes(productId)) {
            return res.json({ msg: `"${product.name}" is already in your wishlist` });
        }
        
        user.wishlist.push(productId);
        await user.save();
        res.json({ msg: `"${product.name}" added to your wishlist`, wishlistCount: user.wishlist.length });
    } catch (error) {
        console.error('AI add to wishlist error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.removeFromWishlist = async (req, res) => {
    const { productId } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const product = await Product.findById(productId);
        const productName = product?.name || 'Product';
        
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();
        res.json({ msg: `"${productName}" removed from your wishlist`, wishlistCount: user.wishlist.length });
    } catch (error) {
        console.error('AI remove from wishlist error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        const addresses = user.savedAddresses || [];
        const defaultAddress = user.savedShippingInfo || null;
        
        res.json({ addresses, defaultAddress, count: addresses.length });
    } catch (error) {
        console.error('AI get addresses error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.addAddress = async (req, res) => {
    const { address } = req.body;
    try {
        if (!address || !address.fullName || !address.address || !address.city || !address.phone) {
            return res.status(400).json({ msg: 'Missing required fields: fullName, address, city, phone' });
        }
        
        const user = await User.findById(req.user.id);
        if (!user.savedAddresses) user.savedAddresses = [];
        
        user.savedAddresses.push(address);
        await user.save();
        res.json({ msg: `Address for "${address.fullName}" added successfully`, addressCount: user.savedAddresses.length });
    } catch (error) {
        console.error('AI add address error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    const { updates } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        const allowed = ['username'];
        const applied = [];
        allowed.forEach(key => {
            if (updates[key] !== undefined) { user[key] = updates[key]; applied.push(key); }
        });
        
        if (applied.length === 0) return res.status(400).json({ msg: 'No valid fields to update' });
        
        await user.save();
        res.json({ msg: `Profile updated: ${applied.join(', ')}`, updatedFields: applied });
    } catch (error) {
        console.error('AI update profile error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const Notification = require('../models/Notification');
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 }).limit(20);
        
        const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });
        
        res.json({
            notifications: notifications.map(n => ({
                _id: n._id, title: n.title, message: n.message,
                type: n.type, read: n.read, createdAt: n.createdAt
            })),
            unreadCount,
            totalCount: notifications.length
        });
    } catch (error) {
        console.error('AI get notifications error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.markNotificationsRead = async (req, res) => {
    try {
        const Notification = require('../models/Notification');
        const result = await Notification.updateMany(
            { userId: req.user.id, read: false },
            { $set: { read: true } }
        );
        res.json({ msg: `Marked ${result.modifiedCount} notification(s) as read` });
    } catch (error) {
        console.error('AI mark notifications read error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getAvailableCoupons = async (req, res) => {
    const { productId, storeId } = req.query;
    try {
        const Coupon = require('../models/Coupon');
        let query = { isActive: true, expiryDate: { $gte: new Date() } };
        
        if (storeId) query.seller = storeId;
        
        const coupons = await Coupon.find(query).limit(10);
        res.json({
            coupons: coupons.map(c => ({
                code: c.code, discountType: c.discountType, discountValue: c.discountValue,
                minOrderAmount: c.minOrderAmount, maxUses: c.maxUses, usedCount: c.usedCount,
                expiryDate: c.expiryDate
            })),
            count: coupons.length
        });
    } catch (error) {
        console.error('AI get coupons error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.validateCoupon = async (req, res) => {
    const { code, cartTotal } = req.body;
    try {
        const Coupon = require('../models/Coupon');
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
        
        if (!coupon) return res.json({ valid: false, msg: 'Coupon not found or inactive' });
        if (coupon.expiryDate < new Date()) return res.json({ valid: false, msg: 'Coupon has expired' });
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return res.json({ valid: false, msg: 'Coupon usage limit reached' });
        if (coupon.minOrderAmount && cartTotal < coupon.minOrderAmount) {
            return res.json({ valid: false, msg: `Minimum order amount is $${coupon.minOrderAmount}` });
        }
        
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (cartTotal * coupon.discountValue) / 100;
            if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        } else {
            discount = coupon.discountValue;
        }
        
        res.json({ valid: true, discount: Math.round(discount * 100) / 100, code: coupon.code, msg: `Coupon "${coupon.code}" saves you $${discount.toFixed(2)}!` });
    } catch (error) {
        console.error('AI validate coupon error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// ─── SELLER COUPON MANAGEMENT ───

exports.createCoupon = async (req, res) => {
    const { role, id: userId } = req.user;
    const { coupon } = req.body;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
        
        const Coupon = require('../models/Coupon');
        
        if (!coupon || !coupon.code || !coupon.discountType || coupon.discountValue === undefined) {
            return res.status(400).json({ msg: 'Missing required fields: code, discountType, discountValue' });
        }
        
        // Check if code already exists
        const existing = await Coupon.findOne({ code: coupon.code.toUpperCase(), seller: userId });
        if (existing) return res.status(400).json({ msg: `Coupon code "${coupon.code}" already exists` });
        
        const newCoupon = new Coupon({
            ...coupon,
            code: coupon.code.toUpperCase(),
            seller: userId,
            isActive: true
        });
        await newCoupon.save();
        
        res.json({ msg: `Coupon "${newCoupon.code}" created! ${coupon.discountType === 'percentage' ? coupon.discountValue + '% off' : '$' + coupon.discountValue + ' off'}` });
    } catch (error) {
        console.error('AI create coupon error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getMyCoupons = async (req, res) => {
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
        
        const Coupon = require('../models/Coupon');
        const coupons = await Coupon.find({ seller: userId }).sort({ createdAt: -1 });
        
        res.json({
            coupons: coupons.map(c => ({
                _id: c._id, code: c.code, discountType: c.discountType,
                discountValue: c.discountValue, isActive: c.isActive,
                minOrderAmount: c.minOrderAmount, maxUses: c.maxUses,
                usedCount: c.usedCount, expiryDate: c.expiryDate
            })),
            totalCoupons: coupons.length,
            activeCoupons: coupons.filter(c => c.isActive).length
        });
    } catch (error) {
        console.error('AI get my coupons error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.updateCoupon = async (req, res) => {
    const { role, id: userId } = req.user;
    const { couponId, updates } = req.body;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
        
        const Coupon = require('../models/Coupon');
        const coupon = await Coupon.findOne({ _id: couponId, seller: userId });
        if (!coupon) return res.status(404).json({ msg: 'Coupon not found' });
        
        const allowed = ['discountType', 'discountValue', 'minOrderAmount', 'maxUses', 'expiryDate', 'maxDiscount'];
        allowed.forEach(key => { if (updates[key] !== undefined) coupon[key] = updates[key]; });
        await coupon.save();
        
        res.json({ msg: `Coupon "${coupon.code}" updated successfully` });
    } catch (error) {
        console.error('AI update coupon error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.deleteCoupon = async (req, res) => {
    const { role, id: userId } = req.user;
    const { couponId } = req.body;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
        
        const Coupon = require('../models/Coupon');
        const coupon = await Coupon.findOneAndDelete({ _id: couponId, seller: userId });
        if (!coupon) return res.status(404).json({ msg: 'Coupon not found' });
        
        res.json({ msg: `Coupon "${coupon.code}" deleted` });
    } catch (error) {
        console.error('AI delete coupon error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.toggleCoupon = async (req, res) => {
    const { role, id: userId } = req.user;
    const { couponId } = req.body;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
        
        const Coupon = require('../models/Coupon');
        const coupon = await Coupon.findOne({ _id: couponId, seller: userId });
        if (!coupon) return res.status(404).json({ msg: 'Coupon not found' });
        
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        
        res.json({ msg: `Coupon "${coupon.code}" is now ${coupon.isActive ? 'active' : 'inactive'}` });
    } catch (error) {
        console.error('AI toggle coupon error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getSubscriptionStatus = async (req, res) => {
    const { role, id: userId } = req.user;
    try {
        if (role !== 'seller' && role !== 'admin') return res.status(403).json({ msg: 'Unauthorized' });
        
        const SellerSubscription = require('../models/SellerSubscription');
        const sub = await SellerSubscription.findOne({ seller: userId });
        
        if (!sub) return res.json({ msg: 'No subscription found', hasSubscription: false });
        
        res.json({
            hasSubscription: true,
            plan: sub.plan,
            status: sub.status,
            trialEndsAt: sub.trialEndsAt,
            currentPeriodEnd: sub.currentPeriodEnd,
            features: sub.features || [],
            aiMessageLimit: sub.aiMessageLimit,
            bonusExpiresAt: sub.bonusExpiresAt
        });
    } catch (error) {
        console.error('AI subscription status error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// ─── ADMIN BROADCAST & SUBSCRIPTION ───

exports.sendBroadcast = async (req, res) => {
    const { role } = req.user;
    const { title, message, audience, scheduledAt } = req.body;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });
        
        if (!title || !message) return res.status(400).json({ msg: 'Title and message are required' });
        
        const BroadcastJob = require('../models/BroadcastJob');
        const broadcast = new BroadcastJob({
            title, message,
            audience: audience || { target: 'all' },
            scheduledAt: scheduledAt || new Date(),
            status: 'pending',
            createdBy: req.user.id
        });
        await broadcast.save();
        
        res.json({ msg: `Broadcast "${title}" scheduled for ${audience?.target || 'all users'}`, broadcastId: broadcast._id });
    } catch (error) {
        console.error('AI send broadcast error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getBroadcasts = async (req, res) => {
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });
        
        const BroadcastJob = require('../models/BroadcastJob');
        const broadcasts = await BroadcastJob.find().sort({ createdAt: -1 }).limit(20);
        
        res.json({
            broadcasts: broadcasts.map(b => ({
                _id: b._id, title: b.title, message: b.message,
                audience: b.audience, status: b.status,
                scheduledAt: b.scheduledAt, sentAt: b.sentAt,
                recipientCount: b.recipientCount
            })),
            count: broadcasts.length
        });
    } catch (error) {
        console.error('AI get broadcasts error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.cancelBroadcast = async (req, res) => {
    const { role } = req.user;
    const { broadcastId } = req.body;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });
        
        const BroadcastJob = require('../models/BroadcastJob');
        const broadcast = await BroadcastJob.findById(broadcastId);
        if (!broadcast) return res.status(404).json({ msg: 'Broadcast not found' });
        if (broadcast.status === 'sent') return res.status(400).json({ msg: 'Cannot cancel an already sent broadcast' });
        
        broadcast.status = 'cancelled';
        await broadcast.save();
        
        res.json({ msg: `Broadcast "${broadcast.title}" cancelled` });
    } catch (error) {
        console.error('AI cancel broadcast error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getAllSubscriptions = async (req, res) => {
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });
        
        const SellerSubscription = require('../models/SellerSubscription');
        const subs = await SellerSubscription.find().populate('seller', 'username email').sort({ createdAt: -1 }).limit(30);
        
        const stats = await SellerSubscription.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        res.json({
            subscriptions: subs.map(s => ({
                _id: s._id, seller: s.seller?.username, email: s.seller?.email,
                plan: s.plan, status: s.status,
                trialEndsAt: s.trialEndsAt, currentPeriodEnd: s.currentPeriodEnd
            })),
            stats: stats.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
            total: subs.length
        });
    } catch (error) {
        console.error('AI get all subscriptions error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getVerifiedStores = async (req, res) => {
    const { role } = req.user;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });
        
        const stores = await Store.find({ 'verification.isVerified': true }).populate('seller', 'username email');
        res.json({
            stores: stores.map(s => ({
                _id: s._id, storeName: s.storeName, storeSlug: s.storeSlug,
                seller: s.seller?.username, sellerEmail: s.seller?.email,
                verifiedAt: s.verification?.verifiedAt, trustCount: s.trustCount
            })),
            count: stores.length
        });
    } catch (error) {
        console.error('AI get verified stores error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getStoreDetails = async (req, res) => {
    const { role } = req.user;
    const { storeId, slug } = req.query;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });
        
        let store;
        if (storeId) store = await Store.findById(storeId).populate('seller', 'username email role status');
        else if (slug) store = await Store.findOne({ storeSlug: slug }).populate('seller', 'username email role status');
        
        if (!store) return res.status(404).json({ msg: 'Store not found' });
        
        const productCount = await Product.countDocuments({ seller: store.seller?._id });
        
        res.json({
            storeName: store.storeName, storeSlug: store.storeSlug,
            seller: store.seller?.username, sellerEmail: store.seller?.email,
            sellerStatus: store.seller?.status,
            verification: store.verification, trustCount: store.trustCount,
            isActive: store.isActive, productCount,
            socialLinks: store.socialLinks, description: store.description,
            createdAt: store.createdAt
        });
    } catch (error) {
        console.error('AI get store details error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.searchStores = async (req, res) => {
    const { role } = req.user;
    const { query, limit = 10 } = req.query;
    try {
        if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only' });
        
        const stores = await Store.find({
            $or: [
                { storeName: { $regex: query || '', $options: 'i' } },
                { storeSlug: { $regex: query || '', $options: 'i' } }
            ]
        }).populate('seller', 'username email').limit(parseInt(limit));
        
        res.json({
            stores: stores.map(s => ({
                _id: s._id, storeName: s.storeName, storeSlug: s.storeSlug,
                seller: s.seller?.username, isVerified: s.verification?.isVerified,
                trustCount: s.trustCount, isActive: s.isActive
            })),
            count: stores.length
        });
    } catch (error) {
        console.error('AI search stores error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};
