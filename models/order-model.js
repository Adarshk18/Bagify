const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      quantity: Number,
      snapshot: {
        name: String,
        price: Number,
        image: String,
        description: String
      },
    },
  ],
  totalAmount: Number,

  // ✅ NEW: Embedded Delivery Address at time of order
  address: {
    name: String,
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
  },

  paymentMethod: {
    type: String,
    enum: ["COD", "Razorpay", "Wallet", "UPI"],
    required: true
  },

  status: {
    type: String,
    default: "Pending", // Pending, Paid, Cancelled, Shipped
  },

  // createdAt: {
  //   type: Date,
  //   default: Date.now,
  // },
}, { timestamps: true });

module.exports = mongoose.model("order", orderSchema);
