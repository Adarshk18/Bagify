const cron = require("node-cron");
const cartModel = require("../models/cart-model");
const { sendMail } = require("./mailer");

cron.schedule("0 * * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 1 * 60 * 1000); // 24h inactivity
    const reminderCutoff = new Date(Date.now() - 2 * 60 * 1000); // 24h since last reminder

    const abandonedCarts = await cartModel.find({
      updatedAt: { $lt: cutoff },
      items: { $exists: true, $ne: [] },
      $or: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { $lt: reminderCutoff } }
      ]
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
          <p>You left some items in your Bagify cart 🛒</p>
          <p>They’re still waiting for you — checkout now before they run out!</p>
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

      await sendMail(cart.user.email, "🛒 Don’t forget your Bagify cart!", html);

      // ✅ Update last reminder timestamp
      cart.lastReminderSentAt = new Date();
      await cart.save();

      console.log(`📨 Abandoned cart email sent to ${cart.user.email}`);
    }
  } catch (err) {
    console.error("❌ Abandoned cart recovery job failed:", err);
  }
});
