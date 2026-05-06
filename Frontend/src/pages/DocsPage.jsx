import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Book, ShoppingBag, Store, Bot, Smartphone, CreditCard, Shield, Truck,
  Users, BarChart3, MessageCircle, Sparkles, ChevronRight, Search,
  Star, Zap, Globe, Lock, Heart, ArrowRight, ExternalLink, Hash,
  Package, Settings, Bell, Ticket, Eye, CheckCircle, XCircle,
  HelpCircle, Palette, TrendingUp, Award, Megaphone, FileText
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

// ─── Section Data ───
const SECTIONS = [
  { id: 'what-is-rozare', title: 'What is Rozare?', icon: Sparkles },
  { id: 'ai-powered-shopping', title: 'AI-Powered Shopping', icon: Bot },
  { id: 'getting-started', title: 'Getting Started', icon: Zap },
  { id: 'shopping-guide', title: 'Shopping Guide', icon: ShoppingBag },
  { id: 'become-a-seller', title: 'Become a Seller', icon: Store },
  { id: 'seller-guide', title: 'Seller Dashboard Guide', icon: Settings },
  { id: 'ai-for-sellers', title: 'AI for Sellers', icon: BarChart3 },
  { id: 'whatsapp-integration', title: 'WhatsApp Integration', icon: Smartphone },
  { id: 'subscription-plans', title: 'Subscription Plans', icon: Award },
  { id: 'payments', title: 'Payments & Checkout', icon: CreditCard },
  { id: 'shipping', title: 'Shipping & Delivery', icon: Truck },
  { id: 'trust-safety', title: 'Trust & Safety', icon: Shield },
  { id: 'store-verification', title: 'Store Verification', icon: CheckCircle },
  { id: 'orders-returns', title: 'Orders & Returns', icon: Package },
  { id: 'coupons-discounts', title: 'Coupons & Discounts', icon: Ticket },
  { id: 'notifications', title: 'Notifications', icon: Bell },
  { id: 'admin-guide', title: 'Admin Guide', icon: Lock },
  { id: 'api-reference', title: 'Technical Overview', icon: FileText },
  { id: 'faq', title: 'Frequently Asked Questions', icon: HelpCircle },
];

function DocsPage() {
  const [activeSection, setActiveSection] = useState('what-is-rozare');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const contentRef = useRef(null);

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const filteredSections = searchQuery
    ? SECTIONS.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : SECTIONS;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsSidebarOpen(false);
    }
  };

  // Schema.org structured data for SEO
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Rozare Documentation — Complete Platform Guide',
    description: 'Complete documentation for Rozare, the world\'s first AI-powered e-commerce platform. Learn how to shop, sell, and manage your store using AI chat on web and WhatsApp.',
    url: 'https://www.rozare.com/docs',
    publisher: {
      '@type': 'Organization',
      name: 'Rozare',
      url: 'https://www.rozare.com',
    },
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Rozare?',
          acceptedAnswer: { '@type': 'Answer', text: 'Rozare is the world\'s first AI-powered e-commerce platform where you can shop, sell, and manage everything through natural conversation with an AI assistant — on the website and via WhatsApp.' },
        },
        {
          '@type': 'Question',
          name: 'How do I become a seller on Rozare?',
          acceptedAnswer: { '@type': 'Answer', text: 'Visit rozare.com/become-seller, enter your email, verify via OTP, set a password, and your seller account with a free store is created instantly. You can start adding products right away through the dashboard or by chatting with the AI.' },
        },
        {
          '@type': 'Question',
          name: 'Can I manage my Rozare store from WhatsApp?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes! Rozare supports WhatsApp integration. Sellers receive order notifications on WhatsApp and can manage their store, add products, update orders, and get analytics — all by chatting with the Rozare AI on WhatsApp.' },
        },
        {
          '@type': 'Question',
          name: 'How does AI shopping work on Rozare?',
          acceptedAnswer: { '@type': 'Answer', text: 'Simply chat with the Rozare AI assistant. Tell it what you\'re looking for, and it will search products, suggest outfits, apply coupons, manage your cart, and place orders for you — all through natural conversation.' },
        },
        {
          '@type': 'Question',
          name: 'Is Rozare free for sellers?',
          acceptedAnswer: { '@type': 'Answer', text: 'Rozare offers a free trial for sellers. After the trial, sellers can choose from multiple subscription plans: Starter, Growth, and Pro, each with increasing features and product limits.' },
        },
      ],
    },
  };

  return (
    <>
      <Helmet>
        <title>Rozare Docs — Complete Guide to AI-Powered Shopping & Selling</title>
        <meta name="description" content="Complete documentation for Rozare, the world's first AI-powered e-commerce platform. Learn how to shop with AI, become a seller, manage your store via chat, use WhatsApp integration, and more." />
        <meta name="keywords" content="Rozare, AI shopping, AI e-commerce, become a seller, WhatsApp shopping, AI store management, online marketplace, chat-based shopping, AI-powered platform" />
        <link rel="canonical" href="https://www.rozare.com/docs" />
        <meta property="og:title" content="Rozare Documentation — AI-Powered E-Commerce Platform" />
        <meta property="og:description" content="The complete guide to Rozare: shop, sell, and manage everything through AI conversation. The world's first AI-powered e-commerce platform." />
        <meta property="og:url" content="https://www.rozare.com/docs" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rozare Docs — AI-Powered Shopping & Selling" />
        <meta name="twitter:description" content="Complete documentation for Rozare's AI shopping platform. Learn to shop, sell, and manage via AI chat." />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
        {/* Hero */}
        <div className="relative overflow-hidden py-16 md:py-24" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 8%), hsl(260, 60%, 12%), hsl(220, 70%, 8%))' }}>
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 50%, hsl(220, 70%, 40%), transparent 60%), radial-gradient(circle at 70% 50%, hsl(280, 60%, 40%), transparent 60%)' }} />
          <div className="relative max-w-5xl mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'hsl(220, 70%, 55%, 0.15)', border: '1px solid hsl(220, 70%, 55%, 0.3)' }}>
                <Book size={16} style={{ color: 'hsl(220, 70%, 65%)' }} />
                <span className="text-sm font-medium" style={{ color: 'hsl(220, 70%, 75%)' }}>Documentation</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'white' }}>
                Rozare <span style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 65%), hsl(280, 60%, 65%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Documentation</span>
              </h1>
              <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8" style={{ color: 'hsl(220, 20%, 70%)' }}>
                The complete guide to the world's first AI-powered e-commerce platform. Learn how to shop, sell, and manage everything through natural conversation.
              </p>
              <div className="max-w-lg mx-auto relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'hsl(220, 20%, 50%)' }} />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: 'hsl(220, 30%, 15%)',
                    border: '1px solid hsl(220, 30%, 25%)',
                    color: 'white',
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>On this page</p>
              {filteredSections.map(({ id, title, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${activeSection === id ? 'font-medium' : ''}`}
                  style={{
                    background: activeSection === id ? 'hsl(220, 70%, 55%, 0.1)' : 'transparent',
                    color: activeSection === id ? 'hsl(220, 70%, 65%)' : 'hsl(var(--muted-foreground))',
                    borderLeft: activeSection === id ? '2px solid hsl(220, 70%, 55%)' : '2px solid transparent',
                  }}
                >
                  <Icon size={14} />
                  <span className="truncate">{title}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 max-w-4xl" ref={contentRef}>
            <div className="space-y-16">

              {/* ═══ WHAT IS ROZARE ═══ */}
              <DocSection id="what-is-rozare" title="What is Rozare?" icon={Sparkles}>
                <p>
                  <strong>Rozare</strong> is the <strong>world's first AI-powered e-commerce platform</strong> that lets you shop, sell, and manage everything through natural conversation. Instead of clicking through menus and filling out forms, you simply <em>talk</em> to your personal AI assistant — and it does the rest.
                </p>
                <FeatureGrid features={[
                  { icon: Bot, title: 'AI-First Experience', desc: 'Chat naturally to search, buy, sell, and manage. The AI understands context, remembers your preferences, and takes actions for you.' },
                  { icon: Smartphone, title: 'WhatsApp Integration', desc: 'Manage your store, place orders, and get real-time notifications — all from WhatsApp. No app download needed.' },
                  { icon: Globe, title: 'Global Marketplace', desc: '10,000+ products from 500+ sellers across 50+ countries. Multi-currency support and localized shopping.' },
                  { icon: Shield, title: 'Verified & Trusted', desc: 'Store verification badges, trust scores, reviews, and AI-powered fraud detection keep the platform safe.' },
                ]} />
                <h3>How Rozare is Different</h3>
                <p>Traditional e-commerce makes you browse, filter, compare, add to cart, fill checkout forms, and track orders manually. On Rozare, you just say:</p>
                <CodeBlock lines={[
                  '"Find me a blue dress under $50"',
                  '"Show me trending sneakers"',
                  '"Place an order for this — cash on delivery"',
                  '"How many orders did I get today?"',
                  '"Apply 20% discount to all my summer products"',
                ]} />
                <p>The AI handles everything — searching, comparing, ordering, managing inventory, analytics, and even giving you business strategies. It's like having a personal shopper AND a business advisor, available 24/7.</p>
              </DocSection>

              {/* ═══ AI-POWERED SHOPPING ═══ */}
              <DocSection id="ai-powered-shopping" title="AI-Powered Shopping" icon={Bot}>
                <p>
                  The Rozare AI is your personal shopping companion. It's not just a chatbot — it's a <strong>fully integrated assistant</strong> that can execute real actions on your account: search products, manage your cart, place orders, apply coupons, track deliveries, and even give you style advice.
                </p>
                <h3>What the AI Can Do for Shoppers</h3>
                <ul>
                  <li><strong>Smart Product Search</strong> — Understands natural language, slang, and even Urdu/Hindi terms. Say "chapal" and it finds sandals. Say "something nice for a date night" and it suggests outfits.</li>
                  <li><strong>Style & Outfit Advice</strong> — Get personalized fashion recommendations with color palettes, occasion-based styling, and complete outfit suggestions.</li>
                  <li><strong>Cart Management</strong> — "Add this to my cart", "Remove the shoes", "What's in my cart?" — manage your cart entirely through chat.</li>
                  <li><strong>One-Chat Ordering</strong> — No need to go through checkout pages. Tell the AI what you want, confirm your address and payment method, and the order is placed.</li>
                  <li><strong>Order Tracking</strong> — "Where's my order?", "Show me my recent orders", "Cancel my last order" — all through conversation.</li>
                  <li><strong>Coupon Discovery</strong> — The AI finds available coupons and validates them against your cart automatically.</li>
                  <li><strong>Wishlist & Favorites</strong> — "Save this for later", "Show my wishlist" — manage your wishlist through chat.</li>
                  <li><strong>Multilingual Support</strong> — Understands English, Urdu, Hindi, and common slang terms for products.</li>
                </ul>

                <h3>How to Access the AI</h3>
                <StepList steps={[
                  'Click the chat bubble (💬) on any page — it\'s always there in the bottom-right corner.',
                  'Or visit the full AI Chat page at /ai-chat for a larger conversation view with history sidebar.',
                  'Or chat via WhatsApp (coming soon) — same AI, same capabilities, on your phone.',
                  'Type naturally. No commands needed. Just describe what you want.',
                ]} />

                <InfoBox type="tip" title="Pro Tip">
                  The AI remembers your conversation context. If you're discussing dresses and then say "show me something cheaper", it knows you mean cheaper dresses — not cheaper everything.
                </InfoBox>
              </DocSection>

              {/* ═══ GETTING STARTED ═══ */}
              <DocSection id="getting-started" title="Getting Started" icon={Zap}>
                <h3>Creating an Account</h3>
                <StepList steps={[
                  'Visit rozare.com and click "Sign Up" in the top navigation.',
                  'Enter your email, create a username, and set a secure password.',
                  'Verify your email address via the OTP sent to your inbox.',
                  'You\'re in! Start shopping immediately or set up your profile.',
                ]} />

                <h3>Setting Up Your Profile</h3>
                <p>A complete profile helps the AI personalize your experience:</p>
                <ul>
                  <li><strong>Username</strong> — How you'll appear on the platform</li>
                  <li><strong>Shipping Address</strong> — Save your default address for one-click ordering</li>
                  <li><strong>Currency Preference</strong> — Set your preferred currency (USD, PKR, EUR, etc.)</li>
                  <li><strong>Saved Addresses</strong> — Add multiple addresses (home, office, etc.) for quick checkout</li>
                </ul>

                <InfoBox type="info" title="Quick Start">
                  You can skip profile setup and start shopping immediately. The AI will ask for your shipping details when you're ready to place an order.
                </InfoBox>

                <h3>Browsing Without an Account</h3>
                <p>Guests can browse products, search the catalog, and get style advice from the AI. However, to place orders, manage a wishlist, or get personalized recommendations, you'll need to sign in.</p>
              </DocSection>

              {/* ═══ SHOPPING GUIDE ═══ */}
              <DocSection id="shopping-guide" title="Shopping Guide" icon={ShoppingBag}>
                <h3>Finding Products</h3>
                <p>There are multiple ways to discover products on Rozare:</p>
                <ul>
                  <li><strong>AI Search</strong> — Ask the AI: "Show me wireless earbuds under $30" or "Find me a birthday gift for my sister"</li>
                  <li><strong>Catalog Browse</strong> — Visit the home page to browse all products with filters for category, price, and rating</li>
                  <li><strong>Store Pages</strong> — Visit /marketplace to browse all stores, or /marketplace/trusted for verified stores only</li>
                  <li><strong>Direct Search</strong> — Use the search bar on the products page</li>
                </ul>

                <h3>Placing an Order</h3>
                <p>You can place orders two ways:</p>
                <h4>1. Through the AI (Recommended)</h4>
                <CodeBlock lines={[
                  'You: "I want to order the blue wireless earbuds"',
                  'AI: "Great choice! The XSound Pro Earbuds are $24.99. They come in Blue and Black. Which color?"',
                  'You: "Blue"',
                  'AI: "Payment method? Cash on Delivery or Stripe?"',
                  'You: "COD"',
                  'AI: "I\'ll ship to your saved address: 123 Main St, Lahore. Ready to confirm?"',
                  'You: "Yes, place it"',
                  'AI: "🎉 Order #ORD-1234 placed! $24.99 via COD. Est. delivery: 5 days"',
                ]} />

                <h4>2. Through the Website</h4>
                <StepList steps={[
                  'Browse products and click on one to view details.',
                  'Select color/size options and click "Add to Cart".',
                  'Go to /checkout and enter your shipping details.',
                  'Choose payment method (Cash on Delivery or Stripe).',
                  'Confirm and place your order.',
                ]} />

                <h3>Order Tracking</h3>
                <p>Track your orders at any time:</p>
                <ul>
                  <li><strong>Via AI</strong>: "Show me my orders" or "What's the status of my last order?"</li>
                  <li><strong>Via website</strong>: Visit /track-order or check your profile</li>
                  <li><strong>Order statuses</strong>: Pending → Confirmed → Processing → Shipped → Delivered</li>
                </ul>
              </DocSection>

              {/* ═══ BECOME A SELLER ═══ */}
              <DocSection id="become-a-seller" title="Become a Seller" icon={Store}>
                <p>Anyone can become a seller on Rozare. It's free to sign up, and you get a fully customizable online store with AI-powered management tools.</p>
                
                <h3>How to Sign Up as a Seller</h3>
                <StepList steps={[
                  'Visit rozare.com/become-seller',
                  'Enter your email address and click "Get Started"',
                  'Verify your email with the 6-digit OTP code sent to your inbox',
                  'Create a password for your account',
                  'Your seller account is created! You\'re redirected to your seller dashboard.',
                  'Your free store is automatically created. Start adding products immediately.',
                ]} />

                <h3>What You Get as a Seller</h3>
                <FeatureGrid features={[
                  { icon: Store, title: 'Free Online Store', desc: 'A fully customizable storefront with your own slug (rozare.com/store/your-name), logo, banner, description, and social links.' },
                  { icon: Bot, title: 'AI Business Partner', desc: 'An AI assistant that manages your products, analyzes sales, suggests growth strategies, and handles orders — all through chat.' },
                  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Revenue tracking, top products, order status breakdown, stock alerts, and customer insights — in real-time.' },
                  { icon: Smartphone, title: 'WhatsApp Management', desc: 'Get order notifications on WhatsApp. Add products, update orders, check analytics — all from your phone.' },
                  { icon: Ticket, title: 'Coupon System', desc: 'Create unlimited coupons with percentage/fixed discounts, min order amounts, max uses, expiry dates, and per-user limits.' },
                  { icon: Truck, title: 'Shipping Control', desc: 'Configure free, standard, and fast shipping methods with custom costs and delivery timelines.' },
                ]} />

                <h3>Requirements</h3>
                <ul>
                  <li>A valid email address</li>
                  <li>At least one product to sell</li>
                  <li>No upfront fees — start with a free trial</li>
                  <li>Optional: Apply for store verification to get a trust badge</li>
                </ul>

                <InfoBox type="tip" title="Already have an account?">
                  If you already have a Rozare buyer account, you can request a role change to seller through the admin team or create a new seller account.
                </InfoBox>
              </DocSection>

              {/* ═══ SELLER DASHBOARD GUIDE ═══ */}
              <DocSection id="seller-guide" title="Seller Dashboard Guide" icon={Settings}>
                <p>The seller dashboard is your command center. Access it at <code>/seller/dashboard</code> after logging in as a seller.</p>

                <h3>Dashboard Sections</h3>
                <ul>
                  <li><strong>Overview</strong> — Quick stats: total revenue, orders, products, store views, trust count</li>
                  <li><strong>Products</strong> — Add, edit, delete products. Bulk discount and price updates. Stock management.</li>
                  <li><strong>Orders</strong> — View all orders containing your products. Update status (Confirmed → Processing → Shipped → Delivered). Filter by status.</li>
                  <li><strong>Coupons</strong> — Create, manage, toggle, and delete discount coupons.</li>
                  <li><strong>Store Settings</strong> — Update store name, description, logo, banner, return policy, social links.</li>
                  <li><strong>Shipping</strong> — Configure shipping methods (free, standard, fast) with costs and delivery times.</li>
                  <li><strong>Analytics</strong> — Detailed revenue charts, top-selling products, order trends, customer demographics.</li>
                  <li><strong>Subscription</strong> — View your current plan, trial status, and upgrade options.</li>
                </ul>

                <h3>Adding a Product</h3>
                <StepList steps={[
                  'Go to Products → Add Product (or tell the AI: "I want to add a product")',
                  'Fill in: Product name, price, category, brand, stock quantity',
                  'Optional: Add description, images, tags, colors, size options, discounted price',
                  'Click Save. Your product is instantly live in the marketplace.',
                ]} />

                <h3>Managing Orders</h3>
                <p>When a customer orders one of your products:</p>
                <StepList steps={[
                  'You receive a notification (in-app + WhatsApp if configured)',
                  'The order appears in your Orders tab with status "Pending"',
                  'Update the status as you process it: Confirmed → Processing → Shipped → Delivered',
                  'The customer is notified of each status change',
                ]} />

                <InfoBox type="important" title="Multi-Seller Orders">
                  If a customer orders products from multiple sellers in one order, each seller only sees their own products from that order. You never see another seller's items, prices, or revenue. Everything is fully isolated.
                </InfoBox>
              </DocSection>

              {/* ═══ AI FOR SELLERS ═══ */}
              <DocSection id="ai-for-sellers" title="AI for Sellers" icon={BarChart3}>
                <p>The Rozare AI isn't just for shoppers — it's your <strong>personal business advisor</strong>. It has full access to your store data and can execute any action on your behalf.</p>

                <h3>What the AI Can Do for Sellers</h3>
                <ul>
                  <li><strong>Product Management</strong> — "Add a product called Summer Dress, $49.99, category: Dresses"</li>
                  <li><strong>Bulk Operations</strong> — "Apply 20% discount to all my electronics" or "Raise prices by $5 on shoes"</li>
                  <li><strong>Analytics On-Demand</strong> — "How much revenue did I make this month?" or "What are my top-selling products?"</li>
                  <li><strong>Order Management</strong> — "Show me pending orders" or "Mark order #ORD-1234 as shipped"</li>
                  <li><strong>Coupon Creation</strong> — "Create a 15% off coupon valid for 7 days, max 100 uses"</li>
                  <li><strong>Growth Strategies</strong> — "Give me tips to increase sales" — the AI analyzes your data and gives personalized advice</li>
                  <li><strong>Stock Alerts</strong> — The AI proactively warns you about low-stock products</li>
                  <li><strong>Store Updates</strong> — "Update my store description to..." or "Change my return policy"</li>
                </ul>

                <h3>Dual Mode: Seller + Buyer</h3>
                <p>Sellers can also shop on Rozare. The AI intelligently detects whether you're managing your store or shopping:</p>
                <CodeBlock lines={[
                  '// Seller mode (default):',
                  '"Show my products" → Shows YOUR store\'s products',
                  '"My orders" → Shows orders containing YOUR products',
                  '',
                  '// Buyer mode (auto-detected):',
                  '"Find me a laptop bag" → Searches ALL products on Rozare',
                  '"Add to cart" → Adds to YOUR shopping cart',
                  '"Place order" → Places order as a buyer',
                ]} />

                <InfoBox type="tip" title="Switch Modes">
                  If the AI isn't sure which mode you're in, it'll ask: "Do you want to see your store's listings, or are you looking to buy for yourself?" You can also say "as a buyer" or "for my store" to switch explicitly.
                </InfoBox>
              </DocSection>

              {/* ═══ WHATSAPP INTEGRATION ═══ */}
              <DocSection id="whatsapp-integration" title="WhatsApp Integration" icon={Smartphone}>
                <p>Rozare brings your entire store to WhatsApp. Get notifications, manage orders, add products, and check analytics — all without opening a browser.</p>

                <h3>For Sellers</h3>
                <ul>
                  <li><strong>Order Notifications</strong> — Instant WhatsApp alerts when you receive a new order</li>
                  <li><strong>AI Store Management</strong> — Chat with the Rozare AI on WhatsApp to manage your store</li>
                  <li><strong>Product Management</strong> — Add, edit, or delete products via WhatsApp chat</li>
                  <li><strong>Analytics</strong> — Ask "How are my sales today?" and get instant stats</li>
                  <li><strong>Order Updates</strong> — Mark orders as shipped/delivered from WhatsApp</li>
                </ul>

                <h3>For Shoppers</h3>
                <ul>
                  <li><strong>Order Updates</strong> — Get delivery status updates on WhatsApp</li>
                  <li><strong>AI Shopping</strong> — Search products, get recommendations, and place orders via WhatsApp chat</li>
                  <li><strong>Order Tracking</strong> — Ask "Where's my order?" on WhatsApp</li>
                </ul>

                <h3>Setting Up WhatsApp</h3>
                <StepList steps={[
                  'Go to your Seller Dashboard → Settings → WhatsApp',
                  'Enter your WhatsApp number',
                  'Verify with the OTP sent to your WhatsApp',
                  'Choose which notifications you want to receive',
                  'Start chatting with the AI on WhatsApp to manage your store!',
                ]} />

                <InfoBox type="info" title="Same AI, Any Channel">
                  The Rozare AI is the same whether you access it from the website chat, the full AI page, or WhatsApp. Your conversation history and capabilities are identical across all channels.
                </InfoBox>
              </DocSection>

              {/* ═══ SUBSCRIPTION PLANS ═══ */}
              <DocSection id="subscription-plans" title="Subscription Plans" icon={Award}>
                <p>Rozare offers flexible plans for sellers of all sizes. Every new seller starts with a free trial.</p>

                <div className="grid md:grid-cols-3 gap-4 my-6">
                  <PlanCard name="Starter" price="Free Trial" features={[
                    'Up to 25 products', 'Basic analytics', 'Standard support',
                    'AI store assistant', 'Manual shipping setup', 'Basic coupons',
                  ]} />
                  <PlanCard name="Growth" price="$19/mo" featured features={[
                    'Up to 200 products', 'Advanced analytics', 'Priority support',
                    'AI business advisor', 'WhatsApp integration', 'Unlimited coupons',
                    'Bulk operations', 'Store verification eligible',
                  ]} />
                  <PlanCard name="Pro" price="$49/mo" features={[
                    'Unlimited products', 'Full analytics suite', 'Dedicated support',
                    'AI growth strategies', 'WhatsApp + priority processing',
                    'Custom branding options', 'API access', 'Team member accounts',
                  ]} />
                </div>

                <InfoBox type="tip" title="Free Trial">
                  All new sellers get a free trial period to explore the platform. No credit card required. You can upgrade anytime from your Subscription page.
                </InfoBox>
              </DocSection>

              {/* ═══ PAYMENTS ═══ */}
              <DocSection id="payments" title="Payments & Checkout" icon={CreditCard}>
                <h3>Payment Methods</h3>
                <ul>
                  <li><strong>Cash on Delivery (COD)</strong> — Pay when your order arrives. Available in supported regions.</li>
                  <li><strong>Stripe</strong> — Secure online payment via credit/debit card. Powered by Stripe for bank-grade security.</li>
                </ul>

                <h3>Checkout Process</h3>
                <p>Rozare offers two checkout experiences:</p>
                <ul>
                  <li><strong>AI Checkout</strong> — Tell the AI "place my order" and it handles everything: address confirmation, payment method selection, and order placement — all in one conversation.</li>
                  <li><strong>Traditional Checkout</strong> — Standard checkout flow at /checkout with form fields for shipping info and payment.</li>
                </ul>

                <h3>For Sellers: Receiving Payments</h3>
                <p>Revenue from your sales is tracked in your dashboard analytics. Payment disbursement details are managed through your seller account settings.</p>
              </DocSection>

              {/* ═══ SHIPPING ═══ */}
              <DocSection id="shipping" title="Shipping & Delivery" icon={Truck}>
                <h3>Shipping Methods</h3>
                <p>Sellers configure their own shipping methods. Common options include:</p>
                <ul>
                  <li><strong>Free Shipping</strong> — No cost, typically 5-7 days</li>
                  <li><strong>Standard Shipping</strong> — Moderate cost, 3-5 days</li>
                  <li><strong>Express/Fast Shipping</strong> — Higher cost, 1-2 days</li>
                </ul>

                <h3>For Sellers: Setting Up Shipping</h3>
                <StepList steps={[
                  'Go to Seller Dashboard → Shipping',
                  'Add shipping methods (free, standard, fast)',
                  'Set cost and estimated delivery days for each',
                  'Toggle methods active/inactive as needed',
                  'Or tell the AI: "Set up standard shipping at $5 with 3-day delivery"',
                ]} />
              </DocSection>

              {/* ═══ TRUST & SAFETY ═══ */}
              <DocSection id="trust-safety" title="Trust & Safety" icon={Shield}>
                <h3>How Rozare Keeps You Safe</h3>
                <ul>
                  <li><strong>Store Verification</strong> — Stores can apply for verification. Verified stores get a ✅ badge, indicating they've been reviewed by the Rozare team.</li>
                  <li><strong>Trust Scores</strong> — Every store has a trust count based on customer endorsements.</li>
                  <li><strong>Store Reviews</strong> — Customers can rate and review stores.</li>
                  <li><strong>Complaint System</strong> — Report issues directly to the Rozare team. Categories: product issues, delivery problems, refund requests, seller complaints.</li>
                  <li><strong>Role-Based Security</strong> — The AI strictly enforces role boundaries. Users can't access seller tools. Sellers can't access other sellers' data. Every action is authenticated.</li>
                  <li><strong>Data Isolation</strong> — Sellers only see their own products, orders, and revenue — even in multi-seller orders.</li>
                </ul>
              </DocSection>

              {/* ═══ STORE VERIFICATION ═══ */}
              <DocSection id="store-verification" title="Store Verification" icon={CheckCircle}>
                <p>Getting your store verified adds a ✅ badge and builds customer trust.</p>
                <h3>How to Apply</h3>
                <StepList steps={[
                  'Go to your Seller Dashboard → Store Settings → Verification',
                  'Or tell the AI: "Apply for verification"',
                  'Provide your contact details and a brief message about your store',
                  'The Rozare admin team reviews your application',
                  'If approved, your store gets a verified badge visible to all customers',
                ]} />
                <h3>Requirements</h3>
                <ul>
                  <li>Active store with at least a few products listed</li>
                  <li>Complete store profile (name, description, logo)</li>
                  <li>Valid contact information</li>
                  <li>No policy violations on your account</li>
                </ul>
              </DocSection>

              {/* ═══ ORDERS & RETURNS ═══ */}
              <DocSection id="orders-returns" title="Orders & Returns" icon={Package}>
                <h3>Order Lifecycle</h3>
                <div className="flex flex-wrap items-center gap-2 my-4">
                  {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map((s, i) => (
                    <React.Fragment key={s}>
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'hsl(220, 70%, 55%, 0.1)', color: 'hsl(220, 70%, 65%)' }}>{s}</span>
                      {i < 4 && <ArrowRight size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />}
                    </React.Fragment>
                  ))}
                </div>

                <h3>Cancelling an Order</h3>
                <p>You can cancel an order if it hasn't been delivered yet:</p>
                <ul>
                  <li><strong>Via AI</strong>: "Cancel my order #ORD-1234"</li>
                  <li><strong>Via dashboard</strong>: Find the order and click Cancel</li>
                  <li>Orders that are already "Delivered" or "Cancelled" cannot be cancelled again</li>
                </ul>

                <h3>Returns & Refunds</h3>
                <p>Return policies are set by each seller individually. Check the seller's store page for their return policy before purchasing. To request a return, submit a complaint through the AI or the complaint form.</p>
              </DocSection>

              {/* ═══ COUPONS ═══ */}
              <DocSection id="coupons-discounts" title="Coupons & Discounts" icon={Ticket}>
                <h3>For Shoppers</h3>
                <ul>
                  <li>Ask the AI: "Are there any coupons available?" to see active coupons</li>
                  <li>Apply coupons at checkout or tell the AI: "Apply coupon SAVE20"</li>
                  <li>The AI automatically validates expiry dates, minimum order amounts, and usage limits</li>
                </ul>

                <h3>For Sellers: Creating Coupons</h3>
                <p>Create coupons through your dashboard or via the AI:</p>
                <CodeBlock lines={[
                  '"Create a coupon SUMMER20, 20% off, expires in 30 days, max 100 uses"',
                  '"Make a $10 off coupon for orders over $50"',
                  '"Disable coupon WINTER10"',
                  '"Show me all my coupons"',
                ]} />
                <p>Coupon options include: percentage or fixed discount, min order amount, max discount cap, expiry date, max total uses, and per-user use limits.</p>
              </DocSection>

              {/* ═══ NOTIFICATIONS ═══ */}
              <DocSection id="notifications" title="Notifications" icon={Bell}>
                <p>Stay updated with multi-channel notifications:</p>
                <ul>
                  <li><strong>In-App</strong> — Bell icon in the top navigation shows unread count</li>
                  <li><strong>Push Notifications</strong> — Browser push notifications for important updates</li>
                  <li><strong>WhatsApp</strong> — Order updates and alerts delivered to your WhatsApp</li>
                  <li><strong>Email</strong> — Order confirmations and account-related emails</li>
                </ul>
                <p>Manage your notifications through the AI: "Show my notifications" or "Mark all as read".</p>
              </DocSection>

              {/* ═══ ADMIN GUIDE ═══ */}
              <DocSection id="admin-guide" title="Admin Guide" icon={Lock}>
                <p>Rozare admins have full platform control through the admin dashboard and the AI Platform Commander.</p>
                <h3>Admin Capabilities</h3>
                <ul>
                  <li><strong>User Management</strong> — Search, view, block/unblock, delete users, change roles</li>
                  <li><strong>Order Oversight</strong> — View all orders platform-wide, cancel any order</li>
                  <li><strong>Store Management</strong> — View all stores, approve/reject/revoke verifications</li>
                  <li><strong>Complaint Resolution</strong> — View, respond to, and resolve all complaints</li>
                  <li><strong>Broadcast Notifications</strong> — Send platform-wide announcements to all users or targeted audiences</li>
                  <li><strong>Tax Configuration</strong> — Set platform-wide tax (percentage or fixed amount)</li>
                  <li><strong>Subscription Management</strong> — View all seller subscriptions and statuses</li>
                  <li><strong>Platform Analytics</strong> — Total users, revenue, orders, stores, growth metrics</li>
                </ul>
                <p>All admin actions are available through both the dashboard UI and the AI chat.</p>
              </DocSection>

              {/* ═══ TECHNICAL OVERVIEW ═══ */}
              <DocSection id="api-reference" title="Technical Overview" icon={FileText}>
                <h3>Technology Stack</h3>
                <ul>
                  <li><strong>Frontend</strong> — React + Vite, Tailwind CSS, Framer Motion</li>
                  <li><strong>Backend</strong> — Node.js, Express.js, MongoDB (Mongoose)</li>
                  <li><strong>AI</strong> — OpenRouter API (Gemini 2.5 Flash) with server-side tool execution</li>
                  <li><strong>Mobile</strong> — React Native / Expo</li>
                  <li><strong>WhatsApp</strong> — Evolution API integration</li>
                  <li><strong>Payments</strong> — Stripe integration</li>
                  <li><strong>Media</strong> — Cloudinary for image uploads</li>
                  <li><strong>Hosting</strong> — Heroku (backend), Vercel (frontend)</li>
                </ul>

                <h3>AI Architecture</h3>
                <p>The Rozare AI uses a <strong>server-side tool execution loop</strong>:</p>
                <StepList steps={[
                  'User sends a message via SSE (Server-Sent Events) streaming',
                  'The AI model decides which tool(s) to call based on the request',
                  'Tools are executed server-side against MongoDB (not on the client)',
                  'Results are fed back to the AI model',
                  'The AI generates a natural language summary and streams it back',
                  'This loop repeats up to 5 times per request for complex multi-step operations',
                ]} />
                <p>Security: Every tool call is validated against the user's role. Even if the AI hallucinates a tool, the server-side allowlist blocks unauthorized access.</p>
              </DocSection>

              {/* ═══ FAQ ═══ */}
              <DocSection id="faq" title="Frequently Asked Questions" icon={HelpCircle}>
                <FAQItem q="Is Rozare free to use for shoppers?" a="Yes! Shopping on Rozare is completely free. You only pay for the products you buy. There are no membership fees for shoppers." />
                <FAQItem q="How much does it cost to sell on Rozare?" a="New sellers start with a free trial. After the trial, you can choose from Starter (free tier with limits), Growth ($19/mo), or Pro ($49/mo) plans." />
                <FAQItem q="Can I use Rozare from my phone?" a="Yes! Rozare has a responsive website that works on all devices. There's also a React Native mobile app, and you can manage everything via WhatsApp." />
                <FAQItem q="How does the AI know about my store?" a="The AI has real-time access to your store data through secure server-side tools. It can see your products, orders, analytics, coupons, and settings — only for YOUR store." />
                <FAQItem q="Can another seller see my data?" a="Absolutely not. The AI enforces strict data isolation. Each seller can only see their own products, orders, revenue, and store data. Even in multi-seller orders, each seller only sees their own portion." />
                <FAQItem q="Is my data safe?" a="Yes. All data is encrypted in transit (HTTPS) and at rest. Authentication uses JWT tokens. The AI never stores or shares personal data outside your session." />
                <FAQItem q="What payment methods are available?" a="Currently Cash on Delivery (COD) and Stripe (credit/debit cards). More payment methods are coming soon." />
                <FAQItem q="How do I get my store verified?" a="Apply through your seller dashboard or tell the AI 'Apply for verification'. The Rozare team reviews applications and grants verified badges to qualifying stores." />
                <FAQItem q="Can I manage my store from WhatsApp?" a="Yes! Connect your WhatsApp number in seller settings. You'll get order notifications and can manage your store by chatting with the Rozare AI on WhatsApp." />
                <FAQItem q="What makes Rozare different from other e-commerce platforms?" a="Rozare is the world's first AI-powered e-commerce platform. Instead of clicking through menus, you chat naturally with an AI that can search, buy, sell, manage inventory, analyze sales, and give growth strategies — all through conversation, on web or WhatsApp." />
              </DocSection>

            </div>

            {/* Bottom CTA */}
            <div className="mt-20 mb-8 text-center p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%, 0.1), hsl(280, 60%, 55%, 0.1))', border: '1px solid hsl(220, 70%, 55%, 0.2)' }}>
              <h2 className="text-2xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Ready to Get Started?</h2>
              <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>Join thousands of shoppers and sellers on the world's first AI-powered marketplace.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/signup" className="px-6 py-3 rounded-xl font-medium text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(280, 60%, 55%))' }}>
                  Start Shopping
                </Link>
                <Link to="/become-seller" className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}>
                  Become a Seller
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Helper Components ───

function DocSection({ id, title, icon: Icon, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(220, 70%, 55%, 0.1)' }}>
          <Icon size={20} style={{ color: 'hsl(220, 70%, 65%)' }} />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>{title}</h2>
      </div>
      <div className="prose prose-sm md:prose-base max-w-none space-y-4
        [&>p]:leading-relaxed [&>ul]:space-y-2 [&>ul>li]:leading-relaxed
        [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-3
        [&>h4]:text-base [&>h4]:font-medium [&>h4]:mt-6 [&>h4]:mb-2"
        style={{ color: 'hsl(var(--foreground))' }}>
        {children}
      </div>
    </section>
  );
}

function FeatureGrid({ features }) {
  return (
    <div className="grid md:grid-cols-2 gap-4 my-6">
      {features.map(({ icon: Icon, title, desc }, i) => (
        <div key={i} className="p-4 rounded-xl" style={{ background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Icon size={16} style={{ color: 'hsl(220, 70%, 65%)' }} />
            <h4 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{title}</h4>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{desc}</p>
        </div>
      ))}
    </div>
  );
}

function StepList({ steps }) {
  return (
    <div className="space-y-3 my-4">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'hsl(220, 70%, 55%, 0.15)', color: 'hsl(220, 70%, 65%)' }}>{i + 1}</div>
          <p className="text-sm leading-relaxed pt-0.5" style={{ color: 'hsl(var(--foreground))' }}>{step}</p>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ lines }) {
  return (
    <div className="rounded-xl overflow-hidden my-4 text-sm" style={{ background: 'hsl(220, 30%, 10%)', border: '1px solid hsl(220, 30%, 20%)' }}>
      <div className="p-4 overflow-x-auto">
        {lines.map((line, i) => (
          <div key={i} className="font-mono whitespace-pre" style={{ color: line.startsWith('//') ? 'hsl(220, 20%, 50%)' : line.startsWith('"') ? 'hsl(150, 60%, 60%)' : 'hsl(220, 20%, 80%)' }}>
            {line || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ type, title, children }) {
  const styles = {
    tip: { bg: 'hsl(150, 60%, 45%, 0.08)', border: 'hsl(150, 60%, 45%, 0.3)', icon: '💡', color: 'hsl(150, 60%, 55%)' },
    info: { bg: 'hsl(220, 70%, 55%, 0.08)', border: 'hsl(220, 70%, 55%, 0.3)', icon: 'ℹ️', color: 'hsl(220, 70%, 65%)' },
    important: { bg: 'hsl(40, 80%, 50%, 0.08)', border: 'hsl(40, 80%, 50%, 0.3)', icon: '⚠️', color: 'hsl(40, 80%, 55%)' },
  };
  const s = styles[type] || styles.info;
  return (
    <div className="rounded-xl p-4 my-4" style={{ background: s.bg, borderLeft: `3px solid ${s.border}` }}>
      <div className="flex items-center gap-2 mb-1">
        <span>{s.icon}</span>
        <span className="text-sm font-semibold" style={{ color: s.color }}>{title}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>{children}</p>
    </div>
  );
}

function PlanCard({ name, price, features, featured }) {
  return (
    <div className={`p-5 rounded-xl ${featured ? 'ring-2' : ''}`}
      style={{
        background: featured ? 'hsl(220, 70%, 55%, 0.08)' : 'hsl(var(--muted) / 0.3)',
        border: '1px solid hsl(var(--border))',
        ringColor: featured ? 'hsl(220, 70%, 55%)' : undefined,
      }}>
      {featured && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'hsl(220, 70%, 55%, 0.2)', color: 'hsl(220, 70%, 65%)' }}>Most Popular</span>}
      <h3 className="text-lg font-bold mt-2" style={{ color: 'hsl(var(--foreground))' }}>{name}</h3>
      <p className="text-2xl font-bold mb-4" style={{ color: 'hsl(220, 70%, 65%)' }}>{price}</p>
      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <CheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'hsl(150, 60%, 50%)' }} />
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b py-4" style={{ borderColor: 'hsl(var(--border))' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left gap-3">
        <span className="font-medium text-sm" style={{ color: 'hsl(var(--foreground))' }}>{q}</span>
        <ChevronRight size={16} className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} style={{ color: 'hsl(var(--muted-foreground))' }} />
      </button>
      {open && (
        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="text-sm mt-2 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{a}</motion.p>
      )}
    </div>
  );
}

export default DocsPage;
