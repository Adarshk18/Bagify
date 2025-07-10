const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");

// 🛒 Add to cart
router.post("/add/:id", isLoggedIn, async (req, res) => {
  const productId = req.params.id;
  const user = await userModel.findById(req.user._id);

  const existingItem = user.cart.find((item) => item.product == productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    user.cart.push({ product: productId });
  }

  await user.save();
  req.flash("success", "Added to cart!");
  res.redirect("/shop");
});

// 🚮 Remove from cart
router.get("/remove/:id", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id);
  user.cart = user.cart.filter((item) => item.product != req.params.id);
  await user.save();
  req.flash("success", "Item removed from cart.");
  res.redirect("/cart");
});

// 📦 View cart
router.get("/", isLoggedIn, async (req, res) => {
  const user = await userModel
    .findById(req.user._id)
    .populate("cart.product");

  const cartItems = user.cart;
  let total = 0;

  cartItems.forEach((item) => {
    const price = item.product.price;
    const discount = item.product.discount || 0;
    total += (price - discount) * item.quantity;
  });

  res.render("cart", { cartItems, total, user });
});

module.exports = router;
