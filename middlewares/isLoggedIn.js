const userModel = require("../models/user-model");

module.exports = async function isLoggedIn(req, res, next) {
  const user = req.session.user;

  if (!user) {
    req.flash("error", "Please login first.");
    return res.redirect("/");
  }

  req.user = user;
  next();
};
