const userModel = require("../models/user-model");

exports.renderProfile = async (req, res) => {
  const user = await userModel.findById(req.session.user._id);
  res.render("users/profile", { user });
};

exports.updateProfile = async (req, res) => {
  const { fullname, contact } = req.body;
  await userModel.findByIdAndUpdate(req.session.user._id, { fullname, contact });
  req.flash("success", "Profile updated!");
  res.redirect("/users/profile");
};
