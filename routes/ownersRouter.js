const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const isAdmin = require("../middlewares/isAdmin");
const productModel = require("../models/product-model");
const upload = require("../config/multer-config");
const orderModel = require("../models/order-model");

// ⚡️ DEV ONLY: Create first owner
if (process.env.NODE_ENV === "development") {
  router.post("/create", async (req, res) => {
    const { fullname, email, password } = req.body;
    const existing = await ownerModel.find();
    if (existing.length) return res.status(403).send("Not allowed");

    const owner = await ownerModel.create({ fullname, email, password });
    res.status(201).send(owner);
  });
}

// 🛒 Admin Products Dashboard
router.get("/admin", isAdmin, async (req, res) => {
  const success = req.flash("success");
  const error = req.flash("error");
  const products = await productModel.find();
  res.render("createproducts", { success, error, products });
});

// ➕ Create Product
router.post("/admin/create", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const data = req.body;

    if (!req.file) {
      req.flash("error", "Image is required");
      return res.redirect("/admin");
    }

    data.image = "/images/" + req.file.filename;
    await productModel.create(data);

    req.flash("success", "✅ Product Created");
    res.redirect("/admin");
  } catch (err) {
    console.error("Product Create Error:", err);
    req.flash("error", "Something went wrong while creating product");
    res.redirect("/admin");
  }
});

// ✏️ Edit Product
router.get("/admin/edit/:id", isAdmin, async (req, res) => {
  const product = await productModel.findById(req.params.id);
  res.render("editproduct", { product });
});

router.post("/admin/edit/:id", isAdmin, upload.single("image"), async (req, res) => {
  const update = req.body;
  if (req.file) update.image = "/images/" + req.file.filename;

  await productModel.findByIdAndUpdate(req.params.id, update);
  req.flash("success", "✅ Product Updated");
  res.redirect("/admin");
});

// ❌ Delete Product
router.get("/admin/delete/:id", isAdmin, async (req, res) => {
  await productModel.findByIdAndDelete(req.params.id);
  req.flash("success", "🗑️ Product Deleted");
  res.redirect("/admin");
});

// 📦 Admin Order Dashboard
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

// 🔄 Update Order Status (with real-time socket emit)
router.post("/admin/orders/update/:id", isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const order = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate("user");

    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/admin/orders");
    }

    // ⚡ Emit event for real-time update
    const io = req.app.get("io");
    if (io) {
      io.emit("orderStatusUpdated", {
        orderId: order._id,
        newStatus: order.status,
        userId: order.user ? order.user._id : null
      });
    }

    req.flash("success", `Order #${orderId} status updated to ${status}`);
    res.redirect("/admin/orders");
  } catch (err) {
    console.error("Order Update Error:", err);
    req.flash("error", "Something went wrong while updating order");
    res.redirect("/admin/orders");
  }
});

module.exports = router;
