const userModel = require("../models/user-model");

module.exports = async function isLoggedIn(req, res, next) {
  const userId = req.session?.passport?.user;

  if (!userId) {
    req.flash("error", "Please login first.");
    return res.redirect("/");
  }

  const user = await userModel.findById(userId);
  if (!user) {
    req.flash("error", "Invalid session. Please login again.");
    return res.redirect("/");
  }

  req.user = user;
  next();
};
