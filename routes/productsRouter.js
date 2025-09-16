const express = require("express");
const router = express.Router();
const productModel = require("../models/product-model");
const isLoggedIn = require("../middlewares/isLoggedIn");
const isAdmin = require("../middlewares/isAdmin");
const multer = require("multer");
const path = require("path");
const productController = require("../controllers/productController");

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

// 📌 Shop Page
router.get("/shop", productController.getAllProducts);

// 📌 Product Detail Page
router.get("/:id", productController.getProductById);

// 📌 Add Review (User Only)
// router.post("/products/:id/reviews", isLoggedIn, productController.addReview);

// ➕ Product Creation (Admin Only - multiple images)
router.post("/create", isAdmin, upload.array("images", 5), async (req, res) => {
  try {
    const {
      name,
      originalPrice,
      discount = 0,
      bgcolor,
      panelcolor,
      textcolor,
      description,
    } = req.body;

    const numericOriginal = Number(originalPrice) || 0;
    const numericDiscount = Number(discount) || 0;
    const finalPrice = Math.max(0, numericOriginal - numericDiscount);

    if (numericDiscount >= numericOriginal) {
      req.flash("error", "Discount cannot be more than or equal to original price.");
      return res.redirect("/admin");
    }

    const images = req.files ? req.files.map(file => "/images/" + file.filename) : [];

    await productModel.create({
      name,
      price: finalPrice,
      originalPrice: numericOriginal,
      discount: numericDiscount,
      bgcolor,
      panelcolor,
      textcolor,
      description,
      images,
    });

    req.flash("success", "Product created successfully!");
    res.redirect("/admin");
  } catch (err) {
    console.error("Product creation error:", err.message);
    req.flash("error", "Failed to create product.");
    res.redirect("/admin");
  }
});

router.post("/buy/:id", productController.buyNow);
router.post('/:id/reviews', productController.addReview);



module.exports = router;
