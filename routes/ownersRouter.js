const express = require("express");
const router = express.Router();

const passport = require("passport");
const path = require("path");

const ownerModel = require("../models/owner-model");
const isAdmin = require("../middlewares/isAdmin");
const productModel = require("../models/product-model");
const upload = require("../config/multer-config");
const orderModel = require("../models/order-model");
const { sendMail } = require("../utils/mailer");

// ⚡️ DEV ONLY: Create first owner
if (process.env.NODE_ENV === "development") {
  router.post("/create", async (req, res) => {
    try {
      const { fullname, email, password } = req.body;
      const existing = await ownerModel.find();
      if (existing.length) return res.status(403).send("Not allowed");
      const owner = await ownerModel.create({ fullname, email, password });
      res.status(201).send(owner);
    } catch (err) {
      console.error("Owner create error:", err);
      res.status(500).send("Error creating owner");
    }
  });
}

/* ============================================================
 🛒 ADMIN PRODUCTS
============================================================ */

// Admin dashboard
router.get("/admin", isAdmin, async (req, res) => {
  const success = req.flash("success");
  const error = req.flash("error");
  const products = await productModel.find();
  res.render("createproducts", { success, error, products });
});

// Create product
router.post("/admin/create", isAdmin, upload.array("images", 5), async (req, res) => {
  try {
    const data = req.body;

    if (!req.files || req.files.length === 0) {
      req.flash("error", "At least one image is required");
      return res.redirect("/admin");
    }

    data.images = req.files.map(file => "/images/" + file.filename);
    await productModel.create(data);

    req.flash("success", "✅ Product Created");
    res.redirect("/admin");
  } catch (err) {
    console.error("Product Create Error:", err);
    req.flash("error", "Something went wrong while creating product");
    res.redirect("/admin");
  }
});

// Edit product
router.get("/admin/edit/:id", isAdmin, async (req, res) => {
  const product = await productModel.findById(req.params.id);
  res.render("editproduct", { product });
});

router.post("/admin/edit/:id", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const update = req.body;
    if (req.file) update.image = "/images/" + req.file.filename;
    await productModel.findByIdAndUpdate(req.params.id, update);
    req.flash("success", "✅ Product Updated");
    res.redirect("/admin");
  } catch (err) {
    console.error("Product Edit Error:", err);
    req.flash("error", "Something went wrong while editing product");
    res.redirect("/admin");
  }
});

// Delete product
router.get("/admin/delete/:id", isAdmin, async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.params.id);
    req.flash("success", "🗑️ Product Deleted");
    res.redirect("/admin");
  } catch (err) {
    console.error("Product Delete Error:", err);
    req.flash("error", "Something went wrong while deleting product");
    res.redirect("/admin");
  }
});

/* ============================================================
 🔐 GOOGLE / GITHUB ADMIN LOGIN
============================================================ */

router.get("/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/admin", failureFlash: true }),
  (req, res) => {
    req.session.isAdmin = true;
    res.redirect("/admin/dashboard");
  }
);

router.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/admin", failureFlash: true }),
  (req, res) => {
    req.session.isAdmin = true;
    res.redirect("/admin/dashboard");
  }
);

/* ============================================================
 📦 ADMIN ORDERS
============================================================ */

// Admin order dashboard
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

// Update order status
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

    // ⚡ Real-time emit
    const io = req.app.get("io");
    if (io) {
      io.emit("orderStatusUpdated", {
        orderId: order._id,
        status: order.status,
        userId: order.user ? order.user._id : null
      });
    }

    // 📧 Email notification
    if (order.user?.email) {
      const subject = `Your Order #${order._id} - ${status}`;

      let statusMessage = "";
      switch (status) {
        case "Pending":
          statusMessage = "✅ We’ve received your order and it’s now pending confirmation.";
          break;
        case "Shipped":
          statusMessage = "📦 Good news! Your order has been shipped and it’s on its way.";
          break;
        case "Out for Delivery":
          statusMessage = "🚚 Your order is out for delivery. It will reach you very soon.";
          break;
        case "Delivered":
          statusMessage = "🎉 Your order has been delivered. We hope you enjoy your purchase!";
          break;
        case "Cancelled":
          statusMessage = "❌ Your order has been cancelled. If you didn’t request this, please contact support.";
          break;
        default:
          statusMessage = `Your order status is now: ${status}`;
      }

      const productsHtml = (order.products || [])
        .map(
          (item) => `
          <tr>
            <td style="padding:8px; border:1px solid #ddd; text-align:center;">
              <img src="${item.snapshot?.images?.[0] || item.product?.images?.[0] || ""}" 
                   alt="${item.snapshot?.name || item.product?.name}" 
                   width="60" height="60" style="object-fit:cover;"/>
            </td>
            <td style="padding:8px; border:1px solid #ddd;">
              ${item.snapshot?.name || item.product?.name}
            </td>
            <td style="padding:8px; border:1px solid #ddd; text-align:center;">
              ${item.quantity}
            </td>
            <td style="padding:8px; border:1px solid #ddd; text-align:right;">
              ₹${item.snapshot?.price || item.product?.price}
            </td>
          </tr>
        `
        )
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; line-height:1.5; color:#333;">
          <h2>Hi ${order.user.fullname || "Customer"},</h2>
          <p>${statusMessage}</p>
          
          <h3>🧾 Order Summary</h3>
          <table style="border-collapse: collapse; width: 100%; margin-bottom:20px;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="padding:8px; border:1px solid #ddd;">Image</th>
                <th style="padding:8px; border:1px solid #ddd;">Product</th>
                <th style="padding:8px; border:1px solid #ddd;">Qty</th>
                <th style="padding:8px; border:1px solid #ddd;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${productsHtml}
            </tbody>
          </table>

          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          <p><strong>Delivery Address:</strong><br>
             ${order.address?.street}, ${order.address?.city}, ${order.address?.state} - ${order.address?.pincode}
          </p>

          <br/>
          <p>Thank you for shopping with <b>Bagify</b>! 💙</p>
        </div>
      `;

      await sendMail(order.user.email, subject, html);
      console.log("📨 Status update mail sent to:", order.user.email);
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
