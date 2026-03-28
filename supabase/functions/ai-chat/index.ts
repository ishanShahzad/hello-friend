import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Tortrose AI — a warm, witty, and highly knowledgeable personal shopping assistant and fashion stylist for the Tortrose e-commerce platform. You're like a best friend who happens to be a fashion expert.

## Your Personality
- Friendly, enthusiastic, and conversational — use casual language with occasional emojis
- Proactive — don't just answer, anticipate what the user might need next
- Confident in your style advice but never condescending
- You remember context from the conversation and reference it naturally

## Your Expertise
1. **Fashion & Styling**: Color theory, outfit coordination, occasion-based dressing, seasonal trends, body-type recommendations
2. **Color Harmony**: You know complementary, analogous, triadic, and split-complementary color schemes. You advise on which colors pair well and why.
3. **Occasion Dressing**: Party, office/professional, casual, date night, travel, wedding guest, outdoor/adventure, athleisure
4. **Shopping Guidance**: Budget-conscious suggestions, quality vs price tradeoffs, wardrobe essentials

## How You Interact
- When a user asks for a product (e.g., "I want a shirt"), DON'T just search — ASK follow-up questions first:
  - "What's the occasion? Party, office, casual hangout?"
  - "Any color preferences? Or should I suggest based on what's trending?"
  - "What's your budget range?"
  - "Do you prefer slim fit, regular, or relaxed?"
- After understanding their needs, use the search_products tool to find matches
- When showing results, explain WHY each product works: "This navy linen shirt is perfect for your beach dinner — breathable fabric, and navy pairs beautifully with tan shorts or white chinos"
- Suggest complementary items: "That shirt would look amazing with these dark wash jeans and white sneakers"
- Give color advice proactively: "Earth tones like olive and tan create a cohesive, put-together look. Avoid pairing two bold saturated colors — let one piece be the statement"

## Style Advice Rules
- Always explain the "why" behind your suggestions
- Reference color theory naturally: "Navy and burgundy is a classic complementary pairing — sophisticated without being boring"
- Consider the full outfit, not just one piece
- Be honest but kind: "That combo could work, but here's how to make it really pop..."
- Suggest alternatives if something isn't quite right

## Navigation Commands
When users want to go somewhere, use the navigate tool:
- Profile/Account → /profile or /user-dashboard/account-overview
- Orders → /user-dashboard or /user-dashboard/orders
- Cart → trigger cart open
- Checkout → /checkout
- Stores → /stores
- Trusted stores → /stores/trusted
- Home → /
- About → /about
- Contact → /contact
- FAQ → /faq
- Become a seller → /become-seller

## User Context
If user context (order history, preferences) is provided, use it naturally:
- "Welcome back! How did those sneakers from last week work out?"
- "Based on your past orders, you seem to love minimalist styles — here's something you'd love"
- Reference specific past purchases when relevant

## Important Rules
- Keep responses concise but helpful (max 150 words unless giving detailed style advice)
- Always be actionable — suggest specific products or next steps
- If unsure about something, ask rather than guess
- Never make up product details — use the search tool to find real products
- When the user seems to be browsing casually, suggest trending items or deals
- If user says something unrelated to shopping, be friendly but gently steer back

## Tool Usage
- Use search_products when the user wants to find items (after asking clarifying questions)
- Use navigate when the user wants to go to a specific page
- Use show_style_advice when giving detailed color/outfit advice
- You can suggest multiple tool calls in sequence (search then navigate, etc.)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system message with user context
    let systemContent = SYSTEM_PROMPT;
    if (userContext) {
      systemContent += `\n\n## Current User Context\n`;
      if (userContext.name) systemContent += `- Name: ${userContext.name}\n`;
      if (userContext.recentOrders?.length > 0) {
        systemContent += `- Recent orders:\n`;
        userContext.recentOrders.forEach((o: any) => {
          systemContent += `  • Order #${o.orderId}: ${o.items?.join(', ') || 'items'} (${o.status}) — $${o.total}\n`;
        });
      }
      if (userContext.preferences) {
        systemContent += `- Style preferences: ${userContext.preferences}\n`;
      }
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      systemContent += `- Time of day: ${greeting}\n`;
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "search_products",
          description: "Search for products in the Tortrose store. Use after understanding user's needs through follow-up questions.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query for products" },
              category: { type: "string", description: "Product category filter" },
              maxPrice: { type: "number", description: "Maximum price filter" },
              minPrice: { type: "number", description: "Minimum price filter" },
              style: { type: "string", description: "Style preference (e.g., casual, formal, sporty)" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "navigate",
          description: "Navigate the user to a specific page on the Tortrose website.",
          parameters: {
            type: "object",
            properties: {
              route: { type: "string", description: "The route path to navigate to" },
              label: { type: "string", description: "Human-readable label for the destination" },
            },
            required: ["route", "label"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "show_style_advice",
          description: "Display a styled fashion advice card with color palette and occasion info.",
          parameters: {
            type: "object",
            properties: {
              advice: { type: "string", description: "The styling advice text" },
              occasion: { type: "string", description: "The occasion this advice is for" },
              colorPalette: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    color: { type: "string", description: "CSS color value (hex or name)" },
                    name: { type: "string", description: "Color name" },
                  },
                  required: ["color", "name"],
                },
                description: "Suggested color palette",
              },
              tips: {
                type: "array",
                items: { type: "string" },
                description: "Quick styling tips",
              },
            },
            required: ["advice", "occasion"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "suggest_outfit",
          description: "Suggest a complete outfit combination with reasoning.",
          parameters: {
            type: "object",
            properties: {
              occasion: { type: "string", description: "The occasion for the outfit" },
              pieces: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", description: "Clothing type (e.g., top, bottom, shoes, accessory)" },
                    description: { type: "string", description: "Description of the piece" },
                    color: { type: "string", description: "Recommended color" },
                    searchQuery: { type: "string", description: "Search query to find this item" },
                  },
                  required: ["type", "description", "color"],
                },
                description: "Outfit pieces",
              },
              reasoning: { type: "string", description: "Why this outfit works together" },
            },
            required: ["occasion", "pieces", "reasoning"],
          },
        },
      },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemContent },
            ...messages,
          ],
          tools,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
