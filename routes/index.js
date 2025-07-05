const express = require("express");
const router = express.Router();
const isLoggedin = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");

router.get("/", (req, res) => {
    let error = req.flash("error");
    res.render("index", { error });
});

router.get("/shop", isLoggedin, async (req, res) => {
  try {
    const products = await productModel.find({});
    res.render("shop", { products });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load products");
    res.redirect("/");
  }
});



module.exports = router;