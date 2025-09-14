const productModel = require("../models/product-model");
const fs = require("fs");
const path = require("path");

// Render the admin product creation form
exports.renderCreateForm = (req, res) => {
  res.render("admin/createproduct", { success: "" });
};

// Handle product creation
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      originalPrice,
      discount = 0,
      bgcolor,
      panelcolor,
      textcolor,
    } = req.body;

    const numericOriginal = Number(originalPrice) || 0;
    const numericDiscount = Number(discount) || 0;
    const finalPrice = Math.max(0, numericOriginal - numericDiscount);

    // Ensure discount is not more than original price
    if (numericDiscount >= numericOriginal) {
      req.flash(
        "error",
        "Discount cannot be more than or equal to original price."
      );
      return res.redirect("/admin/create");
    }

    // 📌 Store uploaded image(s)
    let images = [];
    if (req.file) {
      images = ["/images/" + req.file.filename];
    } else if (req.files && req.files.length > 0) {
      images = req.files.map((file) => "/images/" + file.filename);
    }

    const product = await productModel.create({
      name,
      price: finalPrice,
      originalPrice: numericOriginal,
      discount: numericDiscount,
      bgcolor,
      panelcolor,
      textcolor,
      images, // ✅ uses array now
    });

    req.flash("success", "Product Created");
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating product");
  }
};

// Get all products (for /shop page with search/filter)
exports.getAllProducts = async (req, res) => {
  try {
    const { search, sortby, discount } = req.query;
    const query = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      query.name = { $regex: regex };
    }

    if (discount === "yes") {
      query.discount = { $gt: 0 };
    }

    let sortOption = {};
    if (sortby === "price_asc") {
      sortOption.price = 1;
    } else if (sortby === "price_desc") {
      sortOption.price = -1;
    }

    const products = await productModel.find(query).sort(sortOption);

    res.render("shop", {
      products,
      search,
    });
  } catch (err) {
    console.error("Product fetch error:", err);
    req.flash("error", "Failed to load products");
    res.redirect("/");
  }
};

// Get single product details
exports.getProductById = async (req, res) => {
  try {
    const product = await productModel
      .findById(req.params.id)
      .populate("reviews.user", "name");

    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/shop");
    }

    res.render("product-details", { product, user: req.session.user });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load product");
    res.redirect("/shop");
  }
};

exports.buyNow = async (req, res) => {
  const product = await productModel.findById(req.params.id);
  req.session.cart = [{ product, quantity: 1 }];
  res.redirect("/orders/checkout");
};
