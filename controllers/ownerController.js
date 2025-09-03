const bcrypt = require("bcrypt");
const crypto = require("crypto");
const ownerModel = require("../models/owner-model");
const orderModel = require("../models/order-model");
const { sendPasswordResetMail } = require("../utils/mailer");
const { Parser } = require("json2csv");
const { sendMail } = require("../utils/mailer");

// 🧑 Admin Registration (One-time setup)
exports.createOwner = async (req, res) => {
  try {
    const owners = await ownerModel.find();
    if (owners.length > 0) return res.status(403).send({ error: "Owner already exists" });

    const { fullname, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const newOwner = await ownerModel.create({ fullname, email, password: hashed });
    return res.status(201).send(newOwner);
  } catch (err) {
    console.error("Create Owner Error:", err);
    res.status(500).send({ error: "Creation failed" });
  }
};



// 📦 View All Orders
exports.viewAllOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find()
      .populate("user", "fullname email")
      .populate("products.product");

    res.render("admin/admin-orders", { orders });
  } catch (err) {
    console.error("❌ Failed to fetch orders:", err.message);
    req.flash("error", "Could not load orders.");
    res.redirect("/admin");
  }
};

// 🔄 Update Order Status (with real-time emit)

// exports.updateOrderStatus = async (req, res) => {
//   const { orderId } = req.params;
//   const { status } = req.body;

//   try {
//     const updatedOrder = await orderModel
//       .findByIdAndUpdate(orderId, { status }, { new: true })
//       .populate("user");

//     if (!updatedOrder) {
//       req.flash("error", "Order not found");
//       return res.redirect("/admin/orders");
//     }

//     // 📧 Send status update email
//     if (updatedOrder.user?.email) {
//       await sendMail(
//         updatedOrder.user.email,
//         `Your Bagify order status is now: ${status}`,
//         `
//           <h2>Hi ${updatedOrder.user.fullname},</h2>
//           <p>Your order <strong>#${updatedOrder._id}</strong> has been updated.</p>
//           <p><strong>New Status:</strong> ${status}</p>
//           <p>Thank you for shopping with Bagify!</p>
//         `
//       );
//     }

//     // ⚡ Emit real-time event
//     const io = req.app.get("io");
//     if (io) {
//       // Emit to the specific user (so only they get notified)
//       if (updatedOrder.user?._id) {
//         io.to(updatedOrder.user._id.toString()).emit("orderStatusUpdated", {
//           orderId: updatedOrder._id.toString(),
//           status: updatedOrder.status,   // ✅ always included
//         });
//       }

//       // Also broadcast to admins if needed
//       io.emit("adminOrderUpdate", {
//         orderId: updatedOrder._id.toString(),
//         status: updatedOrder.status,
//         user: {
//           id: updatedOrder.user?._id,
//           name: updatedOrder.user?.fullname,
//           email: updatedOrder.user?.email,
//         },
//       });
//     }

//     req.flash("success", `Order #${orderId} status updated to ${status}`);
//     res.redirect("/admin/orders");
//   } catch (err) {
//     console.error("❌ Error updating status:", err.message);
//     req.flash("error", "Failed to update status.");
//     res.redirect("/admin/orders");
//   }
// };


// 📤 Export Orders as CSV
exports.exportOrders = async (req, res) => {
  try {
    const orders = await orderModel.find().populate("user");

    const fields = ["_id", "user.fullname", "user.email", "totalAmount", "status", "createdAt"];
    const parser = new Parser({ fields });
    const csv = parser.parse(orders);

    res.header("Content-Type", "text/csv");
    res.attachment("orders.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).send("Failed to export orders.");
  }
};

// 👨‍💼 Admin Dashboard
exports.renderAdminPage = (req, res) => {
  const success = req.flash("success");
  const error = req.flash("error");
  res.render("admin/createproduct", { success, error });
};

// 🔐 Admin Login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const owner = await ownerModel.findOne({ email });

    if (!owner) {
      req.flash("error", "Admin not found");
      return res.redirect("/admin/login");
    }

    const match = await bcrypt.compare(password, owner.password);
    if (!match) {
      req.flash("error", "Incorrect password");
      return res.redirect("/admin/login");
    }

    req.session.user = owner;
    req.session.user.role = "admin";
    req.flash("success", "Welcome Admin!");
    res.redirect("/admin");
  } catch (err) {
    console.error("Admin Login Error:", err.message);
    req.flash("error", "Something went wrong");
    res.redirect("/admin/login");
  }
};

// 🔓 Logout
exports.logoutAdmin = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err.message);
      return res.redirect("/admin");
    }
    res.redirect("/");
  });
};

// 🖥️ Login View
exports.renderAdminLogin = (req, res) => {
  const error = req.flash("error");
  const success = req.flash("success");
  res.render("owner-login", { error, success });
};

// 📧 Forgot Password Request
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  const owner = await ownerModel.findOne({ email });

  if (!owner) {
    req.flash("error", "No admin with this email.");
    return res.redirect("/admin/login");
  }

  const token = crypto.randomBytes(20).toString("hex");
  owner.resetPasswordToken = token;
  owner.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await owner.save();

  const resetURL = `${req.protocol}://${req.get("host")}/admin/reset-password/${token}`;
  await sendPasswordResetMail({
    to: email,
    name: owner.fullname,
    link: resetURL,
  });

  req.flash("success", "Reset link sent to your email.");
  res.redirect("/admin/login");
};

// 🔑 Render Reset Password Page
exports.renderResetPasswordForm = async (req, res) => {
  const token = req.params.token;
  const owner = await ownerModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!owner) {
    req.flash("error", "Invalid or expired reset link.");
    return res.redirect("/admin/login");
  }

  res.render("admin-reset-password", {
    token,
    formAction: `/admin/reset-password/${token}`,
    success: req.flash("success"),
    error: req.flash("error"),
  });
};

// 🔐 Reset Password Submit
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const owner = await ownerModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!owner) {
    req.flash("error", "Token expired or invalid.");
    return res.redirect("/admin/login");
  }

  const hashed = await bcrypt.hash(password, 10);
  owner.password = hashed;
  owner.resetPasswordToken = undefined;
  owner.resetPasswordExpires = undefined;
  await owner.save();

  req.flash("success", "Password updated successfully!");
  res.redirect("/admin/login");
};

// 🧾 Show Forgot Password Form
exports.renderForgotPasswordForm = (req, res) => {
  res.render("admin-forgot-password", {
    error: req.flash("error"),
    success: req.flash("success"),
  });
};

// 🔐 Google OAuth Login
exports.loginWithGoogle = async (profile, done) => {
  try {
    let owner = await ownerModel.findOne({ googleId: profile.id });

    if (!owner) {
      owner = await ownerModel.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        fullname: profile.displayName,
        picture: profile.photos[0].value,
      });
    }

    return done(null, owner);
  } catch (err) {
    return done(err, null);
  }
};

// 🖥️ Admin Dashboard Analytics
exports.getAdminDashboard = async (req, res) => {
  try {
    // 1️⃣ Daily sales trend (last 30 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const dailySales = await orderModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$totalAmount" },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 2️⃣ Top-selling products
    const topProducts = await orderModel.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          quantitySold: { $sum: "$products.quantity" }
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: 1,
          quantitySold: 1,
          name: "$productDetails.name",
          price: "$productDetails.price"
        }
      }
    ]);

    // 3️⃣ Repeat buyers (users with more than 1 order)
    const repeatBuyers = await orderModel.aggregate([
      { $group: { _id: "$user", ordersCount: { $sum: 1 } } },
      { $match: { ordersCount: { $gt: 1 } } },
      { $count: "repeatBuyers" }
    ]);

    const repeatBuyersCount = repeatBuyers[0]?.repeatBuyers || 0;
    const orders = await orderModel.find({}, "address.coordinates");

    const heatmapData = orders
      .filter(o => o.address?.coordinates?.lat && o.address?.coordinates?.lng)
      .map(o => [o.address.coordinates.lat, o.address.coordinates.lng]);

    res.render("admin-dashboard", {
      dailySales,
      topProducts,
      repeatBuyersCount,
      heatmapData,
      success: req.flash("success"),
      error: req.flash("error")
    });
  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    req.flash("error", "Failed to load dashboard.");
    res.redirect("/admin");
  }
};


/* 
----------------------------------------------------
🆕 Helper: Emit new order to admins when placed
Use this inside your orderController after saving order:
----------------------------------------------------
*/
exports.notifyNewOrder = (req, order) => {
  const io = req.app.get("io");
  if (io) {
    io.emit("orderPlaced", order);
  }
};
