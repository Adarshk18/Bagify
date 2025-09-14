const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  images: [String],
  name: {
    type: String,
    required: true,
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
  bgcolor: String,
  panelcolor: String,
  textcolor: String,
  description: String,
  reviews: [                 // user reviews
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: { type: Date, default: Date.now },
    },
  ], 
});

module.exports = mongoose.model("Product", productSchema);
