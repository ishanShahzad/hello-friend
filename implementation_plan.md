# Implementation Plan: WhatsApp AI Chat Integration

[Overview]
Enable full AI chat functionality over WhatsApp, mirroring the website AI chat experience, so users, sellers, and admins can converse with the Rozare AI assistant and execute actions via WhatsApp messages.

Currently, the platform has two WhatsApp instances via Evolution API:
- **rozare-main** (buyer instance): Sends order confirmation messages to buyers and receives YES/NO replies
- **rozare-seller** (seller instance): Sends one-way notifications TO sellers; inbound messages are currently ignored

The goal is to expand both instances to support **bidirectional AI conversations**:
- **Users/Buyers** chat with AI from the **rozare-main** instance (after linking & verifying their WhatsApp on their user dashboard)
- **Sellers** chat with AI from the **rozare-seller** instance (already have verified WhatsApp numbers)
- **Admins** chat with AI from the **rozare-seller** instance (identified by admin-designated phone numbers configured in the admin dashboard)

The AI on WhatsApp will have the exact same capabilities as on the website: search products, place orders, manage profile, seller tools, admin tools — everything role-gated and server-side executed. The existing order confirmation flow (buttons + YES/NO) remains untouched and takes priority over AI chat routing.

Additionally:
- Users must link and verify their WhatsApp number via OTP on their dashboard before AI responds on WhatsApp
- A user WhatsApp number must be unique across all user accounts
- Sellers messaging the buyer instance are treated as ordinary buyers (only if they have a linked user WhatsApp number)
- Non-seller numbers messaging the seller instance get a graceful rejection
- Admin numbers are explicitly configured in the admin dashboard
- Login/signup is required at the place-order step on the website (with progress preservation)

[Types]
New data structures and schema modifications needed for WhatsApp AI chat, user WhatsApp linking, and admin number management.

### 1. User Model Extension (`Backend/models/User.js`)
Add a new top-level field `whatsappInfo` for USER-role WhatsApp linking (distinct from `sellerInfo.whatsappNumber` used by sellers):

```js
whatsappInfo: {
    number: { type: String, default: '' },         // E.164 format e.g. "+923028588506"
    verified: { type: Boolean, default: false },    // verified via OTP
    verifiedAt: { type: Date, default: null },
    lastChange: { type: Date, default: null },      // cooldown tracking
}
```

Add a unique sparse index: `{ 'whatsappInfo.number': 1 }` with `sparse: true` and a partial filter `{ 'whatsappInfo.number': { $ne: '' } }` to enforce uniqueness of non-empty numbers.

### 2. New Model: `AdminWhatsAppNumber` (`Backend/models/AdminWhatsAppNumber.js`)
Stores phone numbers designated as admin for the seller WhatsApp instance:

```js
{
    number: { type: String, required: true, unique: true }, // E.164 digits e.g. "923028588506"
    label: { type: String, default: '' },                   // optional friendly label
    addedBy: { type: ObjectId, ref: 'User' },               // admin who added it
    isActive: { type: Boolean, default: true },
    createdAt, updatedAt (timestamps: true)
}
```

### 3. New Model: `WhatsAppAIChatRateLimit` (`Backend/models/WhatsAppAIChatRateLimit.js`)
Per-user rate limiting for WhatsApp AI chat to prevent abuse:

```js
{
    user: { type: ObjectId, ref: 'User', required: true },
    phone: { type: String, required: true },
    instance: { type: String, enum: ['main', 'seller'], required: true },
    messageCount: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
    // TTL index: auto-delete after 2 hours
}
```

### 4. ChatHistory Model — No Schema Changes
The existing `ChatHistory` model with conversations already supports what we need. WhatsApp conversations will be stored as a dedicated conversation per user with a title like "WhatsApp Chat" and a flag to distinguish. We will use a convention: the conversation title prefix `[WhatsApp]` identifies WhatsApp conversations, OR we add a small field:

Add to `conversationSchema`:
```js
source: { type: String, enum: ['web', 'whatsapp', 'mobile'], default: 'web' }
```

[Files]
Complete list of files to create, modify, and their purposes.

### New Files to Create

1. **`Backend/models/AdminWhatsAppNumber.js`**
   Mongoose model for admin-designated WhatsApp phone numbers.

2. **`Backend/models/WhatsAppAIChatRateLimit.js`**
   Mongoose model for per-user WhatsApp AI chat rate limiting.

3. **`Backend/services/whatsapp/whatsappAIChatService.js`**
   Core service that processes incoming WhatsApp messages through the AI pipeline. Handles:
   - User/seller/admin lookup by phone number
   - Conversation history loading and saving
   - Calling the AI chat engine (reused from aiChatController)
   - Formatting responses for WhatsApp
   - Sending responses back via the correct Evolution instance
   - Rate limiting

4. **`Backend/controllers/userWhatsappController.js`**
   Controller for user WhatsApp linking: send OTP, verify OTP, unlink number. Uses the **buyer instance (rozare-main)** for sending OTPs.

5. **`Backend/routes/userWhatsappRoutes.js`**
   Routes for user WhatsApp management: `/api/user-whatsapp/send-otp`, `/api/user-whatsapp/verify-otp`, `/api/user-whatsapp/unlink`, `/api/user-whatsapp/status`.

6. **`Backend/controllers/adminWhatsappNumberController.js`**
   Controller for managing admin-designated WhatsApp numbers: add, list, remove, toggle active.

7. **`Backend/routes/adminWhatsappNumberRoutes.js`**
   Routes: `/api/whatsapp/admin-numbers` (GET, POST), `/api/whatsapp/admin-numbers/:id` (DELETE, PATCH).

### Existing Files to Modify

8. **`Backend/models/User.js`**
   - Add `whatsappInfo` field (number, verified, verifiedAt, lastChange)
   - Add unique sparse index on `whatsappInfo.number`

9. **`Backend/models/ChatHistory.js`**
   - Add `source` field to `conversationSchema` (enum: web, whatsapp, mobile; default: web)

10. **`Backend/services/whatsapp/webhookHandler.js`** (MAJOR)
    - Refactor `handleEvolutionWebhook` to route non-order-confirmation messages to AI chat
    - For **main instance**: after order confirmation check, route remaining text messages to `whatsappAIChatService`
    - For **seller instance**: remove the blanket `skipped: seller_instance_inbound` return; instead route to AI chat after admin/seller phone lookup

11. **`Backend/controllers/aiChatController.js`**
    - Extract the core AI chat logic (system prompt building, tool execution loop, context building) into a **reusable exported function** `processAIChatMessage(user, messages, options)` that can be called by both the HTTP endpoints and the WhatsApp service
    - The existing `streamChat` and `chatOnce` will call this refactored function
    - Add a `whatsapp` mode flag that converts client-side tools (navigate, show_style_advice, suggest_outfit) to text descriptions instead of client actions

12. **`Backend/controllers/whatsappController.js`**
    - Add admin number CRUD endpoints (addAdminNumber, getAdminNumbers, removeAdminNumber, toggleAdminNumber)

13. **`Backend/routes/whatsappRoutes.js`**
    - Add routes for admin number management

14. **`Backend/server.js`**
    - Register new routes: `userWhatsappRoutes`
    - Import and register admin number routes (nested under whatsappRoutes)

15. **`Backend/.env`** / **`Backend/.env.example`**
    - Add `WHATSAPP_AI_CHAT_ENABLED=true` (feature flag)
    - Add `WHATSAPP_AI_RATE_LIMIT_PER_HOUR=30` (per-user hourly cap)
    - Add `EVOLUTION_SELLER_INSTANCE_NAME=rozare-seller` (make explicit)

### Frontend Files to Create/Modify (High-Level)

16. **Frontend: User Dashboard — WhatsApp Linking Section**
    - New component for WhatsApp number entry, OTP send, OTP verify, unlink
    - Display linked/verified status
    - Add to user dashboard/profile page

17. **Frontend: Admin Dashboard — Admin WhatsApp Numbers Management**
    - New component in admin dashboard (under WhatsApp settings tab)
    - Add/remove admin phone numbers
    - Toggle active/inactive

18. **Frontend: Checkout — Login Required Popup**
    - At the final "Place Order" step, if user is not logged in, show login/signup popup
    - Preserve cart state and return to exact position after login
    - Support "Continue with Google" option

[Functions]
Detailed function specifications for new and modified functions.

### New Functions

#### `Backend/services/whatsapp/whatsappAIChatService.js`

1. **`processIncomingWhatsAppMessage(phone, messageText, instanceType)`**
   - Main entry point called by webhookHandler
   - `instanceType`: 'main' | 'seller'
   - Determines user identity, role, and processes through AI
   - Returns void (sends response directly via Evolution)

2. **`identifyUserByPhone(phone, instanceType)`**
   - For 'main' instance: looks up User where `whatsappInfo.number` matches and `whatsappInfo.verified === true`
   - For 'seller' instance: first checks AdminWhatsAppNumber, then looks up User where `sellerInfo.whatsappNumber` matches and `sellerInfo.whatsappVerified === true`
   - Returns `{ user, role }` or null

3. **`loadWhatsAppConversation(userId)`**
   - Finds or creates a WhatsApp-specific conversation in ChatHistory
   - Returns conversation messages (last 30 for context window optimization)

4. **`saveWhatsAppMessage(userId, role, content)`**
   - Appends a message to the user's WhatsApp conversation
   - Creates conversation if needed with title "[WhatsApp] Chat"

5. **`sendAIResponseViaWhatsApp(phone, responseText, instanceType)`**
   - Splits long responses (>4000 chars) into multiple messages
   - Converts markdown to WhatsApp formatting
   - Sends via the correct Evolution instance (main or seller)
   - Handles send errors gracefully

6. **`checkRateLimit(userId, phone, instanceType)`**
   - Checks if user has exceeded hourly message limit (default 30/hr)
   - Returns `{ allowed: boolean, remaining: number }`

7. **`handleNonSellerOnSellerInstance(phone)`**
   - Sends graceful rejection message: "I'm a helper for Rozare sellers. You're not registered as a seller..."
   - Includes link to website

8. **`handleUnlinkedUserOnMainInstance(phone)`**
   - Sends graceful message: "To chat with me on WhatsApp, please link your number on rozare.com..."

#### `Backend/controllers/aiChatController.js` — Refactored

9. **`processAIChatMessage(userObj, incomingMessages, options)`** (NEW, exported)
   - `userObj`: `{ _id, id, role }` — the authenticated user
   - `incomingMessages`: array of `{ role, content }` messages
   - `options`: `{ mode: 'web' | 'whatsapp', conversationId?: string }`
   - Contains the core AI logic: system prompt building, context injection, tool execution loop (up to 5 iterations), tool result processing
   - Returns `{ responseText, toolResults, clientActions, conversationId }`
   - When `mode === 'whatsapp'`:
     - Client-side tools (navigate, show_style_advice, suggest_outfit) are converted to text tool results instead of client actions
     - navigate → returns "URL: https://www.rozare.com/path — [label]" as tool result
     - show_style_advice → returns the advice text as tool result
     - suggest_outfit → returns outfit description as tool result
   - System prompt gets a WhatsApp-specific addendum: "You are chatting via WhatsApp. Keep responses under 500 words. Use WhatsApp formatting (*bold*, _italic_). Don't use markdown headers or code blocks. Share links as full URLs."

10. **`buildWhatsAppSystemPromptAddendum()`** (NEW, internal)
    - Returns additional system prompt text for WhatsApp mode

#### `Backend/controllers/userWhatsappController.js`

11. **`sendUserWhatsAppOTP(req, res)`**
    - POST `/api/user-whatsapp/send-otp`
    - Body: `{ whatsappNumber }`
    - Validates number format, checks uniqueness across users, checks rate limits
    - Sends OTP via **buyer instance (rozare-main)**
    - Stores OTP in WhatsAppOTP model

12. **`verifyUserWhatsAppOTP(req, res)`**
    - POST `/api/user-whatsapp/verify-otp`
    - Body: `{ whatsappNumber, otp }`
    - Verifies OTP, updates `User.whatsappInfo` fields
    - Enforces uniqueness: rejects if number already linked to another user

13. **`unlinkUserWhatsApp(req, res)`**
    - POST `/api/user-whatsapp/unlink`
    - Clears `User.whatsappInfo` fields for the authenticated user

14. **`getUserWhatsAppStatus(req, res)`**
    - GET `/api/user-whatsapp/status`
    - Returns linked number and verified status

#### `Backend/controllers/adminWhatsappNumberController.js`

15. **`addAdminNumber(req, res)`**
    - POST `/api/whatsapp/admin-numbers`
    - Body: `{ number, label }`
    - Validates format, checks no duplicate

16. **`getAdminNumbers(req, res)`**
    - GET `/api/whatsapp/admin-numbers`
    - Returns all admin-designated numbers

17. **`removeAdminNumber(req, res)`**
    - DELETE `/api/whatsapp/admin-numbers/:id`

18. **`toggleAdminNumber(req, res)`**
    - PATCH `/api/whatsapp/admin-numbers/:id`
    - Body: `{ isActive }`

### Modified Functions

#### `Backend/services/whatsapp/webhookHandler.js` — `handleEvolutionWebhook`

19. **Modified: `handleEvolutionWebhook(req, res)`**
    Current behavior for seller instance: returns immediately with `{ ok: true, skipped: 'seller_instance_inbound' }`
    New behavior:
    - For **seller instance MESSAGES_UPSERT**: extract phone and text from message, call `processIncomingWhatsAppMessage(phone, text, 'seller')`
    - For **main instance MESSAGES_UPSERT**: after existing order confirmation logic (button clicks and YES/NO text), if the message was NOT processed as an order confirmation, call `processIncomingWhatsAppMessage(phone, text, 'main')`
    - CONNECTION_UPDATE handling remains unchanged

    Specifically, the existing main instance text message flow changes from:
    ```
    if no pending order → continue (message ignored)
    if pending order + unclear text → send YES/NO hint
    ```
    To:
    ```
    if no pending order → route to AI chat
    if pending order + clear YES/NO → existing order confirmation flow
    if pending order + unclear text → route to AI chat (AI has order context via tools)
    ```

#### `Backend/controllers/aiChatController.js` — `streamChat` and `chatOnce`

20. **Modified: `streamChat(req, res)` and `chatOnce(req, res)`**
    - Refactored to call the new `processAIChatMessage()` function internally
    - `streamChat` still handles SSE streaming wrapper
    - `chatOnce` still handles JSON response wrapper
    - Core logic moved to `processAIChatMessage()`

[Classes]
No new classes are introduced. The project uses a functional/module pattern with Mongoose models, Express controllers, and service modules. All new functionality follows the same pattern.

### Modified Models (acting as "classes"):

1. **User model** — extended with `whatsappInfo` subdocument
2. **ChatHistory conversationSchema** — extended with `source` field
3. **New AdminWhatsAppNumber model** — new Mongoose model
4. **New WhatsAppAIChatRateLimit model** — new Mongoose model with TTL index

[Dependencies]
No new npm packages are required. All functionality is built using existing dependencies.

The project already has:
- `axios` — for Evolution API calls
- `qrcode` — for QR code generation
- `mongoose` — for MongoDB models
- `express` — for routing
- `jsonwebtoken` / `bcrypt` — for auth
- OpenRouter API — for AI model access

The only configuration changes are new environment variables (feature flags and rate limits), which are optional with sensible defaults.

[Testing]
Testing approach for the WhatsApp AI chat integration.

### Manual Testing Strategy

1. **User WhatsApp Linking Flow**
   - Send OTP to a test phone number via buyer instance
   - Verify OTP and confirm User record is updated
   - Try linking same number to another account (should fail)
   - Unlink and re-link

2. **User AI Chat via WhatsApp (Main Instance)**
   - Send a text message to rozare-main from a linked/verified user number
   - Verify AI response is received on WhatsApp
   - Test tool execution: "search for shoes", "show my orders", "add to cart"
   - Verify conversation is saved in ChatHistory
   - Test rate limiting (send 31+ messages in an hour)

3. **Order Confirmation + AI Chat Coexistence**
   - Place an order → order confirmation message arrives
   - Reply "YES" → should confirm order (existing flow)
   - Send a general message → should go to AI chat
   - Verify no interference between flows

4. **Seller AI Chat via WhatsApp (Seller Instance)**
   - Send a message from a verified seller's WhatsApp number to rozare-seller
   - Verify AI responds with seller tools available
   - Test seller-specific tools: "show my products", "my analytics"

5. **Admin AI Chat via WhatsApp (Seller Instance)**
   - Add admin phone number in admin dashboard
   - Send message from that number to rozare-seller
   - Verify AI responds with full admin capabilities

6. **Rejection Flows**
   - Unlinked user sends message on main instance → gets "link your WhatsApp" message
   - Non-seller sends message on seller instance → gets graceful rejection
   - User sends message on seller instance → gets "this is for sellers" message

7. **Edge Cases**
   - Seller's WhatsApp number on buyer instance → treated as buyer (only if linked as user too)
   - Very long AI response → split into multiple WhatsApp messages
   - AI tool returns error → error message sent gracefully
   - Evolution API down → errors handled gracefully

### Existing Tests
- No modifications needed to existing test files
- The refactored `processAIChatMessage` should maintain the same behavior for web mode

[Implementation Order]
Ordered sequence to minimize conflicts and ensure each step can be tested independently.

1. **Add `whatsappInfo` field to User model and `source` field to ChatHistory conversationSchema**
   - Modify `Backend/models/User.js` — add `whatsappInfo` subdocument with index
   - Modify `Backend/models/ChatHistory.js` — add `source` field to conversationSchema
   - These are backward-compatible schema additions (no migration needed)

2. **Create AdminWhatsAppNumber and WhatsAppAIChatRateLimit models**
   - Create `Backend/models/AdminWhatsAppNumber.js`
   - Create `Backend/models/WhatsAppAIChatRateLimit.js`
   - Pure additions, no existing code affected

3. **Create User WhatsApp Linking (OTP flow)**
   - Create `Backend/controllers/userWhatsappController.js` (sendOTP, verifyOTP, unlink, status)
   - Create `Backend/routes/userWhatsappRoutes.js`
   - Register in `Backend/server.js`
   - This uses the **buyer instance (rozare-main)** for OTP delivery
   - Testable independently via API calls

4. **Create Admin WhatsApp Number Management**
   - Create `Backend/controllers/adminWhatsappNumberController.js`
   - Create `Backend/routes/adminWhatsappNumberRoutes.js`
   - Register routes in `Backend/routes/whatsappRoutes.js`
   - Testable independently via API calls

5. **Refactor AI Chat Controller — Extract reusable core function**
   - Modify `Backend/controllers/aiChatController.js`:
     - Extract `processAIChatMessage()` function
     - Add WhatsApp mode handling (client-side tools → text, concise prompt addendum)
     - Refactor `streamChat` and `chatOnce` to use the new function
   - **Critical**: Verify existing web AI chat still works identically after refactor

6. **Create WhatsApp AI Chat Service**
   - Create `Backend/services/whatsapp/whatsappAIChatService.js`
   - Implements: user identification, conversation management, rate limiting, AI processing, response sending
   - Uses `processAIChatMessage()` from the refactored aiChatController
   - Testable by calling the service functions directly

7. **Modify Webhook Handler — Route messages to AI Chat**
   - Modify `Backend/services/whatsapp/webhookHandler.js`:
     - Remove blanket seller instance ignore
     - Add AI chat routing for both instances
     - Maintain existing order confirmation flow priority
   - **Critical**: This is the integration point — all previous steps must work

8. **Add `.env` configuration variables**
   - Add `WHATSAPP_AI_CHAT_ENABLED`, `WHATSAPP_AI_RATE_LIMIT_PER_HOUR`, `EVOLUTION_SELLER_INSTANCE_NAME`

9. **Frontend: User Dashboard WhatsApp Linking UI**
   - Add WhatsApp linking section to user dashboard/profile
   - Phone number input, send OTP button, verify OTP form, unlink button
   - Show linked/verified status

10. **Frontend: Admin Dashboard Admin Numbers Management UI**
    - Add admin numbers management to admin dashboard (WhatsApp settings tab)
    - Add/remove/toggle admin phone numbers

11. **Frontend: Checkout Login Required Popup**
    - At the "Place Order" step, if not logged in, show login/signup popup
    - Preserve cart state, support Google login, return to checkout after auth

12. **End-to-End Testing and Polish**
    - Test all flows described in the Testing section
    - Verify no regressions in existing order confirmation flow
    - Verify no regressions in existing web AI chat
    - Test edge cases and error handling
