const express = require("express");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const Order = require("../models/order-model.js");
const Product = require("../models/product-model.js");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // --- Keyword extraction ---
    const keywords = message
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          !["the", "and", "for", "with", "this", "that", "about", "tell"].includes(word)
      );

    // --- Get user orders ---
    const orders = await Order.find({ user: userId })
      .populate("items.product", "name price originalPrice discount image")
      .sort({ createdAt: -1 });

    // --- Get matching products ---
    let products = [];
    if (keywords.length > 0) {
      const regex = new RegExp(keywords.join("|"), "i");
      products = await Product.find({ name: regex }).limit(5);
    }

    // --- System prompt with actual DB data ---
    const systemPrompt = `
You are Bagify's AI Assistant.
Only answer questions related to Bagify store, products, orders, and delivery.
If the question is unrelated, politely say you can only help with Bagify-related queries.

Session Data:
Orders for this user:
${orders.map(o => `
Order ID: ${o._id}
Status: ${o.status}
Items: ${o.items.map(i => `${i.product?.name || "[Removed]"} x${i.quantity}`).join(", ")}
Delivery Address: ${o.address?.street || "N/A"}, ${o.address?.city || "N/A"}
Total: ₹${o.totalPrice}`).join("\n")}

Matching products:
${products.map(p => `${p.name} - ₹${p.price} (Discount: ₹${p.discount})`).join("\n")}

Rules:
- If user asks for tracking, show the order status directly.
- If user asks for cancellation, check if the order status is "Processing" or "Pending" before approving.
- If no relevant data is found, say "I couldn’t find that in our system."
    `;

    // --- Send to OpenRouter ---
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    // Log full response for debugging
    console.log("🔍 OpenRouter API Full Response:", JSON.stringify(data, null, 2));

    if (data.error) {
      console.error("🚨 OpenRouter API Error:", data.error);
      return res.status(500).json({ error: data.error.message || "GPT API Error" });
    }

    if (!data.choices || !data.choices.length) {
      console.error("🚨 No choices in response");
      return res.status(500).json({ error: "No response from AI" });
    }

    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error("💥 Chatbot Server Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

module.exports = router;
