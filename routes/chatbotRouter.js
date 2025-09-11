// routes/chatbotRouter.js
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const Order = require("../models/order-model.js");
const Product = require("../models/product-model.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { imageHash } = require("image-hash");
const chatHistoryStore = {}; // { userId: [{ role, content }, ...] }
const MAX_HISTORY = 10; // keep last 10 messages per user
const productHashCache = new Map();
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

// Helper: get perceptual hash
function getImageHash(filePath) {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// Helper: hamming distance
function hammingDistance(str1, str2) {
  let dist = 0;
  for (let i = 0; i < str1.length; i++) {
    if (str1[i] !== str2[i]) dist++;
  }
  return dist;
}

/**
 * 📤 File upload route (for image-based matching)
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  // NOTE: requires getImageHash(filePath) and hammingDistance(str1, str2) already defined
  const cleanupFile = (p) => {
    try { if (p && fs.existsSync(p)) fs.unlink(p, () => {}); } catch (e) {}
  };

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Allow only image mime types
    const mimetype = req.file.mimetype || "";
    if (!mimetype.startsWith("image/")) {
      cleanupFile(req.file.path);
      return res.status(400).json({ success: false, message: "Only image uploads are allowed" });
    }

    const uploadedPath = req.file.path;

    // Compute perceptual hash of uploaded image
    let uploadedHash;
    try {
      uploadedHash = await getImageHash(uploadedPath);
    } catch (err) {
      console.error("Failed to hash uploaded image:", err);
      cleanupFile(uploadedPath);
      return res.status(500).json({ success: false, message: "Failed to process uploaded image" });
    }

    // Load products
    const products = await Product.find({}).lean();
    if (!products || products.length === 0) {
      cleanupFile(uploadedPath);
      return res.json({ success: false, message: "No products found" });
    }

    const threshold = parseInt(process.env.IMAGE_MATCH_THRESHOLD) || 10;
    const matches = [];

    // Compare against each product image (cache hashes for performance)
    for (const product of products) {
      if (!product.image) continue;

      // Normalize product.image -> remove leading slash if present
      const cleanImagePath = product.image.startsWith("/")
        ? product.image.substring(1)
        : product.image;

      const productFullPath = path.join(__dirname, "..", "public", cleanImagePath);

      if (!fs.existsSync(productFullPath)) {
        // skip missing files silently
        continue;
      }

      try {
        // try cache first
        let productHash = productHashCache.get(productFullPath);
        if (!productHash) {
          productHash = await getImageHash(productFullPath);
          productHashCache.set(productFullPath, productHash);
        }

        const distance = hammingDistance(uploadedHash, productHash);
        if (typeof distance === "number") {
          // collect any image within a reasonable distance
          if (distance <= threshold) {
            matches.push({ product, distance });
          } else {
            // optionally keep best few even if > threshold (not needed)
          }
        }
      } catch (err) {
        console.warn("Skipping product image due to hash error:", productFullPath, err.message);
        continue;
      }
    }

    // cleanup uploaded file (we no longer need it)
    cleanupFile(uploadedPath);

    if (!matches.length) {
      return res.json({ success: false, message: "No matching product found" });
    }

    // sort by best (smallest) distance and return top 5 matches
    matches.sort((a, b) => a.distance - b.distance);
    const topMatches = matches.slice(0, 5).map((m) => ({
      id: m.product._id,
      name: m.product.name,
      price: m.product.price,
      originalPrice: m.product.originalPrice,
      discount: m.product.discount,
      image: m.product.image, // keep DB value (e.g. "/images/xxx.webp") so frontend <img> works
      distance: m.distance,
    }));

    return res.json({
      success: true,
      message: `Found ${topMatches.length} matching product(s).`,
      products: topMatches,
    });
  } catch (error) {
    console.error("Image upload/match error:", error);
    // try to cleanup uploaded file if present
    if (req.file && req.file.path) cleanupFile(req.file.path);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


/**
 * ✅ Greeting message
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
 * ✅ Predefined chatbot queries
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
 * 🛠 Main Chatbot Route
 */
router.post("/", async (req, res) => {
  try {
    const { message, userId } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    if (!userId) return res.status(400).json({ error: "userId is required" });

     // -----------------------------
    // 🟢 Direct Order Cancellation
    // -----------------------------
    const cancelRegex = /\bcancel\b.*(order)?\s*([a-f\d]{24})?/i;
    const match = message.match(cancelRegex);

    if (match) {
      let orderId = match[2];

      // If user typed "cancel my last order"
      if (/last order/i.test(message)) {
        const lastOrder = await Order.findOne({ user: userId, status: { $in: ["Pending", "Processing"] } })
          .sort({ createdAt: -1 });
        if (lastOrder) orderId = lastOrder._id.toString();
      }

      // If user typed "cancel this order" and only 1 pending order exists
      if (!orderId && /this order/i.test(message)) {
        const activeOrders = await Order.find({ user: userId, status: { $in: ["Pending", "Processing"] } });
        if (activeOrders.length === 1) {
          orderId = activeOrders[0]._id.toString();
        }
      }

      if (orderId) {
        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
          return res.json({ reply: `I couldn’t find order ${orderId} in our system.` });
        }

        if (["Pending", "Processing"].includes(order.status)) {
          order.status = "Cancelled";
          await order.save();
          return res.json({ reply: `✅ Order ${orderId} has been successfully cancelled.` });
        } else {
          return res.json({
            reply: `❌ Order ${orderId} cannot be cancelled because it is already "${order.status}".`
          });
        }
      }
    }
    // -----------------------------
    // 🔹 Conversation Memory Setup
    // -----------------------------
    if (!chatHistoryStore[userId]) chatHistoryStore[userId] = [];

    // Add user's message to history
    chatHistoryStore[userId].push({ role: "user", content: message });

    // Keep last MAX_HISTORY messages only
    if (chatHistoryStore[userId].length > MAX_HISTORY) {
      chatHistoryStore[userId].shift();
    }

    // -----------------------------
    // 🔎 Product Search Enhancements
    // -----------------------------
    const keywords = message
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          !["the", "and", "for", "with", "this", "that", "about", "tell", "show", "my"].includes(word)
      );

    let products = [];
    let filtersApplied = false;

    // Price filter: "under 2000", "below 1500", "less than 1000"
    const priceMatch = message.match(/(?:under|below|less than)\s*(\d+)/i);
    if (priceMatch) {
      const maxPrice = parseInt(priceMatch[1]);
      products = await Product.find({ price: { $lte: maxPrice } })
        .sort({ price: 1 })
        .limit(5)
        .lean();
      filtersApplied = true;
    }

    // Trending / popular products
    if (!filtersApplied && /(trending|popular|best\s*sellers?)/i.test(message)) {
      products = await Product.find({})
        .sort({ discount: -1 }) // using highest discount as proxy
        .limit(5)
        .lean();
      filtersApplied = true;
    }

    // Keyword search fallback
    if (!filtersApplied && keywords.length > 0) {
      const regex = new RegExp(keywords.join("|"), "i");
      products = await Product.find({ name: regex }).limit(5).lean();
    }

    // Orders for this user
    const orders = await Order.find({ user: userId })
      .populate("products.product", "name price originalPrice discount image")
      .sort({ createdAt: -1 })
      .lean();

    // Summaries
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
Use previous conversation context to maintain continuity.

Session Data:
Orders for this user:
${ordersSummary}

Matching products:
${productsSummary}

Rules:
- If user asks for tracking, show the order status from Session Data.
- If user asks for cancellation, allow only if order status is "Pending" or "Processing".
- If user asks generally like "cancel my last order", suggest the ID from Session Data.
- If no relevant data is found, reply: "I couldn’t find that in our system."
- Keep answers short, clear, and precise.
    `;

    // -----------------------------
    // 🧠 AI Call (OpenAI / OpenRouter)
    // -----------------------------
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
            ...chatHistoryStore[userId],
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
            ...chatHistoryStore[userId],
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

    // -----------------------------
    // 🔹 Save bot reply to conversation memory
    // -----------------------------
    chatHistoryStore[userId].push({ role: "assistant", content: reply });
    if (chatHistoryStore[userId].length > MAX_HISTORY) chatHistoryStore[userId].shift();

    // ✅ Return reply + structured product data
    return res.json({
      reply,
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        discount: p.discount,
        image: p.image,
      })),
    });
  } catch (error) {
    console.error("💥 Chatbot Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

module.exports = router;
