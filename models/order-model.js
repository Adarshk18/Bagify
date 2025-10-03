const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        snapshot: {
          name: String,
          price: Number,
          image: String,
          description: String,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    // ✅ Embedded delivery address (frozen at order time)
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
      enum: ["COD", "Razorpay"],
      required: true,
    },

    coinsUsed: {
      type: Number,
      default: 0
    },


    // ✅ Order lifecycle statuses
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Pending",
    },

    // ✅ Track when status was last updated
    statusUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("order", orderSchema);
