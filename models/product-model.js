const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const productSchema = mongoose.Schema({
  images: [String],
  name: {
    type: String,
    required: true,
    trim: true,
  },
  originalPrice: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0, // stored as ₹
  },
  stock: {
    type: Number,
    default: 0, // 📦 New field: product quantity available
  },
  bgcolor: String,
  panelcolor: String,
  textcolor: String,
  description: String,
  reviews: [reviewSchema],
});

module.exports = mongoose.model("Product", productSchema);
