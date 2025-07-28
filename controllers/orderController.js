const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");


exports.placeOrder = async (req, res) => {
  try {
    const user = await userModel.findById(req.session.user._id).populate("cart.productId");

    if (!user || !user.cart.length) {
      req.flash("error", "Your cart is empty.");
      return res.redirect("/cart");
    }

    // 📦 Extract fields
    const {
      name, phone, street, city, state,
      pincode, country, lat, lng, selectedAddress
    } = req.body;

    // 🧾 Final address to use in order
    let finalAddress = null;

    // 1️⃣ If a saved address is selected
    if (selectedAddress !== undefined && user.addresses[parseInt(selectedAddress)]) {
      finalAddress = user.addresses[parseInt(selectedAddress)];
    }
    // 2️⃣ Otherwise use manual form (validate first)
    else {
      if (!name || !phone || !street || !city || !state || !pincode || !country) {
        req.flash("error", "Please fill in all address fields.");
        return res.redirect("/cart");
      }

      finalAddress = {
        fullname: name,
        phone,
        street,
        city,
        state,
        pincode,
        country,
        landmark: req.body.landmark || "",
        coordinates: {
          lat: parseFloat(lat) || null,
          lng: parseFloat(lng) || null
        },
        createdAt: new Date()
      };

      // 🧠 Check if similar address already exists
      const duplicate = user.addresses.find(addr =>
        addr.street === street &&
        addr.city === city &&
        addr.pincode === pincode
      );

      if (!duplicate) {
        user.addresses.push(finalAddress);
      }
    }

    // 💰 Total and product details
    const products = user.cart.map(item => ({
      product: item.productId._id,
      quantity: item.quantity
    }));

    const totalAmount = user.cart.reduce(
      (sum, item) =>
        sum + ((item.productId.price - (item.productId.discount || 0)) * item.quantity),
      0
    );

    // 📦 Create order in DB
    await orderModel.create({
      user: user._id,
      products,
      totalAmount,
      address: finalAddress,
      status: "Pending",
      paymentMode: req.body.paymentMode || "cod"
    });

    // 📝 Optional: Store summary in user's orders
    user.orders.push({
      items: user.cart,
      totalAmount,
      status: "Pending",
      address: finalAddress
    });

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

exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await orderModel.findById(orderId);

    if (!order || order.status !== 'Pending') {
      req.flash("error", "You can only cancel pending orders.");
      return res.redirect("/orders");
    }

    order.status = "Cancelled";
    await order.save();

    req.flash("success", "Order cancelled successfully.");
    res.redirect("/orders");
  } catch (err) {
    console.error("❌ Cancel order error:", err.message);
    req.flash("error", "Failed to cancel order.");
    res.redirect("/orders");
  }
};
