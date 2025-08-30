const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");
const Razorpay = require("razorpay");
const { io } = require("../app");
const { sendMail } = require("../utils/mailer"); // ✅ assuming mailer.js exports sendMail

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================
// Helper: Send Order Status Email
// ==========================
async function sendOrderStatusEmail(user, order, status) {
  const subject = `Your Order #${order._id} - ${status}`;
  const html = `
    <h2>Hi ${user.fullname || "Customer"},</h2>
    <p>Your order <strong>#${order._id}</strong> is now <b>${status}</b>.</p>
    <p>Total Amount: ₹${order.totalAmount}</p>
    <p>Delivery Address: ${order.address.street}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}</p>
    <br/>
    <p>Thank you for shopping with <b>Bagify</b>!</p>
  `;
  await sendMail(user.email, subject, html);
}

// ==========================
// Place Order
// ==========================
exports.placeOrder = async (req, res) => {
  try {
    const user = await userModel.findById(req.session.user._id).populate("cart.productId");

    if (!user || !user.cart.length) {
      req.flash("error", "Your cart is empty.");
      return res.redirect("/cart");
    }

    const {
      fullname, phone, street, city, state,
      pincode, country, landmark, lat, lng,
      selectedAddress, paymentMode, useCoins
    } = req.body;

    let finalAddress = null;

    // ✅ Handle address
    if (selectedAddress !== undefined && selectedAddress !== "" && user.addresses[parseInt(selectedAddress)]) {
      finalAddress = user.addresses[parseInt(selectedAddress)];
    } else {
      if (!fullname || !phone || !street || !city || !state || !pincode || !country) {
        req.flash("error", "Please fill in all required address fields.");
        return res.redirect("/orders/checkout");
      }

      finalAddress = {
        name: fullname.trim(),
        phone: phone.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: country.trim(),
        landmark: (landmark || "").trim(),
        coordinates: {
          lat: parseFloat(lat) || null,
          lng: parseFloat(lng) || null
        },
        createdAt: new Date()
      };

      const duplicate = user.addresses.find(addr =>
        addr.name?.toLowerCase() === fullname.trim().toLowerCase() &&
        addr.phone?.trim() === phone.trim() &&
        addr.street?.toLowerCase() === street.trim().toLowerCase() &&
        addr.city?.toLowerCase() === city.trim().toLowerCase() &&
        addr.state?.toLowerCase() === state.trim().toLowerCase() &&
        addr.pincode?.trim() === pincode.trim() &&
        addr.country?.toLowerCase() === country.trim().toLowerCase()
      );

      if (!duplicate) {
        user.addresses.push(finalAddress);
      }
    }

    // ✅ Filter valid cart items
    const validCartItems = user.cart.filter(item => item.productId);

    const products = validCartItems.map(item => ({
      product: item.productId._id,
      quantity: item.quantity,
      snapshot: {
        name: item.productId.name,
        price: item.productId.price,
        image: item.productId.image,
        description: item.productId.description
      }
    }));

    let totalAmount = validCartItems.reduce((sum, item) => {
      const price = Math.max(0, (item.productId.price || 0));
      return sum + price * item.quantity;
    }, 0);

    // ✅ Coins redemption logic
    let coinsUsed = 0;
    if (useCoins && user.coins > 0) {
      coinsUsed = Math.min(user.coins, Math.floor(totalAmount * 0.1)); // Max 10% discount
      totalAmount -= coinsUsed;
      user.coins -= coinsUsed;
    }

    let newOrder;

    // If payment is ONLINE
    if (paymentMode === "online") {
      const options = {
        amount: totalAmount * 100,
        currency: "INR",
        receipt: `order_rcpt_${Date.now()}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);

      newOrder = await orderModel.create({
        user: user._id,
        products,
        totalAmount,
        address: finalAddress,
        status: "Pending", // 🔄 fixed (no "Pending Payment")
        paymentMethod: "Razorpay",
        razorpayOrderId: razorpayOrder.id,
        coinsUsed
      });

      io.emit("orderPlaced", {
        userId: user._id,
        message: "Your order has been placed successfully!",
        status: "Pending",
      });

      await user.save();

      // ✅ Send email
      await sendOrderStatusEmail(user, newOrder, "Pending");

      return res.render("payment", {
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: totalAmount,
        user,
        newOrder
      });
    }

    // ✅ COD Order
    newOrder = await orderModel.create({
      user: user._id,
      products,
      totalAmount,
      address: finalAddress,
      status: "Pending",
      paymentMethod: "COD",
      coinsUsed
    });

    // ✅ Reward coins (5% of total order value)
    const rewardCoins = Math.floor(totalAmount * 0.05);
    user.coins += rewardCoins;

    // ✅ Clear cart and save
    user.cart = [];
    await user.save();

    // ✅ Send email
    await sendOrderStatusEmail(user, newOrder, "Pending");

    req.flash("success", `✅ Order placed! You earned ${rewardCoins} coins${coinsUsed > 0 ? ` and used ${coinsUsed} coins` : ""}.`);
    res.redirect("/orders");

  } catch (err) {
    console.error("❌ Error placing order:", err.message);
    req.flash("error", "Something went wrong while placing the order.");
    res.redirect("/orders/checkout");
  }
};

// ==========================
// View Orders
// ==========================
exports.viewOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ user: req.session.user._id })
      .populate({
        path: 'products.product',
        options: { strictPopulate: false }
      });

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

// ==========================
// Cancel Order
// ==========================
exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await orderModel.findById(orderId).populate("user");

    if (!order || order.status !== 'Pending') {
      req.flash("error", "You can only cancel pending orders.");
      return res.redirect("/orders");
    }

    order.status = "Cancelled";
    order.statusUpdatedAt = new Date();
    await order.save();

    io.emit("orderStatusUpdated", {
      orderId: order._id,
      status: "Cancelled",
      message: "An order was cancelled."
    });

    // ✅ Send cancellation email
    await sendOrderStatusEmail(order.user, order, "Cancelled");

    req.flash("success", "Order cancelled successfully.");
    res.redirect("/orders");
  } catch (err) {
    console.error("❌ Cancel order error:", err.message);
    req.flash("error", "Failed to cancel order.");
    res.redirect("/orders");
  }
};

// ==========================
// Admin: Update Order Status
// ==========================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!["Pending", "Shipped", "Out for Delivery", "Delivered", "Cancelled"].includes(status)) {
      req.flash("error", "Invalid status provided.");
      return res.redirect("/admin/orders");
    }

    const order = await orderModel.findById(orderId).populate("user");
    if (!order) {
      req.flash("error", "Order not found.");
      return res.redirect("/admin/orders");
    }

    order.status = status;
    order.statusUpdatedAt = new Date();
    await order.save();

    io.emit("orderStatusUpdated", {
      orderId: order._id,
      status: status,
      message: `Order status updated to ${status}.`
    });

    // ✅ Send email to customer
    await sendOrderStatusEmail(order.user, order, status);

    req.flash("success", `Order status updated to ${status}.`);
    res.redirect("/admin/orders");
  } catch (err) {
    console.error("❌ Update status error:", err.message);
    req.flash("error", "Failed to update order status.");
    res.redirect("/admin/orders");
  }
};
