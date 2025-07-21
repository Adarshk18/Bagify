const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const isAdmin = require("../middlewares/isAdmin");
const productModel = require("../models/product-model");
const upload = require("../config/multer-config");
const orderModel = require("../models/order-model");

// Create owner (dev only)
if (process.env.NODE_ENV === "development") {
  router.post("/create", async (req, res) => {
    const { fullname, email, password } = req.body;
    const existing = await ownerModel.find();
    if (existing.length) return res.status(403).send("Not allowed");

    const owner = await ownerModel.create({ fullname, email, password });
    res.status(201).send(owner);
  });
}

router.get("/admin", isAdmin, async (req, res) => {
  const success = req.flash("success");
  const products = await productModel.find();
  res.render("createproducts", { success, products });
});

router.post("/admin/create", isAdmin, upload.single("image"), async (req, res) => {
  const data = req.body;
  
  if (!req.file) {
    req.flash("error", "Image is required");
    return res.redirect("/admin");
  }
  data.image = "/images/" + req.file.filename;
  await productModel.create(data);
  req.flash("success", "Product Created");
  res.redirect("/admin");
});

router.get("/admin/edit/:id", isAdmin, async (req, res) => {
  const product = await productModel.findById(req.params.id);
  res.render("editproduct", { product });
});

router.post("/admin/edit/:id", isAdmin, upload.single("image"), async (req, res) => {
  const update = req.body;
  if (req.file) update.image = req.file.filename;
  await productModel.findByIdAndUpdate(req.params.id, update);
  req.flash("success", "Product Updated");
  res.redirect("/admin");
});

router.get("/admin/delete/:id", isAdmin, async (req, res) => {
  await productModel.findByIdAndDelete(req.params.id);
  req.flash("success", "Product Deleted");
  res.redirect("/admin");
});

// Admin Order Dashboard
router.get("/admin/orders", isAdmin, async (req, res) => {
  try {
    const orders = await orderModel
      .find()
      .populate("products.product")
      .populate("user");

    res.render("admin-orders", { orders });
  } catch (err) {
    console.error("Admin Orders Error:", err.message);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/admin/orders/update/:id", isAdmin, async (req, res) => {
  const { status } = req.body;
  await orderModel.findByIdAndUpdate(req.params.id, { status });
  req.flash("success", "Order status updated");
  res.redirect("/admin/orders");
});

module.exports = router;