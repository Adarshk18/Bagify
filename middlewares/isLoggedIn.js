const userModel = require("../models/user-model");

module.exports = async function isLoggedIn(req, res, next) {
  try {
    const user = req.session.user;

    // ❌ Not logged in
    if (!user) {
      req.flash("error", "Please login first.");
      return res.redirect("/"); // better to redirect to login page instead of "/"
    }

    // ✅ Logged in
    // (Optional) fetch latest user from DB if you want up-to-date data
    const dbUser = await userModel.findById(user._id).lean();
    if (!dbUser) {
      req.flash("error", "User not found. Please login again.");
      req.session.destroy();
      return res.redirect("/");
    }

    req.user = dbUser; // Attach fresh user info
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    req.flash("error", "Something went wrong. Please login again.");
    return res.redirect("/");
  }
};
