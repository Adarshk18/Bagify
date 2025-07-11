const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");

exports.placeOrder = async (req, res) => {
  const user = await userModel.findById(req.session.user._id).populate("cart.productId");

  if (!user.cart.length) {
    req.flash("error", "Your cart is empty.");
    return res.redirect("/cart");
  }

  const products = user.cart.map(item => ({
    product: item.productId._id,
    quantity: item.quantity
  }));

  const totalAmount = user.cart.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);

  const order = await orderModel.create({
    user: user._id,
    products,
    totalAmount
  });

  user.orders.push({
    items: user.cart,
    totalAmount,
    status: "pending"
  });

  user.cart = [];
  await user.save();

  req.flash("success", "Order placed successfully!");
  res.redirect("/orders");
};

exports.viewOrders = async (req, res) => {
  const userOrders = await orderModel.find({ user: req.session.user._id }).populate("products.product");
  res.render("orders/view", { orders: userOrders });
};
