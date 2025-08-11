// routes/chatbotRouter.js
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const Order = require("../models/order-model.js");
const Product = require("../models/product-model.js");

const router = express.Router();

/**
 * ✅ New: Greeting message with emoji + card-style options
 */
router.get("/greeting", (req, res) => {
  res.json({
    message: "👋 Hey there! Welcome to Bagify. How can I help you today?",
    cards: [
      { label: "🛍️ View Latest Orders", query: "Show my latest orders" },
      { label: "📦 Track Order", query: "Track my order status" },
      { label: "❌ Cancel Order", query: "Cancel my recent order" },
      { label: "💸 Discounts", query: "Show products on discount" },
      { label: "✨ Recommendations", query: "Recommend products for me" }
    ]
  });
});

/**
 * ✅ Existing: Predefined chatbot queries
 */
router.get("/options", (req, res) => {
  res.json([
    "Show my latest orders",
    "Track my order status",
    "Cancel my recent order",
    "Show products on discount",
    "Recommend products for me"
  ]);
});

/**
 * 🛠 POST route — works with both typed & predefined queries
 */
router.post("/", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const keywords = message
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          !["the", "and", "for", "with", "this", "that", "about", "tell", "show", "my"].includes(word)
      );

    const orders = await Order.find({ user: userId })
      .populate("products.product", "name price originalPrice discount image")
      .sort({ createdAt: -1 })
      .lean();

    let products = [];
    if (keywords.length > 0) {
      const regex = new RegExp(keywords.join("|"), "i");
      products = await Product.find({ name: regex }).limit(5).lean();
    }

    const ordersSummary =
      orders.length > 0
        ? orders
            .map((o) => {
              const items = (o.products || [])
                .map((p) => `${p.product?.name || "[Removed]"} x${p.quantity}`)
                .join(", ");
              return `Order ID: ${o._id}
Status: ${o.status}
Items: ${items || "No items"}
Delivery Address: ${o.address?.street || "N/A"}, ${o.address?.city || "N/A"}
Total: ₹${o.totalAmount ?? 0}`;
            })
            .join("\n\n")
        : "No orders found for this user.";

    const productsSummary =
      products.length > 0
        ? products
            .map((p) => `${p.name} - ₹${p.price} (Discount: ₹${p.discount || 0})`)
            .join("\n")
        : "No products found matching your query.";

    const systemPrompt = `
You are Bagify's AI Assistant.
Answer only questions related to Bagify store, products, orders, and delivery.

Session Data:
Orders for this user:
${ordersSummary}

Matching products:
${productsSummary}

Rules:
- If user asks for tracking, show the order status from Session Data.
- If user asks for cancellation, allow only if order status is "Pending" or "Processing".
- If no relevant data is found, reply: "I couldn’t find that in our system."
- Keep answers short, clear, and precise.
    `;

    const openaiKey = process.env.OPENAI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    let data;

    if (openaiKey) {
      const apiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.2,
        }),
      });

      data = await apiResp.json();
      if (!apiResp.ok) {
        throw new Error(data?.error?.message || `OpenAI API Error ${apiResp.status}`);
      }
    } else if (openrouterKey) {
      const orModel = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";
      const apiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: orModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.2,
        }),
      });

      data = await apiResp.json();
      if (!apiResp.ok) {
        throw new Error(data?.error?.message || `OpenRouter API Error ${apiResp.status}`);
      }
    } else {
      return res.status(500).json({ error: "No AI provider configured. Please set OPENAI_API_KEY or OPENROUTER_API_KEY." });
    }

    const reply = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || null;
    if (!reply) throw new Error("No reply from AI.");

    return res.json({ reply });
  } catch (error) {
    console.error("💥 Chatbot Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

module.exports = router;
