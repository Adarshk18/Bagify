const express = require("express");
const router = express.Router();
const productModel = require("../models/product-model");
const isLoggedIn = require("../middlewares/isLoggedIn");
const isAdmin = require("../middlewares/isAdmin");
const multer = require("multer");
const path = require("path");

// 🖼️ Multer config for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

// 🛒 Shop Page (User Side)
router.get("/shop", isLoggedIn, async (req, res) => {
  const query = req.query.search || "";
  const products = await productModel.find({
    name: { $regex: query, $options: "i" },
  });
  res.render("shop", { products, user: req.user, search: query });
});

// ➕ Product Creation (Admin Only)
router.post("/create", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;
    const image = req.file ? "/images/" + req.file.filename : null;

    
    if (Number(discount) > Number(price)) {
      req.flash("error", "Discount cannot be greater than price");
      return res.redirect("/admin");
    }

    await productModel.create({
      name,
      price,
      discount,
      image,
      bgcolor,
      panelcolor,
      textcolor,
    });

    req.flash("success", "Product created successfully!");
    res.redirect("/admin");
  } catch (err) {
    console.error("Product creation error:", err.message);
    req.flash("error", "Failed to create product.");
    res.redirect("/admin");
  }
});

module.exports = router;
