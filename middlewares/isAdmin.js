module.exports = async function isAdmin(req, res, next) {
  
  if (!req.session.user) {
    req.flash("error", "Login required");
    return res.redirect("/");
  }

  if (req.session.user.role !== "admin") {
    req.flash("error", "You are not authorized");
    return res.redirect("/");
  }

  next();
};
