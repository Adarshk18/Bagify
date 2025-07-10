const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");

router.get("/", isLoggedIn, async (req, res) => {
  const orders = await orderModel
    .find({ user: req.user._id })
    .populate("products.product");
  res.render("orders", { orders });
});

router.get("/checkout", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id).populate("cart.product");

  if (!user.cart.length) {
    req.flash("error", "Your cart is empty.");
    return res.redirect("/cart");
  }

  let total = 0;
  const orderItems = user.cart.map((item) => {
    const price = item.product.price - item.product.discount;
    total += price * item.quantity;
    return { product: item.product._id, quantity: item.quantity };
  });

  const newOrder = await orderModel.create({
    user: user._id,
    products: orderItems,
    totalAmount: total,
  });

  // Clear user cart
  user.cart = [];
  await user.save();

  req.flash("success", "Order placed successfully!");
  res.redirect("/orders");
});

module.exports = router;
