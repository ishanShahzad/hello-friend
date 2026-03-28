

# Unified AI Shopping Assistant — Lovable AI + Voice Call Mode + Personal Stylist

## Overview

Replace HuggingFace with **Lovable AI** (Gemini via gateway) and transform the chatbot into an intelligent personal shopping advisor with voice call mode. The AI acts as a fashion consultant — it asks follow-up questions about occasion, style preferences, and budget, gives color coordination advice, remembers user history, and proactively suggests outfits.

## Architecture

```text
┌─────────────────────────────────────────────┐
│          ChatBot.jsx (Unified UI)           │
│                                             │
│  TEXT MODE          │  VOICE CALL MODE      │
│  Chat bubbles       │  Animated pulsing orb │
│  Product cards      │  Live waveform bars   │
│  Style advice cards │  "Listening..."       │
│  [🎤] [Send]        │  [End Call] button     │
│                     │  Call timer            │
│─────────────────────┴──────────────────────│
│              ↓ both feed into ↓             │
│  ┌─────────────────────────────────────┐    │
│  │  Backend Edge Function (Lovable AI) │    │
│  │  - Product DB context injected      │    │
│  │  - User order history injected      │    │
│  │  - Conversation history maintained  │    │
│  │  - Returns: text + actions + products│   │
│  └─────────────────────────────────────┘    │
│              ↓                              │
│  Action execution + optional TTS response   │
│  Navigation cards / Product cards in chat   │
└─────────────────────────────────────────────┘
```

## What Changes

### 1. New Supabase Edge Function: `supabase/functions/ai-chat/index.ts`

Replaces HuggingFace entirely. Uses Lovable AI gateway (`LOVABLE_API_KEY` already available).

**System prompt** instructs the AI to be a personal fashion/shopping consultant:
- Ask clarifying questions: "What occasion is this for?", "What's your budget range?", "Do you prefer slim fit or relaxed?"
- Give styling advice: color theory, outfit coordination, seasonal suggestions
- Proactively suggest complementary items: "That shirt pairs great with dark jeans"
- Use tool calling to return structured actions (product search, navigate, add to cart)

**Tool definitions** the AI can call:
- `search_products(query, category, maxPrice, minPrice, style)` — fuzzy search products
- `navigate(route)` — navigate user to a page
- `get_user_orders()` — fetch recent order history
- `show_style_advice(advice, colorPalette, occasion)` — render a styled advice card
- `suggest_outfit(products, reason)` — show a curated outfit with explanation

**Flow**: Frontend sends full conversation history → edge function adds system prompt + user context (order history, browsing context) → Lovable AI responds with text and/or tool calls → frontend renders responses and executes actions.

### 2. New Backend Endpoint: `GET /api/chatbot/user-context`

Returns user's recent orders, favorite categories, and past purchases for AI personalization. Called once when chat opens.

### 3. Rewrite `Frontend/src/components/common/ChatBot.jsx`

**Voice Call Mode:**
- Mic button in input bar transforms the panel into a full-screen voice interface
- Animated pulsing orb + sound wave bars (CSS animations)
- `SpeechRecognition` with `continuous = true` — stays open like a phone call
- Each recognized sentence sent to AI immediately, AI responds via TTS
- "End Call" dumps full transcript into chat history as bubbles
- Call duration timer displayed

**Personal Stylist Features (rendered in chat):**
- **Style Advice Cards**: When AI gives fashion advice, render a styled card with color palette swatches, occasion tag, and reasoning
- **Outfit Suggestion Cards**: Group of product cards with "Why this works" explanation
- **Follow-up Question Chips**: AI-generated contextual chips ("For a party", "Casual wear", "Office look") that the user can tap instead of typing
- **Color Harmony Display**: Visual color swatches when AI discusses color combinations

**Smart Navigation Engine** (client-side intent execution from AI tool calls):
- `navigate(route)` → `useNavigate` to profile, orders, checkout, stores, etc.
- `addToCart(productId)` → calls global context `handleAddToCart`
- Shows inline action confirmation cards

**Personalization on Open:**
- Fetches user context (orders, preferences) via `/api/chatbot/user-context`
- AI greeting references their history: "Welcome back! How are those sneakers working out?"
- Time-aware greetings

**Contextual Quick Action Chips** that change based on conversation:
- Initial: "Help me find an outfit", "Track my order", "Style advice", "Browse stores"
- After product search: "Show me more like this", "What goes with this?", "Add to cart"
- After style discussion: "Show me options", "Different color", "Higher budget"

### 4. Update `Backend/controllers/chatbotController.js`

- Remove `callHF` dependency for the main chat (keep complaint/order logic as server-side handlers)
- Add `getUserContext` endpoint that returns last 5 orders with product details, most-bought categories, and total spend

### 5. Delete `Frontend/src/components/common/VoiceCommerce.jsx`

### 6. Update `Frontend/src/pages/MainLayoutPage.jsx`

- Remove VoiceCommerce import and component

### 7. Update `supabase/config.toml`

- Register the new `ai-chat` edge function

## AI Personality & Capabilities

The system prompt makes the AI behave as:

- **Personal Stylist**: "This navy blazer with khaki chinos is a timeless combo — perfect for a semi-formal dinner. The warm tones complement each other without clashing."
- **Conversational**: Asks follow-up questions naturally — "Where are you planning to wear this?", "Do you usually go for bold or neutral colors?"
- **Color Expert**: "Earth tones like olive and tan work great for your skin tone. Avoid pairing two saturated colors — one should be muted."
- **Occasion-Aware**: Different suggestions for party, office, casual, date night, travel
- **Budget-Sensitive**: "I found some great options under $40 that still look premium"
- **Proactive**: "By the way, that store has free shipping right now" / "This item is 30% off today"
- **Reorder Helper**: "Want to reorder those joggers you bought last month?"
- **Comparison Helper**: "Between these two, the cotton one breathes better for summer, but the polyester blend is more wrinkle-resistant for travel"

## Technical Details

- **AI Provider**: Lovable AI gateway (`google/gemini-3-flash-preview`) via Supabase edge function
- **API Key**: `LOVABLE_API_KEY` (already provisioned)
- **Voice**: Web Speech API (browser-native, no dependencies)
- **TTS**: Browser `SpeechSynthesis` with adjustable rate
- **Streaming**: SSE streaming from edge function for real-time token rendering
- **No new npm dependencies** — all browser-native APIs + existing libraries
- **Graceful degradation**: Mic button hidden if browser doesn't support Speech API

## Files Summary

| Action | File |
|--------|------|
| Create | `supabase/functions/ai-chat/index.ts` |
| Create | `supabase/config.toml` |
| Rewrite | `Frontend/src/components/common/ChatBot.jsx` |
| Modify | `Backend/controllers/chatbotController.js` (add user-context endpoint) |
| Modify | `Backend/routes/chatbotRoutes.js` (add user-context route) |
| Modify | `Frontend/src/pages/MainLayoutPage.jsx` (remove VoiceCommerce) |
| Delete | `Frontend/src/components/common/VoiceCommerce.jsx` |
| Delete | `Backend/utils/hfClient.js` (no longer needed) |

