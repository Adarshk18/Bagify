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
      req.flash("error", "Discount cannot be more than or equal to original price.");
      return res.redirect("/admin/create");
    }

    const product = await productModel.create({
      name,
      price: finalPrice,
      originalPrice: numericOriginal,
      discount: numericDiscount,
      bgcolor,
      panelcolor,
      textcolor,
      image: req.file.filename,
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
