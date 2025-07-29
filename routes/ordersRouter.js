const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");
const razorpay = require("../utils/razorpay");
const crypto = require("crypto");
const orderController = require("../controllers/orderController");



router.get("/", isLoggedIn, async (req, res) => {
  const orders = await orderModel
    .find({ user: req.user._id })
    .populate("products.product");
  res.render("orders", { orders });
});

router.get("/checkout", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id).populate("cart.productId");

  if (!user.cart.length) {
    req.flash("error", "Your cart is empty.");
    return res.redirect("/cart");
  }

  let total = 0;
  user.cart.forEach((item) => {
    const price = item.productId.price - item.productId.discount;
    total += price * item.quantity;
  });


  res.render("checkout", {
    user,
    total,
    payOnline: false, // 👈 important so it sets COD in hidden input
  });
});

router.post("/pay", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id).populate("cart.productId");

  if (!user.cart.length) {
    req.flash("error", "Cart is empty.");
    return res.redirect("/cart");
  }

  let total = 0;
  const orderItems = user.cart
  .filter(item => item.productId)
  .map((item) => {
    const price = item.productId.price - item.productId.discount;
    total += price * item.quantity;
    return {
      product: item.productId._id,
      quantity: item.quantity,
    };
  });


  const options = {
    amount: total * 100, // in paise
    currency: "INR",
    receipt: "order_rcptid_" + Date.now(),
  };

  const razorpayOrder = await razorpay.orders.create(options);

  // Save to session temporarily
  req.session.orderData = { orderItems, total };

  res.render("razorpay-checkout", {
    key: process.env.RAZORPAY_KEY_ID,
    orderId: razorpayOrder.id,
    amount: total,
    user: req.user,
  });
});

router.post("/payment-success", isLoggedIn, async (req, res) => {
  const { orderItems, total } = req.session.orderData;

  await orderModel.create({
    user: req.user._id,
    products: orderItems,
    totalAmount: total,
    status: "Paid",
  });

  const user = await userModel.findById(req.user._id);
  user.cart = [];
  await user.save();

  req.flash("success", "Payment successful & order placed!");
  res.status(200).end(); // Responds to fetch() in razorpay-checkout
});
router.post("/submit", isLoggedIn, orderController.placeOrder);

router.post("/cancel/:id", isLoggedIn, orderController.cancelOrder);


module.exports = router;
