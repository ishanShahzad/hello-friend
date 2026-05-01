// const { default: mongoose } = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product')
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null
const TaxConfig = require('../models/TaxConfig');
const { calculateTax } = require('./taxController');
const { recordCouponUsage } = require('./couponController');
const { sendEmail } = require('./mailController');
const { orderConfirmationEmail, orderStatusUpdateEmail, newOrderSellerEmail, buyerOrderConfirmationRequestEmail } = require('../utils/emailTemplates');
const { generateConfirmationToken } = require('./orderConfirmationController');
const { sellerHasWhatsAppVerify } = require('./subscriptionController');
const { enqueueOrderConfirmation } = require('../services/whatsapp/queue');
const WhatsAppConfig = require('../models/WhatsAppConfig');
const User = require('../models/User');

// Enqueue WhatsApp confirmation if admin connected AND any seller in the order has the bonus
const maybeEnqueueWhatsAppConfirmation = async (order, productItems) => {
    try {
        if (!order?.confirmation?.token) return;
        const cfg = await WhatsAppConfig.findOne({ singletonKey: 'main' });
        if (!cfg || cfg.status !== 'connected') return;

        const sellerIds = [...new Set((productItems || []).map(p => p.seller?.toString()).filter(Boolean))];
        let entitled = false;
        for (const sid of sellerIds) {
            // eslint-disable-next-line no-await-in-loop
            if (await sellerHasWhatsAppVerify(sid)) { entitled = true; break; }
        }
        if (!entitled) return;

        await enqueueOrderConfirmation(order);
        console.log(`[order] WhatsApp confirmation enqueued for ${order.orderId}`);
    } catch (err) {
        console.error('maybeEnqueueWhatsAppConfirmation:', err.message);
    }
};


exports.placeOrder = async (req, res) => {
    const { order } = req.body;
    // console.log(order);

    const userId = req.user?.id || null;

    try {
        if (
            !order ||
            !order.orderItems ||
            !Array.isArray(order.orderItems) ||
            order.orderItems.length === 0
        ) {
            return res.status(400).json({ msg: "Order must have at least one item" });
        }

        if (
            !order.shippingInfo ||
            !order.paymentMethod ||
            !order.orderSummary ||
            !order.shippingMethod
        ) {
            return res.status(400).json({ msg: "Missing required order details" });
        }

        // console.log(order.orderItems);

        const productIds = order.orderItems.map(item => item.id)
        const productQtys = order.orderItems.map(item => item.quantity)
        // console.log(productIds);
        // return
        const orderItems = await Product.find({ _id: { $in: productIds } })
        console.log('db product items:::', orderItems);

        // Calculate subtotal from frontend prices
        const subtotal = order.orderItems.reduce((acc, item) => {
            return acc + item.price * item.quantity
        }, 0)

        console.log(subtotal);

        console.log(order.shippingMethod);

        // Calculate total shipping cost from all sellers
        let shippingCost = 0;
        if (order.sellerShipping && Array.isArray(order.sellerShipping) && order.sellerShipping.length > 0) {
            // Sum up shipping costs from all sellers
            shippingCost = order.sellerShipping.reduce((sum, sellerShip) => {
                return sum + (sellerShip.shippingMethod.price || 0);
            }, 0);
        } else {
            // Fallback to single shipping method (backward compatibility)
            shippingCost = order.shippingMethod.price || 0;
        }

        // Fetch tax configuration and calculate tax
        let tax = 0;
        const taxConfig = await TaxConfig.findOne({ isActive: true });
        if (taxConfig) {
            tax = calculateTax(subtotal, taxConfig);
        }

        // Calculate coupon discount from frontend
        const couponDiscount = order.orderSummary?.couponDiscount || 0;

        // Final total
        const totalAmount = subtotal + shippingCost + tax - couponDiscount;
        // console.log("cartItems::::", cartItems);


        const newOrder = new Order({
            ...(userId ? { user: userId } : {}),
            guestEmail: !userId ? order.shippingInfo.email : null,
            orderId: `ORD-${Date.now()}`,

            orderItems: order.orderItems.map((item) => ({
                productId: item.id,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                selectedColor: item.selectedColor || null,
                selectedOptions: item.selectedOptions || undefined,
            })),

            shippingInfo: {
                fullName: order.shippingInfo.fullName,
                email: order.shippingInfo.email,
                phone: order.shippingInfo.phone,
                address: order.shippingInfo.address,
                city: order.shippingInfo.city,
                state: order.shippingInfo.state,
                postalCode: order.shippingInfo.postalCode,
                country: order.shippingInfo.country,
            },

            shippingMethod: {
                name: order.shippingMethod.name,
                price: order.shippingMethod.price,
                estimatedDays: order.shippingMethod.estimatedDays,
                seller: order.shippingMethod.seller || null
            },

            orderSummary: {
                subtotal: subtotal,
                shippingCost: shippingCost,
                tax: tax,
                couponDiscount: couponDiscount,
                totalAmount: totalAmount,
            },

            appliedCoupons: order.appliedCoupons || [],

            // ✅ Schema expects just string ("stripe" | "cash_on_delivery")
            paymentMethod: order.paymentMethod,
        });
        
        
        
        // Add seller shipping info if provided (for multi-seller orders)
        if (order.sellerShipping && Array.isArray(order.sellerShipping)) {
            newOrder.sellerShipping = order.sellerShipping;
        }
        
        if (order.instructions && order.instructions !== '') newOrder.instructions = order.instructions

        // Always attach a confirmation token so WhatsApp/email auto-verify can use it.
        // Email-confirm flow only triggers for COD; WhatsApp flow runs for both COD & paid orders.
        const isCOD = newOrder.paymentMethod === 'cash_on_delivery';
        {
            const { token, tokenExpiresAt } = generateConfirmationToken();
            newOrder.confirmation = { token, tokenExpiresAt, confirmedAt: null, confirmedVia: null, declinedAt: null };
        }

        await newOrder.save();

        // Send order confirmation email to buyer
        try {
            if (isCOD) {
                const confirmUrl = `${process.env.FRONTEND_URL || 'https://rozare.com'}/orders/confirm/${newOrder.confirmation.token}`;
                const emailData = buyerOrderConfirmationRequestEmail(newOrder, confirmUrl);
                await sendEmail({ to: newOrder.shippingInfo.email, ...emailData });
            } else {
                const emailData = orderConfirmationEmail(newOrder);
                await sendEmail({ to: newOrder.shippingInfo.email, ...emailData });
            }
            // Track email send success
            newOrder.confirmation.emailSentAt = new Date();
            newOrder.confirmation.emailSentSuccess = true;
            await newOrder.save();
        } catch (emailErr) {
            console.error('Failed to send order confirmation email:', emailErr.message);
            // Track email send failure
            newOrder.confirmation.emailSentAt = new Date();
            newOrder.confirmation.emailSentSuccess = false;
            newOrder.confirmation.emailError = emailErr.message || 'Unknown email error';
            await newOrder.save();
        }

        // Send new order notification to each seller
        try {
            const sellerIds = [...new Set(orderItems.map(p => p.seller?.toString()).filter(Boolean))];
            for (const sellerId of sellerIds) {
                const seller = await User.findById(sellerId);
                if (seller?.email) {
                    const sellerEmailData = newOrderSellerEmail(newOrder, seller.username);
                    await sendEmail({ to: seller.email, ...sellerEmailData });
                }
            }
        } catch (emailErr) {
            console.error('Failed to send seller notification email:', emailErr.message);
        }

        // 🟢 Enqueue WhatsApp poll-based confirmation (gated by subscription bonus + admin link)
        maybeEnqueueWhatsAppConfirmation(newOrder, orderItems);

        // Record coupon usage
        if (userId && order.appliedCoupons && order.appliedCoupons.length > 0) {
            for (const couponData of order.appliedCoupons) {
                if (couponData.couponId) {
                    await recordCouponUsage(couponData.couponId, userId);
                }
            }
        }


        // const domainURL = process.env.FRONTEND_URL || 'http://localhost:5173'

        if (newOrder.paymentMethod === 'cash_on_delivery') {
            // Reduce stock for cash on delivery orders
            for (const item of newOrder.orderItems) {
                await Product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { stock: -item.quantity } }
                );
            }
            
            return res.status(200).json({
                msg: 'Order placed successfully',
                orderId: newOrder.orderId,
                order: {
                    orderId: newOrder.orderId,
                    totalAmount: newOrder.orderSummary.totalAmount,
                    email: newOrder.shippingInfo.email
                }
            });
        }

        const line_items = [
            ...newOrder.orderItems.map(item => ({ 
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        images: item.image ? [item.image] : undefined
                    },
                    unit_amount: Math.round(item.price * 100)
                },
                quantity: item.quantity
            })),


            // SHIPPING
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${newOrder.shippingMethod.name} Shipping`,
                    },
                    unit_amount: Math.round(newOrder.shippingMethod.price * 100)
                },
                quantity: 1
            },

            // TAX (only if tax > 0)
            ...(newOrder.orderSummary.tax > 0 ? [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: taxConfig && taxConfig.type === 'percentage' 
                            ? `Tax (${taxConfig.value}%)` 
                            : 'Tax',
                    },
                    unit_amount: Math.round(newOrder.orderSummary.tax * 100)
                },
                quantity: 1
            }] : [])
        ]

        // console.log(line_items);

        // Support mobile deep-link redirects when platform === 'mobile'
        const isMobile = order.platform === 'mobile';
        const successUrl = isMobile
            ? `rozare://payment-success?session_id={CHECKOUT_SESSION_ID}&orderId=${newOrder.orderId}`
            : `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = isMobile
            ? `rozare://payment-cancel?orderId=${newOrder.orderId}`
            : `${process.env.FRONTEND_URL}/checkout`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { orderId: newOrder.orderId }
        })

        // console.log('session:::::', session);


        return res.status(201).json({
            id: session.id,
            url: session.url,
        });
    } catch (error) {
        console.error("Stripe session error:::", error);
        return res.status(500).json({ msg: "Server error while creating checkout session. Try again!" });
    }
}



exports.getOrders = async (req, res) => {
    const { role, id: userId } = req.user
    const { search, paymentStatus, status, startDate, endDate } = { ...req.query }
    
    console.log('=== GET ORDERS DEBUG ===');
    console.log('User role:', role);
    console.log('User ID:', userId);

    let query = {}
    if (search) {
        query.$or = [
            { "shippingInfo.fullName": { $regex: search, $options: 'i' } },
            { orderId: { $regex: search, $options: 'i' } }
        ]
    }

    if (status) {
        query.orderStatus = status
    }

    if (paymentStatus) {
        query.isPaid = paymentStatus === 'paid' ? true : false
    }

    try {
        let orders

        // If seller, only show orders containing their products
        if (role === 'seller') {
            console.log('Filtering orders for seller...');
            // First, get all seller's product IDs
            const sellerProducts = await Product.find({ seller: userId }).select('_id')
            const sellerProductIds = sellerProducts.map(p => p._id.toString())
            console.log('Seller product IDs:', sellerProductIds);

            // If seller has no products, return empty array
            if (sellerProductIds.length === 0) {
                console.log('Seller has no products - returning empty orders');
                orders = []
            } else {
                // Find orders that contain at least one of seller's products
                const allOrders = await Order.find(query)
                console.log('Total orders found:', allOrders.length);
                
                // Filter and modify orders to show only seller's portion
                orders = allOrders
                    .filter(order => {
                        const hasSellerProduct = order.orderItems.some(item => 
                            sellerProductIds.includes(item.productId.toString())
                        )
                        return hasSellerProduct
                    })
                    .map(order => {
                        // Filter order items to only seller's products
                        const sellerOrderItems = order.orderItems.filter(item => 
                            sellerProductIds.includes(item.productId.toString())
                        )
                        
                        // Calculate seller's portion
                        const sellerSubtotal = sellerOrderItems.reduce((sum, item) => 
                            sum + (item.price * item.quantity), 0
                        )
                        
                        // Get seller's actual shipping cost from sellerShipping array
                        let sellerShipping = 0;
                        if (order.sellerShipping && order.sellerShipping.length > 0) {
                            const sellerShippingInfo = order.sellerShipping.find(
                                ss => ss.seller.toString() === userId.toString()
                            );
                            sellerShipping = sellerShippingInfo ? sellerShippingInfo.shippingMethod.price : 0;
                        }
                        
                        const totalOrderValue = order.orderSummary.subtotal
                        const sellerProportion = totalOrderValue > 0 ? sellerSubtotal / totalOrderValue : 0
                        const sellerTax = order.orderSummary.tax * sellerProportion
                        const sellerTotal = sellerSubtotal + sellerShipping + sellerTax
                        
                        // Return modified order with seller's portion
                        return {
                            ...order.toObject(),
                            orderItems: sellerOrderItems,
                            orderSummary: {
                                subtotal: Math.round(sellerSubtotal * 100) / 100,
                                shippingCost: Math.round(sellerShipping * 100) / 100,
                                tax: Math.round(sellerTax * 100) / 100,
                                totalAmount: Math.round(sellerTotal * 100) / 100
                            }
                        }
                    })
                console.log('Orders with seller products:', orders.length);
            }
        } else {
            console.log('Admin - showing all orders');
            // Admin sees all orders
            orders = await Order.find(query)
        }

        res.status(200).json({ msg: 'Orders fetched successfully', orders: orders })

    } catch (error) {
        console.error("Error fetching Order:", error);
        return res.status(500).json({ msg: "Server error while fetching orders" });
    }
}

exports.getUserOrders = async (req, res) => {
    const { id } = req.user
    const { search, status, paymentStatus } = req.query
    try {
        let query = {}
        if (search) {
            query.orderId = { $regex: search, $options: 'i' }
        }

        if (status) {
            query.orderStatus = status
        }

        if (paymentStatus) {
            query.isPaid = paymentStatus === 'paid' ? true : false
        }
        query.user = id

        // console.log(query);
        let orders = await Order.find(query)
        // console.log('get user ordersss:::::::::::::', orders);
        // orders = orders.find(item => item.user)


        res.status(200).json({ msg: 'User Orders fetched successfully', orders: orders })

    } catch (error) {
        console.error("Error fetching Order:", error);
        return res.status(500).json({ msg: "Server error while fetching orders" });

    }
}


exports.updateStatus = async (req, res) => {
    const { id: _id } = req.params
    const { newStatus } = req.body
    const { role, id: userId } = req.user

    try {
        const existingOrder = await Order.findById(_id)
        
        if (!existingOrder) {
            return res.status(404).json({ msg: 'Order not found' })
        }

        // If seller, check if order contains their products
        if (role === 'seller') {
            const sellerProducts = await Product.find({ seller: userId }).select('_id')
            const sellerProductIds = sellerProducts.map(p => p._id.toString())
            
            const hasSellerProduct = existingOrder.orderItems.some(item => 
                sellerProductIds.includes(item.productId.toString())
            )
            
            if (!hasSellerProduct) {
                return res.status(403).json({ msg: 'You can only update orders containing your products' })
            }
            
            // Sellers can set confirmed and cancelled, but not if order is already shipped or delivered
            if (newStatus === 'cancelled' && ['shipped', 'delivered'].includes(existingOrder.orderStatus)) {
                return res.status(403).json({ msg: 'Cannot cancel an order that is already shipped or delivered.' })
            }
        }

        // Track confirmation fields when seller/admin explicitly sets confirmed/cancelled
        // Only if the BUYER hasn't already made a decision
        const buyerAlreadyDecided = !!(existingOrder.confirmation?.confirmedAt || existingOrder.confirmation?.declinedAt);
        
        if (newStatus === 'confirmed' && !buyerAlreadyDecided) {
            existingOrder.confirmation = existingOrder.confirmation || {};
            existingOrder.confirmation.confirmedAt = new Date();
            existingOrder.confirmation.confirmedVia = role === 'admin' ? 'admin' : 'manual';
            existingOrder.confirmation.decidedAt = new Date();
            existingOrder.confirmation.decidedVia = role === 'admin' ? 'admin' : 'manual';
        } else if (newStatus === 'cancelled' && !buyerAlreadyDecided) {
            existingOrder.confirmation = existingOrder.confirmation || {};
            existingOrder.confirmation.declinedAt = new Date();
            existingOrder.confirmation.confirmedVia = role === 'admin' ? 'admin' : 'manual'; // tracks who initiated the decision
            existingOrder.confirmation.decidedAt = new Date();
            existingOrder.confirmation.decidedVia = role === 'admin' ? 'admin' : 'manual';
        }

        existingOrder.orderStatus = newStatus;
        if (newStatus === 'delivered') {
            existingOrder.isPaid = true;
        }
        await existingOrder.save();

        // Send status update email
        try {
            const emailData = orderStatusUpdateEmail(existingOrder, newStatus);
            await sendEmail({ to: existingOrder.shippingInfo.email, ...emailData });
        } catch (emailErr) {
            console.error('Failed to send status update email:', emailErr.message);
        }

        res.status(200).json({ msg: 'Updated status successfully' })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error while updating status' })
    }
}



exports.getOrderDetail = async (req, res) => {
    const { id } = req.params
    const { role, id: userId } = req.user
    
    console.log('=== GET ORDER DETAIL DEBUG ===');
    console.log('Order ID:', id);
    console.log('User role:', role);
    console.log('User ID:', userId);
    
    try {
        const order = await Order.findOne({ _id: id })
        
        if (!order) {
            console.log('Order not found');
            return res.status(404).json({ msg: 'Order not found' })
        }

        console.log('Order found:', order.orderId);
        console.log('Order items:', order.orderItems.map(i => ({ productId: i.productId, name: i.name })));

        // If seller, filter order items to show only their products
        if (role === 'seller') {
            const sellerProducts = await Product.find({ seller: userId }).select('_id')
            const sellerProductIds = sellerProducts.map(p => p._id.toString())
            
            console.log('Seller product IDs:', sellerProductIds);
            console.log('Order product IDs:', order.orderItems.map(i => i.productId.toString()));
            
            // Filter order items to only include seller's products
            const sellerOrderItems = order.orderItems.filter(item => 
                sellerProductIds.includes(item.productId.toString())
            )
            
            console.log('Seller order items:', sellerOrderItems.length);
            
            if (sellerOrderItems.length === 0) {
                console.log('Access denied - order does not contain seller products');
                return res.status(403).json({ msg: 'You can only view orders containing your products' })
            }
            
            // Create a modified order object with only seller's items
            const sellerSubtotal = sellerOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            
            // Get seller's actual shipping cost from sellerShipping array
            let sellerShipping = 0;
            if (order.sellerShipping && order.sellerShipping.length > 0) {
                const sellerShippingInfo = order.sellerShipping.find(
                    ss => ss.seller.toString() === userId.toString()
                );
                sellerShipping = sellerShippingInfo ? sellerShippingInfo.shippingMethod.price : 0;
            }
            
            // Calculate proportional tax based on seller's portion
            const totalOrderValue = order.orderSummary.subtotal
            const sellerProportion = totalOrderValue > 0 ? sellerSubtotal / totalOrderValue : 0
            const sellerTax = order.orderSummary.tax * sellerProportion
            const sellerTotal = sellerSubtotal + sellerShipping + sellerTax
            
            const filteredOrder = {
                ...order.toObject(),
                orderItems: sellerOrderItems,
                // Show only seller's portion of the order
                orderSummary: {
                    subtotal: Math.round(sellerSubtotal * 100) / 100,
                    shippingCost: Math.round(sellerShipping * 100) / 100,
                    tax: Math.round(sellerTax * 100) / 100,
                    totalAmount: Math.round(sellerTotal * 100) / 100,
                    // Keep original for reference (optional)
                    _originalTotal: order.orderSummary.totalAmount
                }
            }
            
            return res.status(200).json({ msg: 'Order fetched successfully.', order: filteredOrder })
        }

        res.status(200).json({ msg: 'Order fetched successfully.', order: order })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while fetching order detail' })
    }
}

// Guest order tracking by email + orderId
exports.trackGuestOrder = async (req, res) => {
    const { email, orderId } = req.query;
    
    if (!email || !orderId) {
        return res.status(400).json({ msg: 'Email and Order ID are required' });
    }

    try {
        const order = await Order.findOne({
            orderId: orderId,
            'shippingInfo.email': email.toLowerCase().trim()
        });

        if (!order) {
            return res.status(404).json({ msg: 'Order not found. Please check your email and order ID.' });
        }

        res.status(200).json({ msg: 'Order found', order });
    } catch (error) {
        console.error('Error tracking guest order:', error);
        res.status(500).json({ msg: 'Server error while tracking order' });
    }
};


exports.cancelOrder = async (req, res) => {
    const { id: _id } = req.params
    const { role } = req.user
    
    try {
        // Only admin and customers can cancel orders, not sellers
        if (role === 'seller') {
            return res.status(403).json({ msg: 'Sellers cannot cancel orders. Only customers and admins can cancel orders.' })
        }
        
        const order = await Order.findById(_id);
        if (!order) return res.status(404).json({ msg: 'Order not found' })

        // Track whether the buyer is overriding a prior WhatsApp confirmation.
        // This helps the seller see a clear note:
        //   "Order was confirmed via WhatsApp but buyer changed their mind
        //    and cancelled from their dashboard."
        const wasConfirmedViaWhatsApp = !!(
            order.confirmation?.confirmedAt &&
            order.confirmation?.confirmedVia === 'whatsapp'
        );

        order.orderStatus = 'cancelled';

        if (wasConfirmedViaWhatsApp) {
            // Mark that the buyer retracted their WhatsApp confirmation
            order.confirmation.cancelledFromDashboardAt = new Date();
            order.confirmation.cancelledFromDashboardNote =
                'Order was confirmed by buyer via Rozare WhatsApp automation, but buyer changed their mind and cancelled from their account dashboard.';
        }

        await order.save();
        
        // Send cancellation email
        try {
            const emailData = orderStatusUpdateEmail(order, 'cancelled');
            await sendEmail({ to: order.shippingInfo.email, ...emailData });
        } catch (emailErr) {
            console.error('Failed to send cancellation email:', emailErr.message);
        }
        
        res.status(200).json({ msg: 'Order cancelled successfully.', order })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while cancelling order' })
    }
}

// =============================================================================
// Re-order — clone past order's items into the user's cart
// =============================================================================
exports.reorder = async (req, res) => {
    const { id: orderId } = req.params;
    const { id: userId } = req.user;
    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ msg: 'Order not found' });
        if (order.user && order.user.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Not your order' });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) cart = new Cart({ user: userId, cartItems: [] });

        let added = 0;
        let unavailable = 0;
        for (const item of order.orderItems) {
            const product = await Product.findById(item.productId);
            if (!product || product.stock <= 0) { unavailable++; continue; }
            const qty = Math.min(item.quantity || 1, product.stock);
            const existing = cart.cartItems.find(
                (p) => p.product?.toString() === item.productId.toString() &&
                       (p.selectedColor || null) === (item.selectedColor || null)
            );
            if (existing) {
                existing.qty = Math.min((existing.qty || 1) + qty, product.stock);
            } else {
                cart.cartItems.push({ product: item.productId, qty, selectedColor: item.selectedColor || null });
            }
            added++;
        }
        await cart.save();

        res.status(200).json({
            msg: `Re-order complete. ${added} items added to cart.${unavailable > 0 ? ` ${unavailable} unavailable.` : ''}`,
            added,
            unavailable,
        });
    } catch (error) {
        console.error('Reorder error:', error);
        res.status(500).json({ msg: 'Server error while re-ordering' });
    }
};

// =============================================================================
// Invoice — generate styled HTML invoice (rendered to PDF on client)
// =============================================================================
exports.getInvoice = async (req, res) => {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    try {
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        if (role !== 'admin') {
            const ownsOrder = order.user && order.user.toString() === userId.toString();
            if (!ownsOrder) {
                if (role === 'seller') {
                    const sellerProducts = await Product.find({ seller: userId }).select('_id');
                    const ids = sellerProducts.map((p) => p._id.toString());
                    const hasItem = order.orderItems.some((it) => ids.includes(it.productId.toString()));
                    if (!hasItem) return res.status(403).json({ msg: 'Forbidden' });
                } else {
                    return res.status(403).json({ msg: 'Forbidden' });
                }
            }
        }

        const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;
        const rows = order.orderItems.map((it) => `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${it.name}${it.selectedColor ? ` <span style="color:#6366f1;font-size:11px;">(${it.selectedColor})</span>` : ''}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(it.price)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmt(it.price * it.quantity)}</td>
            </tr>`).join('');

        const summary = order.orderSummary || {};
        const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice ${order.orderId}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;color:#1f2937;background:#f9fafb;padding:24px;margin:0;}
  .card{background:#fff;max-width:760px;margin:0 auto;border-radius:18px;padding:36px;box-shadow:0 6px 24px rgba(0,0,0,0.08);}
  .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #6366f1;padding-bottom:18px;}
  h1{margin:0;font-size:26px;color:#6366f1;letter-spacing:-0.5px;}
  .muted{color:#6b7280;font-size:12px;}
  .grid{display:flex;gap:32px;margin:18px 0;}
  .grid > div{flex:1;}
  .label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;}
  table{width:100%;border-collapse:collapse;margin-top:14px;}
  th{background:#eef2ff;color:#4338ca;padding:10px;text-align:left;font-size:12px;font-weight:600;}
  th:nth-child(2){text-align:center;} th:nth-child(3),th:nth-child(4){text-align:right;}
  .totals{margin-top:18px;margin-left:auto;width:46%;}
  .totals .row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;}
  .totals .grand{border-top:2px solid #1f2937;margin-top:8px;padding-top:10px;font-weight:700;font-size:18px;color:#6366f1;}
  .footer{margin-top:30px;padding-top:18px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;}
  .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#ecfdf5;color:#059669;}
</style></head><body>
<div class="card">
  <div class="head">
    <div>
      <h1>Rozare</h1>
      <div class="muted">Verified marketplace for trusted sellers</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:13px;font-weight:600;">Invoice #${order.orderId}</div>
      <div class="muted">${new Date(order.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
      <div style="margin-top:6px;"><span class="badge">${(order.orderStatus || 'pending').toUpperCase()}</span></div>
    </div>
  </div>
  <div class="grid">
    <div>
      <div class="label">Billed To</div>
      <div style="font-weight:600;">${order.shippingInfo.fullName}</div>
      <div class="muted">${order.shippingInfo.address}<br/>${order.shippingInfo.city}, ${order.shippingInfo.state || ''} ${order.shippingInfo.postalCode || ''}<br/>${order.shippingInfo.country}<br/>${order.shippingInfo.email}</div>
    </div>
    <div>
      <div class="label">Payment</div>
      <div style="font-weight:600;">${order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Card Payment'}</div>
      <div class="muted">Status: ${order.isPaid ? 'Paid' : 'Unpaid'}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmt(summary.subtotal)}</span></div>
    <div class="row"><span>Shipping</span><span>${fmt(summary.shippingCost)}</span></div>
    <div class="row"><span>Tax</span><span>${fmt(summary.tax)}</span></div>
    ${summary.couponDiscount ? `<div class="row" style="color:#10b981;"><span>Coupon discount</span><span>-${fmt(summary.couponDiscount)}</span></div>` : ''}
    <div class="row grand"><span>Total</span><span>${fmt(summary.totalAmount)}</span></div>
  </div>
  <div class="footer">Thank you for shopping on Rozare.<br/>Questions? Contact support — we're here to help.</div>
</div></body></html>`;

        res.status(200).json({ msg: 'Invoice generated', html, orderId: order.orderId });
    } catch (error) {
        console.error('Invoice error:', error);
        res.status(500).json({ msg: 'Server error while generating invoice' });
    }
};

