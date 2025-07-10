const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const { registerUser, loginUser, logoutUser } = require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedIn");

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

module.exports = router;
