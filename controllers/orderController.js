const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");

exports.placeOrder = async (req, res) => {
  try {
    const user = await userModel.findById(req.session.user._id).populate("cart.productId");

    if (!user || !user.cart.length) {
      req.flash("error", "Your cart is empty.");
      return res.redirect("/cart");
    }

    // Prepare order data
    const products = user.cart.map(item => ({
      product: item.productId._id,
      quantity: item.quantity
    }));

    const totalAmount = user.cart.reduce(
      (sum, item) =>
        sum + ((item.productId.price - (item.productId.discount || 0)) * item.quantity),
      0
    );

    // Save in orders collection
    await orderModel.create({
      user: user._id,
      products,
      totalAmount,
      status: "Pending"
    });

    // Optional: save mini order copy in user's own record
    user.orders.push({
      items: user.cart,
      totalAmount,
      status: "Pending"
    });

    // Clear the cart
    user.cart = [];
    await user.save();

    req.flash("success", "✅ Order placed successfully!");
    res.redirect("/orders");
  } catch (err) {
    console.error("❌ Error placing order:", err.message);
    req.flash("error", "Something went wrong while placing the order.");
    res.redirect("/cart");
  }
};

exports.viewOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ user: req.session.user._id })
      .populate("products.product");

    res.render("orders", {
      orders,
      user: req.user || null
    });
  } catch (err) {
    console.error("❌ Error loading orders:", err.message);
    req.flash("error", "Failed to load your orders.");
    res.redirect("/");
  }
};
