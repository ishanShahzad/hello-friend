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

const STORE_CHANGE_COOLDOWN_DAYS = { storeName: 7, storeSlug: 30, sellerType: 30 };
const STORE_FIELD_LABELS = { storeName: 'store name', storeSlug: 'subdomain', sellerType: 'store type' };
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'app', 'mail', 'ftp', 'shop', 'store', 'blog', 'docs', 'help', 'cdn', 'static', 'support']);

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cooldownStatus(field, lastAt) {
  const cooldownDays = STORE_CHANGE_COOLDOWN_DAYS[field];
  if (!cooldownDays) return { canChange: true, cooldownDays };
  if (!lastAt) return { canChange: true, cooldownDays, lastChangedAt: null, nextAllowedAt: null, daysRemaining: 0 };

  const lastChangedAt = new Date(lastAt);
  const nextAllowedAt = new Date(lastChangedAt.getTime() + cooldownDays * 86400000);
  const now = new Date();
  if (now >= nextAllowedAt) {
    return {
      canChange: true,
      cooldownDays,
      lastChangedAt: lastChangedAt.toISOString(),
      nextAllowedAt: nextAllowedAt.toISOString(),
      daysRemaining: 0,
    };
  }

  return {
    canChange: false,
    cooldownDays,
    lastChangedAt: lastChangedAt.toISOString(),
    nextAllowedAt: nextAllowedAt.toISOString(),
    daysRemaining: Math.max(1, Math.ceil((nextAllowedAt - now) / 86400000)),
  };
}

function storeChangeLimits(store) {
  return {
    storeName: cooldownStatus('storeName', store?.lastNameChangeAt),
    subdomain: cooldownStatus('storeSlug', store?.lastSlugChangeAt),
    sellerType: cooldownStatus('sellerType', store?.lastTypeChangeAt),
  };
}

function sanitizeSubdomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\.rozare\.com$/i, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isPlaceholderValue(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return false;
  return [
    'your new store name',
    'new store name',
    'store name',
    'your store name',
    'your new subdomain',
    'new subdomain',
    'subdomain',
    'your-new-store-name',
    'new-store-name',
    'your-new-subdomain',
    'new-subdomain',
    'example',
    'example-store',
  ].includes(v);
}

function cleanString(value) {
  return String(value ?? '').trim();
}

const COMMON_COLOR_WORDS = new Set([
  'black', 'white', 'red', 'yellow', 'blue', 'green', 'orange', 'purple',
  'pink', 'brown', 'gray', 'grey', 'silver', 'gold', 'golden', 'navy',
  'maroon', 'beige', 'cream', 'ivory', 'teal', 'cyan', 'magenta', 'violet',
  'indigo', 'lime', 'olive', 'tan', 'coral', 'turquoise',
]);
const COLOR_SHADE_WORDS = new Set(['light', 'dark', 'navy', 'baby', 'sky', 'royal', 'hot', 'forest']);

function splitDelimitedString(value, { splitSpacesForColors = false } = {}) {
  const raw = cleanString(value);
  if (!raw) return [];
  if (/[,\n;|/]/.test(raw)) {
    return raw.split(/[,\n;|/]+/).map(cleanString).filter(Boolean);
  }
  if (splitSpacesForColors) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every(w => COMMON_COLOR_WORDS.has(w.toLowerCase()))) {
      if (words.length === 2 && COLOR_SHADE_WORDS.has(words[0].toLowerCase())) return [raw];
      return words;
    }
  }
  return [raw];
}

function normalizeStringArray(value, options = {}) {
  const values = Array.isArray(value) ? value.flatMap(v => splitDelimitedString(v, options)) : splitDelimitedString(value, options);
  const seen = new Set();
  return values
    .map(v => cleanString(v).replace(/^#/, ''))
    .filter(v => v && v.length <= 50)
    .filter(v => {
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeTags(value, fallbackSource = {}) {
  const provided = normalizeStringArray(value);
  if (provided.length) return provided.slice(0, 12);

  const seed = [
    fallbackSource.brand,
    fallbackSource.category,
    fallbackSource.name,
    fallbackSource.description,
    ...(fallbackSource.colors || []),
  ].filter(Boolean).join(' ');
  const words = seed
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && w.length <= 24);
  const blocked = new Set(['this', 'that', 'with', 'from', 'best', 'your', 'product', 'available']);
  const tags = [];
  for (const word of words) {
    if (blocked.has(word) || tags.includes(word)) continue;
    tags.push(word);
    if (tags.length >= 8) break;
  }
  if (/\bkid|child|toy|play\b/i.test(seed) && !tags.includes('kids')) tags.push('kids');
  return tags.slice(0, 12);
}

function normalizeImageList(value) {
  const candidates = [];
  const add = (entry) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      const urls = entry.match(/https?:\/\/\S+/g);
      if (urls?.length) candidates.push(...urls);
      else candidates.push(...splitDelimitedString(entry));
      return;
    }
    if (typeof entry === 'object') {
      add(entry.url || entry.image || entry.imageUrl || entry.src);
    }
  };
  if (Array.isArray(value)) value.forEach(add);
  else add(value);

  const seen = new Set();
  return candidates
    .map(cleanString)
    .filter(url => /^https?:\/\//i.test(url))
    .filter(url => {
      const key = url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(url => ({ url }));
}

function normalizeOptionGroups(value) {
  const rawGroups = Array.isArray(value)
    ? value
    : (value && typeof value === 'object'
      ? Object.entries(value).map(([name, values]) => ({ name, values }))
      : []);

  const seen = new Set();
  return rawGroups.map(group => {
    const name = cleanString(group?.name);
    const values = normalizeStringArray(group?.values);
    if (!name || values.length === 0) return null;
    const key = name.toLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    const defaultValue = cleanString(group?.default);
    return {
      name,
      values,
      default: values.includes(defaultValue) ? defaultValue : values[0],
    };
  }).filter(Boolean);
}

function addColorOptionGroup(optionGroups, colors) {
  if (!colors.length) return optionGroups;
  const hasColorGroup = optionGroups.some(group => group.name.toLowerCase() === 'color');
  if (hasColorGroup) return optionGroups;
  return [
    ...optionGroups,
    { name: 'Color', values: colors, default: colors[0] },
  ];
}

function buildProductImageFields(productInput) {
  const primaryImages = normalizeImageList(productInput.image || productInput.imageUrl);
  const primaryImage = primaryImages[0]?.url || '';
  const normalizedImages = normalizeImageList(productInput.images || productInput.imageUrls);
  const allImages = normalizeImageList([
    ...primaryImages,
    ...normalizedImages,
  ]);
  return {
    image: primaryImage || allImages[0]?.url || 'https://via.placeholder.com/400',
    images: allImages,
  };
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

      case 'send_product_image': {
        const { productId, caption } = args;
        if (!productId) return { success: false, error: 'Please provide a product ID.' };

        const product = await Product.findById(toId(productId))
          .select('name image images price discountedPrice stock')
          .lean();
        if (!product) return { success: false, error: 'Product not found.' };

        const imageUrl = product.image || product.images?.[0]?.url || product.images?.[0];
        if (!imageUrl) return { success: false, error: `No image is available for "${product.name}".` };

        return {
          success: true,
          data: {
            productId: product._id,
            name: product.name,
            imageUrl,
            caption: caption || product.name,
            price: product.discountedPrice || product.price,
            stock: product.stock,
          },
          message: `Image ready for "${product.name}".`,
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
        const targetSellerId = role === 'admin' ? toId(args.sellerId || args.seller) : userId;
        if (role === 'admin' && !targetSellerId) {
          return { success: false, error: 'Please provide sellerId so the product can be assigned to a seller.' };
        }
        const store = await Store.findOne({ seller: targetSellerId }).select('_id storeName').lean();
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
        const price = Number(p.price);
        const stock = p.stock != null ? Number(p.stock) : 0;
        const discountedPrice = p.discountedPrice ? Number(p.discountedPrice) : 0;
        if (!Number.isFinite(price) || price < 0) return { success: false, error: 'Product price must be a non-negative number.' };
        if (!Number.isFinite(stock) || stock < 0) return { success: false, error: 'Product stock must be a non-negative number.' };
        if (!Number.isFinite(discountedPrice) || discountedPrice < 0) return { success: false, error: 'Discounted price must be a non-negative number.' };
        if (discountedPrice > 0 && discountedPrice >= price) return { success: false, error: 'Discounted price must be lower than the product price.' };

        const confirmDuplicate = args.confirmDuplicate === true || p.confirmDuplicate === true;
        const duplicate = await Product.findOne({
          seller: targetSellerId,
          name: { $regex: `^${escapeRegExp(p.name)}$`, $options: 'i' },
          brand: { $regex: `^${escapeRegExp(p.brand)}$`, $options: 'i' },
        }).select('_id name brand price stock category createdAt').lean();

        if (duplicate && !confirmDuplicate) {
          return {
            success: false,
            blocked: true,
            requiresConfirmation: true,
            duplicate: true,
            error: `A product named "${duplicate.name}" by ${duplicate.brand} already exists in this store. I did not add another copy. Confirm if you intentionally want a duplicate listing.`,
            data: {
              existingProduct: {
                productId: duplicate._id,
                name: duplicate.name,
                brand: duplicate.brand,
                price: duplicate.price,
                stock: duplicate.stock,
                category: duplicate.category,
                createdAt: duplicate.createdAt,
              },
            },
          };
        }

        const colors = normalizeStringArray(p.colors || p.colorOptions, { splitSpacesForColors: true });
        const optionGroups = addColorOptionGroup(normalizeOptionGroups(p.optionGroups || p.options), colors);
        const { image, images } = buildProductImageFields(p);
        const tags = normalizeTags(p.tags, {
          name: p.name,
          brand: p.brand,
          category: p.category,
          description: p.description,
          colors,
        });

        const product = await Product.create({
          name: cleanString(p.name),
          description: cleanString(p.description) || cleanString(p.name),
          price,
          discountedPrice,
          category: cleanString(p.category),
          brand: cleanString(p.brand),
          stock,
          image,
          images,
          tags,
          colors,
          optionGroups,
          ...(Object.keys(pickObject(p.returnPolicy)).length ? { returnPolicy: p.returnPolicy } : {}),
          seller: targetSellerId,
        });

        return {
          success: true,
          data: {
            productId: product._id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            category: product.category,
            brand: product.brand,
            image: product.image,
            images: product.images,
            tags: product.tags,
            colors: product.colors,
            optionGroups: product.optionGroups,
            returnPolicy: product.returnPolicy,
          },
          message: `Product "${product.name}" added to your store "${store.storeName}" at $${product.price}! 🎉`,
        };
      }

      case 'edit_product': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productId, productName } = args;
        const incomingUpdates = Object.keys(pickObject(args.updates)).length ? args.updates : args;
        const allowedProductFields = ['name', 'description', 'price', 'discountedPrice', 'category', 'brand', 'stock', 'image', 'imageUrl', 'images', 'tags', 'colors', 'optionGroups', 'returnPolicy'];
        const updates = {};
        for (const field of allowedProductFields) {
          if (incomingUpdates[field] !== undefined) updates[field] = incomingUpdates[field];
        }
        if (!productId && !productName) return { success: false, error: 'Please specify which product to edit (productId or productName).' };
        if (Object.keys(updates).length === 0) return { success: false, error: 'No valid product fields were provided to update.' };
        for (const numericField of ['price', 'discountedPrice', 'stock']) {
          if (updates[numericField] !== undefined) {
            const numericValue = Number(updates[numericField]);
            if (!Number.isFinite(numericValue) || numericValue < 0) {
              return { success: false, error: `${numericField} must be a non-negative number.` };
            }
            updates[numericField] = numericValue;
          }
        }

        if (updates.images !== undefined || updates.image !== undefined || updates.imageUrl !== undefined) {
          const imageFields = buildProductImageFields({ ...updates, image: updates.image || updates.imageUrl });
          updates.image = imageFields.image;
          updates.images = imageFields.images;
          delete updates.imageUrl;
        }
        if (updates.tags !== undefined) updates.tags = normalizeTags(updates.tags);
        if (updates.colors !== undefined) updates.colors = normalizeStringArray(updates.colors, { splitSpacesForColors: true });
        if (updates.optionGroups !== undefined) updates.optionGroups = normalizeOptionGroups(updates.optionGroups);

        const safeProductId = toId(productId);
        const filter = role === 'admin' ? {} : { seller: userId };
        if (safeProductId) {
          filter._id = safeProductId;
        } else {
          filter.name = { $regex: `^${escapeRegExp(productName)}$`, $options: 'i' };
        }
        if (role === 'admin' && toId(args.sellerId || args.seller)) {
          filter.seller = toId(args.sellerId || args.seller);
        }

        if (updates.colors?.length) {
          if (updates.optionGroups !== undefined) {
            updates.optionGroups = addColorOptionGroup(updates.optionGroups, updates.colors);
          } else {
            const existingProduct = await Product.findOne(filter).select('optionGroups').lean();
            updates.optionGroups = addColorOptionGroup(existingProduct?.optionGroups || [], updates.colors);
          }
        }

        const product = await Product.findOneAndUpdate(
          filter,
          { $set: updates },
          { new: true, runValidators: true, sort: { updatedAt: -1, createdAt: -1 } }
        ).select('name price stock category brand image images tags colors optionGroups').lean();

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

        const product = await Product.findOneAndDelete(role === 'admin' ? { _id: toId(productId) } : { _id: toId(productId), seller: userId });
        if (!product) return { success: false, error: 'Product not found or you don\'t own it.' };
        return { success: true, message: `Product "${product.name}" has been permanently deleted. 🗑️` };
      }

      case 'list_my_products': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { search, category, limit, page, sortBy } = args;
        const filter = role === 'admin' ? {} : { seller: userId };
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
        const { productIds, category: cat } = args;
        const discountType = args.discountType || (args.discountPercent != null ? 'percentage' : 'percentage');
        const discountValue = args.discountValue != null ? Number(args.discountValue) : Number(args.discountPercent);
        if (!Number.isFinite(discountValue) || discountValue <= 0) return { success: false, error: 'Please specify a positive discount value.' };
        if (!['percentage', 'fixed'].includes(discountType)) return { success: false, error: 'Discount type must be percentage or fixed.' };
        if (discountType === 'percentage' && discountValue > 100) return { success: false, error: 'Percentage discounts cannot exceed 100%.' };

        const filter = role === 'admin' ? {} : { seller: userId };
        if (productIds?.length) filter._id = { $in: productIds.map(toId).filter(Boolean) };
        else if (cat) filter.category = { $regex: cat, $options: 'i' };

        const products = await Product.find(filter).select('price').lean();
        if (!products.length) return { success: false, error: 'No matching products found.' };

        const bulkOps = products.map(p => ({
          updateOne: {
            filter: { _id: p._id },
            update: {
              $set: {
                discountedPrice: discountType === 'percentage'
                  ? Math.round(p.price * (1 - discountValue / 100) * 100) / 100
                  : Math.max(0, Math.round((p.price - discountValue) * 100) / 100),
              },
            },
          },
        }));
        await Product.bulkWrite(bulkOps);

        return {
          success: true,
          message: `Applied ${discountType === 'percentage' ? `${discountValue}%` : `$${discountValue}`} discount to ${products.length} product${products.length !== 1 ? 's' : ''}!`,
        };
      }

      case 'bulk_price_update': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productIds, category: cat } = args;
        const updateType = args.updateType || (args.isPercent ? 'percentage' : 'fixed');
        const value = args.value != null ? Number(args.value) : Number(args.priceChange);
        if (!Number.isFinite(value)) return { success: false, error: 'Please specify a valid price update value.' };
        if (!['percentage', 'fixed', 'set'].includes(updateType)) return { success: false, error: 'Price update type must be percentage, fixed, or set.' };

        const filter = role === 'admin' ? {} : { seller: userId };
        if (productIds?.length) filter._id = { $in: productIds.map(toId).filter(Boolean) };
        else if (cat) filter.category = { $regex: cat, $options: 'i' };

        const products = await Product.find(filter).select('price').lean();
        if (!products.length) return { success: false, error: 'No matching products found.' };

        const bulkOps = products.map(p => {
          let newPrice;
          if (updateType === 'set') newPrice = value;
          else if (updateType === 'percentage') newPrice = p.price + (p.price * value / 100);
          else newPrice = p.price + value;
          newPrice = Math.max(0, Math.round(newPrice * 100) / 100);
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
          message: `Updated prices for ${products.length} product${products.length !== 1 ? 's' : ''} (${updateType}: ${value}).`,
        };
      }

      case 'remove_discount': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const { productIds, category: cat } = args;
        const filter = role === 'admin' ? {} : { seller: userId };
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
        const { orderId } = args;
        const newStatus = args.newStatus || args.status;
        if (!orderId || !newStatus) return { success: false, error: 'Please provide orderId and new status.' };

        const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
        if (!validStatuses.includes(newStatus)) {
          return { success: false, error: `Invalid status. Valid: ${validStatuses.join(', ')}` };
        }

        // Verify seller owns products in this order. Admins can update any order.
        const productIds = role === 'admin'
          ? []
          : (await Product.find({ seller: userId }).select('_id').lean()).map(p => p._id.toString());

        const order = await Order.findOne({
          $or: [{ _id: toId(orderId) }, { orderId: orderId }],
        });
        if (!order) return { success: false, error: 'Order not found.' };

        const ownsItems = role === 'admin' || order.orderItems.some(i => productIds.includes(i.productId?.toString()));
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
            changeLimits: storeChangeLimits(store),
            createdAt: store.createdAt,
          },
          message: `Your store "${store.storeName}" — ${store.verification?.isVerified ? 'verified ✓' : 'not verified'} — ${productCount} products, ${store.views} views.`,
        };
      }

      case 'update_store': {
        if (!userId) return { success: false, error: 'Authentication required.' };
        const normalizedRaw = Object.keys(pickObject(args.updates)).length ? { ...args.updates } : { ...args };
        const allowedStoreFields = ['storeName', 'storeSlug', 'description', 'logo', 'banner', 'socialLinks', 'address', 'returnPolicy', 'sellerType'];
        const normalizedUpdates = {};
        for (const field of allowedStoreFields) {
          if (normalizedRaw[field] !== undefined) normalizedUpdates[field] = normalizedRaw[field];
        }

        const existingStore = await Store.findOne({ seller: userId });
        if (!existingStore) return { success: false, error: 'Store not found.' };

        if (existingStore.isActive === false) {
          return { success: false, error: 'Your store is blocked. Reactivate your subscription before changing store details.' };
        }

        if (normalizedUpdates.storeName !== undefined) {
          const name = String(normalizedUpdates.storeName).trim();
          if (isPlaceholderValue(name)) {
            return { success: false, error: 'No store name was provided. Ask the seller what new store name they want before updating.' };
          }
          if (name.length < 3 || name.length > 50) {
            return { success: false, error: 'Store name must be 3-50 characters.' };
          }
          if (name.toLowerCase() === existingStore.storeName.toLowerCase()) {
            delete normalizedUpdates.storeName;
          } else {
            const cd = cooldownStatus('storeName', existingStore.lastNameChangeAt);
            if (!cd.canChange) {
              return {
                success: false,
                error: `You can change your ${STORE_FIELD_LABELS.storeName} again in ${cd.daysRemaining} day(s). Store names can only be changed once every 7 days.`,
                cooldown: cd,
              };
            }
            const duplicate = await Store.findOne({ storeName: { $regex: new RegExp(`^${escapeRegExp(name)}$`, 'i') }, _id: { $ne: existingStore._id } }).select('_id').lean();
            if (duplicate) return { success: false, error: 'A store with this name already exists.' };
            normalizedUpdates.storeName = name;
            normalizedUpdates.lastNameChangeAt = new Date();
          }
        }

        if (normalizedUpdates.storeSlug !== undefined) {
          const slug = sanitizeSubdomain(normalizedUpdates.storeSlug);
          if (isPlaceholderValue(slug)) {
            return { success: false, error: 'No subdomain was provided. Ask the seller what new subdomain they want before updating.' };
          }
          if (slug.length < 3 || slug.length > 63) {
            return { success: false, error: 'Subdomain must be 3-63 characters.' };
          }
          if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
            return { success: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.' };
          }
          if (RESERVED_SUBDOMAINS.has(slug)) {
            return { success: false, error: 'This subdomain is reserved by the system.' };
          }
          if (slug === existingStore.storeSlug) {
            delete normalizedUpdates.storeSlug;
          } else {
            const cd = cooldownStatus('storeSlug', existingStore.lastSlugChangeAt);
            if (!cd.canChange) {
              return {
                success: false,
                error: `You can change your ${STORE_FIELD_LABELS.storeSlug} again in ${cd.daysRemaining} day(s). Subdomains can only be changed once every 30 days.`,
                cooldown: cd,
              };
            }

            const hasPurchasedSubdomain = !!(existingStore.subdomainPurchase?.isPurchased && existingStore.subdomainPurchase?.expiresAt && new Date(existingStore.subdomainPurchase.expiresAt) > new Date());
            if (hasPurchasedSubdomain && normalizedRaw.confirmSubdomainChange !== true) {
              return {
                success: false,
                requiresConfirmation: true,
                error: `You have purchased "${existingStore.storeSlug}.rozare.com". Changing it will forfeit ownership of the old subdomain. Ask the seller to confirm before proceeding.`,
                currentSubdomain: existingStore.storeSlug,
                newSubdomain: slug,
              };
            }

            const duplicate = await Store.findOne({ storeSlug: slug, _id: { $ne: existingStore._id } }).select('_id').lean();
            if (duplicate) return { success: false, error: 'This subdomain is already taken by another store.' };
            normalizedUpdates.storeSlug = slug;
            normalizedUpdates.lastSlugChangeAt = new Date();
            if (hasPurchasedSubdomain) {
              normalizedUpdates.subdomainPurchase = {
                isPurchased: false,
                purchasedAt: null,
                expiresAt: null,
                stripePaymentId: '',
                removalScheduledAt: null,
              };
            }
          }
        }

        if (normalizedUpdates.sellerType !== undefined) {
          if (!['store', 'brand'].includes(normalizedUpdates.sellerType)) {
            delete normalizedUpdates.sellerType;
          } else if (normalizedUpdates.sellerType === (existingStore.sellerType || 'store')) {
            delete normalizedUpdates.sellerType;
          } else {
            const cd = cooldownStatus('sellerType', existingStore.lastTypeChangeAt);
            if (!cd.canChange) {
              return { success: false, error: `You can change your ${STORE_FIELD_LABELS.sellerType} again in ${cd.daysRemaining} day(s).`, cooldown: cd };
            }
            normalizedUpdates.lastTypeChangeAt = new Date();
          }
        }

        if (Object.keys(normalizedUpdates).length === 0) {
          return { success: false, error: 'No changes to apply.' };
        }

        const updatedStore = await Store.findOneAndUpdate(
          { seller: userId },
          { $set: normalizedUpdates },
          { new: true, runValidators: true }
        ).select('storeName storeSlug description lastNameChangeAt lastSlugChangeAt lastTypeChangeAt').lean();

        return {
          success: true,
          message: `Store "${updatedStore.storeName}" updated successfully.`,
          data: {
            storeName: updatedStore.storeName,
            slug: updatedStore.storeSlug,
            updatedFields: Object.keys(normalizedUpdates).filter(k => !k.startsWith('last')),
            changeLimits: storeChangeLimits(updatedStore),
          },
        };
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
        const shippingUpdates = Object.keys(pickObject(args.updates)).length ? args.updates : args;
        let { method, cost, deliveryDays, isActive } = shippingUpdates;
        if (!method && args.methodId) method = args.methodId;
        if (!method) return { success: false, error: 'Please specify a shipping method type (free, standard, fast).' };
        if (!['free', 'standard', 'fast'].includes(method)) return { success: false, error: 'Shipping method must be free, standard, or fast.' };

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
        if (!['percentage', 'fixed'].includes(c.discountType)) {
          return { success: false, error: 'Coupon discountType must be percentage or fixed.' };
        }
        const discountValue = Number(c.discountValue);
        if (!Number.isFinite(discountValue) || discountValue <= 0) {
          return { success: false, error: 'Coupon discountValue must be a positive number.' };
        }
        if (c.discountType === 'percentage' && discountValue > 100) {
          return { success: false, error: 'Percentage coupon discounts cannot exceed 100%.' };
        }
        const expiryDate = new Date(c.expiryDate);
        if (Number.isNaN(expiryDate.getTime())) return { success: false, error: 'Coupon expiryDate is invalid.' };
        if (expiryDate <= new Date()) return { success: false, error: 'Coupon expiryDate must be in the future.' };
        const code = String(c.code).toUpperCase().trim();
        const duplicate = await Coupon.findOne({ seller: userId, code }).select('_id').lean();
        if (duplicate) return { success: false, error: `Coupon "${code}" already exists for your store.` };

        const coupon = await Coupon.create({
          seller: userId,
          code,
          discountType: c.discountType,
          discountValue,
          applicableTo: c.applicableTo || 'all',
          applicableProducts: c.applicableProducts || [],
          maxUses: c.maxUses || null,
          maxUsesPerUser: c.maxUsesPerUser || 1,
          minOrderAmount: c.minOrderAmount || 0,
          maxDiscountAmount: c.maxDiscountAmount || null,
          expiryDate,
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
        const { couponId } = args;
        const incomingUpdates = Object.keys(pickObject(args.updates)).length ? args.updates : args;
        const allowedCouponFields = ['discountType', 'discountValue', 'applicableTo', 'applicableProducts', 'maxUses', 'maxUsesPerUser', 'minOrderAmount', 'maxDiscountAmount', 'startDate', 'expiryDate', 'isActive', 'description'];
        const updates = {};
        for (const field of allowedCouponFields) {
          if (incomingUpdates[field] !== undefined) updates[field] = incomingUpdates[field];
        }
        if (!couponId) return { success: false, error: 'Please specify couponId.' };
        if (Object.keys(updates).length === 0) return { success: false, error: 'No valid coupon fields were provided to update.' };
        if (updates.discountType && !['percentage', 'fixed'].includes(updates.discountType)) {
          return { success: false, error: 'Coupon discountType must be percentage or fixed.' };
        }
        for (const numericField of ['discountValue', 'maxUses', 'maxUsesPerUser', 'minOrderAmount', 'maxDiscountAmount']) {
          if (updates[numericField] !== undefined && updates[numericField] !== null) {
            const numericValue = Number(updates[numericField]);
            if (!Number.isFinite(numericValue) || numericValue < 0) {
              return { success: false, error: `${numericField} must be a non-negative number.` };
            }
            updates[numericField] = numericValue;
          }
        }
        if (updates.discountType === 'percentage' && updates.discountValue > 100) {
          return { success: false, error: 'Percentage coupon discounts cannot exceed 100%.' };
        }
        if (updates.expiryDate !== undefined) {
          const expiryDate = new Date(updates.expiryDate);
          if (Number.isNaN(expiryDate.getTime())) return { success: false, error: 'Coupon expiryDate is invalid.' };
          updates.expiryDate = expiryDate;
        }

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
        const { search, role: filterRole, status, page, limit } = args;
        const filter = {};
        if (search) {
          filter.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ];
        }
        if (filterRole) filter.role = filterRole;
        if (status) filter.status = status;

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
          message: `Found ${total} user${total !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}${filterRole ? ` with role "${filterRole}"` : ''}${status ? ` with status "${status}"` : ''}. Showing ${users.length}.`,
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
        const { complaintId, status: newStatus, priority } = args;
        const adminResp = args.adminResponse || args.response;
        if (!complaintId) return { success: false, error: 'Please provide complaintId.' };

        const update = {};
        if (newStatus) update.status = newStatus;
        if (priority) update.priority = priority;
        if (adminResp) update.adminResponse = adminResp;
        if (Object.keys(update).length === 0) return { success: false, error: 'No valid complaint updates were provided.' };

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
        if (type) {
          if (!['none', 'percentage', 'fixed'].includes(type)) {
            return { success: false, error: 'Tax type must be none, percentage, or fixed.' };
          }
          update.type = type;
        }
        if (value != null) {
          const numericValue = Number(value);
          if (!Number.isFinite(numericValue) || numericValue < 0) {
            return { success: false, error: 'Tax value must be a non-negative number.' };
          }
          if (type === 'percentage' && numericValue > 100) {
            return { success: false, error: 'Percentage tax cannot exceed 100%.' };
          }
          update.value = numericValue;
        }
        if (type === 'none') update.value = 0;
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
        const { title, category, channels, linkTo, recurrence, endsAt } = args;
        const body = args.body || args.message;
        if (!title || !body) return { success: false, error: 'Please provide title and body for the broadcast.' };
        const normalizedCategory = category || 'announcement';
        if (!['announcement', 'promo', 'order', 'system', 'seller'].includes(normalizedCategory)) {
          return { success: false, error: 'Broadcast category must be announcement, promo, order, system, or seller.' };
        }

        const validAudiences = ['all_users', 'all_sellers', 'both', 'specific'];
        const audienceInput = args.audience;
        const audienceTarget = typeof audienceInput === 'object' && audienceInput !== null
          ? audienceInput.target
          : audienceInput;
        const audienceMap = {
          all: 'both',
          users: 'all_users',
          sellers: 'all_sellers',
          custom: 'specific',
        };
        const audience = audienceMap[audienceTarget] || audienceTarget || 'all_users';
        const userIds = Array.isArray(args.userIds)
          ? args.userIds
          : Array.isArray(audienceInput?.userIds)
            ? audienceInput.userIds
            : [];
        if (!validAudiences.includes(audience)) {
          return { success: false, error: 'Audience must be all_users, all_sellers, both, or specific.' };
        }
        if (audience === 'specific' && userIds.length === 0) {
          return { success: false, error: 'Please provide userIds when sending a broadcast to a specific audience.' };
        }

        const validChannels = ['inapp', 'push', 'email', 'whatsapp'];
        const normalizedChannels = Array.isArray(channels) && channels.length ? channels : ['inapp', 'push'];
        if (normalizedChannels.some(ch => !validChannels.includes(ch))) {
          return { success: false, error: `Invalid broadcast channel. Valid channels: ${validChannels.join(', ')}.` };
        }

        let scheduleType = args.scheduleType || (args.scheduledAt ? 'one_time' : 'immediate');
        if (!['immediate', 'one_time', 'recurring'].includes(scheduleType)) {
          return { success: false, error: 'Schedule type must be immediate, one_time, or recurring.' };
        }
        let nextRunAt = new Date();
        if (scheduleType === 'one_time' || scheduleType === 'recurring') {
          if (!args.scheduledAt) return { success: false, error: 'scheduledAt is required for scheduled broadcasts.' };
          nextRunAt = new Date(args.scheduledAt);
          if (Number.isNaN(nextRunAt.getTime())) return { success: false, error: 'Invalid scheduledAt date.' };
        }

        const broadcast = await BroadcastJob.create({
          title,
          body,
          category: normalizedCategory,
          audience,
          userIds: audience === 'specific' ? userIds.map(toId).filter(Boolean) : [],
          channels: normalizedChannels,
          scheduleType,
          recurrence: scheduleType === 'recurring' ? (recurrence || 'daily') : 'none',
          nextRunAt,
          endsAt: endsAt ? new Date(endsAt) : null,
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
          .select('storeName storeSlug description views trustCount verification')
          .lean();

        return {
          success: true,
          data: {
            stores: stores.map(s => ({
              _id: s._id,
              storeName: s.storeName,
              slug: s.storeSlug,
              description: s.description,
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
        let orderCount;
        if (role === 'admin') {
          orderCount = await Order.countDocuments({
            'orderItems.productId': {
              $in: (await Product.find({ seller: store.seller?._id }).select('_id').lean()).map(p => p._id),
            },
          });
        }

        return {
          success: true,
          data: {
            storeName: store.storeName,
            slug: store.storeSlug,
            description: store.description,
            seller: store.seller?.username,
            isVerified: store.verification?.isVerified || false,
            views: store.views,
            trustCount: store.trustCount,
            productCount,
            createdAt: store.createdAt,
            ...(role === 'admin' ? {
              sellerEmail: store.seller?.email,
              sellerStatus: store.seller?.status,
              verificationStatus: store.verification?.status || 'none',
              orderCount,
            } : {}),
          },
          message: `Store "${store.storeName}" - ${productCount} products${role === 'admin' ? `, ${orderCount} orders` : ''}, ${store.views} views.`,
        };
      }

      case 'search_stores': {
        const { query, limit } = args;
        if (!query) return { success: false, error: 'Please provide a search query.' };
        const safeQuery = escapeRegExp(query);

        const stores = await Store.find({
          $or: [
            { storeName: { $regex: safeQuery, $options: 'i' } },
            { storeSlug: { $regex: safeQuery, $options: 'i' } },
            { description: { $regex: safeQuery, $options: 'i' } },
          ],
        })
          .limit(safeLimit(limit, 10))
          .select('storeName storeSlug description views trustCount verification.isVerified')
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

module.exports = { executeToolCall, isClientSideTool, CLIENT_SIDE_TOOLS, storeChangeLimits };
