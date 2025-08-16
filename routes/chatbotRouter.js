// routes/chatbotRouter.js
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const Order = require("../models/order-model.js");
const Product = require("../models/product-model.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// File upload route
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    fileType: req.file.mimetype
  });
});

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

    // 🟢 Check if user explicitly asked to cancel an order
    const cancelMatch = message.match(/cancel.*order.*([a-f0-9]{24})/i);
    if (cancelMatch) {
      const orderId = cancelMatch[1];
      try {
        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
          return res.json({ reply: `I couldn't find order ${orderId} in your account.` });
        }

        if (order.status === "Pending") {
          order.status = "Cancelled";
          await order.save();
          return res.json({ reply: `✅ Order ${orderId} has been cancelled successfully.` });
        } else {
          return res.json({
            reply: `❌ Order ${orderId} is currently "${order.status}". Only Pending orders can be cancelled.`
          });
        }
      } catch (err) {
        console.error("Cancel order error:", err);
        return res.json({ reply: "Something went wrong while cancelling your order." });
      }
    }

    // 🟢 Case 2: User says "cancel my order" / "cancel recent order" without ID
    if (/cancel.*(recent|my).*order/i.test(message)) {
      try {
        const latestOrder = await Order.findOne({ user: userId }).sort({ createdAt: -1 });
        if (!latestOrder) {
          return res.json({ reply: "You don’t have any orders to cancel." });
        }

        if (latestOrder.status === "Pending") {
          latestOrder.status = "Cancelled";
          await latestOrder.save();
          return res.json({ reply: `✅ Your most recent order (${latestOrder._id}) has been cancelled.` });
        } else {
          return res.json({
            reply: `❌ Your most recent order (${latestOrder._id}) is currently "${latestOrder.status}". Only Pending orders can be cancelled.`
          });
        }
      } catch (err) {
        console.error("Cancel recent order error:", err);
        return res.json({ reply: "Something went wrong while cancelling your recent order." });
      }
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
