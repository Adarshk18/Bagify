const productModel = require("../models/product-model");
const fs = require("fs");
const path = require("path");

exports.renderCreateForm = (req, res) => {
  res.render("admin/createproduct", { success: "" });
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;

    const product = await productModel.create({
      name,
      price,
      discount,
      bgcolor,
      panelcolor,
      textcolor,
      image: req.file.filename
    });

    req.flash("success", "Product Created");
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating product");
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await productModel.find({});
    res.render("products/shop", { products });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load products");
    res.redirect("/");
  }
};
