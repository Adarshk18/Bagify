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
    let filter = {};
    let sort = {};

    // Filter by discount
    if (req.query.discount === "yes") {
      filter.discount = { $gt: 0 };
    }

    // Filter by price range
    if (req.query.min || req.query.max) {
      filter.price = {};
      if (req.query.min) filter.price.$gte = parseInt(req.query.min);
      if (req.query.max) filter.price.$lte = parseInt(req.query.max);
    }

    // Sorting
    if (req.query.sortby === "price_asc") {
      sort.price = 1;
    } else if (req.query.sortby === "price_desc") {
      sort.price = -1;
    }

    const products = await productModel.find(filter).sort(sort);
    res.render("shop", { products });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load products");
    res.redirect("/");
  }
});




module.exports = router;