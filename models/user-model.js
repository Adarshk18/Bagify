const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: { type: Number, default: 1, min: 1, }
});

const orderSchema = new mongoose.Schema({
  items: [cartItemSchema],
  totalAmount: Number,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now }
});


const userSchema = mongoose.Schema({
    fullname: String,
    email: String,
    password: String,
    cart: [cartItemSchema],
    orders: [orderSchema],
    contact: Number,
    picture: String,
});

module.exports = mongoose.model("user", userSchema);