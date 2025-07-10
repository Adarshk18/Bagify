const express = require("express");
const router = express.Router();
const productModel = require("../models/product-model");
const isLoggedIn = require("../middlewares/isLoggedIn");

router.get("/shop", isLoggedIn, async (req, res) => {
  const products = await productModel.find();
  res.render("shop", { products, user: req.user });
});

module.exports = router;