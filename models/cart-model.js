const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, default: 1 },
    }
  ],
  lastReminderSentAt: { type: Date, default: null } // 🆕 prevent spam
}, { timestamps: true });

module.exports = mongoose.model("cart", cartSchema);
