const crypto = require("crypto");
const userModel = require("../models/user-model");
const Mailer = require("../utils/mailer"); // You already have this
const bcrypt = require("bcrypt");


// 👉 Forgot Password - Render Form
exports.renderForgotPassword = (req, res) => {
  const error = req.flash("error");
  const success = req.flash("success");
  res.render("forgot-password", { error, success });
};

// ✅ 📌 Add Address
exports.addAddress = async (req, res) => {
  const userId = req.session.user._id;
  const {
    name,
    phone,
    street,
    city,
    state,
    pincode,
    country,
    landmark,
    lat,
    lng,
  } = req.body;

  // Simple validation (you can make this stricter as needed)
  if (!name || !phone || !street || !city || !state || !pincode || !country) {
    req.flash("error", "All fields except landmark must be filled.");
    return res.redirect("/cart");
  }

  try {
    await userModel.findByIdAndUpdate(userId, {
      $push: {
        addresses: {
          name,
          phone,
          street,
          city,
          state,
          pincode,
          country,
          landmark,
          coordinates: {
            lat: lat || null,
            lng: lng || null,
          },
        },
      },
    });

    req.flash("success", "Address saved successfully!");
    res.redirect("/cart");
  } catch (err) {
    console.error("❌ Failed to save address:", err.message);
    req.flash("error", "Could not save address.");
    res.redirect("/users/profile");
  }
};

exports.saveAddress = (req, res) => {
  const { selectedAddress } = req.body;

  if (!selectedAddress) {
    req.flash("error", "Please select a saved address.");
    return res.redirect("/orders/checkout");
  }

  req.session.selectedAddressIndex = selectedAddress;
  req.flash("success", "Address selected successfully!");
  res.redirect("/cart"); // same as manual form behavior
};



// ✅ 🗑️ Delete Address
exports.deleteAddress = async (req, res) => {
  const userId = req.session.user._id;
  const addressIndex = parseInt(req.params.index);

  try {
    const user = await userModel.findById(userId);
    if (!user || !user.addresses || user.addresses.length <= addressIndex) {
      req.flash("error", "Invalid address index.");
      return res.redirect("/users/profile");
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    req.flash("success", "Address deleted.");
    res.redirect("/users/profile");
  } catch (err) {
    console.error("❌ Failed to delete address:", err.message);
    req.flash("error", "Could not delete address.");
    res.redirect("/users/profile");
  }
};


// 👉 Forgot Password - Handle Form POST
exports.handleForgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      req.flash("error", "No user found with that email.");
      return res.redirect("/users/forgot-password");
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetLink = `http://${req.headers.host}/users/reset-password/${token}`;
    await Mailer.sendPasswordResetMail({
      to: user.email,
      name: user.fullname,
      link: resetLink,
    });

    req.flash("success", "Reset link sent to your email.");
    res.redirect("/users/forgot-password");
  } catch (err) {
    console.error("Error in handleForgotPassword:", err.message);
    req.flash("error", "Something went wrong.");
    res.redirect("/users/forgot-password");
  }
};

// 👉 Render Reset Form
exports.renderResetForm = async (req, res) => {
  const { token } = req.params;
  const user = await userModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Reset token is invalid or expired.");
    return res.redirect("/users/forgot-password");
  }

  res.render("reset-password", {
    token: req.params.token,
    formAction: `/users/reset-password/${req.params.token}`,
    success: req.flash("success"),
    error: req.flash("error"),
  });
};

// 👉 Handle New Password POST
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, confirm } = req.body;

  if (password !== confirm) {
    req.flash("error", "Passwords do not match.");
    return res.redirect("back");
  }

  const user = await userModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Token expired or invalid.");
    return res.redirect("/users/forgot-password");
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  req.flash("success", "Password reset successful! You can now login.");
  res.redirect("/users");
};
