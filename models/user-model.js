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
// 📦 Order Schema
const orderSchema = new mongoose.Schema({
  items: [cartItemSchema],
  totalAmount: Number,
  status: { type: String, default: "pending" },
  paymentMethod: { type: String, enum: ["COD", "Razorpay"], default: "COD" },
  coinsUsed: { type: Number, default: 0 },   // 👈 track redeemed coins
  coinsEarned: { type: Number, default: 0 }, // 👈 track reward coins earned
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
  coins: {
    type: Number,
    default: 0, // every new user starts with 0 coins
  },
  contact: {
    type: String,
    match: [/^\d{10}$/, "Invalid contact number"]
  },
  picture: String,

addresses: [
  {
    name: String, // 👈 changed from fullname to name
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
    landmark: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
],



  // 🛒 Embed Cart Items
  cart: [cartItemSchema],

  // 📦 Embed Orders
  orders: [
  { type: mongoose.Schema.Types.ObjectId, ref: "order" }
],


  // 👤 Role
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
    // Forgot Password
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  avatar: {
  type: String,
  default: "/images/default-avatar.png"
},

  // 🆕 For abandoned cart tracking
  lastCartReminderSentAt: { type: Date, default: null }


}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);
