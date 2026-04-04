const dotenv = require('dotenv')
dotenv.config()

const cors = require('cors')
const rateLimit = require('express-rate-limit')
const express = require('express')
const app = express()
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1))
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null
const mongoose = require('mongoose')
const Order = require('./models/Order')
const Product = require('./models/Product')


// ── Stripe Webhook (raw body required — must come before express.json) ──
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) {
    console.error("❌ Stripe not configured");
    return res.sendStatus(500);
  }
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.sendStatus(400);
  }

  // Handle subscription webhook events
  const { handleWebhook: handleSubscriptionWebhook } = require('./controllers/subscriptionController');
  if (['checkout.session.completed', 'customer.subscription.deleted', 'invoice.payment_failed'].includes(event.type)) {
    await handleSubscriptionWebhook(event);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Skip subscription checkouts (handled above)
    if (session.mode === 'subscription') {
      return res.sendStatus(200);
    }

    console.log("✅ Payment succeeded!");
    console.log("Session ID:", session.id);
    console.log("Order ID (metadata):", session.metadata?.orderId);

    const paymentIntentId = session.payment_intent;
    const email = session.customer_details?.email;

    const orderId = session.metadata?.orderId;
    let order = await Order.findOne({ orderId });
    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult.paymentIntentId = paymentIntentId;
      order.paymentResult.emailAddress = email;
      await order.save();
      console.log("✅ Order updated:", order.orderId);

      try {
        const user = await User.findById(order.user);
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Confirmation</title>
  <style>
    body { background-color:#F8F9FA; font-family:'Inter','Segoe UI',sans-serif; color:#1A1A1A; line-height:1.6; margin:0; padding:0; }
    .email-wrapper { max-width:600px; margin:0 auto; padding:1.5rem; }
    .card { background:#FFFFFF; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.05); padding:2rem; }
    .header { background:#16A34A; color:#fff; padding:1rem 2rem; border-radius:12px 12px 0 0; font-size:1.25rem; font-weight:600; text-align:center; }
    .button { display:inline-block; margin-top:1.5rem; background:#16A34A; color:white!important; padding:0.75rem 1.5rem; border-radius:8px; text-decoration:none; font-weight:500; }
    .footer { font-size:14px; text-align:center; color:#6B7280; margin-top:2rem; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="card">
      <div class="header">🎉 Payment Successful!</div>
      <div style="padding:1.5rem 0;">
        <p>Hello ${user?.username || 'Customer'},</p>
        <p>We have successfully received your payment of <strong>USD ${order.orderSummary.totalAmount}</strong> for your order <strong>#${order.orderId}</strong>.</p>
        <p>Your order is now confirmed and will be delivered to you shortly.</p>
        <p style="text-align:center;">
          <a href="${process.env.FRONTEND_URL}/user-dashboard/order/detail/${order._id}" class="button">View Your Order</a>
        </p>
        <p>Thank you for shopping with <strong>Tortrose</strong>.</p>
        <p>Stay safe,<br/>The Tortrose Team</p>
      </div>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} Tortrose. All rights reserved.</div>
  </div>
</body>
</html>`;

        await sendEmail({
          to: email,
          subject: `Your Order #${order.orderId} is Confirmed 🎉`,
          text: `We've received your payment of USD ${order.orderSummary.totalAmount}. Your order will be delivered soon.`,
          html: html,
        });
      } catch (emailErr) {
        console.error('Failed to send payment confirmation email:', emailErr.message);
      }

      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
      }

      const cart = await Cart.findOne({ user: order.user });
      if (cart) {
        cart.cartItems = [];
        await cart.save();
      }
    }
  }

  res.sendStatus(200);
});


// ── CORS ──
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://www.tortrose.com',
  'https://tortrose.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
}));

app.options('*', cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Ensure CORS headers on ALL responses (including errors)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// ── Rate Limiting ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many requests, please try again later.' },
  validate: false,
  keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.ip || req.socket?.remoteAddress || 'unknown',
  handler: (req, res, _next, options) => {
    return res.status(options.statusCode).json(options.message);
  },
});

// ── Body Parsing ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Database ──
const ConnectDB = require('./config/db');
ConnectDB().catch(err => console.error('DB init error:', err.message));

// Middleware to ensure DB is connected before processing any API request
app.use('/api', async (req, res, next) => {
  try {
    await ConnectDB();
    next();
  } catch (err) {
    console.error('DB middleware connection error:', err.message);
    return res.status(503).json({ msg: 'Database temporarily unavailable. Please retry.' });
  }
});

// ── Passport (Google OAuth) ──
const passport = require('passport');
require('./middleware/googleStreatgy');
app.use(passport.initialize());

// ── Route imports ──
const resetPasswordRoutes = require('./routes/resetPasswordRoutes');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const storeRoutes = require('./routes/storeRoutes');
const taxRoutes = require('./routes/taxRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const trustRoutes = require('./routes/trustRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const subdomainRoutes = require('./routes/subdomain');
const chatbotRoutes = require('./routes/chatbotRoutes');
const smartTagRoutes = require('./routes/smartTagRoutes');
const aiActionRoutes = require('./routes/aiActionRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const couponRoutes = require('./routes/couponRoutes');
const Cart = require('./models/Cart');
const { sendEmail } = require('./controllers/mailController');
const User = require('./models/User');

// ── Routes ──
app.use('/api/products', productRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/password', authLimiter, resetPasswordRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/stores', trustRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subdomain', subdomainRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/smart-tags', smartTagRoutes);
app.use('/api/ai-actions', aiActionRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/coupons', couponRoutes);

// ── Trial expiration (runs on persistent Heroku dyno) ──
const { processTrialExpirations } = require('./controllers/subscriptionController');
setInterval(processTrialExpirations, 60 * 60 * 1000); // every hour
setTimeout(processTrialExpirations, 30000); // 30s after boot

// ── Centralized error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  return res.status(err?.status || 500).json({ msg: err?.message || 'Internal Server Error' });
});

// ── Health check ──
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// ── Root ──
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Tortrose API is running',
    version: '1.0.0',
    endpoints: { health: '/health', products: '/api/products', auth: '/api/auth' }
  });
});

// ── Start server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

module.exports = app;
