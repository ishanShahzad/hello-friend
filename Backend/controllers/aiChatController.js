/**
 * AI Chat Controller
 * ─────────────────────
 * Handles the streaming AI chat for Rozare platform.
 * Uses OpenRouter API (https://openrouter.ai) to access any model.
 *
 * Key responsibilities:
 *  1. Role-based system prompts (user / seller / admin)
 *  2. Role-based tool (function) exposure + strict server-side validation
 *  3. Deep personalization via live context injection
 *  4. Streaming Server-Sent Events (SSE) response to the client
 *  5. Security: the AI NEVER performs actions directly — it returns tool calls
 *     which the frontend executes against our own `/api/ai-actions/*` routes,
 *     which re-validate the caller's role on the server.
 */

const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const ChatHistory = require('../models/ChatHistory');
const { executeToolCall, isClientSideTool } = require('../services/aiActionExecutor');

// ─── OpenRouter Config ───────────────────────────────────────────────
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.5-flash';
const AI_FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || 'google/gemini-flash-1.5';
const SITE_URL = process.env.FRONTEND_URL || 'https://www.rozare.com';
const SITE_NAME = 'Rozare';

// ─── SYSTEM PROMPTS ──────────────────────────────────────────────────
// These are crafted for warmth, expertise, and personal connection.
// Each prompt is role-scoped and explicitly lists forbidden cross-role actions.

const USER_PROMPT = `You are Rozare AI — a warm, witty, incredibly helpful personal shopping companion for the Rozare e-commerce platform. Think of yourself as a close friend who happens to be a brilliant stylist and shopping expert.

## Who You Are
- Friendly, conversational, genuinely interested in helping
- A fashion & lifestyle expert with a sharp eye for style
- Patient, never condescending, always positive
- Remember details the user shares and weave them back naturally

## What You Can Do For The User
You help the user perform real actions on their account through tool calls. You can:
- **Shop smart**: Search products, compare options, find coupons, save items to wishlist
- **Manage orders**: View order history, check order details, track orders, cancel pending orders
- **Manage profile**: Update profile info, manage saved addresses, set default address
- **Notifications**: View notifications, mark them as read
- **Style expertise**: Give fashion advice, color coordination, outfit suggestions for any occasion
- **Navigation**: Take them directly to any page (cart, profile, orders, stores, etc.)
- **Help**: Submit complaints, check complaint status

## Hard Boundaries (NEVER cross these)
You are talking to a USER (customer). You CANNOT and MUST NEVER:
- View another user's data, orders, profile, or anything private
- View seller analytics, seller orders, or store management data
- Add/edit/delete products (only sellers can)
- Manage users, stores, complaints platform-wide (only admins can)
- Approve/reject store verifications
- Change anyone's role or block anyone
- Access admin or seller dashboards

If the user asks for something only a seller or admin can do, politely explain: "That's a seller/admin feature — I can only help you with things on your own account as a shopper." Then suggest what you CAN help with.

## How To Talk
- Warm, slightly playful tone. Occasional tasteful emojis (not too many).
- When suggesting a product, explain WHY it's a great fit
- Ask clarifying questions when helpful (occasion, budget, color, style) rather than guessing
- Give specific, actionable suggestions — never vague
- Reference their past orders and preferences naturally when relevant
- Keep replies conversational length (under ~150 words) unless they ask for a detailed breakdown

## Styling Expertise
- Color theory: complementary, analogous, triadic — use real color names
- Occasion dressing: casual, office, date, wedding guest, travel, athleisure
- Body-conscious flattering without being judgmental
- Seasonal trends and timeless essentials
- Budget-aware: you respect what they say about price

## ORDER WORKFLOW — VERY IMPORTANT
When a user wants to order a product:
1. If the product has **colors** or **sizes/options** (optionGroups), you MUST ask which one they want BEFORE placing the order. Never choose for them.
2. Ask for **payment method** (Cash on Delivery or Stripe) — don't default silently.
3. If they have NO saved address, ask for shipping details (fullName, address, city, state, postalCode, country, phone).
4. If they HAVE a saved address, confirm: "I'll ship to [their address]. Is that okay?"
5. Give a clear summary before placing: "Placing order for [product] in [color/size] — $[price] — [payment] — shipping to [address]. Shall I confirm?"
6. Only call place_order AFTER the user confirms.

## SMART SEARCH — CRITICAL
When searching for products, you must be INTELLIGENT about what to search:
- If user says "show me something interesting" or "cool stuff" or "what's trending" → search with sortBy "trending" or "popular" and a BROAD category, NOT the literal word "interesting"
- If user uses slang, colloquial, or non-English terms (e.g. "chapal", "joota", "chasma") → translate to English equivalents (sandals, shoes, glasses) and search those
- If user says "airpods" or "air pods" → also search "wireless earbuds", "bluetooth earphones" etc. The search system handles synonyms, but YOU should also use smart keywords
- If first search returns 0 results, TRY AGAIN with more general terms or related product categories
- NEVER search for adjectives like "interesting", "nice", "cool", "good", "best" as product names
- When showing results, present products WITH their images and prices in a natural, helpful way

## Rules
- Use tools to fetch REAL data — never fabricate product names, prices, or order details
- When user asks for action, use the tool directly (don't just describe what you'd do)
- For destructive actions (cancel order, delete something), confirm once before executing
- For ORDER PLACEMENT: ALWAYS confirm product options, payment method, and address before calling place_order
- If information is missing for a tool, ask for it specifically
- End replies with a small, inviting follow-up when natural

## ROZARE PLATFORM KNOWLEDGE
You know everything about Rozare. If a user asks "what is Rozare", "what's on the about page", "how does this work", "what pages are there", etc., answer from this knowledge:

- **Rozare** is the world's first AI-powered e-commerce platform. Users shop, sell, and manage everything through natural conversation with you (the AI).
- **Pages**: Home (/), Marketplace (/marketplace), Trusted Stores (/marketplace/trusted), Product Detail (/single-product/:id), Store Page (/store/:slug), About (/about), FAQ (/faq), Contact (/contact), Docs (/docs), Track Order (/track-order), Become a Seller (/become-seller), Terms (/terms), Privacy (/privacy), AI Chat (/ai-chat)
- **User Dashboard** (/user-dashboard): Account overview, profile, orders, order details
- **Seller Dashboard** (/seller-dashboard): Products, orders, analytics, store settings, shipping, coupons, subscription, WhatsApp settings
- **Admin Dashboard** (/admin-dashboard): Users, orders, products, analytics, complaints, verifications, broadcasts, tax config
- **Key features**: AI chat (you!), WhatsApp integration, store verification, trust scores, coupons, multi-currency, role-based security
- **Payments**: Cash on Delivery + Stripe
- **Becoming a seller**: Visit /become-seller → enter email → verify OTP → set password → free store created → start adding products
- **Subscription plans**: Starter (free trial, 25 products), Growth ($19/mo, 200 products), Pro ($49/mo, unlimited)
- **For detailed info**: Direct users to /docs for the complete documentation
- **You are unique**: Rozare is the first platform where AI can execute real actions (search, buy, sell, manage) through chat — on web AND WhatsApp`;

const SELLER_PROMPT = `You are Rozare AI Business Partner — a sharp, strategic, proactive business advisor for sellers on Rozare. You're the friend every small business owner wishes they had: business-savvy, data-driven, and genuinely invested in their growth.

## Who You Are
- Professional and warm. Confident, not pushy.
- Data-driven: every recommendation is backed by numbers
- Proactive: spot opportunities and flag risks before being asked
- Action-oriented: get things done, don't just talk about them

## What You Can Do For The Seller
Through tool calls, you execute REAL actions on the seller's store:
- **Products**: Add, edit, delete, bulk-discount, bulk price update, remove discounts, list products
- **Orders**: View orders, update order status (processing → shipped → delivered)
- **Store**: View store details, update store settings (name, description, logo, banner, socials, return policy), view store analytics, apply for verification
- **Shipping**: View and update shipping methods
- **Coupons**: Create, list, update, delete, toggle coupons; view coupon analytics
- **Subscription**: Check subscription status and plan details
- **Analytics**: Revenue, orders count, top products, stock alerts, growth insights
- **Everything a shopper can do**: Plus their own orders, wishlist, addresses as a customer

## Hard Boundaries (NEVER cross these)
You are talking to a SELLER. You CANNOT and MUST NEVER:
- View, edit, or delete ANOTHER seller's products, orders, or store
- View platform-wide analytics (only admins see that)
- View or manage users (only admins can)
- Approve/reject store verifications for anyone (only admins can)
- Block users, delete user accounts, change user roles
- View/cancel orders that don't contain your products
- Update platform tax configuration
- Access the admin dashboard or admin-only reports
- Send platform-wide broadcast notifications

If the seller asks for something admin-only, say: "That's a platform-admin capability — I can help you with your own store and analytics, but not platform-wide operations. Want me to [suggest relevant seller action]?"

## CRITICAL DATA ISOLATION
- ALL data you show MUST belong to THIS seller only — never mix data from other sellers
- get_my_orders returns ONLY orders containing THIS seller's products (not anyone else's)
- get_seller_analytics counts ONLY this seller's products, orders, and revenue
- You can NEVER see another seller's products, orders, revenue, or store data
- If numbers seem low, that's correct — they are scoped to THIS seller's store only
- When the seller says "my orders", use get_my_orders — it automatically filters to their store's orders

## ACCURATE COUNTING — VERY IMPORTANT
- When the seller asks "how many [cancelled/delivered/etc] orders" or any COUNT question, use get_seller_analytics — it returns ordersByStatus with ALL orders counted (no limit)
- get_my_orders and get_seller_orders show paginated results (limited to 20). Their "totalCount" field is the TRUE count. ALWAYS report totalCount, NOT count.
- Example: if totalCount is 19 and count is 20, say "You have 19 cancelled orders" (use totalCount)
- For revenue questions, use get_seller_analytics — it calculates from ALL orders, not just the displayed page
- NEVER count items from a paginated list and report that as the total — always use totalCount or ordersByStatus from analytics

## DUAL MODE: Seller Dashboard vs Buyer Mode
Sellers can ALSO shop on Rozare as buyers. You must intelligently detect which mode they're in:

**SELLER MODE (default priority):**
Trigger phrases: "my products", "my orders", "my store", "analytics", "add product", "edit product", "my revenue", "my coupons", "order status", "stock", "dashboard"
→ Use seller tools: list_my_products, get_seller_orders, get_seller_analytics, etc.

**BUYER MODE:**
Trigger phrases: "I want to buy", "find me a [product]", "show me [category]", "I'm looking for", "add to cart", "place order", "search for", "I want to order", "show me something nice", "what's trending", "recommend me"
→ Use buyer tools: search_products (searches ALL products, not just theirs), add_to_cart, place_order, get_wishlist, etc.

**HOW TO DECIDE:**
1. Look at conversation context — if recent messages are about store management, assume seller mode
2. If the seller says "show me products" ambiguously, lean toward their OWN products (list_my_products) since they're primarily here to manage their store
3. But if they say "show me dresses" or "find me sneakers" or "I want to buy something" → that's buyer mode, use search_products
4. If genuinely ambiguous (e.g., "show me shoes"), ask: "Do you want to see your store's shoe listings, or are you looking to buy shoes for yourself?"
5. Once in buyer mode, stay in buyer mode until they switch back to store management topics
6. The seller can explicitly say things like "as a buyer" or "for my store" to switch modes

**IMPORTANT:** search_products searches ALL products on the platform (for buying). list_my_products shows ONLY this seller's products (for managing). Never confuse the two.

## Interaction Style
- When the seller says "add a product": collect name, price, category, brand, stock. If any missing, ask specifically.
- When showing analytics: present numbers clearly (totals, %, comparisons)
- Proactively suggest: social media marketing, seasonal promotions, optimizing low-performing listings, cross-sells
- Always confirm destructive actions (delete product, delete coupon) before executing
- When bulk-updating: show a summary of what will change and confirm

## Growth Mindset
You're a growth partner. Regularly suggest:
- Social media content ideas (Instagram Reels, TikTok trends, Pinterest boards)
- Photography improvements (better lighting, lifestyle shots, consistent style)
- Pricing psychology (charm pricing, premium tier anchors, bundle offers)
- Seasonal campaigns (back-to-school, holiday, summer sale)
- Coupon strategies (first-time buyer, loyalty, cart-abandonment)

## Rules
- Keep replies under 200 words unless presenting a detailed analytics breakdown
- Tables and bullet points for data — easy to scan
- Never fabricate numbers — always use tools to fetch fresh data
- Reference past conversation and seller's business details naturally

## ROZARE PLATFORM KNOWLEDGE
You know everything about Rozare. Answer questions about the platform from this knowledge:
- **Rozare** is the world's first AI-powered e-commerce platform. Users shop, sell, and manage everything through natural conversation with you (the AI) — on web AND WhatsApp.
- **Pages**: Home (/), Marketplace (/marketplace), Docs (/docs), About (/about), FAQ (/faq), Contact (/contact), Become a Seller (/become-seller), Terms (/terms), Privacy (/privacy)
- **Seller Dashboard** (/seller-dashboard): Products, orders, analytics, store settings, shipping, coupons, subscription, WhatsApp settings
- **Subscription plans**: Starter (free trial, 25 products), Growth ($19/mo, 200 products), Pro ($49/mo, unlimited)
- **For detailed info**: Direct users to /docs for the complete documentation`;

const ADMIN_PROMPT = `You are Rozare AI Platform Commander — a decisive, authoritative administrative co-pilot with FULL operational access to the Rozare e-commerce platform.

## Who You Are
- Efficient, professional, direct
- Data-driven and security-conscious
- Proactive in flagging platform risks (suspicious activity, abuse, fraud signals)
- Respectful of the weight of admin actions

## What You Can Do
You have FULL platform access through tools:
- **Users**: Search, list, view, delete, block/unblock, change roles
- **Products**: Search any product, edit/delete any product
- **Orders**: View all orders, cancel any order, view order details
- **Stores**: List all stores, view any store's details, search stores, view verified stores
- **Verifications**: Approve, reject, or revoke store verifications
- **Complaints**: View all, respond to, resolve, escalate, prioritize
- **Broadcasts**: Send/schedule platform-wide notifications, view past broadcasts, cancel scheduled ones
- **Subscriptions**: View all seller subscriptions and their statuses
- **Tax Config**: View and update platform tax rates
- **Analytics**: Platform-wide revenue, user growth, store distribution, order volume
- **Everything sellers and users can do**

## Interaction Style
- Execute read operations (list, view, search) directly without confirmation
- For destructive actions (delete user, cancel order, reject verification, delete anything), confirm ONCE then execute
- Present data in clean, scannable tables with counts and totals
- Flag anomalies: unusual traffic, spam complaints, suspicious sellers, fraud signals
- Suggest platform improvements based on data patterns you notice

## Security Mindset
- Warn before irreversible actions (delete user — "This will permanently remove all their data")
- Suggest reviewing data before mass operations
- Flag when an admin action might affect many users

## Rules
- Admin has full access — no operation is off-limits
- Always show counts, totals, and percentages with lists
- Keep replies under 250 words unless giving a full platform report
- Use structured formatting (headers, tables, bullets) for clarity
- Never fabricate numbers — always use tools
- Be direct and concise: admins value efficiency`;

// ─── TOOLS BY ROLE ───────────────────────────────────────────────────

const SHARED_NAVIGATION_TOOL = {
  type: 'function',
  function: {
    name: 'navigate',
    description: 'Navigate the user to a page in the application.',
    parameters: {
      type: 'object',
      properties: {
        route: { type: 'string', description: 'Route path e.g. /profile, /cart' },
        label: { type: 'string', description: 'Human-readable label for what page this is' },
      },
      required: ['route', 'label'],
    },
  },
};

const userTools = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products in the Rozare catalog. Returns matching products.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (product name, keyword, description)' },
          category: { type: 'string', description: 'Category filter (optional)' },
          maxPrice: { type: 'number', description: 'Maximum price (optional)' },
          minPrice: { type: 'number', description: 'Minimum price (optional)' },
        },
        required: ['query'],
      },
    },
  },
  SHARED_NAVIGATION_TOOL,
  {
    type: 'function',
    function: {
      name: 'show_style_advice',
      description: 'Display rich, styled fashion advice with a color palette to the user.',
      parameters: {
        type: 'object',
        properties: {
          advice: { type: 'string', description: 'The core style advice' },
          occasion: { type: 'string', description: 'Occasion this is for' },
          colorPalette: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                color: { type: 'string', description: 'Hex color or CSS color' },
                name: { type: 'string', description: 'Name of the color' },
              },
              required: ['color', 'name'],
            },
          },
          tips: { type: 'array', items: { type: 'string' } },
        },
        required: ['advice', 'occasion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_outfit',
      description: 'Suggest a complete outfit combination for an occasion.',
      parameters: {
        type: 'object',
        properties: {
          occasion: { type: 'string' },
          pieces: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', description: 'e.g. "Top", "Bottom", "Shoes", "Accessory"' },
                description: { type: 'string' },
                color: { type: 'string', description: 'Hex or CSS color' },
                searchQuery: { type: 'string', description: 'Query to find this piece in store' },
              },
              required: ['type', 'description', 'color'],
            },
          },
          reasoning: { type: 'string' },
        },
        required: ['occasion', 'pieces', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_orders',
      description: "Get the user's own order history.",
      parameters: {
        type: 'object',
        properties: { status: { type: 'string', description: 'Optional status filter' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_detail',
      description: 'Get full details of a specific order.',
      parameters: {
        type: 'object',
        properties: { orderId: { type: 'string', description: 'MongoDB _id of the order' } },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_order',
      description: "Cancel a pending order (user's own only).",
      parameters: {
        type: 'object',
        properties: { orderId: { type: 'string', description: 'MongoDB _id of the order' } },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_complaint',
      description: 'Submit a complaint on behalf of the user.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['product_issue', 'order_issue', 'delivery', 'refund', 'seller_complaint', 'website_bug', 'suggestion', 'other'],
          },
          subject: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['category', 'subject', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_complaints',
      description: "Get the user's own complaint history.",
      parameters: { type: 'object', properties: {} },
    },
  },
  // ─── NEW USER TOOLS ───
  {
    type: 'function',
    function: {
      name: 'get_wishlist',
      description: "Get all items in the user's wishlist.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_wishlist',
      description: "Add a product to the user's wishlist.",
      parameters: {
        type: 'object',
        properties: { productId: { type: 'string' } },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_wishlist',
      description: "Remove a product from the user's wishlist.",
      parameters: {
        type: 'object',
        properties: { productId: { type: 'string' } },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_addresses',
      description: "Get the user's saved shipping addresses.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_address',
      description: "Add a new shipping address to the user's saved addresses.",
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            description: 'Address object with fullName, address, city, state, postalCode, country, phone',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_profile',
      description: "Update the user's own profile (username only).",
      parameters: {
        type: 'object',
        properties: {
          updates: { type: 'object', description: 'Object with fields to update (e.g. { username: "NewName" })' },
        },
        required: ['updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_notifications',
      description: "Get the user's recent notifications.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_notifications_read',
      description: 'Mark all notifications as read for the current user.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_coupons',
      description: 'List currently available active coupons (optionally for a specific store).',
      parameters: {
        type: 'object',
        properties: {
          storeId: { type: 'string', description: 'Optional seller/store id to filter coupons' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_coupon',
      description: 'Validate a coupon code against a cart total to check savings.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          cartTotal: { type: 'number' },
        },
        required: ['code', 'cartTotal'],
      },
    },
  },
  // ─── CART & ORDER TOOLS ───
  {
    type: 'function',
    function: {
      name: 'get_product_detail',
      description: 'Get full details of a specific product by its ID (price, description, stock, colors, options, reviews).',
      parameters: {
        type: 'object',
        properties: { productId: { type: 'string', description: 'Product ID' } },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_profile',
      description: 'Get the current user\'s full profile details (name, email, addresses, wishlist count).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description: 'Add a product to the user\'s shopping cart.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Product ID to add' },
          selectedColor: { type: 'string', description: 'Optional color choice' },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'view_cart',
      description: 'View all items currently in the user\'s shopping cart with prices and totals.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_cart',
      description: 'Remove a product from the user\'s cart.',
      parameters: {
        type: 'object',
        properties: { productId: { type: 'string' } },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clear_cart',
      description: 'Remove all items from the user\'s cart.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_product_image',
      description: 'Send a product image to the user on WhatsApp. Only use this when the user explicitly asks to see a product image. Do NOT send images automatically when listing products.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Product ID to send image for' },
          caption: { type: 'string', description: 'Optional caption to include with the image' },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_order',
      description: 'Place an order. Can order a specific product by ID or checkout the entire cart. Uses the user\'s saved address if available, otherwise requires shipping info. Default payment is Cash on Delivery.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Optional: specific product ID to order. If omitted, orders entire cart.' },
          shippingInfo: {
            type: 'object',
            description: 'Shipping address. If not provided, uses saved address. Required fields: fullName, address, city. Optional: email, phone, state, postalCode, country.',
          },
          paymentMethod: { type: 'string', enum: ['cash_on_delivery', 'stripe'], description: 'Payment method. Default: cash_on_delivery' },
        },
      },
    },
  },
];

const sellerTools = [
  ...userTools,
  {
    type: 'function',
    function: {
      name: 'add_product',
      description: "Add a new product to the seller's store. REQUIRED: name, price, category, brand, stock. Ask for any missing fields.",
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          description: { type: 'string' },
          category: { type: 'string' },
          brand: { type: 'string' },
          stock: { type: 'number' },
          image: { type: 'string' },
          discountedPrice: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'price', 'category', 'brand', 'stock'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_product',
      description: "Edit one of the seller's own products. Only owner can edit.",
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          updates: { type: 'object', description: 'Fields to update' },
        },
        required: ['productId', 'updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_product',
      description: "Delete one of the seller's own products. Confirm first.",
      parameters: {
        type: 'object',
        properties: { productId: { type: 'string' } },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_my_products',
      description: "List the seller's products with optional filtering.",
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          category: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_discount',
      description: "Apply a discount to multiple of the seller's own products.",
      parameters: {
        type: 'object',
        properties: {
          productIds: { type: 'array', items: { type: 'string' } },
          discountType: { type: 'string', enum: ['percentage', 'fixed'] },
          discountValue: { type: 'number' },
        },
        required: ['productIds', 'discountType', 'discountValue'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_price_update',
      description: "Update prices on multiple of the seller's own products.",
      parameters: {
        type: 'object',
        properties: {
          productIds: { type: 'array', items: { type: 'string' } },
          updateType: { type: 'string', enum: ['percentage', 'fixed', 'set'] },
          value: { type: 'number' },
        },
        required: ['productIds', 'updateType', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_discount',
      description: "Remove discounts from the seller's own products.",
      parameters: {
        type: 'object',
        properties: { productIds: { type: 'array', items: { type: 'string' } } },
        required: ['productIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_seller_analytics',
      description: "Get the seller's business analytics: revenue, orders, top products, stock alerts.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_seller_orders',
      description: "Get orders that contain the seller's products.",
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_order_status',
      description: "Update status of an order containing the seller's product (processing/shipped/delivered only; sellers can't cancel).",
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          newStatus: { type: 'string', enum: ['processing', 'shipped', 'delivered'] },
        },
        required: ['orderId', 'newStatus'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_store',
      description: "Get the seller's own store details.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_store',
      description: "Update seller's own store settings.",
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'object',
            description: 'Fields: storeName, description, logo, banner, socialLinks, returnPolicy, address',
          },
        },
        required: ['updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_store_analytics',
      description: "Get the seller's store performance metrics.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_for_verification',
      description: "Submit a verification application for seller's store.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_shipping_methods',
      description: "View the seller's shipping methods.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_shipping',
      description: "Update one of the seller's shipping methods.",
      parameters: {
        type: 'object',
        properties: {
          methodId: { type: 'string' },
          updates: { type: 'object' },
        },
        required: ['methodId', 'updates'],
      },
    },
  },
  // ─── SELLER COUPON TOOLS ───
  {
    type: 'function',
    function: {
      name: 'create_coupon',
      description: "Create a new discount coupon for the seller's store.",
      parameters: {
        type: 'object',
        properties: {
          coupon: {
            type: 'object',
            description: 'Coupon: { code, discountType ("percentage"|"fixed"), discountValue, minOrderAmount?, maxUses?, expiryDate?, maxDiscount? }',
          },
        },
        required: ['coupon'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_coupons',
      description: "List the seller's own coupons.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_coupon',
      description: "Update one of the seller's own coupons.",
      parameters: {
        type: 'object',
        properties: {
          couponId: { type: 'string' },
          updates: { type: 'object' },
        },
        required: ['couponId', 'updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_coupon',
      description: "Delete one of the seller's own coupons. Confirm first.",
      parameters: {
        type: 'object',
        properties: { couponId: { type: 'string' } },
        required: ['couponId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_coupon',
      description: "Toggle active/inactive state of one of seller's coupons.",
      parameters: {
        type: 'object',
        properties: { couponId: { type: 'string' } },
        required: ['couponId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_subscription_status',
      description: "Get the seller's current subscription plan and status.",
      parameters: { type: 'object', properties: {} },
    },
  },
];

const adminTools = [
  ...sellerTools,
  {
    type: 'function',
    function: {
      name: 'get_all_users',
      description: 'List/search all users on the platform.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          role: { type: 'string' },
          status: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_user',
      description: 'Delete a user. This is permanent. Confirm with admin first.',
      parameters: {
        type: 'object',
        properties: { userId: { type: 'string' } },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'block_user',
      description: 'Toggle block/unblock for a user.',
      parameters: {
        type: 'object',
        properties: { userId: { type: 'string' } },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_user_role',
      description: "Change a user's role.",
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          newRole: { type: 'string', enum: ['user', 'seller', 'admin'] },
        },
        required: ['userId', 'newRole'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_admin_analytics',
      description: 'Get platform-wide analytics.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_orders',
      description: 'List all orders across the platform.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_complaints',
      description: 'List all complaints platform-wide.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_complaint',
      description: 'Respond to, resolve, escalate or reprioritize a complaint.',
      parameters: {
        type: 'object',
        properties: {
          complaintId: { type: 'string' },
          status: { type: 'string' },
          adminResponse: { type: 'string' },
          priority: { type: 'string' },
        },
        required: ['complaintId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pending_verifications',
      description: 'List stores awaiting verification.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'approve_verification',
      description: "Approve a store's verification application.",
      parameters: {
        type: 'object',
        properties: { storeId: { type: 'string' } },
        required: ['storeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reject_verification',
      description: "Reject a store's verification application.",
      parameters: {
        type: 'object',
        properties: {
          storeId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['storeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_verification',
      description: "Revoke a store's verified badge.",
      parameters: {
        type: 'object',
        properties: { storeId: { type: 'string' } },
        required: ['storeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_stores',
      description: 'List all stores on the platform.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_tax_config',
      description: 'Update platform tax configuration.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['percentage', 'fixed'] },
          value: { type: 'number' },
          isActive: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tax_config',
      description: 'View platform tax configuration.',
      parameters: { type: 'object', properties: {} },
    },
  },
  // ─── ADMIN BROADCAST + SUBSCRIPTION TOOLS ───
  {
    type: 'function',
    function: {
      name: 'send_broadcast',
      description: 'Send/schedule a broadcast notification to all users or a targeted audience.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          message: { type: 'string' },
          audience: {
            type: 'object',
            description: 'Audience target: { target: "all"|"users"|"sellers"|"admins"|"custom", userIds?: [...] }',
          },
          scheduledAt: { type: 'string', description: 'ISO datetime string; omit for immediate' },
        },
        required: ['title', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_broadcasts',
      description: 'List recent/scheduled broadcasts.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_broadcast',
      description: 'Cancel a scheduled broadcast that has not yet been sent.',
      parameters: {
        type: 'object',
        properties: { broadcastId: { type: 'string' } },
        required: ['broadcastId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_subscriptions',
      description: 'View all seller subscriptions and their statuses.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_verified_stores',
      description: 'List all verified stores on the platform.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_store_details',
      description: 'Get detailed info on a specific store by ID or slug.',
      parameters: {
        type: 'object',
        properties: {
          storeId: { type: 'string' },
          slug: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_stores',
      description: 'Search stores by name or slug.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────

// ─── Minimal grammar addendum ───
// Keeps the original assistant behavior/tool usage intact while avoiding
// masculine first-person wording in gendered languages.
const FEMININE_GRAMMAR_ADDENDUM = `

## Language grammar only
Do not change your identity, tone, capabilities, permissions, or tool usage.
Do not introduce yourself as female or say you are a female AI assistant.
Only when the user's language requires gendered first-person wording for your
own words, use feminine forms instead of masculine forms. For example, in Urdu
or Hindi say "kar sakti hoon" / "karti hoon" instead of "kar sakta hoon" /
"karta hoon". This is only a grammar choice, not a personality change.
`;

function getSystemPrompt(role) {
  let base;
  switch (role) {
    case 'seller':
      base = SELLER_PROMPT;
      break;
    case 'admin':
      base = ADMIN_PROMPT;
      break;
    default:
      base = USER_PROMPT;
  }
  return base + FEMININE_GRAMMAR_ADDENDUM;
}

function getTools(role) {
  switch (role) {
    case 'seller':
      return sellerTools;
    case 'admin':
      return adminTools;
    default:
      return userTools;
  }
}

/**
 * Server-side allow-list: hard-enforces which tools each role can invoke.
 * This is the second layer of security (the first being the role-scoped tool list
 * sent to the model). Even if the model hallucinates a tool, we block it here.
 */
const ALLOWED_TOOLS_BY_ROLE = {
  user: new Set(userTools.map(t => t.function.name)),
  seller: new Set(sellerTools.map(t => t.function.name)),
  admin: new Set(adminTools.map(t => t.function.name)),
  guest: new Set([
    'search_products',
    'navigate',
    'show_style_advice',
    'suggest_outfit',
    'get_available_coupons',
  ]),
};

function isToolAllowedForRole(toolName, role) {
  const set = ALLOWED_TOOLS_BY_ROLE[role] || ALLOWED_TOOLS_BY_ROLE.guest;
  return set.has(toolName);
}

/**
 * Token-saving: keep last N full messages, condense older ones into summary.
 */
function optimizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  if (messages.length <= 20) return messages;

  const older = messages.slice(0, messages.length - 20);
  const recent = messages.slice(-20);

  const summary = older
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map(m => {
      const content = typeof m.content === 'string' ? m.content : '';
      return `${m.role}: ${content.slice(0, 140)}`;
    })
    .join('\n');

  if (!summary) return recent;

  return [
    { role: 'system', content: `## Earlier conversation (condensed context)\n${summary}` },
    ...recent,
  ];
}

/**
 * Build deep user context for personalization.
 */
async function buildUserContext(userId, role) {
  if (!userId) return null;
  try {
    const user = await User.findById(userId).select('username email role currency sellerInfo createdAt');
    if (!user) return null;

    const ctx = {
      name: user.username || '',
      email: user.email || '',
      role: user.role,
      currency: user.currency || 'USD',
      memberSince: user.createdAt ? user.createdAt.toISOString().split('T')[0] : null,
    };

    // Recent orders (all roles)
    const recentOrders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('orderItems.productId', 'name category brand')
      .lean();

    ctx.recentOrders = recentOrders.map(o => ({
      orderId: o.orderId,
      status: o.orderStatus,
      total: o.orderSummary?.totalAmount || 0,
      items: (o.orderItems || []).map(i => i.productId?.name).filter(Boolean).slice(0, 3),
      date: o.createdAt,
    }));

    // Favorite categories from order history
    const categories = {};
    recentOrders.forEach(o => {
      (o.orderItems || []).forEach(item => {
        if (item.productId?.category) {
          categories[item.productId.category] = (categories[item.productId.category] || 0) + 1;
        }
      });
    });
    ctx.topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // Seller-specific enrichment
    if (role === 'seller') {
      try {
        const store = await Store.findOne({ seller: userId }).select('storeName storeSlug verification trustCount isActive');
        if (store) {
          ctx.store = {
            name: store.storeName,
            slug: store.storeSlug,
            isVerified: store.verification?.isVerified || false,
            trustCount: store.trustCount || 0,
            isActive: store.isActive,
          };
        }
        const productCount = await Product.countDocuments({ seller: userId });
        ctx.productCount = productCount;
      } catch (e) { /* non-fatal */ }
    }

    // Admin-specific enrichment
    if (role === 'admin') {
      try {
        const [totalUsers, totalOrders, totalStores, pendingVerifications] = await Promise.all([
          User.countDocuments(),
          Order.countDocuments(),
          Store.countDocuments(),
          Store.countDocuments({ 'verification.status': 'pending' }),
        ]);
        ctx.platform = { totalUsers, totalOrders, totalStores, pendingVerifications };
      } catch (e) { /* non-fatal */ }
    }

    return ctx;
  } catch (e) {
    console.error('buildUserContext error:', e.message);
    return null;
  }
}

function formatContextBlock(ctx, role) {
  if (!ctx) return '';
  let s = `\n\n## Current User Context (use this to personalize, don't repeat back verbatim)\n`;
  if (ctx.name) s += `- Name: ${ctx.name}\n`;
  s += `- Role: ${ctx.role}\n`;
  if (ctx.currency) s += `- Preferred currency: ${ctx.currency}\n`;
  if (ctx.memberSince) s += `- Member since: ${ctx.memberSince}\n`;
  if (ctx.topCategories?.length) s += `- Loves: ${ctx.topCategories.join(', ')}\n`;
  if (ctx.recentOrders?.length) {
    s += `- Recent orders:\n`;
    ctx.recentOrders.forEach(o => {
      s += `  • #${o.orderId}: ${o.items?.join(', ') || 'items'} — ${o.status} — $${o.total}\n`;
    });
  }
  if (role === 'seller' && ctx.store) {
    s += `- Store: "${ctx.store.name}" (${ctx.store.slug}) — ${ctx.store.isVerified ? 'verified ✓' : 'not verified'} — ${ctx.productCount ?? 0} products — ${ctx.store.trustCount} trust\n`;
  }
  if (role === 'admin' && ctx.platform) {
    s += `- Platform snapshot: ${ctx.platform.totalUsers} users, ${ctx.platform.totalOrders} orders, ${ctx.platform.totalStores} stores, ${ctx.platform.pendingVerifications} pending verifications\n`;
  }

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  s += `- Current time of day: ${timeOfDay}\n`;
  return s;
}

/**
 * Filter/stamp tool calls coming back from the model to enforce role allowlist.
 * This is a LAST-MILE check; the backend AI-action routes ALSO re-validate role.
 */
function filterToolCallsByRole(parsed, role) {
  if (!parsed?.choices) return parsed;
  parsed.choices = parsed.choices.map(choice => {
    const delta = choice.delta || choice.message;
    if (!delta?.tool_calls) return choice;
    const filtered = [];
    for (const tc of delta.tool_calls) {
      const name = tc.function?.name;
      // When streaming, the first chunk has the name; subsequent chunks have argument deltas
      // We only filter when a named tool call appears and is disallowed
      if (name && !isToolAllowedForRole(name, role)) {
        // Drop this tool call entirely — replace with null/no-op
        continue;
      }
      filtered.push(tc);
    }
    if (delta.tool_calls) delta.tool_calls = filtered;
    return choice;
  });
  return parsed;
}

// ─── Helper: read a full streaming response, buffer tool calls, forward text ─
async function consumeStream(response, { onText, onToolCallDelta, role }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let assistantContent = '';
  const toolCallMap = {}; // indexed by tool_call index

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.error) throw new Error(parsed.error?.message || parsed.error);
          const choice = parsed.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta;
          if (!delta) continue;

          // Text content
          if (delta.content) {
            assistantContent += delta.content;
            if (onText) onText(delta.content);
          }

          // Tool call deltas — accumulate into toolCallMap
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const i = tc.index ?? 0;
              if (!toolCallMap[i]) {
                toolCallMap[i] = { id: '', name: '', arguments: '' };
              }
              if (tc.id) toolCallMap[i].id = tc.id;
              if (tc.function?.name) toolCallMap[i].name = tc.function.name;
              if (tc.function?.arguments) toolCallMap[i].arguments += tc.function.arguments;
            }
          }
        } catch (e) {
          if (e.message?.includes('AI') || e.message?.includes('rate')) throw e;
          // Ignore JSON parse errors mid-stream
        }
      }
    }
  } finally {
    try { reader.cancel(); } catch {}
  }

  // Build tool_calls array (only allowed tools)
  const toolCalls = Object.values(toolCallMap)
    .filter(tc => tc.name && isToolAllowedForRole(tc.name, role));

  return { assistantContent, toolCalls };
}

// ─── WhatsApp Mode System Prompt Addendum ────────────────────────────
const WHATSAPP_SYSTEM_PROMPT_ADDENDUM = `

## IMPORTANT: You are chatting via WhatsApp
- Keep responses concise — under 500 words unless the user asks for detailed info
- Use WhatsApp formatting: *bold*, _italic_, ~strikethrough~
- Do NOT use markdown headers (#), code blocks (\`\`\`), or tables
- Share links as full URLs (e.g. https://www.rozare.com/marketplace)
- When listing products, use bullet points with emoji and NUMBER them (1, 2, 3...)
- For navigation suggestions, just share the URL directly
- Be even more conversational and mobile-friendly in tone
- Remember: the user is on their phone — short, punchy, helpful

## PRODUCT IMAGES ON WHATSAPP
- When you list products, do NOT automatically send images — just list them as text with numbers
- After listing products, sometimes naturally ask: "Want to see the image of any of these? Just say which one! 📸"
- When the user says "show me image of 1st product" or "send image of product 3" or "I want to see it", use the send_product_image tool with the productId
- You can send multiple images if the user asks for multiple (e.g. "show me 1st and 3rd")
- Only send images when explicitly asked — never spam images automatically
- If the product has no image, tell the user: "This product doesn't have an image yet"
`;

/**
 * processAIChatMessage — Reusable core AI chat engine
 * ────────────────────────────────────────────────────
 * Used by both the HTTP chatOnce endpoint AND the WhatsApp AI chat service.
 * Runs a non-streaming AI conversation with server-side tool execution loop.
 *
 * @param {Object} userObj - { _id, id, role } — the authenticated user
 * @param {Array}  incomingMessages - array of { role, content } messages
 * @param {Object} options - { mode: 'web'|'whatsapp', conversationId?: string }
 * @returns {Object} { responseText, toolResults, clientActions, conversationId }
 */
async function processAIChatMessage(userObj, incomingMessages, options = {}) {
  const mode = options.mode || 'web';
  const isWhatsApp = mode === 'whatsapp';

  const userId = userObj?._id || userObj?.id || null;
  const effectiveRole = ['user', 'seller', 'admin'].includes(userObj?.role)
    ? userObj.role
    : 'guest';

  const userContext = await buildUserContext(userId, effectiveRole);
  let systemContent = getSystemPrompt(effectiveRole);
  systemContent += formatContextBlock(userContext, effectiveRole);

  if (effectiveRole === 'guest') {
    systemContent += `\n\n## IMPORTANT: This user is NOT logged in. Encourage them to sign in for personalized help.`;
  }

  if (isWhatsApp) {
    systemContent += WHATSAPP_SYSTEM_PROMPT_ADDENDUM;
  }

  const cleanMessages = incomingMessages
    .filter(m => m && typeof m.role === 'string')
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      ...(m.name ? { name: m.name } : {}),
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
    }));

  const conversationMessages = [
    { role: 'system', content: systemContent },
    ...optimizeMessages(cleanMessages),
  ];

  const tools = getTools(effectiveRole);
  const toolResults = [];
  const clientActions = [];

  const MAX_ITERATIONS = 5;
  let lastMessage = null;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const isLast = i === MAX_ITERATIONS - 1;

    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: conversationMessages,
        tools: isLast ? undefined : tools,
        stream: false,
        temperature: 0.7,
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text().catch(() => '');
      console.error('OpenRouter non-stream error', upstream.status, t);
      if (upstream.status === 429) throw new Error('AI rate limit hit. Try again in a moment.');
      if (upstream.status === 402) throw new Error('AI credits exhausted.');
      throw new Error('AI service temporarily unavailable.');
    }

    const data = await upstream.json();
    const message = data.choices?.[0]?.message;
    if (!message) break;

    lastMessage = message;

    // Filter tool calls by role
    if (message.tool_calls?.length) {
      message.tool_calls = message.tool_calls.filter(tc =>
        tc.function?.name && isToolAllowedForRole(tc.function.name, effectiveRole)
      );
    }

    if (!message.tool_calls?.length) break;

    // Add assistant message and execute tools
    conversationMessages.push(message);

    for (const tc of message.tool_calls) {
      const toolName = tc.function.name;
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}

      // Special handling for send_product_image in WhatsApp mode
      if (toolName === 'send_product_image' && isWhatsApp) {
        try {
          const product = await Product.findById(args.productId).select('name images price discountedPrice').lean();
          if (!product || !product.images?.length) {
            conversationMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ success: false, message: 'This product does not have an image.' }),
            });
          } else {
            const imageUrl = product.images[0]?.url || product.images[0];
            const caption = args.caption || `*${product.name}*\n💰 ${product.discountedPrice ? `~$${product.price}~ $${product.discountedPrice}` : `$${product.price}`}\n🔗 ${SITE_URL}/single-product/${product._id}`;
            // Store image info for the WhatsApp service to send after response
            if (!options._pendingImages) options._pendingImages = [];
            options._pendingImages.push({ imageUrl, caption });
            conversationMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ success: true, message: `Image of "${product.name}" will be sent to the user.` }),
            });
          }
        } catch (imgErr) {
          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ success: false, message: 'Failed to fetch product image.' }),
          });
        }
        toolResults.push({ tool: toolName, result: { success: true }, id: tc.id });
        continue;
      }

      if (isClientSideTool(toolName)) {
        if (isWhatsApp) {
          // In WhatsApp mode, convert client-side tools to text results
          let textResult = '';
          if (toolName === 'navigate') {
            const route = args.route || '/';
            const label = args.label || 'Page';
            textResult = `Here's the link: ${SITE_URL}${route} (${label})`;
          } else if (toolName === 'show_style_advice') {
            textResult = `Style Advice for ${args.occasion || 'any occasion'}:\n${args.advice || ''}`;
            if (args.tips?.length) textResult += '\n\nTips:\n' + args.tips.map(t => `• ${t}`).join('\n');
          } else if (toolName === 'suggest_outfit') {
            textResult = `Outfit for ${args.occasion || 'any occasion'}:\n`;
            if (args.pieces?.length) {
              textResult += args.pieces.map(p => `• ${p.type}: ${p.description}`).join('\n');
            }
            if (args.reasoning) textResult += `\n\n${args.reasoning}`;
          } else {
            textResult = `${toolName} executed.`;
          }
          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ success: true, message: textResult }),
          });
          toolResults.push({ tool: toolName, result: { success: true, message: textResult }, id: tc.id });
        } else {
          // Web mode: send client actions as before
          clientActions.push({ action: toolName, args, id: tc.id });
          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ success: true, message: `${toolName} sent to client.` }),
          });
        }
      } else {
        // Server-side execution
        const result = await executeToolCall(toolName, args, userObj);
        toolResults.push({ tool: toolName, result, id: tc.id });
        conversationMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }
  }

  const responseText = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

  // Save to conversation history — ONLY the NEW messages from this interaction
  // (not the full history that was passed in as context, to avoid duplication)
  let savedConvoId = null;
  if (userId) {
    try {
      // Save only NEW messages from this request (not the history passed as context).
      // Simple approach: save the last user message + the final AI response text.
      // This avoids index calculation bugs when optimizeMessages condenses history.
      const lastUserMsg = incomingMessages.filter(m => m.role === 'user').pop();
      const newMessages = [];
      if (lastUserMsg?.content) {
        newMessages.push({ role: 'user', content: typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '' });
      }
      if (responseText) {
        newMessages.push({ role: 'assistant', content: responseText });
      }

      if (newMessages.length > 0) {
        savedConvoId = await saveToConversation(userId, options.conversationId || null, newMessages, isWhatsApp ? 'whatsapp' : 'web');
      }
    } catch (e) {
      console.error('processAIChatMessage: chat history save error:', e.message);
    }
  }

  return {
    responseText,
    toolResults,
    clientActions,
    conversationId: savedConvoId?.toString() || null,
    role: effectiveRole,
    lastMessage,
  };
}

// Export for use by WhatsApp AI chat service
exports.processAIChatMessage = processAIChatMessage;

// ─── MAIN CHAT ENDPOINT (Streaming SSE with Server-Side Tool Loop) ───

exports.streamChat = async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: 'AI service not configured. Please contact support.',
        detail: 'OPENROUTER_API_KEY missing',
      });
    }

    const body = req.body || {};
    const incoming = Array.isArray(body.messages) ? body.messages : [];

    const authenticatedRole = req.user?.role || 'guest';
    const userId = req.user?.id || null;
    const effectiveRole = ['user', 'seller', 'admin'].includes(authenticatedRole)
      ? authenticatedRole
      : 'guest';

    // Build the user object for the executor
    const userObj = userId ? { _id: userId, id: userId, role: effectiveRole } : null;

    const userContext = await buildUserContext(userId, effectiveRole);

    let systemContent = getSystemPrompt(effectiveRole);
    systemContent += formatContextBlock(userContext, effectiveRole);
    if (effectiveRole === 'guest') {
      systemContent += `\n\n## IMPORTANT: This user is NOT logged in. Do not try to access their personal data. Encourage them to sign in for personalized help.`;
    }

    // Sanitize messages
    const cleanMessages = incoming
      .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content }));

    const tools = getTools(effectiveRole);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const closed = () => res.writableEnded || res.destroyed;
    const send = (obj) => { if (!closed()) res.write(`data: ${JSON.stringify(obj)}\n\n`); };

    // Heartbeat
    const heartbeat = setInterval(() => { if (!closed()) res.write(': ping\n\n'); }, 15000);
    const cleanupHB = () => clearInterval(heartbeat);
    req.on('close', cleanupHB);

    // Build conversation for the API
    const conversationMessages = [
      { role: 'system', content: systemContent },
      ...optimizeMessages(cleanMessages),
    ];

    // Track where new messages start (so we only save NEW messages to history)
    const newMsgStartIndex = conversationMessages.length;

    // Collect tool events from this turn so we can persist them with the assistant message
    const turnToolEvents = [];

    // ═══ Tool Execution Loop ═══
    // The AI may request tool calls. We execute them server-side, feed results back,
    // and let the AI generate a natural language summary. Max 5 iterations for safety.
    const MAX_TOOL_ITERATIONS = 5;
    let iteration = 0;
    let finalTextSent = false;

    while (iteration < MAX_TOOL_ITERATIONS && !closed()) {
      iteration++;
      const isLastChance = iteration === MAX_TOOL_ITERATIONS;

      // Call OpenRouter (streaming)
      const upstreamResp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: conversationMessages,
          tools: isLastChance ? undefined : tools, // Don't offer tools on last iteration
          stream: true,
          temperature: 0.7,
        }),
      });

      if (!upstreamResp.ok) {
        const errorText = await upstreamResp.text().catch(() => '');
        console.error('OpenRouter error', upstreamResp.status, errorText);
        const errMsg = upstreamResp.status === 429
          ? 'AI rate limit hit. Please try again in a moment.'
          : upstreamResp.status === 402
            ? 'AI credits exhausted. Please top up.'
            : 'AI service temporarily unavailable.';
        send({ error: errMsg });
        break;
      }

      if (!upstreamResp.body) {
        send({ error: 'Empty AI response' });
        break;
      }

      // Consume the stream: forward text to client in real-time, accumulate tool calls
      const { assistantContent, toolCalls } = await consumeStream(upstreamResp, {
        onText: (chunk) => {
          // Stream text chunks to client in real-time (typing effect)
          if (!closed()) {
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
          }
        },
        role: effectiveRole,
      });

      // If no tool calls, the AI gave a direct text answer — we're done
      if (toolCalls.length === 0) {
        finalTextSent = true;
        // Add assistant message to conversation for history
        conversationMessages.push({ role: 'assistant', content: assistantContent });
        break;
      }

      // ── Tool calls detected: execute them server-side ──
      // Add the assistant's tool-call message to the conversation
      const assistantMsg = {
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCalls.map((tc, i) => ({
          id: tc.id || `call_${Date.now()}_${i}`,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
      conversationMessages.push(assistantMsg);

      // Execute each tool call
      for (const tc of assistantMsg.tool_calls) {
        const toolName = tc.function.name;
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}

        if (isClientSideTool(toolName)) {
          // Client-side tools: send to frontend for rendering, give AI a success ack
          send({ type: 'client_action', action: toolName, args, id: tc.id });
          // Persist client actions other than navigation (which is a one-time side-effect)
          if (toolName !== 'navigate') {
            turnToolEvents.push({ type: 'client_action', action: toolName, args });
          }
          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ success: true, message: `${toolName} displayed to user.` }),
          });
        } else {
          // Server-side execution
          send({ type: 'tool_start', tool: toolName, id: tc.id });

          const result = await executeToolCall(toolName, args, userObj);

          send({ type: 'tool_result', tool: toolName, result, id: tc.id });
          turnToolEvents.push({ type: 'tool_result', tool: toolName, result });

          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      }

      // Loop continues — AI will now see tool results and generate a response
    }

    // ── Save chat history to conversation ──
    if (userId) {
      try {
        const conversationId = body.conversationId || null;
        const lastUserMsg = cleanMessages.filter(m => m.role === 'user').pop();
        const newMessages = [];
        if (lastUserMsg?.content && typeof lastUserMsg.content === 'string' && lastUserMsg.content.trim()) {
          newMessages.push({ role: 'user', content: lastUserMsg.content });
        }
        // Merge ALL assistant text from this turn into a single message
        // (multiple tool-rounds can produce multiple assistant text segments — they belong to the same turn)
        const assistantText = conversationMessages
          .slice(newMsgStartIndex)
          .filter(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.trim())
          .map(m => m.content.trim())
          .join('\n\n');
        if (assistantText) {
          newMessages.push({ role: 'assistant', content: assistantText, toolEvents: turnToolEvents });
        }

        const savedConvoId = await saveToConversation(userId, conversationId, newMessages);
        // Send the conversationId back to the client so it can track it
        if (savedConvoId && !closed()) {
          res.write(`data: ${JSON.stringify({ type: 'conversation_id', conversationId: savedConvoId.toString() })}\n\n`);
        }
      } catch (e) {
        console.error('Chat history save error:', e.message);
      }
    }

    // Finalize SSE
    if (!closed()) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
    cleanupHB();
  } catch (err) {
    console.error('streamChat fatal error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
    try {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Server error' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {}
  }
};

/**
 * Non-streaming variant with server-side tool execution loop.
 * Used by React Native / Expo clients that cannot handle SSE.
 */
exports.chatOnce = async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const body = req.body || {};
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const authenticatedRole = req.user?.role || 'guest';
    const userId = req.user?.id || null;
    const effectiveRole = ['user', 'seller', 'admin'].includes(authenticatedRole)
      ? authenticatedRole
      : 'guest';

    const userObj = userId ? { _id: userId, id: userId, role: effectiveRole } : null;

    const userContext = await buildUserContext(userId, effectiveRole);
    let systemContent = getSystemPrompt(effectiveRole);
    systemContent += formatContextBlock(userContext, effectiveRole);
    if (effectiveRole === 'guest') {
      systemContent += `\n\n## IMPORTANT: This user is NOT logged in. Encourage them to sign in for personalized help.`;
    }

    const cleanMessages = incoming
      .filter(m => m && typeof m.role === 'string')
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.name ? { name: m.name } : {}),
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      }));

    const conversationMessages = [
      { role: 'system', content: systemContent },
      ...optimizeMessages(cleanMessages),
    ];
    const tools = getTools(effectiveRole);
    const toolResults = []; // Collect tool results for client
    const clientActions = []; // Collect client-side actions

    // Tool execution loop (non-streaming)
    const MAX_ITERATIONS = 5;
    let lastMessage = null;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const isLast = i === MAX_ITERATIONS - 1;

      const upstream = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: conversationMessages,
          tools: isLast ? undefined : tools,
          stream: false,
          temperature: 0.7,
        }),
      });

      if (!upstream.ok) {
        const t = await upstream.text().catch(() => '');
        console.error('OpenRouter non-stream error', upstream.status, t);
        if (upstream.status === 429) return res.status(429).json({ error: 'AI rate limit hit. Try again.' });
        if (upstream.status === 402) return res.status(402).json({ error: 'AI credits exhausted.' });
        return res.status(500).json({ error: 'AI service temporarily unavailable' });
      }

      const data = await upstream.json();
      const message = data.choices?.[0]?.message;
      if (!message) break;

      lastMessage = message;

      // Filter tool calls by role
      if (message.tool_calls?.length) {
        message.tool_calls = message.tool_calls.filter(tc =>
          tc.function?.name && isToolAllowedForRole(tc.function.name, effectiveRole)
        );
      }

      // If no tool calls, done
      if (!message.tool_calls?.length) break;

      // Add assistant message and execute tools
      conversationMessages.push(message);

      for (const tc of message.tool_calls) {
        const toolName = tc.function.name;
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}

        if (isClientSideTool(toolName)) {
          clientActions.push({ action: toolName, args, id: tc.id });
          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ success: true, message: `${toolName} sent to client.` }),
          });
        } else {
          const result = await executeToolCall(toolName, args, userObj);
          toolResults.push({ tool: toolName, result, id: tc.id });
          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      }
    }

    // Save chat history — only the LAST user message + final AI response (not full history)
    if (userId) {
      try {
        const responseText = typeof lastMessage?.content === 'string' ? lastMessage.content : '';
        const lastUserMsg = cleanMessages.filter(m => m.role === 'user').pop();
        const newMessages = [];
        if (lastUserMsg?.content) {
          newMessages.push({ role: 'user', content: typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '' });
        }
        if (responseText) {
          newMessages.push({ role: 'assistant', content: responseText });
        }
        if (newMessages.length > 0) {
          await saveToConversation(userId, body.conversationId || null, newMessages, 'web');
        }
      } catch (e) { /* non-fatal */ }
    }

    return res.json({
      message: lastMessage,
      toolResults,
      clientActions,
      role: effectiveRole,
    });
  } catch (err) {
    console.error('chatOnce error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════
//  CHAT HISTORY / CONVERSATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Save messages to a specific conversation (or create/find the active one).
 */
async function saveToConversation(userId, conversationId, messages, source = 'web') {
  let history = await ChatHistory.findOne({ user: userId });
  if (!history) {
    history = new ChatHistory({ user: userId, conversations: [] });
  }

  let convo;
  if (conversationId) {
    convo = history.conversations.id(conversationId);
  }
  if (!convo) {
    if (source === 'whatsapp') {
      // For WhatsApp: find existing WhatsApp conversation or create one
      convo = history.conversations.find(c => c.source === 'whatsapp');
    } else {
      // For web: find the active web conversation
      convo = history.conversations.find(c => c.isActive && c.source !== 'whatsapp');
    }
    if (!convo) {
      // Auto-generate title from first user message
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = source === 'whatsapp'
        ? '[WhatsApp] Chat'
        : (firstUserMsg
          ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
          : 'New Chat');
      history.conversations.push({ title, messages: [], isActive: source !== 'whatsapp', source });
      convo = history.conversations[history.conversations.length - 1];
      if (source !== 'whatsapp') {
        history.activeConversationId = convo._id;
      }
    }
  }

  // APPEND new messages (don't replace existing ones)
  for (const m of messages) {
    const entry = { role: m.role, content: m.content };
    if (Array.isArray(m.toolEvents) && m.toolEvents.length > 0) {
      entry.toolEvents = m.toolEvents;
    }
    convo.messages.push(entry);
  }
  // Cap at 200 messages
  if (convo.messages.length > 200) {
    convo.messages = convo.messages.slice(-200);
  }
  convo.lastActive = new Date();

  await history.save();
  return convo._id;
}

/**
 * GET /api/ai-chat/conversations — list user's conversations (sidebar)
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const history = await ChatHistory.findOne({ user: userId }).lean();
    if (!history || !history.conversations?.length) {
      return res.json({ conversations: [], activeConversationId: null });
    }

    // Return conversations sorted by last active, with summary info
    const conversations = history.conversations
      .sort((a, b) => new Date(b.lastActive || b.updatedAt) - new Date(a.lastActive || a.updatedAt))
      .map(c => ({
        _id: c._id,
        title: c.title,
        messageCount: c.messages?.length || 0,
        lastActive: c.lastActive || c.updatedAt,
        isActive: c.isActive,
        preview: c.messages?.filter(m => m.role === 'user').pop()?.content?.slice(0, 80) || '',
      }));

    return res.json({
      conversations,
      activeConversationId: history.activeConversationId,
    });
  } catch (err) {
    console.error('getConversations error:', err);
    return res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

/**
 * GET /api/ai-chat/conversations/:conversationId — load a specific conversation's messages
 */
exports.getConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const history = await ChatHistory.findOne({ user: userId }).lean();
    if (!history) return res.json({ messages: [], title: 'New Chat' });

    const convo = history.conversations?.find(c => c._id?.toString() === conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });

    // Mark this as active
    await ChatHistory.updateOne(
      { user: userId },
      {
        $set: {
          activeConversationId: convo._id,
          'conversations.$[c].isActive': true,
        },
      },
      { arrayFilters: [{ 'c._id': convo._id }] }
    );

    // Deactivate other conversations
    await ChatHistory.updateOne(
      { user: userId },
      { $set: { 'conversations.$[c].isActive': false } },
      { arrayFilters: [{ 'c._id': { $ne: convo._id } }] }
    );

    return res.json({
      _id: convo._id,
      title: convo.title,
      messages: (convo.messages || []).map(m => ({
        role: m.role,
        content: m.content,
        toolEvents: m.toolEvents || [],
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error('getConversation error:', err);
    return res.status(500).json({ error: 'Failed to load conversation.' });
  }
};

/**
 * POST /api/ai-chat/conversations — create a new conversation
 */
exports.createConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    let history = await ChatHistory.findOne({ user: userId });
    if (!history) {
      history = new ChatHistory({ user: userId, conversations: [] });
    }

    // Deactivate all existing conversations
    history.conversations.forEach(c => { c.isActive = false; });

    const title = req.body.title || 'New Chat';
    history.conversations.push({ title, messages: [], isActive: true });
    const newConvo = history.conversations[history.conversations.length - 1];
    history.activeConversationId = newConvo._id;

    await history.save();

    return res.json({
      _id: newConvo._id,
      title: newConvo.title,
      messages: [],
    });
  } catch (err) {
    console.error('createConversation error:', err);
    return res.status(500).json({ error: 'Failed to create conversation.' });
  }
};

/**
 * DELETE /api/ai-chat/conversations/:conversationId — delete a conversation
 */
exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const history = await ChatHistory.findOne({ user: userId });
    if (!history) return res.status(404).json({ error: 'No chat history found.' });

    history.conversations = history.conversations.filter(
      c => c._id?.toString() !== conversationId
    );

    // If we deleted the active one, activate the latest
    if (history.activeConversationId?.toString() === conversationId) {
      const latest = history.conversations[history.conversations.length - 1];
      if (latest) {
        latest.isActive = true;
        history.activeConversationId = latest._id;
      } else {
        history.activeConversationId = null;
      }
    }

    await history.save();
    return res.json({ success: true, message: 'Conversation deleted.' });
  } catch (err) {
    console.error('deleteConversation error:', err);
    return res.status(500).json({ error: 'Failed to delete conversation.' });
  }
};

/**
 * PATCH /api/ai-chat/conversations/:conversationId/rename
 */
exports.renameConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { title } = req.body;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    await ChatHistory.updateOne(
      { user: userId, 'conversations._id': conversationId },
      { $set: { 'conversations.$.title': title.slice(0, 100) } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('renameConversation error:', err);
    return res.status(500).json({ error: 'Failed to rename.' });
  }
};

/**
 * DELETE /api/ai-chat/conversations/:conversationId/messages — clear messages but keep conversation
 */
exports.clearConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    await ChatHistory.updateOne(
      { user: userId, 'conversations._id': conversationId },
      { $set: { 'conversations.$.messages': [] } }
    );

    return res.json({ success: true, message: 'Messages cleared.' });
  } catch (err) {
    console.error('clearConversation error:', err);
    return res.status(500).json({ error: 'Failed to clear.' });
  }
};
