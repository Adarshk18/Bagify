const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");

exports.placeOrder = async (req, res) => {
  try {
    const user = await userModel.findById(req.session.user._id).populate("cart.productId");

    if (!user || !user.cart.length) {
      req.flash("error", "Your cart is empty.");
      return res.redirect("/cart");
    }

    const {
      fullname, phone, street, city, state,
      pincode, country, lat, lng, selectedAddress
    } = req.body;

    // ✅ Address selection logic
    let finalAddress = null;

    if (selectedAddress !== undefined && user.addresses[parseInt(selectedAddress)]) {
      finalAddress = user.addresses[parseInt(selectedAddress)];
    } else {
      if (!fullname || !phone || !street || !city || !state || !pincode || !country) {
        req.flash("error", "Please fill in all address fields.");
        return res.redirect("/cart");
      }

      finalAddress = {
        fullname: fullname.trim(),
        phone: phone.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: country.trim(),
        landmark: (req.body.landmark || "").trim(),
        coordinates: {
          lat: parseFloat(lat) || null,
          lng: parseFloat(lng) || null
        },
        createdAt: new Date()
      };


      // Optional: Save this address if new
      const duplicate = user.addresses.find(addr =>
        addr.street === street &&
        addr.city === city &&
        addr.pincode === pincode
      );

      if (!duplicate) user.addresses.push(finalAddress);
    }

    // ✅ Only keep valid products
    const validCartItems = user.cart.filter(item => item.productId);

    // 📦 Order product structure for DB
    const products = validCartItems.map(item => ({
      product: item.productId._id,
      quantity: item.quantity
    }));

    // 💰 Accurate price after discount
    const totalAmount = validCartItems.reduce((sum, item) => {
      const price = Math.max(0, (item.productId.price || 0));
      return sum + price * item.quantity;
    }, 0);

    console.log("🛒 Products:", products);
    console.log("💰 Total Amount:", totalAmount);
    console.log("📦 Address:", finalAddress);

    // ✅ Save order in DB
    await orderModel.create({
      user: user._id,
      products,
      totalAmount,
      address: finalAddress,
      status: "Pending",
      paymentMode: req.body.paymentMode || "cod"
    });

    console.log("✅ Order created in DB");

    // ✅ Clear cart and save new address if added
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
