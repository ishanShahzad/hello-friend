# Stripe Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         STRIPE DASHBOARD                         │
│  ┌──────────────┐                           ┌──────────────┐    │
│  │  Test Mode   │                           │  Live Mode   │    │
│  │              │                           │              │    │
│  │ Test Keys    │                           │ Live Keys    │    │
│  │ Test Webhook │                           │ Live Webhook │    │
│  └──────────────┘                           └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Keys & Webhooks
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ENVIRONMENT VARIABLES                       │
│                                                                  │
│  Backend (Heroku):                Frontend (Vercel):            │
│  ┌────────────────────────┐      ┌────────────────────────┐    │
│  │ STRIPE_MODE=test/live  │      │ VITE_STRIPE_MODE       │    │
│  │ STRIPE_TEST_SECRET_KEY │      │ VITE_STRIPE_TEST_PUB   │    │
│  │ STRIPE_LIVE_SECRET_KEY │      │ VITE_STRIPE_LIVE_PUB   │    │
│  │ STRIPE_TEST_WEBHOOK    │      └────────────────────────┘    │
│  │ STRIPE_LIVE_WEBHOOK    │                                     │
│  └────────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Configuration
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│                                                                  │
│  Backend:                          Frontend:                    │
│  ┌────────────────────────┐      ┌────────────────────────┐    │
│  │ config/stripe.js       │      │ Checkout.jsx           │    │
│  │                        │      │                        │    │
│  │ - Mode detection       │      │ - Load Stripe.js       │    │
│  │ - Key selection        │      │ - Create checkout      │    │
│  │ - Stripe init          │      │ - Redirect to Stripe   │    │
│  └────────────────────────┘      └────────────────────────┘    │
│                                                                  │
│  Controllers:                                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ - orderController.js (product payments)                │    │
│  │ - subscriptionController.js (recurring billing)        │    │
│  │ - subdomainPurchaseController.js (one-time purchase)   │    │
│  │ - sesssionController.js (session retrieval)            │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Payment Flow Diagram

### Product Order Flow

```
┌──────────┐
│ Customer │
└────┬─────┘
     │ 1. Browse products
     ▼
┌──────────────┐
│   Frontend   │
│  (Checkout)  │
└────┬─────────┘
     │ 2. Place order
     │    POST /api/order/place
     ▼
┌──────────────────────┐
│      Backend         │
│  orderController.js  │
└────┬─────────────────┘
     │ 3. Create Stripe session
     │    stripe.checkout.sessions.create()
     ▼
┌──────────────┐
│    Stripe    │
│   Checkout   │
└────┬─────────┘
     │ 4. Customer pays
     │    (card details)
     ▼
┌──────────────┐
│    Stripe    │
│   Webhook    │
└────┬─────────┘
     │ 5. checkout.session.completed
     │    POST /webhook
     ▼
┌──────────────────────┐
│      Backend         │
│  Webhook Handler     │
└────┬─────────────────┘
     │ 6. Update order
     │    - Mark as paid
     │    - Confirm order
     │    - Reduce stock
     │    - Send email
     ▼
┌──────────────┐
│   Database   │
│   (MongoDB)  │
└──────────────┘
```

---

## Mode Switching Logic

### Backend (config/stripe.js)

```javascript
const STRIPE_MODE = process.env.STRIPE_MODE || 'test';

const STRIPE_SECRET_KEY = STRIPE_MODE === 'live' 
  ? process.env.STRIPE_LIVE_SECRET_KEY 
  : process.env.STRIPE_TEST_SECRET_KEY;

const STRIPE_WEBHOOK_SECRET = STRIPE_MODE === 'live'
  ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
  : process.env.STRIPE_TEST_WEBHOOK_SECRET;

const stripe = require('stripe')(STRIPE_SECRET_KEY);
```

### Frontend (Checkout.jsx)

```javascript
const STRIPE_MODE = import.meta.env.VITE_STRIPE_MODE || 'test';

const STRIPE_PUBLISHABLE_KEY = STRIPE_MODE === 'live'
  ? import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY
  : import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
```

---

## Environment Configuration Matrix

| Environment | Backend Mode | Frontend Mode | Keys Used | Purpose |
|-------------|--------------|---------------|-----------|---------|
| **Local Dev** | `test` | `test` | Test keys | Development |
| **Staging** | `test` | `test` | Test keys | Pre-production testing |
| **Production** | `live` | `live` | Live keys | Real payments |

---

## Webhook Event Flow

```
┌──────────────┐
│    Stripe    │
│   (Event)    │
└────┬─────────┘
     │ 1. Event occurs
     │    (payment success, subscription cancel, etc.)
     ▼
┌──────────────────────┐
│   Stripe Webhook     │
│   Delivery System    │
└────┬─────────────────┘
     │ 2. POST /webhook
     │    with signature
     ▼
┌──────────────────────┐
│  Backend Webhook     │
│     Handler          │
│   (server.js)        │
└────┬─────────────────┘
     │ 3. Verify signature
     │    stripe.webhooks.constructEvent()
     ▼
┌──────────────────────┐
│  Event Type Router   │
└────┬─────────────────┘
     │
     ├─ checkout.session.completed ──────────┐
     │                                        ▼
     │                              ┌──────────────────┐
     │                              │ Order Processing │
     │                              │ - Mark as paid   │
     │                              │ - Confirm order  │
     │                              │ - Reduce stock   │
     │                              │ - Send email     │
     │                              └──────────────────┘
     │
     ├─ customer.subscription.deleted ───────┐
     │                                        ▼
     │                              ┌──────────────────┐
     │                              │ Subscription     │
     │                              │ - Cancel sub     │
     │                              │ - Update status  │
     │                              │ - Notify seller  │
     │                              └──────────────────┘
     │
     ├─ invoice.payment_failed ──────────────┐
     │                                        ▼
     │                              ┌──────────────────┐
     │                              │ Payment Failed   │
     │                              │ - Send alert     │
     │                              │ - Update status  │
     │                              └──────────────────┘
     │
     └─ invoice.payment_succeeded ───────────┐
                                             ▼
                                   ┌──────────────────┐
                                   │ Payment Success  │
                                   │ - Confirm payment│
                                   │ - Send receipt   │
                                   └──────────────────┘
```

---

## Payment Types Architecture

### 1. Product Orders (One-Time Payment)

```
Customer → Checkout → Create Session → Stripe Checkout → Payment
                                                            │
                                                            ▼
                                                         Webhook
                                                            │
                                                            ▼
                                        Order Confirmed + Stock Reduced
```

**Key Features:**
- One-time payment
- Multiple items support
- Shipping & tax calculation
- Auto-confirmation
- Stock management

---

### 2. Subscriptions (Recurring Payment)

```
Seller → Subscribe → Create Session → Stripe Checkout → Payment
                                                           │
                                                           ▼
                                                        Webhook
                                                           │
                                                           ▼
                                      Subscription Active + Free Trial
                                                           │
                                                           ▼
                                                    Monthly Renewal
```

**Key Features:**
- Recurring billing
- Free trial periods (30-45 days)
- Automatic renewal
- Duplicate prevention
- Cancellation handling

---

### 3. Subdomain Purchase (One-Time Payment)

```
Seller → Purchase → Create Session → Stripe Checkout → Payment
                                                          │
                                                          ▼
                                                       Webhook
                                                          │
                                                          ▼
                                      Subdomain Active (3 years)
```

**Key Features:**
- One-time $15 payment
- 3-year ownership
- Renewal support
- Protected ownership

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Environment Variables                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - No hardcoded keys                                │    │
│  │ - Separate test/live keys                          │    │
│  │ - .env files in .gitignore                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 2: Webhook Signature Verification                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - Verify all webhook events                        │    │
│  │ - Prevent fake events                              │    │
│  │ - Use signing secret                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 3: HTTPS/SSL                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - All traffic encrypted                            │    │
│  │ - Valid SSL certificates                           │    │
│  │ - Secure webhook endpoints                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 4: CORS Protection                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - Whitelist allowed origins                        │    │
│  │ - Credentials handling                             │    │
│  │ - Preflight requests                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 5: Rate Limiting                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - Limit auth requests                              │    │
│  │ - Prevent brute force                              │    │
│  │ - IP-based throttling                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 6: Stripe Radar (Fraud Detection)                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - Automatic fraud detection                        │    │
│  │ - Machine learning models                          │    │
│  │ - Risk scoring                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION SETUP                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Vercel/Netlify)                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Domain: rozare.com                                 │    │
│  │ Environment: Production                            │    │
│  │ Variables:                                         │    │
│  │   - VITE_STRIPE_MODE=live                         │    │
│  │   - VITE_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_xxx  │    │
│  │   - VITE_API_URL=https://backend.herokuapp.com    │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          │ HTTPS                             │
│                          ▼                                   │
│  Backend (Heroku)                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Domain: tortrose-backend.herokuapp.com            │    │
│  │ Environment: Production                            │    │
│  │ Variables:                                         │    │
│  │   - STRIPE_MODE=live                              │    │
│  │   - STRIPE_LIVE_SECRET_KEY=sk_live_xxx            │    │
│  │   - STRIPE_LIVE_WEBHOOK_SECRET=whsec_xxx          │    │
│  │   - MONGO_URI=mongodb://...                       │    │
│  │   - JWT_SECRET=...                                │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          │ Webhook                           │
│                          ▼                                   │
│  Stripe                                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Mode: Live                                         │    │
│  │ Webhook: https://backend.herokuapp.com/webhook    │    │
│  │ Events:                                            │    │
│  │   - checkout.session.completed                    │    │
│  │   - customer.subscription.deleted                 │    │
│  │   - invoice.payment_failed                        │    │
│  │   - invoice.payment_succeeded                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Logging

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stripe Dashboard                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - Payment transactions                             │    │
│  │ - Webhook delivery logs                            │    │
│  │ - Fraud alerts (Radar)                             │    │
│  │ - Subscription status                              │    │
│  │ - Dispute management                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Backend Logs (Heroku)                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - Stripe initialization                            │    │
│  │ - Payment processing                               │    │
│  │ - Webhook events                                   │    │
│  │ - Error tracking                                   │    │
│  │ - Performance metrics                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Database (MongoDB)                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - Order records                                    │    │
│  │ - Subscription status                              │    │
│  │ - Payment history                                  │    │
│  │ - User data                                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Email Service (Brevo)                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ - Confirmation emails                              │    │
│  │ - Receipt emails                                   │    │
│  │ - Notification emails                              │    │
│  │ - Delivery tracking                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Centralized Configuration**: All Stripe logic in one place (`config/stripe.js`)
2. **Environment-Based**: Mode switches automatically based on env vars
3. **Secure by Default**: No hardcoded keys, defaults to test mode
4. **Comprehensive Coverage**: All payment types supported
5. **Robust Webhooks**: Signature verification and event handling
6. **Easy Deployment**: Simple env var updates to go live
7. **Monitoring Ready**: Logging and tracking at every layer

---

**Architecture Version**: 1.0.0  
**Last Updated**: May 12, 2026  
**Status**: Production Ready
