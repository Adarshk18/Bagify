const userModel = require("../models/user-model");

exports.viewCart = async (req, res) => {
  try {
    const user = await userModel.findById(req.session.user._id).populate("cart.productId");

    const cartItems = user.cart
      .filter(item => item.productId)
      .map(item => {
        const product = item.productId;
        const discountedPrice = Number(product.price) || 0; // This is the final price after discount
        const originalPrice = Number(product.originalPrice) || discountedPrice;
        const discountAmount = originalPrice - discountedPrice;
        const discountPercentage = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

        return {
          product,
          quantity: item.quantity,
          effectivePrice: discountedPrice,
          discountPercentage,
          labelFree: discountedPrice === 0,
        };
      });

    const total = cartItems.reduce((acc, item) => {
      return acc + item.effectivePrice * item.quantity;
    }, 0);

    res.render("cart", {
      cartItems,
      total,
      user: req.user || null
    });
  } catch (err) {
    console.error("❌ Error viewing cart:", err.message);
    req.flash("error", "Failed to load your cart.");
    res.redirect("/");
  }
};






exports.addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await userModel.findById(req.session.user._id);

    const existingItem = user.cart.find(item => item.productId.toString() === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cart.push({ productId, quantity: 1 });
    }

    await user.save();
    req.flash("success", "✅ Added to cart!");
    res.redirect("/cart");
  } catch (err) {
    console.error("❌ Error adding to cart:", err.message);
    req.flash("error", "Failed to add to cart.");
    res.redirect("/shop");
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await userModel.findById(req.session.user._id);

    user.cart = user.cart.filter(item => item.productId.toString() !== productId);
    await user.save();

    req.flash("success", "🗑️ Removed from cart.");
    res.redirect("/cart");
  } catch (err) {
    console.error("❌ Error removing from cart:", err.message);
    req.flash("error", "Failed to remove item.");
    res.redirect("/cart");
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const { id, action } = req.body;
    const user = await userModel.findById(req.session.user._id);

    const item = user.cart.find(item => item.productId.toString() === id);
    if (!item) {
      req.flash("error", "Item not found in cart.");
      return res.redirect("/cart");
    }

    if (action === "increase") {
      item.quantity += 1;
    } else if (action === "decrease" && item.quantity > 1) {
      item.quantity -= 1;
    } else if (action === "decrease" && item.quantity === 1) {
      user.cart = user.cart.filter(item => item.productId.toString() !== id);
    }

    await user.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("❌ Error updating quantity:", err.message);
    req.flash("error", "Failed to update quantity.");
    res.redirect("/cart");
  }
};
