const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const cartController = require("../controllers/cartController");

// 🧺 View cart
router.get("/", isLoggedIn, cartController.viewCart);

// 🛒 Add to cart
router.post("/add/:productId", isLoggedIn, cartController.addToCart);

// 🚮 Remove from cart
router.get("/remove/:productId", isLoggedIn, cartController.removeFromCart);

// 🔁 Update quantity
router.post("/update", isLoggedIn, cartController.updateQuantity);

module.exports = router;
