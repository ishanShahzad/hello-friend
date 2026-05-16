/**
 * AI Action Executor — Server-Side Tool Execution
 * ─────────────────────────────────────────────────
 * Executes AI tool calls directly on the server using Mongoose models.
 * This allows the AI chat controller to run a tool-execution loop:
 *   1. AI decides to call a tool
 *   2. This service executes it (no round-trip to frontend)
 *   3. Result is fed back to the AI for a natural language response
 *
 * Security: Role validation is done in the chat controller BEFORE calling
 * this service (via ALLOWED_TOOLS_BY_ROLE). This service trusts the caller.
 */

'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Coupon = require('../models/Coupon');
const Complaint = require('../models/Complaint');
const ShippingMethod = require('../models/ShippingMethod');
const Notification = require('../models/Notification');
const TaxConfig = require('../models/TaxConfig');
const BroadcastJob = require('../models/BroadcastJob');
const SellerSubscription = require('../models/SellerSubscription');
const StoreTrust = require('../models/StoreTrust');
const Cart = require('../models/Cart');
const StoreReview = require('../models/StoreReview');

// ─── Client-side tools: rendered by frontend, not executed here ───
const CLIENT_SIDE_TOOLS = new Set([
  'navigate',
  'show_style_advice',
  'suggest_outfit',
]);

function isClientSideTool(name) {
  return CLIENT_SIDE_TOOLS.has(name);
}

// ─── Helpers ───
function toId(v) {
  if (!v) return null;
  if (typeof v === 'string' && mongoose.Types.ObjectId.isValid(v)) return v;
  return null;
}

function safeLimit(v, def = 10, max = 50) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
}

function safePage(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// ─── Smart Search: Synonym/Multilingual Expansion ───
const SYNONYM_MAP = {
  // Multilingual (Urdu/Hindi → English)
  chapal: ['sandals', 'slippers', 'flip flops', 'slides'],
  joota: ['shoes', 'sneakers', 'footwear', 'boots'],
  juta: ['shoes', 'sneakers', 'footwear'],
  kapray: ['clothes', 'clothing', 'apparel', 'garments'],
  kurta: ['kurta', 'tunic', 'ethnic wear', 'traditional'],
  dupatta: ['dupatta', 'scarf', 'shawl', 'stole'],
  shalwar: ['shalwar', 'trousers', 'pants', 'bottoms'],
  kamiz: ['kameez', 'shirt', 'top', 'tunic'],
  ghari: ['watch', 'watches', 'wristwatch', 'timepiece'],
  basta: ['bag', 'bags', 'backpack', 'handbag'],
  topi: ['cap', 'hat', 'beanie', 'headwear'],
  chasma: ['glasses', 'sunglasses', 'eyewear', 'shades'],
  
  // Common slang/alternate spellings
  airpods: ['airpods', 'wireless earbuds', 'bluetooth earphones', 'tws earbuds', 'ear buds'],
  'air pods': ['airpods', 'wireless earbuds', 'bluetooth earphones', 'tws earbuds', 'ear buds'],
  earphones: ['earphones', 'earbuds', 'headphones', 'wireless earbuds', 'in-ear'],
  headphones: ['headphones', 'earphones', 'over-ear', 'wireless headphones', 'bluetooth headphones'],
  sneakers: ['sneakers', 'running shoes', 'trainers', 'sport shoes', 'athletic shoes'],
  tshirt: ['t-shirt', 'tee', 'top', 'casual shirt'],
  't-shirt': ['t-shirt', 'tee', 'top', 'casual shirt'],
  hoodie: ['hoodie', 'sweatshirt', 'pullover', 'hooded'],
  jeans: ['jeans', 'denim', 'pants', 'trousers'],
  jacket: ['jacket', 'coat', 'blazer', 'outerwear'],
  perfume: ['perfume', 'fragrance', 'cologne', 'eau de toilette', 'scent'],
  lipstick: ['lipstick', 'lip color', 'lip gloss', 'lip tint', 'lip'],
  cream: ['cream', 'moisturizer', 'lotion', 'skincare'],
  mobile: ['mobile', 'phone', 'smartphone', 'cell phone'],
  laptop: ['laptop', 'notebook', 'computer', 'macbook'],
  charger: ['charger', 'charging cable', 'power adapter', 'usb cable'],
  powerbank: ['power bank', 'portable charger', 'battery pack'],
  'power bank': ['power bank', 'portable charger', 'battery pack'],
  wallet: ['wallet', 'purse', 'card holder', 'money clip'],
  belt: ['belt', 'waist belt', 'leather belt'],
  ring: ['ring', 'finger ring', 'band', 'jewelry'],
  necklace: ['necklace', 'chain', 'pendant', 'jewelry'],
  bracelet: ['bracelet', 'bangle', 'wristband', 'jewelry'],
};

function expandSearchTerms(query) {
  if (!query) return [];
  const lower = query.toLowerCase().trim();
  const terms = new Set([lower]);
  
  // Check full phrase against synonym map
  if (SYNONYM_MAP[lower]) {
    SYNONYM_MAP[lower].forEach(s => terms.add(s));
  }
  
  // Check each word individually
  lower.split(/\s+/).forEach(word => {
    if (SYNONYM_MAP[word]) {
      SYNONYM_MAP[word].forEach(s => terms.add(s));
    }
  });
  
  return [...terms];
}

function buildSmartSearchFilter(query, category) {
  const filter = {};
  if (query) {
    const searchTerms = expandSearchTerms(query);
    const orConditions = [];
    
    for (const term of searchTerms) {
      // Escape regex special chars
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      orConditions.push(
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } },
        { brand: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      );
    }
    
    // Also try individual words from the original query for partial matching
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      orConditions.push({ name: { $regex: escaped, $options: 'i' } });
    }
    
    filter.$or = orConditions;
  }
  if (category) filter.category = { $regex: category, $options: 'i' };
  return filter;
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════════════

async function executeToolCall(toolName, args = {}, user) {
  const userId = user?._id || user?.id || null;
  const role = user?.role || 'guest';

  try {
    switch (toolName) {

      // ─────────────────────────────────────────────
      //  USER / SHARED TOOLS
      // ─────────────────────────────────────────────

      case 'search_products': {
        const { query, category, minPrice, maxPrice, sortBy } = args;
        
        // Use smart search with synonym expansion
        const filter = buildSmartSearchFilter(query, category);
        if (minPrice || maxPrice) {
          filter.price = {};
          if (minPrice) filter.price.$gte = Number(minPrice);
          if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        let sort = { createdAt: -1 };
        if (sortBy === 'price_low') sort = { price: 1 };
        else if (sortBy === 'price_high') sort = { price: -1 };
        else if (sortBy === 'popular') sort = { rating: -1 };
        else if (sortBy === 'newest') sort = { createdAt: -1 };
        else if (sortBy === 'best_rated') sort = { rating: -1, numReviews: -1 };
        else if (sortBy === 'trending') sort = { numReviews: -1, rating: -1 };

        let products = await Product.find(filter)
          .sort(sort)
          .limit(20)
          .select('name price discountedPrice category brand image rating numReviews stock colors optionGroups')
          .lean();

        // If no results and we have a query, try a broader fallback: sort by popularity
        if (products.length === 0 && query) {
          // Fallback: return popular/recent products when search yields nothing
          products = await Product.find(category ? { category: { $regex: category, $options: 'i' } } : {})
            .sort({ rating: -1, numReviews: -1, createdAt: -1 })
            .limit(12)
            .select('name price discountedPrice category brand image rating numReviews stock colors optionGroups')
            .lean();

          if (products.length > 0) {
            return {
              success: true,
              data: { products, count: products.length, fallback: true },
              message: `No exact matches for "${query}", but here are ${products.length} popular product${products.length !== 1 ? 's' : ''} you might like:`,
            };
          }
        }

        return {
          success: true,
          data: { products, count: products.length },
          message: products.length > 0
            ? `Found ${products.length} product${products.length !== 1 ? 's' : ''}${query ? ` matching "${query}"` : ''}`
            : `No products found${query ? ` for "${query}"` : ''}. Try different keywords or browse categories.`,
        };
      }

      case 'get_my_orders': {
        if (!userId) return { success: false, error: 'You must be logged in to view orders.' };
        const { status, limit } = args;

        // ROLE-AWARE: If seller, show orders containing THEIR products (not personal purchases)
        let orders, totalCount;
        if (role === 'seller') {
          const myProducts = await Product.find({ seller: userId }).select('_id').lean();
          const productIds = myProducts.map(p => p._id);
          const filter = { 'orderItems.productId': { $in: productIds } };
          if (status && status !== 'all') filter.orderStatus = status;

          // Get TOTAL count first (no limit) for accurate reporting
          totalCount = await Order.countDocuments(filter);

          orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(safeLimit(limit, 20))
            .populate('user', 'username email')
            .populate('orderItems.productId', 'name image price seller')
            .lean();

          // CRITICAL: Filter order items to only show THIS seller's products + recalculate seller-specific total
          orders = orders.map(o => {
            const sellerItems = (o.orderItems || []).filter(i =>
              productIds.some(pid => pid.toString() === (i.productId?._id || i.productId)?.toString())
            );
            const sellerTotal = sellerItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
            return { ...o, orderItems: sellerItems, _sellerTotal: sellerTotal };
          });
        } else {
          // Regular user: show their OWN orders only
          const filter = { user: userId };
          if (status && status !== 'all') filter.orderStatus = status;

          totalCount = await Order.countDocuments(filter);

          orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(safeLimit(limit, 15))
            .populate('orderItems.productId', 'name image price')
            .lean();
        }

        return {
          success: true,
          data: {
            orders: orders.map(o => ({
              _id: o._id,
              orderId: o.orderId,
              status: o.orderStatus,
              total: role === 'seller' ? (o._sellerTotal || 0) : (o.orderSummary?.totalAmount || 0),
              buyer: role === 'seller' ? (o.user?.username || 'Guest') : undefined,
              items: (o.orderItems || []).map(i => ({
                name: i.name || i.productId?.name,
                price: i.price,
                quantity: i.quantity,
                image: i.image || i.productId?.image,
              })),
              date: o.createdAt,
              isPaid: o.isPaid,
            })),
            count: orders.length,
            totalCount,
          },
          message: `Found ${totalCount} total order${totalCount !== 1 ? 's' : ''}${status ? ` with status "${status}"` : ''}${role === 'seller' ? ' for your store' : ''} (showing ${orders.length})`,
        };
      }

      case 'get_order_detail': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { orderId } = args;
        if (!orderId) return { success: false, error: 'Please provide an order ID.' };

        let order;
        if (role === 'seller') {
          // Sellers can view orders containing THEIR products
          const myProducts = await Product.find({ seller: userId }).select('_id').lean();
          const productIds = myProducts.map(p => p._id.toString());
          order = await Order.findOne({
            $or: [{ _id: toId(orderId) }, { orderId: orderId }],
            'orderItems.productId': { $in: myProducts.map(p => p._id) },
          })
            .populate('orderItems.productId', 'name image price category seller')
            .populate('user', 'username email')
            .lean();
        } else if (role === 'admin') {
          // Admins can view any order
          order = await Order.findOne({
            $or: [{ _id: toId(orderId) }, { orderId: orderId }],
          })
            .populate('orderItems.productId', 'name image price category')
            .populate('user', 'username email')
            .lean();
        } else {
          // Users can only view their own orders
          order = await Order.findOne({
            $or: [
              { _id: toId(orderId), user: userId },
              { orderId: orderId, user: userId },
            ],
          })
            .populate('orderItems.productId', 'name image price category')
            .lean();
        }

        if (!order) return { success: false, error: 'Order not found or access denied.' };

        // For sellers: filter items to only their products + compute seller subtotal
        let items = order.orderItems || [];
        let summary = order.orderSummary;
        if (role === 'seller') {
          const myProductIds = (await Product.find({ seller: userId }).select('_id').lean()).map(p => p._id.toString());
          items = items.filter(i =>
            myProductIds.includes((i.productId?._id || i.productId)?.toString())
          );
          const sellerSubtotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
          summary = { subtotal: sellerSubtotal, totalAmount: sellerSubtotal, note: 'Shows only your products from this order' };
        }

        return {
          success: true,
          data: {
            orderId: order.orderId,
            status: order.orderStatus,
            buyer: role === 'seller' ? (order.user?.username || 'Guest') : undefined,
            items: items.map(i => ({
              name: i.name || i.productId?.name,
              price: i.price,
              quantity: i.quantity,
              image: i.image || i.productId?.image,
            })),
            summary,
            shipping: role !== 'seller' ? order.shippingInfo : { city: order.shippingInfo?.city, country: order.shippingInfo?.country },
            paymentMethod: order.paymentMethod,
            isPaid: order.isPaid,
            isDelivered: order.isDelivered,
            date: order.createdAt,
          },
          message: `Order #${order.orderId} — ${order.orderStatus}${role === 'seller' ? ' (your products only)' : ''}`,
        };
      }

      case 'cancel_order': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { orderId, reason } = args;
        if (!orderId) return { success: false, error: 'Please provide an order ID to cancel.' };

        const order = await Order.findOne({
          $or: [
            { _id: toId(orderId), user: userId },
            { orderId: orderId, user: userId },
          ],
        });

        if (!order) return { success: false, error: 'Order not found or access denied.' };
        if (['delivered', 'cancelled'].includes(order.orderStatus)) {
          return { success: false, error: `Cannot cancel — order is already ${order.orderStatus}.` };
        }

        order.orderStatus = 'cancelled';
        if (reason) order.instructions = (order.instructions || '') + ` [Cancelled: ${reason}]`;
        await order.save();

        return { success: true, message: `Order #${order.orderId} has been cancelled successfully.` };
      }

      case 'submit_complaint': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { category, subject, message, orderId, productId } = args;
        if (!category || !subject || !message) {
          return { success: false, error: 'Please provide category, subject, and message for the complaint.' };
        }

        const complaint = await Complaint.create({
          user: userId,
          category,
          subject,
          message,
          ...(orderId ? { relatedOrder: toId(orderId) } : {}),
          ...(productId ? { relatedProduct: toId(productId) } : {}),
        });

        return {
          success: true,
          data: { complaintId: complaint._id, status: complaint.status },
          message: `Complaint submitted successfully (ID: ${complaint._id}). We'll look into it.`,
        };
      }

      case 'get_my_complaints': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { status } = args;
        const filter = { user: userId };
        if (status) filter.status = status;

        const [complaints, totalCount] = await Promise.all([
          Complaint.find(filter).sort({ createdAt: -1 }).limit(20).lean(),
          Complaint.countDocuments(filter),
        ]);

        return {
          success: true,
          data: {
            complaints: complaints.map(c => ({
              _id: c._id,
              subject: c.subject,
              category: c.category,
              status: c.status,
              priority: c.priority,
              adminResponse: c.adminResponse || '',
              date: c.createdAt,
            })),
            count: complaints.length,
            totalCount,
          },
          message: `You have ${totalCount} complaint${totalCount !== 1 ? 's' : ''}${status ? ` with status "${status}"` : ''} (showing ${complaints.length})`,
        };
      }

      case 'get_wishlist': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const user = await User.findById(userId)
          .populate('wishlist', 'name price discountedPrice image category rating stock')
          .lean();

        const items = (user?.wishlist || []).map(p => ({
          _id: p._id,
          name: p.name,
          price: p.price,
          discountedPrice: p.discountedPrice,
          image: p.image,
          category: p.category,
          inStock: p.stock > 0,
        }));

        return {
          success: true,
          data: { items, count: items.length },
          message: items.length > 0
            ? `Your wishlist has ${items.length} item${items.length !== 1 ? 's' : ''}: ${items.map(i => i.name).join(', ')}`
            : 'Your wishlist is empty.',
        };
      }

      case 'add_to_wishlist': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productId } = args;
        if (!productId) return { success: false, error: 'Please provide a product ID.' };

        const product = await Product.findById(toId(productId)).select('name').lean();
        if (!product) return { success: false, error: 'Product not found.' };

        await User.findByIdAndUpdate(userId, { $addToSet: { wishlist: productId } });
        return { success: true, message: `"${product.name}" added to your wishlist! ❤️` };
      }

      case 'remove_from_wishlist': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productId } = args;
        if (!productId) return { success: false, error: 'Please provide a product ID.' };

        await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } });
        return { success: true, message: 'Item removed from your wishlist.' };
      }

      case 'get_addresses': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const user = await User.findById(userId).select('savedAddresses savedShippingInfo').lean();

        return {
          success: true,
          data: {
            addresses: user?.savedAddresses || [],
            defaultAddress: user?.savedShippingInfo || null,
          },
          message: `You have ${(user?.savedAddresses || []).length} saved address(es).`,
        };
      }

      case 'add_address': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const addr = args.address || args;
        if (!addr.fullName || !addr.address || !addr.city) {
          return { success: false, error: 'Please provide at least fullName, address, and city.' };
        }

        await User.findByIdAndUpdate(userId, { $push: { savedAddresses: addr } });
        return { success: true, message: `New address "${addr.label || 'Home'}" added successfully!` };
      }

      case 'update_profile': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const updates = args.updates || args;
        const allowed = {};
        if (updates.username) allowed.username = updates.username;
        if (updates.name) allowed.username = updates.name;
        if (updates.phone) allowed['sellerInfo.phoneNumber'] = updates.phone;
        if (updates.currency) allowed.currency = updates.currency;

        if (Object.keys(allowed).length === 0) {
          return { success: false, error: 'No valid fields to update. You can update: name, phone, currency.' };
        }

        await User.findByIdAndUpdate(userId, { $set: allowed });
        return { success: true, message: 'Profile updated successfully! ✨' };
      }

      case 'get_notifications': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { limit } = args;

        const [notifications, totalCount, totalUnread] = await Promise.all([
          Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(safeLimit(limit, 20)).lean(),
          Notification.countDocuments({ user: userId }),
          Notification.countDocuments({ user: userId, read: false }),
        ]);

        return {
          success: true,
          data: {
            notifications: notifications.map(n => ({
              _id: n._id,
              title: n.title,
              body: n.body,
              category: n.category,
              read: n.read,
              date: n.createdAt,
            })),
            unreadCount: totalUnread,
            totalCount,
            showing: notifications.length,
          },
          message: `${totalUnread} unread notification${totalUnread !== 1 ? 's' : ''} out of ${totalCount} total (showing ${notifications.length}).`,
        };
      }

      case 'mark_notifications_read': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const result = await Notification.updateMany(
          { user: userId, read: false },
          { $set: { read: true, readAt: new Date() } }
        );
        return { success: true, message: `Marked ${result.modifiedCount} notification${result.modifiedCount !== 1 ? 's' : ''} as read.` };
      }

      case 'get_available_coupons': {
        const { storeId, productId } = args;
        const now = new Date();
        const filter = {
          isActive: true,
          expiryDate: { $gt: now },
          startDate: { $lte: now },
          $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }],
        };
        if (storeId) filter.seller = toId(storeId);

        let coupons = await Coupon.find(filter)
          .limit(20)
          .populate('seller', 'username')
          .lean();

        if (productId) {
          coupons = coupons.filter(c =>
            c.applicableTo === 'all' ||
            (c.applicableProducts || []).some(p => p.toString() === productId)
          );
        }

        return {
          success: true,
          data: {
            coupons: coupons.map(c => ({
              code: c.code,
              type: c.discountType,
              value: c.discountValue,
              minOrder: c.minOrderAmount,
              maxDiscount: c.maxDiscountAmount,
              expires: c.expiryDate,
              seller: c.seller?.username || 'Unknown',
              description: c.description,
            })),
            count: coupons.length,
          },
          message: coupons.length > 0
            ? `Found ${coupons.length} available coupon${coupons.length !== 1 ? 's' : ''}!`
            : 'No coupons available right now.',
        };
      }

      case 'get_product_detail': {
        const { productId } = args;
        if (!productId) return { success: false, error: 'Please provide a product ID.' };

        const product = await Product.findById(toId(productId))
          .populate('seller', 'username')
          .lean();
        if (!product) return { success: false, error: 'Product not found.' };

        const store = await Store.findOne({ seller: product.seller?._id }).select('storeName storeSlug verification.isVerified').lean();

        return {
          success: true,
          data: {
            _id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            discountedPrice: product.discountedPrice,
            category: product.category,
            brand: product.brand,
            stock: product.stock,
            image: product.image,
            images: product.images,
            rating: product.rating,
            numReviews: product.numReviews,
            colors: product.colors,
            optionGroups: product.optionGroups,
            tags: product.tags,
            seller: product.seller?.username,
            storeName: store?.storeName,
            storeSlug: store?.storeSlug,
            isVerifiedStore: store?.verification?.isVerified || false,
            returnPolicy: product.returnPolicy,
          },
          message: `${product.name} — $${product.discountedPrice || product.price} | ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'} | ⭐ ${product.rating?.toFixed(1) || 'N/A'} (${product.numReviews} reviews)`,
        };
      }

      case 'get_my_profile': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const user = await User.findById(userId)
          .select('username email role currency avatar savedShippingInfo savedAddresses sellerInfo createdAt wishlist')
          .lean();
        if (!user) return { success: false, error: 'User not found.' };

        return {
          success: true,
          data: {
            username: user.username,
            email: user.email,
            role: user.role,
            currency: user.currency,
            avatar: user.avatar,
            phone: user.sellerInfo?.phoneNumber || '',
            defaultAddress: user.savedShippingInfo || null,
            savedAddressCount: (user.savedAddresses || []).length,
            wishlistCount: (user.wishlist || []).length,
            memberSince: user.createdAt,
          },
          message: `Profile: ${user.username} (${user.email}) — ${user.role} — ${(user.savedAddresses || []).length} addresses, ${(user.wishlist || []).length} wishlist items.`,
        };
      }

      case 'add_to_cart': {
        if (!userId) return { success: false, error: 'You must be logged in to add items to cart.' };
        const { productId, selectedColor, selectedOptions } = args;
        if (!productId) return { success: false, error: 'Please provide a productId.' };

        const product = await Product.findById(toId(productId)).select('name price discountedPrice stock image').lean();
        if (!product) return { success: false, error: 'Product not found.' };
        if (product.stock <= 0) return { success: false, error: `"${product.name}" is out of stock.` };

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
          cart = new Cart({ user: userId, cartItems: [] });
        }

        // Check if already in cart
        const optKey = selectedOptions ? Object.keys(selectedOptions).sort().map(k => `${k}:${selectedOptions[k]}`).join('|') : '';
        const existing = cart.cartItems.find(item =>
          item.product.toString() === productId &&
          (item.selectedColor || null) === (selectedColor || null) &&
          (item.selectedOptions ? Object.keys(item.selectedOptions.toJSON?.() || item.selectedOptions).sort().map(k => `${k}:${(item.selectedOptions.toJSON?.() || item.selectedOptions)[k]}`).join('|') : '') === optKey
        );
        if (existing) {
          return { success: true, message: `"${product.name}" is already in your cart.` };
        }

        cart.cartItems.push({
          product: productId,
          selectedColor: selectedColor || null,
          selectedOptions: selectedOptions || undefined,
        });
        await cart.populate('cartItems.product');
        await cart.save();

        const effectivePrice = product.discountedPrice && product.discountedPrice > 0 ? product.discountedPrice : product.price;
        return {
          success: true,
          data: { cartItemCount: cart.cartItems.length, totalCartPrice: cart.totalCartPrice },
          message: `"${product.name}" added to cart! 🛒 Cart total: $${cart.totalCartPrice?.toFixed(2)} (${cart.cartItems.length} item${cart.cartItems.length !== 1 ? 's' : ''})`,
        };
      }

      case 'view_cart': {
        if (!userId) return { success: false, error: 'You must be logged in to view cart.' };
        const cart = await Cart.findOne({ user: userId }).populate('cartItems.product').lean();
        if (!cart || !cart.cartItems?.length) {
          return { success: true, data: { items: [], total: 0 }, message: 'Your cart is empty. Start shopping! 🛍️' };
        }

        const items = cart.cartItems.filter(i => i.product).map(item => {
          const p = item.product;
          const price = p.discountedPrice && p.discountedPrice > 0 ? p.discountedPrice : p.price;
          return {
            _id: item._id,
            productId: p._id,
            name: p.name,
            price,
            originalPrice: p.price,
            quantity: item.qty || 1,
            image: p.image,
            selectedColor: item.selectedColor,
            subtotal: price * (item.qty || 1),
          };
        });

        return {
          success: true,
          data: { items, total: cart.totalCartPrice, itemCount: items.length },
          message: `Your cart has ${items.length} item${items.length !== 1 ? 's' : ''} — Total: $${cart.totalCartPrice?.toFixed(2)}. Items: ${items.map(i => `${i.name} ($${i.price})`).join(', ')}`,
        };
      }

      case 'remove_from_cart': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productId } = args;
        if (!productId) return { success: false, error: 'Please provide productId.' };

        const cart = await Cart.findOne({ user: userId });
        if (!cart) return { success: false, error: 'Cart is empty.' };

        const before = cart.cartItems.length;
        cart.cartItems = cart.cartItems.filter(item => !item.product.equals(toId(productId)));
        if (cart.cartItems.length === before) {
          return { success: false, error: 'Product not found in cart.' };
        }
        await cart.populate('cartItems.product');
        await cart.save();

        return {
          success: true,
          data: { cartItemCount: cart.cartItems.length, totalCartPrice: cart.totalCartPrice },
          message: `Item removed from cart. ${cart.cartItems.length} item${cart.cartItems.length !== 1 ? 's' : ''} remaining — $${cart.totalCartPrice?.toFixed(2)}`,
        };
      }

      case 'clear_cart': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const cart = await Cart.findOne({ user: userId });
        if (!cart || !cart.cartItems?.length) return { success: true, message: 'Cart is already empty.' };

        cart.cartItems = [];
        await cart.save();
        return { success: true, message: 'Cart cleared! 🗑️' };
      }

      case 'place_order': {
        if (!userId) return { success: false, error: 'You must be logged in to place an order.' };
        const { productId, shippingInfo, paymentMethod } = args;

        // Get user's saved address if shipping info not provided
        let shipping = shippingInfo;
        if (!shipping || !shipping.fullName) {
          const user = await User.findById(userId).select('savedShippingInfo savedAddresses username email sellerInfo').lean();
          // Try default address first, then first saved address
          if (user?.savedShippingInfo?.fullName) {
            shipping = user.savedShippingInfo;
          } else if (user?.savedAddresses?.length > 0) {
            const addr = user.savedAddresses.find(a => a.isDefault) || user.savedAddresses[0];
            shipping = {
              fullName: addr.fullName,
              email: addr.email || user.email,
              phone: addr.phone || user.sellerInfo?.phoneNumber || '',
              address: addr.address,
              city: addr.city,
              state: addr.state || '',
              postalCode: addr.postalCode || '',
              country: addr.country || 'Pakistan',
            };
          }
        }

        if (!shipping || !shipping.fullName || !shipping.address || !shipping.city) {
          return {
            success: false,
            error: 'No shipping address found. Please provide your shipping details: fullName, email, phone, address, city, state, postalCode, country.',
            needsShippingInfo: true,
          };
        }
        if (!shipping.email) shipping.email = (await User.findById(userId).select('email').lean())?.email || '';
        if (!shipping.phone) shipping.phone = '';

        // Get product(s) to order
        let orderItems = [];
        if (productId) {
          // Single product order
          const product = await Product.findById(toId(productId)).lean();
          if (!product) return { success: false, error: 'Product not found.' };
          if (product.stock <= 0) return { success: false, error: `"${product.name}" is out of stock.` };

          const effectivePrice = product.discountedPrice && product.discountedPrice > 0 ? product.discountedPrice : product.price;
          orderItems = [{
            productId: product._id,
            id: product._id,
            name: product.name,
            image: product.image,
            price: effectivePrice,
            quantity: 1,
          }];
        } else {
          // Order from cart
          const cart = await Cart.findOne({ user: userId }).populate('cartItems.product').lean();
          if (!cart || !cart.cartItems?.length) {
            return { success: false, error: 'Cart is empty. Add products first or specify a productId.' };
          }
          orderItems = cart.cartItems.filter(i => i.product).map(item => {
            const p = item.product;
            const price = p.discountedPrice && p.discountedPrice > 0 ? p.discountedPrice : p.price;
            return {
              productId: p._id,
              id: p._id,
              name: p.name,
              image: p.image,
              price,
              quantity: item.qty || 1,
              selectedColor: item.selectedColor,
              selectedOptions: item.selectedOptions,
            };
          });
        }

        if (orderItems.length === 0) return { success: false, error: 'No items to order.' };

        const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        // Get tax
        let tax = 0;
        const taxConfig = await TaxConfig.findOne({ isActive: true }).lean();
        if (taxConfig && taxConfig.type !== 'none') {
          tax = taxConfig.type === 'percentage' ? subtotal * taxConfig.value / 100 : taxConfig.value;
        }

        // Get shipping method for the seller
        const firstSeller = orderItems[0]?.productId;
        const sellerProduct = await Product.findById(firstSeller).select('seller').lean();
        let shippingMethod = { name: 'Standard', price: 0, estimatedDays: 5 };
        if (sellerProduct?.seller) {
          const sellerShipping = await ShippingMethod.findOne({ seller: sellerProduct.seller }).lean();
          if (sellerShipping?.methods?.length) {
            const active = sellerShipping.methods.find(m => m.isActive);
            if (active) {
              shippingMethod = { name: active.type, price: active.cost, estimatedDays: active.deliveryDays };
            }
          }
        }

        const totalAmount = subtotal + shippingMethod.price + tax;

        const newOrder = new Order({
          user: userId,
          orderId: `ORD-${Date.now()}`,
          orderItems: orderItems.map(i => ({
            productId: i.productId || i.id,
            name: i.name,
            image: i.image,
            price: i.price,
            quantity: i.quantity,
            selectedColor: i.selectedColor || null,
            selectedOptions: i.selectedOptions || undefined,
          })),
          shippingInfo: {
            fullName: shipping.fullName,
            email: shipping.email,
            phone: shipping.phone || '',
            address: shipping.address,
            city: shipping.city,
            state: shipping.state || '',
            postalCode: shipping.postalCode || '',
            country: shipping.country || 'Pakistan',
          },
          shippingMethod,
          orderSummary: {
            subtotal,
            shippingCost: shippingMethod.price,
            tax,
            couponDiscount: 0,
            totalAmount,
          },
          paymentMethod: paymentMethod || 'cash_on_delivery',
        });

        // Generate confirmation token
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        newOrder.confirmation = {
          token,
          tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };

        await newOrder.save();

        // Decrement stock
        for (const item of orderItems) {
          await Product.findByIdAndUpdate(item.productId || item.id, { $inc: { stock: -item.quantity } });
        }

        // Clear cart if ordering from cart
        if (!productId) {
          await Cart.findOneAndUpdate({ user: userId }, { $set: { cartItems: [] } });
        }

        return {
          success: true,
          data: {
            orderId: newOrder.orderId,
            total: totalAmount,
            items: orderItems.length,
            paymentMethod: newOrder.paymentMethod,
            estimatedDelivery: `${shippingMethod.estimatedDays} days`,
          },
          message: `🎉 Order placed successfully! Order #${newOrder.orderId} — $${totalAmount.toFixed(2)} — ${orderItems.length} item${orderItems.length !== 1 ? 's' : ''} — ${newOrder.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Stripe'} — Est. delivery: ${shippingMethod.estimatedDays} days`,
        };
      }

      case 'get_verification_status': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const store = await Store.findOne({ seller: userId }).select('verification storeName').lean();
        if (!store) return { success: false, error: 'No store found.' };

        return {
          success: true,
          data: {
            isVerified: store.verification?.isVerified || false,
            status: store.verification?.status || 'none',
            appliedAt: store.verification?.appliedAt,
            rejectionReason: store.verification?.rejectionReason || '',
          },
          message: store.verification?.isVerified
            ? `Store "${store.storeName}" is verified! ✅🛡️`
            : store.verification?.status === 'pending'
              ? `Verification pending — submitted ${store.verification.appliedAt ? new Date(store.verification.appliedAt).toLocaleDateString() : 'recently'}.`
              : store.verification?.status === 'rejected'
                ? `Verification rejected: ${store.verification.rejectionReason || 'Does not meet requirements.'}`
                : 'Not yet applied for verification.',
        };
      }

      case 'validate_coupon': {
        const { code, cartTotal } = args;
        if (!code) return { success: false, error: 'Please provide a coupon code.' };

        const now = new Date();
        const coupon = await Coupon.findOne({
          code: code.toUpperCase().trim(),
          isActive: true,
          expiryDate: { $gt: now },
          startDate: { $lte: now },
        }).lean();

        if (!coupon) return { success: false, error: `Coupon "${code}" is invalid or expired.` };
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          return { success: false, error: 'This coupon has reached its usage limit.' };
        }
        if (cartTotal && coupon.minOrderAmount > Number(cartTotal)) {
          return { success: false, error: `Minimum order amount is $${coupon.minOrderAmount}.` };
        }

        let discount = coupon.discountType === 'percentage'
          ? (cartTotal ? Number(cartTotal) * coupon.discountValue / 100 : coupon.discountValue)
          : coupon.discountValue;
        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
          discount = coupon.maxDiscountAmount;
        }

        return {
          success: true,
          data: { code: coupon.code, discount, type: coupon.discountType, value: coupon.discountValue },
          message: `Coupon "${coupon.code}" is valid! ${coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `$${coupon.discountValue} off`}`,
        };
      }

      // ─────────────────────────────────────────────
      //  SELLER TOOLS
      // ─────────────────────────────────────────────

      case 'add_product': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const store = await Store.findOne({ seller: userId }).select('_id storeName').lean();
        if (!store) return { success: false, error: 'You need to create a store first.' };

        const p = args.product || args;
        const missing = [];
        if (!p.name) missing.push('name');
        if (!p.price && p.price !== 0) missing.push('price');
        if (!p.category) missing.push('category');
        if (!p.brand) missing.push('brand');
        if (missing.length) {
          return { success: false, error: `Missing required fields: ${missing.join(', ')}`, missingFields: missing };
        }

        const product = await Product.create({
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          discountedPrice: p.discountedPrice ? Number(p.discountedPrice) : 0,
          category: p.category,
          brand: p.brand,
          stock: p.stock != null ? Number(p.stock) : 0,
          image: p.image || 'https://via.placeholder.com/400',
          images: p.images || [],
          tags: p.tags || [],
          colors: p.colors || [],
          seller: userId,
        });

        return {
          success: true,
          data: { productId: product._id, name: product.name, price: product.price },
          message: `Product "${product.name}" added to your store "${store.storeName}" at $${product.price}! 🎉`,
        };
      }

      case 'edit_product': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productId, ...updates } = args;
        if (!productId) return { success: false, error: 'Please specify which product to edit (productId).' };

        const product = await Product.findOneAndUpdate(
          { _id: toId(productId), seller: userId },
          { $set: updates },
          { new: true, runValidators: true }
        ).select('name price stock category').lean();

        if (!product) return { success: false, error: 'Product not found or you don\'t own it.' };
        return {
          success: true,
          data: product,
          message: `Product "${product.name}" updated successfully! ✅`,
        };
      }

      case 'delete_product': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productId } = args;
        if (!productId) return { success: false, error: 'Please specify which product to delete (productId).' };

        const product = await Product.findOneAndDelete({ _id: toId(productId), seller: userId });
        if (!product) return { success: false, error: 'Product not found or you don\'t own it.' };
        return { success: true, message: `Product "${product.name}" has been permanently deleted. 🗑️` };
      }

      case 'list_my_products': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { search, category, limit, page, sortBy } = args;
        const filter = { seller: userId };
        if (search) filter.name = { $regex: search, $options: 'i' };
        if (category) filter.category = { $regex: category, $options: 'i' };

        let sort = { createdAt: -1 };
        if (sortBy === 'price_low') sort = { price: 1 };
        else if (sortBy === 'price_high') sort = { price: -1 };
        else if (sortBy === 'name') sort = { name: 1 };

        const skip = (safePage(page) - 1) * safeLimit(limit, 20);
        const [products, total] = await Promise.all([
          Product.find(filter).sort(sort).skip(skip).limit(safeLimit(limit, 20))
            .select('name price discountedPrice category brand stock image rating numReviews')
            .lean(),
          Product.countDocuments(filter),
        ]);

        return {
          success: true,
          data: { products, total, page: safePage(page) },
          message: `You have ${total} product${total !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}. Showing ${products.length}.`,
        };
      }

      case 'bulk_discount': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productIds, category: cat, discountPercent } = args;
        if (!discountPercent) return { success: false, error: 'Please specify a discount percentage.' };

        const filter = { seller: userId };
        if (productIds?.length) filter._id = { $in: productIds.map(toId).filter(Boolean) };
        else if (cat) filter.category = { $regex: cat, $options: 'i' };

        const products = await Product.find(filter).select('price').lean();
        if (!products.length) return { success: false, error: 'No matching products found.' };

        const bulkOps = products.map(p => ({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { discountedPrice: Math.round(p.price * (1 - discountPercent / 100) * 100) / 100 } },
          },
        }));
        await Product.bulkWrite(bulkOps);

        return {
          success: true,
          message: `Applied ${discountPercent}% discount to ${products.length} product${products.length !== 1 ? 's' : ''}! 🏷️`,
        };
      }

      case 'bulk_price_update': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productIds, category: cat, priceChange, isPercent } = args;
        if (!priceChange && priceChange !== 0) return { success: false, error: 'Please specify a price change amount.' };

        const filter = { seller: userId };
        if (productIds?.length) filter._id = { $in: productIds.map(toId).filter(Boolean) };
        else if (cat) filter.category = { $regex: cat, $options: 'i' };

        const products = await Product.find(filter).select('price').lean();
        if (!products.length) return { success: false, error: 'No matching products found.' };

        const bulkOps = products.map(p => {
          const change = isPercent ? p.price * Number(priceChange) / 100 : Number(priceChange);
          const newPrice = Math.max(0, Math.round((p.price + change) * 100) / 100);
          return {
            updateOne: {
              filter: { _id: p._id },
              update: { $set: { price: newPrice } },
            },
          };
        });
        await Product.bulkWrite(bulkOps);

        return {
          success: true,
          message: `Updated prices for ${products.length} product${products.length !== 1 ? 's' : ''} (${isPercent ? priceChange + '%' : '$' + priceChange}).`,
        };
      }

      case 'remove_discount': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productIds, category: cat } = args;
        const filter = { seller: userId };
        if (productIds?.length) filter._id = { $in: productIds.map(toId).filter(Boolean) };
        else if (cat) filter.category = { $regex: cat, $options: 'i' };

        const result = await Product.updateMany(filter, { $set: { discountedPrice: 0 } });
        return {
          success: true,
          message: `Removed discounts from ${result.modifiedCount} product${result.modifiedCount !== 1 ? 's' : ''}.`,
        };
      }

      case 'get_seller_analytics': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const store = await Store.findOne({ seller: userId }).select('storeName views trustCount').lean();

        const myProducts = await Product.find({ seller: userId }).select('_id').lean();
        const productIds = myProducts.map(p => p._id);

        const orders = await Order.find({ 'orderItems.productId': { $in: productIds } })
          .select('orderSummary orderStatus createdAt orderItems')
          .lean();

        // CRITICAL: Calculate revenue from ONLY this seller's items, not the full order total
        const totalRevenue = orders
          .filter(o => o.orderStatus !== 'cancelled')
          .reduce((sum, o) => {
            const sellerItemsRevenue = (o.orderItems || [])
              .filter(i => productIds.some(pid => pid.toString() === i.productId?.toString()))
              .reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
            return sum + sellerItemsRevenue;
          }, 0);

        const statusCounts = {};
        orders.forEach(o => {
          statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
        });

        // Top products by order frequency
        const productFreq = {};
        orders.forEach(o => {
          (o.orderItems || []).forEach(item => {
            if (productIds.some(pid => pid.toString() === item.productId?.toString())) {
              const key = item.name || item.productId?.toString();
              productFreq[key] = (productFreq[key] || 0) + item.quantity;
            }
          });
        });
        const topProducts = Object.entries(productFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, sold]) => ({ name, sold }));

        // Low stock alerts
        const lowStock = await Product.find({ seller: userId, stock: { $lt: 5, $gt: 0 } })
          .select('name stock')
          .lean();

        return {
          success: true,
          data: {
            storeName: store?.storeName,
            totalProducts: myProducts.length,
            totalOrders: orders.length,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            storeViews: store?.views || 0,
            trustCount: store?.trustCount || 0,
            ordersByStatus: statusCounts,
            topProducts,
            lowStockAlerts: lowStock.map(p => ({ name: p.name, stock: p.stock })),
          },
          message: `📊 Store "${store?.storeName}": ${myProducts.length} products, ${orders.length} orders, $${Math.round(totalRevenue)} revenue, ${store?.views || 0} views.`,
        };
      }

      case 'get_seller_orders': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { status, limit } = args;

        const myProducts = await Product.find({ seller: userId }).select('_id').lean();
        const productIds = myProducts.map(p => p._id);

        const filter = { 'orderItems.productId': { $in: productIds } };
        if (status && status !== 'all') filter.orderStatus = status;

        // Get TRUE total count (no limit) for accurate reporting
        const totalCount = await Order.countDocuments(filter);

        const orders = await Order.find(filter)
          .sort({ createdAt: -1 })
          .limit(safeLimit(limit, 20))
          .populate('user', 'username email')
          .lean();

        // Filter items & compute seller-specific totals per order
        const sellerOrders = orders.map(o => {
          const sellerItems = (o.orderItems || []).filter(i =>
            productIds.some(pid => pid.toString() === (i.productId?._id || i.productId)?.toString())
          );
          const sellerTotal = sellerItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
          return {
            orderId: o.orderId,
            status: o.orderStatus,
            buyer: o.user?.username || o.guestEmail || 'Guest',
            total: sellerTotal,
            itemCount: sellerItems.length,
            date: o.createdAt,
            paymentMethod: o.paymentMethod,
            isPaid: o.isPaid,
          };
        });

        return {
          success: true,
          data: { orders: sellerOrders, count: sellerOrders.length, totalCount },
          message: `You have ${totalCount} total order${totalCount !== 1 ? 's' : ''}${status ? ` with status "${status}"` : ''} for your store (showing ${sellerOrders.length}).`,
        };
      }

      case 'update_order_status': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { orderId, status: newStatus } = args;
        if (!orderId || !newStatus) return { success: false, error: 'Please provide orderId and new status.' };

        const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
        if (!validStatuses.includes(newStatus)) {
          return { success: false, error: `Invalid status. Valid: ${validStatuses.join(', ')}` };
        }

        // Verify seller owns products in this order
        const myProducts = await Product.find({ seller: userId }).select('_id').lean();
        const productIds = myProducts.map(p => p._id.toString());

        const order = await Order.findOne({
          $or: [{ _id: toId(orderId) }, { orderId: orderId }],
        });
        if (!order) return { success: false, error: 'Order not found.' };

        const ownsItems = order.orderItems.some(i => productIds.includes(i.productId?.toString()));
        if (!ownsItems) return { success: false, error: 'This order doesn\'t contain your products.' };

        order.orderStatus = newStatus;
        if (newStatus === 'delivered') {
          order.isDelivered = true;
          order.deliveredAt = new Date();
        }
        await order.save();

        return { success: true, message: `Order #${order.orderId} status updated to "${newStatus}" ✅` };
      }

      case 'get_my_store': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const store = await Store.findOne({ seller: userId }).lean();
        if (!store) return { success: false, error: 'You don\'t have a store yet.' };

        const productCount = await Product.countDocuments({ seller: userId });
        return {
          success: true,
          data: {
            storeName: store.storeName,
            slug: store.storeSlug,
            description: store.description,
            sellerType: store.sellerType,
            logo: store.logo,
            banner: store.banner,
            isActive: store.isActive,
            views: store.views,
            trustCount: store.trustCount,
            verification: store.verification,
            socialLinks: store.socialLinks,
            returnPolicy: store.returnPolicy,
            productCount,
            createdAt: store.createdAt,
          },
          message: `Your store "${store.storeName}" — ${store.verification?.isVerified ? 'verified ✓' : 'not verified'} — ${productCount} products, ${store.views} views.`,
        };
      }

      case 'update_store': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const updates = { ...args };
        delete updates.seller;
        delete updates.verification;
        delete updates.storeSlug; // subdomain changes go through a separate flow with payment/cooldown

        const existing = await Store.findOne({ seller: userId });
        if (!existing) return { success: false, error: 'Store not found.' };

        if (existing.isActive === false) {
          return { success: false, error: 'Your store is blocked. Reactivate your subscription before changing store details.' };
        }

        // Enforce cooldowns: storeName 7d, sellerType 30d
        const COOLDOWN_DAYS = { storeName: 7, sellerType: 30 };
        const FIELD_LABELS = { storeName: 'name', sellerType: 'type' };
        const checkCd = (field, lastAt) => {
          if (!lastAt) return null;
          const nextAt = new Date(new Date(lastAt).getTime() + COOLDOWN_DAYS[field] * 86400000);
          const now = new Date();
          if (now >= nextAt) return null;
          return Math.max(1, Math.ceil((nextAt - now) / 86400000));
        };

        // Validate & detect changes
        if (updates.storeName !== undefined) {
          const name = String(updates.storeName).trim();
          if (name.length < 3 || name.length > 50) {
            return { success: false, error: 'Store name must be 3–50 characters.' };
          }
          if (name.toLowerCase() === existing.storeName.toLowerCase()) {
            delete updates.storeName;
          } else {
            const days = checkCd('storeName', existing.lastNameChangeAt);
            if (days) return { success: false, error: `You can change your store ${FIELD_LABELS.storeName} again in ${days} day(s). Store names can only be changed once every 7 days.` };
            const dup = await Store.findOne({ storeName: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: existing._id } }).select('_id').lean();
            if (dup) return { success: false, error: 'A store with this name already exists.' };
            updates.storeName = name;
            updates.lastNameChangeAt = new Date();
          }
        }

        if (updates.sellerType !== undefined) {
          if (!['store', 'brand'].includes(updates.sellerType)) {
            delete updates.sellerType;
          } else if (updates.sellerType === (existing.sellerType || 'store')) {
            delete updates.sellerType;
          } else {
            const days = checkCd('sellerType', existing.lastTypeChangeAt);
            if (days) return { success: false, error: `You can change your store ${FIELD_LABELS.sellerType} again in ${days} day(s).` };
            updates.lastTypeChangeAt = new Date();
          }
        }

        if (Object.keys(updates).length === 0) {
          return { success: false, error: 'No changes to apply.' };
        }

        const store = await Store.findOneAndUpdate(
          { seller: userId },
          { $set: updates },
          { new: true, runValidators: true }
        ).select('storeName description').lean();

        return { success: true, message: `Store "${store.storeName}" updated successfully! 🏪`, data: { updatedFields: Object.keys(updates).filter(k => !k.startsWith('last')) } };
      }

      case 'get_store_analytics': {
        // Alias — same as get_seller_analytics
        return executeToolCall('get_seller_analytics', args, user);
      }

      case 'apply_for_verification': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const store = await Store.findOne({ seller: userId });
        if (!store) return { success: false, error: 'Create a store first.' };

        if (store.verification?.isVerified) return { success: false, error: 'Your store is already verified! 🎉' };
        if (store.verification?.status === 'pending') return { success: false, error: 'Verification already pending — we\'re reviewing it.' };

        store.verification = {
          ...store.verification,
          status: 'pending',
          appliedAt: new Date(),
          applicationMessage: args.message || '',
          contactEmail: args.contactEmail || '',
          contactPhone: args.contactPhone || '',
        };
        await store.save();

        return { success: true, message: 'Verification application submitted! We\'ll review it soon. 🛡️' };
      }

      case 'get_shipping_methods': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const shipping = await ShippingMethod.findOne({ seller: userId }).lean();
        return {
          success: true,
          data: { methods: shipping?.methods || [] },
          message: shipping?.methods?.length
            ? `You have ${shipping.methods.length} shipping method(s) configured.`
            : 'No shipping methods configured yet.',
        };
      }

      case 'update_shipping': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { method, cost, deliveryDays, isActive } = args;
        if (!method) return { success: false, error: 'Please specify a shipping method type (free, standard, fast).' };

        let shipping = await ShippingMethod.findOne({ seller: userId });
        if (!shipping) {
          shipping = new ShippingMethod({ seller: userId, methods: [] });
        }

        const existing = shipping.methods.find(m => m.type === method);
        if (existing) {
          if (cost != null) existing.cost = Number(cost);
          if (deliveryDays != null) existing.deliveryDays = Number(deliveryDays);
          if (isActive != null) existing.isActive = isActive;
        } else {
          shipping.methods.push({
            type: method,
            cost: Number(cost) || 0,
            deliveryDays: Number(deliveryDays) || 3,
            isActive: isActive !== false,
          });
        }
        await shipping.save();

        return { success: true, message: `Shipping method "${method}" updated! 🚚` };
      }

      case 'create_coupon': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const c = args.coupon || args;
        if (!c.code || !c.discountType || !c.discountValue || !c.expiryDate) {
          return { success: false, error: 'Please provide: code, discountType (percentage/fixed), discountValue, expiryDate.' };
        }

        const coupon = await Coupon.create({
          seller: userId,
          code: c.code.toUpperCase().trim(),
          discountType: c.discountType,
          discountValue: Number(c.discountValue),
          applicableTo: c.applicableTo || 'all',
          applicableProducts: c.applicableProducts || [],
          maxUses: c.maxUses || null,
          maxUsesPerUser: c.maxUsesPerUser || 1,
          minOrderAmount: c.minOrderAmount || 0,
          maxDiscountAmount: c.maxDiscountAmount || null,
          expiryDate: new Date(c.expiryDate),
          description: c.description || '',
        });

        return {
          success: true,
          data: { couponId: coupon._id, code: coupon.code },
          message: `Coupon "${coupon.code}" created — ${coupon.discountType === 'percentage' ? coupon.discountValue + '%' : '$' + coupon.discountValue} off! 🎟️`,
        };
      }

      case 'get_my_coupons': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const coupons = await Coupon.find({ seller: userId }).sort({ createdAt: -1 }).lean();

        return {
          success: true,
          data: {
            coupons: coupons.map(c => ({
              _id: c._id,
              code: c.code,
              type: c.discountType,
              value: c.discountValue,
              isActive: c.isActive,
              usedCount: c.usedCount,
              maxUses: c.maxUses,
              expires: c.expiryDate,
            })),
            count: coupons.length,
          },
          message: `You have ${coupons.length} coupon${coupons.length !== 1 ? 's' : ''}.`,
        };
      }

      case 'update_coupon': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { couponId, ...updates } = args;
        if (!couponId) return { success: false, error: 'Please specify couponId.' };

        const coupon = await Coupon.findOneAndUpdate(
          { _id: toId(couponId), seller: userId },
          { $set: updates },
          { new: true }
        ).lean();

        if (!coupon) return { success: false, error: 'Coupon not found or you don\'t own it.' };
        return { success: true, message: `Coupon "${coupon.code}" updated.` };
      }

      case 'delete_coupon': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { couponId } = args;
        if (!couponId) return { success: false, error: 'Please specify couponId.' };

        const coupon = await Coupon.findOneAndDelete({ _id: toId(couponId), seller: userId });
        if (!coupon) return { success: false, error: 'Coupon not found or you don\'t own it.' };
        return { success: true, message: `Coupon "${coupon.code}" deleted. 🗑️` };
      }

      case 'toggle_coupon': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { couponId } = args;
        if (!couponId) return { success: false, error: 'Please specify couponId.' };

        const coupon = await Coupon.findOne({ _id: toId(couponId), seller: userId });
        if (!coupon) return { success: false, error: 'Coupon not found or you don\'t own it.' };

        coupon.isActive = !coupon.isActive;
        await coupon.save();
        return { success: true, message: `Coupon "${coupon.code}" is now ${coupon.isActive ? 'active ✅' : 'inactive ⏸️'}.` };
      }

      case 'get_subscription_status': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const sub = await SellerSubscription.findOne({ seller: userId }).lean();
        if (!sub) return { success: true, data: null, message: 'No subscription found.' };

        return {
          success: true,
          data: {
            status: sub.status,
            plan: sub.plan,
            planName: sub.planName,
            trialDaysRemaining: sub.trialDaysRemaining,
            bonusFeaturesActive: sub.bonusFeaturesActive,
            currentPeriodEnd: sub.currentPeriodEnd,
          },
          message: `Your subscription: ${sub.planName} (${sub.status}). ${sub.status === 'trial' ? `Trial ends in ${sub.trialDaysRemaining} days.` : ''}`,
        };
      }

      // ─────────────────────────────────────────────
      //  ADMIN TOOLS
      // ─────────────────────────────────────────────

      case 'get_all_users': {
        const { search, role: filterRole, page, limit } = args;
        const filter = {};
        if (search) {
          filter.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ];
        }
        if (filterRole) filter.role = filterRole;

        const skip = (safePage(page) - 1) * safeLimit(limit, 20);
        const [users, total] = await Promise.all([
          User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit(limit, 20))
            .select('username email role status createdAt')
            .lean(),
          User.countDocuments(filter),
        ]);

        return {
          success: true,
          data: { users, total, page: safePage(page) },
          message: `Found ${total} user${total !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}${filterRole ? ` with role "${filterRole}"` : ''}. Showing ${users.length}.`,
        };
      }

      case 'delete_user': {
        const { userId: targetId } = args;
        if (!targetId) return { success: false, error: 'Please provide userId.' };

        const target = await User.findById(toId(targetId)).select('username role').lean();
        if (!target) return { success: false, error: 'User not found.' };
        if (target.role === 'admin') return { success: false, error: 'Cannot delete an admin user.' };

        // Clean up related data
        await Promise.all([
          Order.deleteMany({ user: targetId }),
          Complaint.deleteMany({ user: targetId }),
          Notification.deleteMany({ user: targetId }),
          Store.findOneAndDelete({ seller: targetId }),
          Product.deleteMany({ seller: targetId }),
          SellerSubscription.findOneAndDelete({ seller: targetId }),
          User.findByIdAndDelete(targetId),
        ]);

        return { success: true, message: `User "${target.username}" and all their data have been permanently deleted. ⚠️` };
      }

      case 'block_user': {
        const { userId: targetId, blocked } = args;
        if (!targetId) return { success: false, error: 'Please provide userId.' };

        const newStatus = blocked !== false ? 'blocked' : 'active';
        const target = await User.findByIdAndUpdate(
          toId(targetId),
          { $set: { status: newStatus } },
          { new: true }
        ).select('username status').lean();

        if (!target) return { success: false, error: 'User not found.' };
        return { success: true, message: `User "${target.username}" is now ${target.status}. ${target.status === 'blocked' ? '🚫' : '✅'}` };
      }

      case 'change_user_role': {
        const { userId: targetId, newRole } = args;
        if (!targetId || !newRole) return { success: false, error: 'Please provide userId and newRole.' };
        if (!['user', 'seller', 'admin'].includes(newRole)) {
          return { success: false, error: 'Invalid role. Must be: user, seller, or admin.' };
        }

        const target = await User.findByIdAndUpdate(
          toId(targetId),
          { $set: { role: newRole } },
          { new: true }
        ).select('username role').lean();

        if (!target) return { success: false, error: 'User not found.' };
        return { success: true, message: `User "${target.username}" role changed to "${newRole}".` };
      }

      case 'get_admin_analytics': {
        const { period } = args;
        let dateFilter = {};
        const now = new Date();
        if (period === 'today') dateFilter = { createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } };
        else if (period === 'week') dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        else if (period === 'month') dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };

        const [
          totalUsers, totalSellers, totalAdmins,
          totalOrders, totalProducts, totalStores,
          pendingVerifications, openComplaints,
          periodOrders,
        ] = await Promise.all([
          User.countDocuments({ role: 'user' }),
          User.countDocuments({ role: 'seller' }),
          User.countDocuments({ role: 'admin' }),
          Order.countDocuments(),
          Product.countDocuments(),
          Store.countDocuments(),
          Store.countDocuments({ 'verification.status': 'pending' }),
          Complaint.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
          dateFilter.createdAt ? Order.countDocuments(dateFilter) : Promise.resolve(null),
        ]);

        const revenueAgg = await Order.aggregate([
          { $match: { orderStatus: { $ne: 'cancelled' } } },
          { $group: { _id: null, total: { $sum: '$orderSummary.totalAmount' } } },
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        return {
          success: true,
          data: {
            users: { total: totalUsers + totalSellers + totalAdmins, customers: totalUsers, sellers: totalSellers, admins: totalAdmins },
            orders: { total: totalOrders, ...(periodOrders != null ? { inPeriod: periodOrders } : {}) },
            revenue: Math.round(totalRevenue * 100) / 100,
            products: totalProducts,
            stores: totalStores,
            pendingVerifications,
            openComplaints,
          },
          message: `📊 Platform: ${totalUsers + totalSellers + totalAdmins} users, ${totalOrders} orders, $${Math.round(totalRevenue)} revenue, ${totalProducts} products, ${totalStores} stores, ${pendingVerifications} pending verifications, ${openComplaints} open complaints.`,
        };
      }

      case 'get_all_orders': {
        const { status, limit, page } = args;
        const filter = {};
        if (status && status !== 'all') filter.orderStatus = status;

        const skip = (safePage(page) - 1) * safeLimit(limit, 20);
        const [orders, total] = await Promise.all([
          Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit(limit, 20))
            .populate('user', 'username email')
            .lean(),
          Order.countDocuments(filter),
        ]);

        return {
          success: true,
          data: {
            orders: orders.map(o => ({
              orderId: o.orderId,
              status: o.orderStatus,
              buyer: o.user?.username || o.guestEmail || 'Guest',
              total: o.orderSummary?.totalAmount || 0,
              items: o.orderItems?.length || 0,
              date: o.createdAt,
              isPaid: o.isPaid,
            })),
            total,
            page: safePage(page),
          },
          message: `${total} order${total !== 1 ? 's' : ''}${status ? ` (${status})` : ''} — showing ${orders.length}.`,
        };
      }

      case 'get_all_complaints': {
        const { status, category: cat, page, limit } = args;
        const filter = {};
        if (status) filter.status = status;
        if (cat) filter.category = cat;

        const skip = (safePage(page) - 1) * safeLimit(limit, 20);
        const [complaints, total] = await Promise.all([
          Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit(limit, 20))
            .populate('user', 'username email')
            .lean(),
          Complaint.countDocuments(filter),
        ]);

        return {
          success: true,
          data: {
            complaints: complaints.map(c => ({
              _id: c._id,
              subject: c.subject,
              category: c.category,
              status: c.status,
              priority: c.priority,
              user: c.user?.username || 'Unknown',
              date: c.createdAt,
            })),
            total,
          },
          message: `${total} complaint${total !== 1 ? 's' : ''}${status ? ` (${status})` : ''}.`,
        };
      }

      case 'update_complaint': {
        const { complaintId, status: newStatus, response: adminResp } = args;
        if (!complaintId) return { success: false, error: 'Please provide complaintId.' };

        const update = {};
        if (newStatus) update.status = newStatus;
        if (adminResp) update.adminResponse = adminResp;

        const complaint = await Complaint.findByIdAndUpdate(
          toId(complaintId),
          { $set: update },
          { new: true }
        ).lean();

        if (!complaint) return { success: false, error: 'Complaint not found.' };
        return { success: true, message: `Complaint "${complaint.subject}" updated to "${complaint.status}". ${adminResp ? 'Response sent.' : ''}` };
      }

      case 'get_pending_verifications': {
        const stores = await Store.find({ 'verification.status': 'pending' })
          .populate('seller', 'username email')
          .lean();

        return {
          success: true,
          data: {
            stores: stores.map(s => ({
              _id: s._id,
              storeName: s.storeName,
              slug: s.storeSlug,
              seller: s.seller?.username || 'Unknown',
              sellerEmail: s.seller?.email || '',
              appliedAt: s.verification?.appliedAt,
              message: s.verification?.applicationMessage || '',
            })),
            count: stores.length,
          },
          message: `${stores.length} store${stores.length !== 1 ? 's' : ''} pending verification.`,
        };
      }

      case 'approve_verification': {
        const { storeId } = args;
        if (!storeId) return { success: false, error: 'Please provide storeId.' };

        const store = await Store.findByIdAndUpdate(toId(storeId), {
          $set: {
            'verification.isVerified': true,
            'verification.status': 'approved',
            'verification.reviewedAt': new Date(),
            'verification.reviewedBy': userId,
          },
        }, { new: true }).select('storeName').lean();

        if (!store) return { success: false, error: 'Store not found.' };
        return { success: true, message: `Store "${store.storeName}" has been verified! ✅🛡️` };
      }

      case 'reject_verification': {
        const { storeId, reason } = args;
        if (!storeId) return { success: false, error: 'Please provide storeId.' };

        const store = await Store.findByIdAndUpdate(toId(storeId), {
          $set: {
            'verification.isVerified': false,
            'verification.status': 'rejected',
            'verification.reviewedAt': new Date(),
            'verification.reviewedBy': userId,
            'verification.rejectionReason': reason || 'Does not meet requirements.',
          },
        }, { new: true }).select('storeName').lean();

        if (!store) return { success: false, error: 'Store not found.' };
        return { success: true, message: `Store "${store.storeName}" verification rejected.${reason ? ` Reason: ${reason}` : ''}` };
      }

      case 'remove_verification': {
        const { storeId } = args;
        if (!storeId) return { success: false, error: 'Please provide storeId.' };

        const store = await Store.findByIdAndUpdate(toId(storeId), {
          $set: {
            'verification.isVerified': false,
            'verification.status': 'none',
            'verification.reviewedAt': new Date(),
            'verification.reviewedBy': userId,
          },
        }, { new: true }).select('storeName').lean();

        if (!store) return { success: false, error: 'Store not found.' };
        return { success: true, message: `Verification removed from store "${store.storeName}".` };
      }

      case 'get_all_stores': {
        const { search, limit, page } = args;
        const filter = {};
        if (search) {
          filter.$or = [
            { storeName: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ];
        }

        const skip = (safePage(page) - 1) * safeLimit(limit, 20);
        const [stores, total] = await Promise.all([
          Store.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit(limit, 20))
            .populate('seller', 'username email status')
            .lean(),
          Store.countDocuments(filter),
        ]);

        return {
          success: true,
          data: {
            stores: stores.map(s => ({
              _id: s._id,
              storeName: s.storeName,
              slug: s.storeSlug,
              seller: s.seller?.username || 'Unknown',
              sellerStatus: s.seller?.status || 'unknown',
              isVerified: s.verification?.isVerified || false,
              views: s.views,
              trustCount: s.trustCount,
            })),
            total,
          },
          message: `${total} store${total !== 1 ? 's' : ''} on the platform.`,
        };
      }

      case 'update_tax_config': {
        const { type, value, isActive } = args;
        const update = {};
        if (type) update.type = type;
        if (value != null) update.value = Number(value);
        if (isActive != null) update.isActive = isActive;
        update.updatedBy = userId;

        let config = await TaxConfig.findOneAndUpdate(
          { isActive: true },
          { $set: update },
          { new: true, upsert: true }
        ).lean();

        return {
          success: true,
          data: config,
          message: `Tax config updated: ${config.type === 'none' ? 'taxes disabled' : `${config.type} — ${config.type === 'percentage' ? config.value + '%' : '$' + config.value}`}.`,
        };
      }

      case 'get_tax_config': {
        const config = await TaxConfig.findOne({ isActive: true }).lean();
        if (!config) return { success: true, data: { type: 'none', value: 0 }, message: 'No tax configured.' };

        return {
          success: true,
          data: { type: config.type, value: config.value, isActive: config.isActive },
          message: `Tax: ${config.type === 'none' ? 'disabled' : `${config.type} — ${config.type === 'percentage' ? config.value + '%' : '$' + config.value}`}.`,
        };
      }

      case 'send_broadcast': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { title, body, category, audience, channels, scheduleType, linkTo } = args;
        if (!title || !body) return { success: false, error: 'Please provide title and body for the broadcast.' };

        const broadcast = await BroadcastJob.create({
          title,
          body,
          category: category || 'announcement',
          audience: audience || 'all_users',
          channels: channels || ['inapp', 'push'],
          scheduleType: scheduleType || 'immediate',
          nextRunAt: new Date(),
          linkTo: linkTo || '',
          createdBy: userId,
        });

        return {
          success: true,
          data: { broadcastId: broadcast._id },
          message: `Broadcast "${title}" created and ${scheduleType === 'immediate' ? 'will be sent now' : 'scheduled'}! 📣`,
        };
      }

      case 'get_broadcasts': {
        const broadcasts = await BroadcastJob.find()
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();

        return {
          success: true,
          data: {
            broadcasts: broadcasts.map(b => ({
              _id: b._id,
              title: b.title,
              status: b.status,
              audience: b.audience,
              channels: b.channels,
              recipients: b.stats?.recipients || 0,
              date: b.createdAt,
            })),
            count: broadcasts.length,
          },
          message: `${broadcasts.length} broadcast${broadcasts.length !== 1 ? 's' : ''}.`,
        };
      }

      case 'cancel_broadcast': {
        const { broadcastId } = args;
        if (!broadcastId) return { success: false, error: 'Please provide broadcastId.' };

        const broadcast = await BroadcastJob.findByIdAndUpdate(
          toId(broadcastId),
          { $set: { status: 'cancelled' } },
          { new: true }
        ).lean();

        if (!broadcast) return { success: false, error: 'Broadcast not found.' };
        return { success: true, message: `Broadcast "${broadcast.title}" cancelled.` };
      }

      case 'get_all_subscriptions': {
        const { plan, status: subStatus, page, limit } = args;
        const filter = {};
        if (plan) filter.plan = plan;
        if (subStatus) filter.status = subStatus;

        const skip = (safePage(page) - 1) * safeLimit(limit, 20);
        const [subs, total] = await Promise.all([
          SellerSubscription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit(limit, 20))
            .populate('seller', 'username email')
            .lean(),
          SellerSubscription.countDocuments(filter),
        ]);

        return {
          success: true,
          data: {
            subscriptions: subs.map(s => ({
              seller: s.seller?.username || 'Unknown',
              plan: s.plan,
              planName: s.planName,
              status: s.status,
              subscribedAt: s.subscribedAt,
            })),
            total,
          },
          message: `${total} subscription${total !== 1 ? 's' : ''}${plan ? ` (${plan})` : ''}.`,
        };
      }

      case 'get_verified_stores': {
        const stores = await Store.find({ 'verification.isVerified': true })
          .populate('seller', 'username')
          .select('storeName storeSlug views trustCount verification')
          .lean();

        return {
          success: true,
          data: {
            stores: stores.map(s => ({
              _id: s._id,
              storeName: s.storeName,
              slug: s.storeSlug,
              seller: s.seller?.username || 'Unknown',
              views: s.views,
              trustCount: s.trustCount,
            })),
            count: stores.length,
          },
          message: `${stores.length} verified store${stores.length !== 1 ? 's' : ''} on the platform.`,
        };
      }

      case 'get_store_details': {
        const { storeId, slug } = args;
        if (!storeId && !slug) return { success: false, error: 'Please provide storeId or slug.' };

        const filter = storeId ? { _id: toId(storeId) } : { storeSlug: slug };
        const store = await Store.findOne(filter)
          .populate('seller', 'username email status role')
          .lean();

        if (!store) return { success: false, error: 'Store not found.' };

        const productCount = await Product.countDocuments({ seller: store.seller?._id });
        const orderCount = await Order.countDocuments({
          'orderItems.productId': {
            $in: (await Product.find({ seller: store.seller?._id }).select('_id').lean()).map(p => p._id),
          },
        });

        return {
          success: true,
          data: {
            storeName: store.storeName,
            slug: store.storeSlug,
            description: store.description,
            seller: store.seller?.username,
            sellerEmail: store.seller?.email,
            sellerStatus: store.seller?.status,
            isVerified: store.verification?.isVerified || false,
            verificationStatus: store.verification?.status || 'none',
            views: store.views,
            trustCount: store.trustCount,
            productCount,
            orderCount,
            createdAt: store.createdAt,
          },
          message: `Store "${store.storeName}" — ${productCount} products, ${orderCount} orders, ${store.views} views.`,
        };
      }

      case 'search_stores': {
        const { query, limit } = args;
        if (!query) return { success: false, error: 'Please provide a search query.' };

        const stores = await Store.find({
          $or: [
            { storeName: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
          ],
        })
          .limit(safeLimit(limit, 10))
          .select('storeName storeSlug views trustCount verification.isVerified')
          .lean();

        return {
          success: true,
          data: { stores, count: stores.length },
          message: `Found ${stores.length} store${stores.length !== 1 ? 's' : ''} matching "${query}".`,
        };
      }

      // ─── Unknown tool ───
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`[aiActionExecutor] Error executing ${toolName}:`, err.message);
    return { success: false, error: `Failed to execute ${toolName}: ${err.message}` };
  }
}

module.exports = { executeToolCall, isClientSideTool, CLIENT_SIDE_TOOLS };
