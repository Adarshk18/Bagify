const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
      quantity: { type: Number, default: 1 },
    }
  ]
}, { timestamps: true }); // ✅ gives createdAt & updatedAt

module.exports = mongoose.model("cart", cartSchema);
