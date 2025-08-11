// routes/chatbotRouter.js
const express = require("express");
// dynamic import to avoid ESM require crash for node-fetch
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const Order = require("../models/order-model.js");
const Product = require("../models/product-model.js");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // --- Keyword extraction (lightweight) ---
    const keywords = message
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          !["the", "and", "for", "with", "this", "that", "about", "tell"].includes(word)
      );

    // --- Get user orders (note: your model uses 'products' and 'totalAmount') ---
    const orders = await Order.find({ user: userId })
      .populate("products.product", "name price originalPrice discount image")
      .sort({ createdAt: -1 })
      .lean();

    // --- Get matching products ---
    let products = [];
    if (keywords.length > 0) {
      const regex = new RegExp(keywords.join("|"), "i");
      products = await Product.find({ name: regex }).limit(5).lean();
    }

    // --- Build system prompt using real DB data (safe fallback) ---
    const ordersSummary = orders.length
      ? orders
          .map((o) => {
            const items = (o.products || []).map(p => `${p.product?.name || "[Removed]"} x${p.quantity}`).join(", ");
            return `Order ID: ${o._id}
Status: ${o.status}
Items: ${items || "No items"}
Delivery Address: ${o.address?.street || "N/A"}, ${o.address?.city || "N/A"}
Total: ₹${o.totalAmount ?? 0}`;
          })
          .join("\n\n")
      : "No orders for this user.";

    const productsSummary = products.length
      ? products.map(p => `${p.name} - ₹${p.price} (Discount: ₹${p.discount || 0})`).join("\n")
      : "No matching products found for this query.";

    const systemPrompt = `
You are Bagify's AI Assistant.
Only answer questions related to Bagify store, products, orders, and delivery.
If the question is unrelated, politely say you can only help with Bagify-related queries.

Session Data (do NOT hallucinate beyond this data):
Orders for this user:
${ordersSummary}

Matching products:
${productsSummary}

Rules:
- If user asks for tracking, show the order status from the Session Data above.
- If user asks for cancellation, verify order status is "Pending" or "Processing" before approving.
- If no relevant data is found in the session, reply: "I couldn’t find that in our system."
- Keep responses short and precise, provide action steps only when applicable.
    `;

    // --- Choose provider: prefer OpenAI if present, fallback to OpenRouter if present ---
    const openaiKey = process.env.OPENAI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    let apiResp, data;

    if (openaiKey) {
      // Use OpenAI official API (gpt-3.5-turbo) to avoid model access errors/quota with other providers
      apiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.2,
        }),
      });

      data = await apiResp.json();
      console.log("🔍 OpenAI response:", JSON.stringify(data, null, 2));
      if (apiResp.status !== 200) {
        const errMsg = data?.error?.message || `OpenAI API returned ${apiResp.status}`;
        return res.status(500).json({ error: errMsg });
      }
    } else if (openrouterKey) {
      // Use OpenRouter as fallback — ensure model is allowed for your key (config via env)
      const orModel = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";
      apiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: orModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.2,
        }),
      });

      data = await apiResp.json();
      console.log("🔍 OpenRouter response:", JSON.stringify(data, null, 2));
      if (apiResp.status !== 200) {
        const errMsg = data?.error?.message || `OpenRouter API returned ${apiResp.status}`;
        return res.status(500).json({ error: errMsg });
      }
    } else {
      return res.status(500).json({ error: "No AI provider configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY." });
    }

    // Response normalization
    const reply = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? null;
    if (!reply) {
      console.error("No reply text found in AI response", data);
      return res.status(500).json({ error: "No reply from AI" });
    }

    // success
    return res.json({ reply });

  } catch (error) {
    console.error("💥 Chatbot Server Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

module.exports = router;
