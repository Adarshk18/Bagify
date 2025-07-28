const bcrypt = require("bcrypt");
const crypto = require("crypto");
const ownerModel = require("../models/owner-model");
const orderModel = require("../models/order-model");
const { sendPasswordResetMail } = require("../utils/mailer");
const { Parser } = require('json2csv');


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
    console.error(err);
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

// 🔄 Update Order Status
exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    await orderModel.findByIdAndUpdate(orderId, { status });
    req.flash("success", "Order status updated!");
    res.redirect("/admin/orders");
  } catch (err) {
    console.error("❌ Error updating status:", err.message);
    req.flash("error", "Failed to update status.");
    res.redirect("/admin/orders");
  }
};

exports.exportOrders = async (req, res) => {
  try {
    const orders = await orderModel.find().populate('user');

    const fields = ['_id', 'user.fullname', 'user.email', 'totalAmount', 'status', 'createdAt'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(orders);

    res.header('Content-Type', 'text/csv');
    res.attachment('orders.csv');
    return res.send(csv);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).send("Failed to export orders.");
  }
};

// 👨‍💼 Admin Dashboard
exports.renderAdminPage = (req, res) => {
  const success = req.flash("success");
  res.render("admin/createproduct", { success });
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
    console.error(err.message);
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
    token: req.params.token,
    formAction: `/admin/reset-password/${req.params.token}`,
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
    success: req.flash("success")
  });
};



// 🔐 Google OAuth Login (used in Passport callback)
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
