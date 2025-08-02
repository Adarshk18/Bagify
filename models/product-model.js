const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  image: String,
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
});

module.exports = mongoose.model("Product", productSchema);
