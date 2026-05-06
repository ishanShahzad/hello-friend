# Implementation Plan

[Overview]
Upgrade the AI chat system with smart search, product image cards, professional UI, and floating chatbot improvements.

This plan addresses five key areas:
1. **Smart Search**: The AI currently passes user's exact words as search queries (e.g. "interesting", "chapal"). The AI system prompt must instruct it to translate intent/slang/multilingual terms into proper English product search keywords. The search_products tool itself needs fuzzy matching and synonym expansion.
2. **Product Image Cards**: When tools return product data (search_products, get_product_detail, view_cart), the ChatBot must render rich product cards with images, prices, ratings, and action buttons (Add to Cart, View, Wishlist).
3. **AI Chat Page UI**: The /ai-chat page must match the website's glass-morphism dark theme with proper colors, animations, and professional layout.
4. **Floating ChatBot Improvements**: Add "New Chat" and "Open Full Chat ↗" buttons to the floating chatbot header.
5. **AI Intelligence**: Improve system prompts so the AI understands intent, suggests alternatives, handles multilingual queries, and never searches literal user words blindly.

[Types]
No new TypeScript types needed — project uses JavaScript throughout.

Product cards in chat will use the existing product data shape returned by search_products:
```
{ _id, name, price, discountedPrice, category, brand, image, rating, numReviews, stock }
```

Tool result events in messages use shape:
```
{ type: 'tool_result', tool: string, result: { success: boolean, data: any, message: string } }
```

New product card component will accept:
```
{ product: { _id, name, price, discountedPrice, image, rating, numReviews, stock, category, brand }, onAddToCart: fn, onView: fn, onWishlist: fn }
```

[Files]
Files to modify for all improvements.

### Modified Files:

1. **`Backend/controllers/aiChatController.js`** (lines 30-100 — USER_PROMPT)
   - Add "SMART SEARCH INSTRUCTIONS" section to system prompt
   - Instruct AI to translate slang, multilingual terms, and vague queries into proper product keywords
   - Instruct AI to search multiple related terms if first search fails
   - Instruct AI to NEVER search literal words like "interesting", "cool", "nice"

2. **`Backend/services/aiActionExecutor.js`** (search_products case, lines 75-120)
   - Add synonym/keyword expansion for common terms
   - Add fuzzy matching with regex word boundaries relaxed
   - If no results found with exact match, retry with individual words
   - Add a SYNONYM_MAP for multilingual/slang terms (chapal→sandals/slippers, joota→shoes, etc.)

3. **`Frontend/src/components/common/ChatBot.jsx`**
   - Add `ProductCardGrid` component that renders product images, prices, ratings
   - Modify `renderMessage` to detect tool_result events containing product arrays and render ProductCardGrid
   - Add "New Chat" button to floating chatbot header
   - Add "Open Full Chat ↗" link button to floating chatbot header
   - Detect cart items in view_cart results and render cart item cards with images

4. **`Frontend/src/pages/AIChatPage.jsx`**
   - Redesign to match website's glass-morphism dark theme (use --glass-bg, --glass-border CSS vars)
   - Add gradient accents consistent with the site
   - Add welcome state when no conversation is selected
   - Improve mobile responsiveness
   - Add "Powered by Rozare AI" footer in sidebar

### No New Files Created — all changes are modifications to existing files.

[Functions]
Functions to add and modify.

### New Functions/Components:

1. **`ProductCardInChat`** (in ChatBot.jsx)
   - Renders a single product card: image, name, price, rating stars, stock badge, action buttons
   - Props: `{ product, onAddToCart, onView, onWishlist }`
   - Compact horizontal card layout for chat context

2. **`ProductCardGrid`** (in ChatBot.jsx)
   - Renders a scrollable grid of ProductCardInChat items
   - Props: `{ products, onAction }`
   - Shows "X products found" header

3. **`CartItemCard`** (in ChatBot.jsx)
   - Renders a cart item with image, name, price, quantity
   - Used when view_cart tool results are shown

4. **`expandSearchQuery(query)`** (in aiActionExecutor.js)
   - Takes a search query and returns expanded array of search terms
   - Handles: multilingual terms, slang, synonyms, category mapping
   - Example: "chapal" → ["chapal", "sandals", "slippers", "flip flops"]
   - Example: "air pods" → ["air pods", "airpods", "wireless earbuds", "bluetooth earphones"]

### Modified Functions:

1. **`search_products` case** (in aiActionExecutor.js)
   - Use expandSearchQuery() for broader matching
   - If 0 results with original query, retry with expanded terms
   - Add text search index usage if available

2. **`renderMessage`** (in ChatBot.jsx)
   - Add detection for tool_result events where result.data has `products` array → render ProductCardGrid
   - Add detection for tool_result with `items` array (cart) → render CartItemCard list
   - Add detection for get_product_detail → render single large ProductCardInChat

3. **`sendMessage`** (in ChatBot.jsx)
   - Pass `conversationId: activeConvoId` in the fetch body so backend saves to correct conversation

[Classes]
No class modifications needed — project uses functional components and plain objects.

[Dependencies]
No new dependencies needed.

All required packages (framer-motion, lucide-react, react-markdown, react-router-dom) are already installed.

[Testing]
Manual testing approach.

1. Test smart search: "show me something interesting" → AI should search trending/popular products, NOT literal "interesting"
2. Test multilingual: "chapal dikhao" → AI should search sandals/slippers
3. Test synonyms: "air pods" → should find wireless earbuds
4. Test product cards: search results should show images, prices, Add to Cart buttons
5. Test floating chatbot: verify New Chat and Open Full Chat buttons work
6. Test /ai-chat page: verify glass-morphism UI matches website theme
7. Test conversation persistence: send messages, reload, verify messages are preserved

[Implementation Order]
Sequential implementation to minimize conflicts.

1. **Backend: Smart search** — Update search_products in aiActionExecutor.js with expandSearchQuery + fuzzy matching
2. **Backend: AI prompts** — Update USER_PROMPT in aiChatController.js with smart search instructions
3. **Frontend: Product cards** — Add ProductCardInChat, ProductCardGrid, CartItemCard components to ChatBot.jsx
4. **Frontend: Render product cards** — Update renderMessage to detect and render product data with image cards
5. **Frontend: Floating chatbot buttons** — Add "New Chat" and "Open Full Chat" to header
6. **Frontend: Pass conversationId** — Update sendMessage to include conversationId in API body
7. **Frontend: AI Chat page UI** — Redesign AIChatPage.jsx with glass-morphism theme
8. **Syntax check all files** — node -c on backend, review frontend for JSX errors
9. **Commit, push, deploy** — Push to all 3 repos, deploy to Heroku
