const cron = require("node-cron");
const cartModel = require("../models/cart-model");
const userModel = require("../models/user-model");
const { sendMail } = require("./mailer");

// Run every hour
cron.schedule("0 * * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h old

    // Find abandoned carts
    const abandonedCarts = await cartModel.find({
      updatedAt: { $lt: cutoff },
      items: { $exists: true, $ne: [] },
    }).populate("user").populate("items.product");

    for (const cart of abandonedCarts) {
      if (!cart.user?.email) continue;

      const itemsHtml = cart.items.map(i => `
        <tr>
          <td style="padding:8px; border:1px solid #ddd;">${i.product.name}</td>
          <td style="padding:8px; border:1px solid #ddd;">₹${i.product.price}</td>
          <td style="padding:8px; border:1px solid #ddd;">${i.quantity}</td>
        </tr>
      `).join("");

      const html = `
        <div style="font-family:Arial,sans-serif; line-height:1.5; color:#333;">
          <h2>Hi ${cart.user.fullname},</h2>
          <p>Looks like you left some items in your cart 🛒</p>
          <p>Don’t miss out — complete your purchase now before they sell out!</p>
          <table style="border-collapse: collapse; width: 100%; margin:20px 0;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="padding:8px; border:1px solid #ddd;">Product</th>
                <th style="padding:8px; border:1px solid #ddd;">Price</th>
                <th style="padding:8px; border:1px solid #ddd;">Qty</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <a href="${process.env.BASE_URL}/cart" 
             style="background:#2563eb;color:#fff;padding:12px 20px;
             text-decoration:none;border-radius:6px;display:inline-block;">
             👉 Return to Cart
          </a>
          <p>Happy Shopping,<br/>The Bagify Team 💙</p>
        </div>
      `;

      await sendMail(cart.user.email, "🛒 You left items in your Bagify cart!", html);
      console.log(`📨 Abandoned cart email sent to ${cart.user.email}`);
    }
  } catch (err) {
    console.error("❌ Abandoned cart recovery job failed:", err);
  }
});
