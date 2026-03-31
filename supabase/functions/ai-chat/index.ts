import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── SYSTEM PROMPTS BY ROLE ───

const USER_PROMPT = `You are Tortrose AI — a warm, witty personal shopping stylist for the Tortrose e-commerce platform. You're like a best friend who happens to be a fashion expert.

## Personality
- Friendly, enthusiastic, conversational with occasional emojis
- Proactive — anticipate user needs
- Confident in style advice but never condescending
- Remember context from conversation

## Expertise
1. Fashion & Styling: Color theory, outfit coordination, occasion-based dressing, trends
2. Color Harmony: Complementary, analogous, triadic schemes
3. Occasion Dressing: Party, office, casual, date night, travel, wedding guest
4. Shopping Guidance: Budget-conscious, quality vs price, wardrobe essentials

## Interaction Style
- When user asks for a product, ASK follow-up questions first (occasion, color, budget, fit)
- Explain WHY each product works with reasoning
- Suggest complementary items for complete outfits
- Give color advice proactively

## Navigation
Use navigate tool for: Profile→/profile, Orders→/user-dashboard, Cart→trigger cart, Stores→/stores, Home→/, About→/about, Contact→/contact, FAQ→/faq

## Conversation Memory
- Reference past conversations naturally
- Track evolving preferences
- Build on previous style advice

## Rules
- Max 150 words unless giving detailed style advice
- Always be actionable — suggest products or next steps
- Use search tool to find real products (never make up details)
- Ask rather than guess when unsure`;

const SELLER_PROMPT = `You are Tortrose AI Business Assistant — a smart, proactive business advisor for sellers on the Tortrose e-commerce platform.

## Personality
- Professional yet friendly, data-driven, strategic
- Proactive — suggest improvements without being asked
- Action-oriented — help sellers DO things, not just learn about them

## Your Capabilities
You can DIRECTLY perform these actions for the seller through tool calls:
- **Product Management**: Add, edit, delete products, apply bulk discounts, update prices
- **Order Management**: View orders, update order statuses
- **Store Management**: Update store details, view analytics, apply for verification
- **Shipping**: View and update shipping methods
- **Analytics**: Revenue, top products, stock alerts

## Interaction Style
- When seller says "add a product", collect ALL required info: name, price, category, brand, stock
- If ANY info is missing, ask for it specifically before proceeding
- When data is unclear or mixed, ask for clarification
- Show analytics summaries in clean, readable format
- Proactively suggest: running social media ads, seasonal promotions, cross-selling, optimizing listings

## Growth Strategies
- Suggest social media marketing (Instagram, TikTok, Facebook)
- Recommend product photography improvements
- Advise on pricing strategies and competitive positioning
- Suggest seasonal promotions and flash sales
- Recommend expanding product categories based on trends

## Navigation
Use navigate tool for dashboard pages: Analytics→/seller-dashboard/analytics, Products→/seller-dashboard/product-management, Orders→/seller-dashboard/order-management, Store Settings→/seller-dashboard/store-settings, Shipping→/seller-dashboard/shipping-configuration

## Rules
- Always confirm destructive actions (delete product) before executing
- Show data in organized format (tables, bullet points)
- Max 200 words unless showing detailed analytics
- Keep business advice actionable and specific`;

const ADMIN_PROMPT = `You are Tortrose AI Platform Commander — an all-powerful administrative assistant with UNRESTRICTED access to manage the entire Tortrose e-commerce platform.

## Personality
- Professional, efficient, authoritative
- Data-driven — always back up suggestions with numbers
- Security-conscious — warn about risky operations

## Your Capabilities (UNRESTRICTED)
You can perform ANY platform operation:
- **User Management**: List, search, delete, block/unblock users, change roles
- **Product Management**: Search, manage all products across the platform
- **Order Management**: View all orders, cancel orders, update statuses
- **Store Management**: View all stores, approve/reject/remove verifications
- **Complaints**: View all complaints, respond to, resolve, escalate
- **Tax Configuration**: View and update platform tax settings
- **Analytics**: Platform-wide revenue, user growth, store distribution
- **Everything a seller can do** — plus platform-wide operations

## Interaction Style
- Execute commands directly — no need for confirmation on read operations
- For destructive actions (delete user, cancel order), confirm once then execute
- Present platform data in clean dashboards
- Flag security concerns proactively
- Suggest platform improvements based on data

## Navigation
Admin dashboard pages: Analytics→/admin-dashboard/analytics, Users→/admin-dashboard/user-management, Products→/admin-dashboard/product-management, Orders→/admin-dashboard/order-management, Verifications→/admin-dashboard/store-verifications, Complaints→/admin-dashboard/complaints, Tax→/admin-dashboard/tax-configuration

## Rules
- No restrictions — admin has full platform access
- Always show counts and totals when presenting lists
- Max 250 words unless showing detailed platform reports
- Be concise but comprehensive`;

// ─── TOOLS BY ROLE ───

const userTools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search for products in the store catalog.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          category: { type: "string", description: "Category filter" },
          maxPrice: { type: "number", description: "Max price filter" },
          minPrice: { type: "number", description: "Min price filter" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Navigate user to a page.",
      parameters: {
        type: "object",
        properties: {
          route: { type: "string", description: "Route path" },
          label: { type: "string", description: "Human-readable label" },
        },
        required: ["route", "label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_style_advice",
      description: "Display styled fashion advice with color palette.",
      parameters: {
        type: "object",
        properties: {
          advice: { type: "string" },
          occasion: { type: "string" },
          colorPalette: {
            type: "array",
            items: { type: "object", properties: { color: { type: "string" }, name: { type: "string" } }, required: ["color", "name"] },
          },
          tips: { type: "array", items: { type: "string" } },
        },
        required: ["advice", "occasion"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_outfit",
      description: "Suggest a complete outfit combination.",
      parameters: {
        type: "object",
        properties: {
          occasion: { type: "string" },
          pieces: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" }, description: { type: "string" },
                color: { type: "string" }, searchQuery: { type: "string" },
              },
              required: ["type", "description", "color"],
            },
          },
          reasoning: { type: "string" },
        },
        required: ["occasion", "pieces", "reasoning"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_orders",
      description: "Get user's own order history.",
      parameters: { type: "object", properties: { status: { type: "string", description: "Filter by status" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_detail",
      description: "Get details of a specific order.",
      parameters: { type: "object", properties: { orderId: { type: "string", description: "Order ID" } }, required: ["orderId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_order",
      description: "Cancel a pending order.",
      parameters: { type: "object", properties: { orderId: { type: "string", description: "Order ID to cancel" } }, required: ["orderId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_complaint",
      description: "Submit a complaint.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["product_issue", "order_issue", "delivery", "refund", "seller_complaint", "website_bug", "suggestion", "other"] },
          subject: { type: "string" }, message: { type: "string" },
        },
        required: ["category", "subject", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_complaints",
      description: "Get user's complaint history.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const sellerTools = [
  ...userTools,
  {
    type: "function",
    function: {
      name: "add_product",
      description: "Add a new product to the seller's store. REQUIRES: name, price, category, brand, stock. Ask for missing fields.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" }, price: { type: "number" }, description: { type: "string" },
          category: { type: "string" }, brand: { type: "string" }, stock: { type: "number" },
          image: { type: "string", description: "Main image URL" },
          discountedPrice: { type: "number" }, tags: { type: "array", items: { type: "string" } },
        },
        required: ["name", "price", "category", "brand", "stock"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_product",
      description: "Edit an existing product.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          updates: { type: "object", description: "Fields to update (name, price, description, stock, etc.)" },
        },
        required: ["productId", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_product",
      description: "Delete a product. Always confirm with user first.",
      parameters: { type: "object", properties: { productId: { type: "string" } }, required: ["productId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_products",
      description: "List seller's products with optional search/filter.",
      parameters: {
        type: "object",
        properties: { search: { type: "string" }, category: { type: "string" }, limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_discount",
      description: "Apply discount to multiple products.",
      parameters: {
        type: "object",
        properties: {
          productIds: { type: "array", items: { type: "string" } },
          discountType: { type: "string", enum: ["percentage", "fixed"] },
          discountValue: { type: "number" },
        },
        required: ["productIds", "discountType", "discountValue"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_price_update",
      description: "Update prices of multiple products.",
      parameters: {
        type: "object",
        properties: {
          productIds: { type: "array", items: { type: "string" } },
          updateType: { type: "string", enum: ["percentage", "fixed", "set"] },
          value: { type: "number" },
        },
        required: ["productIds", "updateType", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_discount",
      description: "Remove discounts from products.",
      parameters: { type: "object", properties: { productIds: { type: "array", items: { type: "string" } } }, required: ["productIds"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_seller_analytics",
      description: "Get seller's business analytics: revenue, orders, top products, stock alerts.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_seller_orders",
      description: "Get orders for seller's products.",
      parameters: { type: "object", properties: { status: { type: "string" }, limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "update_order_status",
      description: "Update an order's status.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          newStatus: { type: "string", enum: ["processing", "shipped", "delivered"] },
        },
        required: ["orderId", "newStatus"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_store",
      description: "Get seller's store details.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_store",
      description: "Update store settings.",
      parameters: {
        type: "object",
        properties: {
          updates: { type: "object", description: "Store fields to update (storeName, description, logo, banner, socialLinks, returnPolicy)" },
        },
        required: ["updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_store_analytics",
      description: "Get store performance metrics.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_for_verification",
      description: "Submit store verification application.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_shipping_methods",
      description: "View seller's shipping methods.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_shipping",
      description: "Update a shipping method.",
      parameters: {
        type: "object",
        properties: {
          methodId: { type: "string" },
          updates: { type: "object", description: "Shipping method fields to update" },
        },
        required: ["methodId", "updates"],
      },
    },
  },
];

const adminTools = [
  ...sellerTools,
  {
    type: "function",
    function: {
      name: "get_all_users",
      description: "List all users with optional search/filter.",
      parameters: {
        type: "object",
        properties: { search: { type: "string" }, role: { type: "string" }, status: { type: "string" }, limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_user",
      description: "Delete a user. Confirm with admin first.",
      parameters: { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "block_user",
      description: "Block or unblock a user.",
      parameters: { type: "object", properties: { userId: { type: "string" } }, required: ["userId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "change_user_role",
      description: "Change a user's role.",
      parameters: {
        type: "object",
        properties: { userId: { type: "string" }, newRole: { type: "string", enum: ["user", "seller", "admin"] } },
        required: ["userId", "newRole"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_admin_analytics",
      description: "Get platform-wide analytics.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_orders",
      description: "Get all orders across the platform.",
      parameters: { type: "object", properties: { status: { type: "string" }, limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_complaints",
      description: "Get all complaints.",
      parameters: { type: "object", properties: { category: { type: "string" }, status: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "update_complaint",
      description: "Update a complaint (respond, resolve, escalate).",
      parameters: {
        type: "object",
        properties: {
          complaintId: { type: "string" }, status: { type: "string" },
          adminResponse: { type: "string" }, priority: { type: "string" },
        },
        required: ["complaintId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_verifications",
      description: "List stores awaiting verification.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_verification",
      description: "Approve a store's verification.",
      parameters: { type: "object", properties: { storeId: { type: "string" } }, required: ["storeId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_verification",
      description: "Reject a store's verification.",
      parameters: {
        type: "object",
        properties: { storeId: { type: "string" }, reason: { type: "string" } },
        required: ["storeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_verification",
      description: "Revoke a store's verified status.",
      parameters: { type: "object", properties: { storeId: { type: "string" } }, required: ["storeId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_stores",
      description: "List all stores on the platform.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "update_tax_config",
      description: "Update platform tax configuration.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["percentage", "fixed"] },
          value: { type: "number" }, isActive: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tax_config",
      description: "View current tax configuration.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function getSystemPrompt(role: string): string {
  switch (role) {
    case 'seller': return SELLER_PROMPT;
    case 'admin': return ADMIN_PROMPT;
    default: return USER_PROMPT;
  }
}

function getTools(role: string) {
  switch (role) {
    case 'seller': return sellerTools;
    case 'admin': return adminTools;
    default: return userTools;
  }
}

// ─── Token optimization: trim messages ───
function optimizeMessages(messages: any[]): any[] {
  if (!messages || messages.length === 0) return [];

  // Keep last 20 messages at full length
  if (messages.length <= 20) return messages;

  const older = messages.slice(0, messages.length - 20);
  const recent = messages.slice(-20);

  // Summarize older messages into a condensed context block
  const summary = older
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => {
      const content = typeof m.content === 'string' ? m.content : '';
      return `${m.role}: ${content.slice(0, 100)}`;
    })
    .slice(-10) // Only last 10 older messages
    .join('\n');

  const contextMsg = {
    role: 'system' as const,
    content: `## Earlier Conversation Summary (condensed)\n${summary}`,
  };

  return [contextMsg, ...recent];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext, role = 'user' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build system message with context
    let systemContent = getSystemPrompt(role);

    if (userContext) {
      systemContent += `\n\n## Current User Context\n`;
      if (userContext.name) systemContent += `- Name: ${userContext.name}\n`;
      if (userContext.recentOrders?.length > 0) {
        systemContent += `- Recent orders:\n`;
        userContext.recentOrders.forEach((o: any) => {
          systemContent += `  • #${o.orderId}: ${o.items?.join(', ') || 'items'} (${o.status}) — $${o.total}\n`;
        });
      }
      if (userContext.preferences) systemContent += `- Preferences: ${userContext.preferences}\n`;
      const hour = new Date().getHours();
      systemContent += `- Time: ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}\n`;
    }

    // Optimize token usage
    const optimizedMessages = optimizeMessages(messages);
    const tools = getTools(role);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemContent }, ...optimizedMessages],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
