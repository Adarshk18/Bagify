const mongoose = require("mongoose");

// 🛒 Individual Cart Item Schema
const cartItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product", 
    required: true 
  },
  quantity: { 
    type: Number, 
    default: 1, 
    min: 1 
  }
});

// 📦 Order Schema
const orderSchema = new mongoose.Schema({
  items: [cartItemSchema],
  totalAmount: Number,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

// 👤 User Schema
const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  contact: {
    type: String,
    match: [/^\d{10}$/, "Invalid contact number"]
  },
  picture: String,

  // 🛒 Embed Cart Items
  cart: [cartItemSchema],

  // 📦 Embed Orders
  orders: [orderSchema],

  // 👤 Role
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  }
}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);
