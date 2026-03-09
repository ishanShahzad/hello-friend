const Product = require('../models/Product');
const Order = require('../models/Order');
const Complaint = require('../models/Complaint');
const { callHF } = require('../utils/hfClient');
const Fuse = require('fuse.js');

// Chat with AI assistant
exports.chat = async (req, res) => {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user?.id;

    if (!message || !message.trim()) {
        return res.status(400).json({ msg: 'Message is required' });
    }

    try {
        // Detect intent from user message
        const lowerMsg = message.toLowerCase();

        // Intent: Product search
        if (lowerMsg.includes('find') || lowerMsg.includes('search') || lowerMsg.includes('looking for') || lowerMsg.includes('show me') || lowerMsg.includes('recommend')) {
            const products = await Product.find({}).limit(100);
            const fuse = new Fuse(products, {
                threshold: 0.4,
                keys: ['name', 'description', 'brand', 'tags', 'category']
            });
            const searchTerms = message.replace(/find|search|looking for|show me|recommend|under|above|\$/gi, ' ').trim();
            const results = fuse.search(searchTerms).slice(0, 5);

            // Check for price filters
            const underMatch = lowerMsg.match(/under\s*\$?(\d+)/);
            const aboveMatch = lowerMsg.match(/(above|over)\s*\$?(\d+)/);

            let filtered = results.map(r => r.item);
            if (underMatch) filtered = filtered.filter(p => (p.discountedPrice || p.price) <= parseInt(underMatch[1]));
            if (aboveMatch) filtered = filtered.filter(p => (p.discountedPrice || p.price) >= parseInt(aboveMatch[2]));

            if (filtered.length === 0) {
                // Try broader search
                const allProducts = await Product.find({}).sort({ rating: -1 }).limit(5);
                return res.json({
                    reply: `I couldn't find exact matches for "${searchTerms}", but here are some popular products you might like:`,
                    products: allProducts.map(p => ({
                        _id: p._id, name: p.name, price: p.price,
                        discountedPrice: p.discountedPrice, image: p.image,
                        rating: p.rating, category: p.category, brand: p.brand
                    })),
                    intent: 'product_search'
                });
            }

            return res.json({
                reply: `I found ${filtered.length} product${filtered.length > 1 ? 's' : ''} matching your search:`,
                products: filtered.map(p => ({
                    _id: p._id, name: p.name, price: p.price,
                    discountedPrice: p.discountedPrice, image: p.image,
                    rating: p.rating, category: p.category, brand: p.brand
                })),
                intent: 'product_search'
            });
        }

        // Intent: Cart info
        if (lowerMsg.includes('cart') || lowerMsg.includes('what\'s in my cart') || lowerMsg.includes('my cart')) {
            return res.json({
                reply: 'You can view your cart by clicking the cart icon in the top navigation bar. Would you like me to help with something else?',
                action: { type: 'open_cart' },
                intent: 'cart_info'
            });
        }

        // Intent: Track order
        if (lowerMsg.includes('track') || lowerMsg.includes('order status') || lowerMsg.includes('my order') || lowerMsg.includes('where is my')) {
            if (userId) {
                const recentOrders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(3);
                if (recentOrders.length > 0) {
                    return res.json({
                        reply: `Here are your recent orders:`,
                        orders: recentOrders.map(o => ({
                            orderId: o.orderId, status: o.orderStatus,
                            total: o.orderSummary?.totalAmount,
                            date: o.createdAt, isPaid: o.isPaid
                        })),
                        intent: 'order_tracking'
                    });
                }
                return res.json({ reply: 'You don\'t have any orders yet. Start shopping to place your first order!', intent: 'order_tracking' });
            }
            return res.json({ reply: 'Please log in to track your orders. You can log in using the button in the top navigation.', intent: 'auth_required' });
        }

        // Intent: Complaint / Report
        if (lowerMsg.includes('complaint') || lowerMsg.includes('report') || lowerMsg.includes('issue') || lowerMsg.includes('problem') || lowerMsg.includes('refund')) {
            return res.json({
                reply: 'I\'m sorry to hear you\'re having an issue. You can submit a complaint using the form below, and our team will look into it right away. You can also reach us at support@tortrose.com or visit our Contact page.',
                action: { type: 'show_complaint_form' },
                intent: 'complaint',
                contactUrl: '/contact'
            });
        }

        // Intent: General AI response using HuggingFace
        const contextPrompt = `You are Tortrose AI, a friendly and helpful shopping assistant for Tortrose e-commerce store. You help users find products, track orders, give style advice, and handle support queries. Keep responses concise (max 100 words). Be warm and professional.

User: ${message}
Assistant:`;

        try {
            const aiResponse = await callHF(contextPrompt);
            // Extract just the assistant's response
            const assistantPart = aiResponse.split('Assistant:').pop()?.trim() || 
                'I\'d be happy to help! You can browse our products, track your orders, or let me know if you have any questions.';
            
            return res.json({ reply: assistantPart, intent: 'general' });
        } catch (aiErr) {
            console.error('AI response failed, using fallback:', aiErr.message);
            return res.json({
                reply: 'I\'m here to help! I can assist you with:\n• 🔍 Finding products (e.g., "Find red sneakers under $50")\n• 🛒 Cart information\n• 📦 Order tracking\n• 📝 Filing complaints\n• 💡 Product recommendations\n\nWhat would you like help with?',
                intent: 'fallback'
            });
        }

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ msg: 'Server error in chatbot' });
    }
};

// Submit complaint
exports.submitComplaint = async (req, res) => {
    const { category, subject, message, relatedOrder, relatedProduct } = req.body;
    const userId = req.user.id;

    if (!category || !subject || !message) {
        return res.status(400).json({ msg: 'Category, subject, and message are required' });
    }

    try {
        const complaint = new Complaint({
            user: userId,
            category,
            subject: subject.slice(0, 200),
            message: message.slice(0, 2000),
            relatedOrder: relatedOrder || undefined,
            relatedProduct: relatedProduct || undefined,
        });
        await complaint.save();

        res.status(201).json({ msg: 'Complaint submitted successfully. Our team will review it shortly.', complaint });
    } catch (error) {
        console.error('Submit complaint error:', error);
        res.status(500).json({ msg: 'Server error while submitting complaint' });
    }
};

// Get user's complaints
exports.getMyComplaints = async (req, res) => {
    const userId = req.user.id;
    try {
        const complaints = await Complaint.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('relatedOrder', 'orderId orderStatus')
            .populate('relatedProduct', 'name image');
        res.json({ complaints });
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Admin: Get all complaints
exports.getAllComplaints = async (req, res) => {
    const { category, status, page = 1, limit = 20 } = req.query;
    
    try {
        const query = {};
        if (category) query.category = category;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Complaint.countDocuments(query);
        const complaints = await Complaint.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user', 'username email avatar')
            .populate('relatedOrder', 'orderId orderStatus')
            .populate('relatedProduct', 'name image');

        // Category stats
        const categoryStats = await Complaint.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const statusStats = await Complaint.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            complaints,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            categoryStats: categoryStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
            statusStats: statusStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        });
    } catch (error) {
        console.error('Get all complaints error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Admin: Update complaint
exports.updateComplaint = async (req, res) => {
    const { id } = req.params;
    const { status, adminResponse, priority } = req.body;

    try {
        const complaint = await Complaint.findById(id);
        if (!complaint) return res.status(404).json({ msg: 'Complaint not found' });

        if (status) complaint.status = status;
        if (adminResponse) complaint.adminResponse = adminResponse;
        if (priority) complaint.priority = priority;

        await complaint.save();
        res.json({ msg: 'Complaint updated', complaint });
    } catch (error) {
        console.error('Update complaint error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};
