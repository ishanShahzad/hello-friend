// const { default: mongoose } = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


exports.placeOrder = async (req, res) => {
    const { order } = req.body;
    // console.log(order);

    const { id: userId } = req.user;

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

        const subtotal = orderItems.reduce((acc, item, idx) => {
            return item.discountedPrice !== 0 ? acc + item.discountedPrice * productQtys[idx] : acc + item.price * productQtys[idx]
        }, 0)

        console.log(subtotal);

        console.log(order.shippingMethod);


        // Calculate shipping cost
        const shippingCost =
            order.shippingMethod.name === "standard"
                ? 5
                : order.shippingMethod.name === "express"
                    ? 10
                    : 20;

        // Tax
        const tax = subtotal * 0.05; // 5% tax

        // Final total
        const totalAmount = subtotal + shippingCost + tax;
        // console.log("cartItems::::", cartItems);


        const newOrder = new Order({
            user: userId,
            orderId: `ORD-${Date.now()}`,

            // ✅ orderItems already matches schema from frontend
            orderItems: orderItems.map((item, idx) => ({
                productId: item._id,
                name: item.name,
                image: item.image,
                price: item.discountedPrice !== 0 ? item.discountedPrice : item.price,
                quantity: productQtys[idx],
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
            },

            orderSummary: {
                subtotal: subtotal,
                shippingCost: shippingCost,
                tax: tax,
                totalAmount: totalAmount,
            },

            // ✅ Schema expects just string ("stripe" | "cash_on_delivery")
            paymentMethod: order.paymentMethod,
        });
        if (order.instructions && order.instructions !== '') newOrder.instructions = order.instructions

        await newOrder.save();
        // console.log('new order:::', newOrder);


        // const domainURL = process.env.FRONTEND_URL || 'http://localhost:5173'

        if (newOrder.paymentMethod === 'cash_on_delivery') {
            return res.status(200).json({
                msg: 'Order placed successfully',
                // id: session.id,
                // url: session.url,
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

            // TAX
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Tax (5%)`,
                    },
                    unit_amount: Math.round(newOrder.orderSummary.tax * 100)
                },
                quantity: 1
            }
        ]

        // console.log(line_items);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/checkout`,
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
    // const { query: filter } = req
    const { search, paymentStatus, status, startDate, endDate } = { ...req.query }
    // console.log(startDate, endDate);

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
        // console.log(query);
        const orders = await Order.find(query)
        // console.log(orders);

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
    // console.log(id);

    try {
        let order
        if (newStatus !== 'delivered') {
            order = await Order.findByIdAndUpdate(_id, { $set: { orderStatus: newStatus } })
        }
        else {
            order = await Order.findByIdAndUpdate(_id,
                {
                    $set: {
                        orderStatus: newStatus,
                        isPaid: true,
                    }
                },
            )
        }
        // console.log(order);

        await order.save()

        res.status(200).json({ msg: 'Updated status successfully' })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error while updating status' })

    }
}



exports.getOrderDetail = async (req, res) => {
    const { id } = req.params
    try {
        const order = await Order.findOne({ _id: id })
        res.status(200).json({ msg: 'Order fetched successfully.', order: order })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while fetching order detail', order: order })
    }
}


exports.cancelOrder = async (req, res) => {
    const { id: _id } = req.params
    try {
        const order = await Order.findByIdAndUpdate(_id, { $set: { orderStatus: 'cancelled' } })
        if (!order) return res.status(404).json({ msg: 'Order not found' })
        console.log(order);
        res.status(200).json({ msg: 'Order fetched successfully.', order: order })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while fetching order detail', order: order })
    }
}

