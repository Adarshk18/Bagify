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
    const { search, sortby, discount } = req.query;
    const query = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      query.name = { $regex: regex };
      console.log("Search keyword:", search);
      console.log("Search regex:", regex);
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

    console.log("Final query:", query);
    const products = await productModel.find(query).sort(sortOption);
    console.log("Products found:", products.length);

    res.render("products/shop", {
      products,
      search,
    });
  } catch (err) {
    console.error("Product fetch error:", err);
    
    req.flash("error", "Failed to load products");
    res.redirect("/");
  }
};


