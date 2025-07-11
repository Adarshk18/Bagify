const userModel = require("../models/user-model");
const productModel = require("../models/product-model");

exports.viewCart = async (req, res) => {
  const user = await userModel.findById(req.session.user._id).populate("cart.productId");
  res.render("cart/view", { cartItems: user.cart });
};

exports.addToCart = async (req, res) => {
  const { productId } = req.body;
  const user = await userModel.findById(req.session.user._id);

  const existingItem = user.cart.find(item => item.productId.toString() === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    user.cart.push({ productId, quantity: 1 });
  }

  await user.save();
  req.flash("success", "Added to cart!");
  res.redirect("/cart");
};

exports.removeFromCart = async (req, res) => {
  const { productId } = req.params;
  const user = await userModel.findById(req.session.user._id);
  user.cart = user.cart.filter(item => item.productId.toString() !== productId);
  await user.save();
  req.flash("success", "Removed from cart.");
  res.redirect("/cart");
};
