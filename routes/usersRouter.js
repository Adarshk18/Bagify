const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const { registerUser, loginUser, logoutUser } = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedIn");
const userController = require("../controllers/userController");

// Auth form page (Login + Register)
router.get("/", (req, res) => {
  const error = req.flash("error");
  const success = req.flash("success");
  res.render("register-login", {
    error,
    success,
    user: req.session.user || null,
  });
});

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Logout
router.get("/logout", logoutUser);

// Profile Page
router.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);

    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/users");
    }

    res.render("profile", { user });
  } catch (err) {
    console.error("Error fetching user profile:", err.message);
    req.flash("error", "Something went wrong.");
    res.redirect("/users");
  }
});

// 🏠 Address Add/Delete
router.post("/address/add", isLoggedIn, userController.addAddress);
router.post("/address/delete/:index", isLoggedIn, userController.deleteAddress);

router.get("/forgot-password", userController.renderForgotPassword);
router.post("/forgot-password", userController.handleForgotPassword);
router.get("/reset-password/:token", userController.renderResetForm);
router.post("/reset-password/:token", userController.resetPassword);

module.exports = router;
