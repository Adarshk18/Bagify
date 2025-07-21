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
  let filter = {};
  let sort = {};

  // ✅ Keyword search
  if (req.query.search && req.query.search.trim() !== "") {
    filter.name = { $regex: req.query.search.trim(), $options: "i" };
  }

  // ✅ Discount filter
  if (req.query.discount === "yes") {
    filter.discount = { $gt: 0 };
  }

  // ✅ Price sorting
  if (req.query.sortby === "price_asc") sort.price = 1;
  else if (req.query.sortby === "price_desc") sort.price = -1;

  try {
    const products = await productModel.find(filter).sort(sort);
    res.render("shop", {
      products,
      user: req.user,
      search: req.query.search || "",
    });
  } catch (err) {
    console.error("Shop Page Error:", err.message);
    res.status(500).send("Server Error");
  }
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
