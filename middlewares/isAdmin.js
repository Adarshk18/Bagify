const jwt = require("jsonwebtoken");
const ownerModel = require("../models/owner-model");

module.exports = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      req.flash("error", "Admin login required.");
      return res.redirect("/");
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const owner = await ownerModel.findById(decoded.id);
    if (!owner) {
      req.flash("error", "You are not authorized.");
      return res.redirect("/");
    }

    req.owner = owner;
    next();
  } catch (err) {
    req.flash("error", "Admin access failed.");
    return res.redirect("/");
  }
};
