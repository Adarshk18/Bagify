const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// 📩 Contact Form Mail
module.exports.sendContactMail = async ({ name, email, message }) => {
  await transporter.sendMail({
    from: `"Bagify Contact" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_USER,
    subject: `New Contact Message from ${name}`,
    html: `
      <h3>Contact Request</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong> ${message}</p>
    `,
  });
};

// 🔐 Password Reset Mail (For both User and Admin)
module.exports.sendPasswordResetMail = async ({ to, name, link }) => {
  await transporter.sendMail({
    from: `"Bagify Support" <${process.env.MAIL_USER}>`,
    to,
    subject: "Reset your Bagify password",
    html: `
      <h2>Password Reset</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>You recently requested to reset your Bagify account password.</p>
      <p>Click the link below to proceed:</p>
      <p><a href="${link}" style="color: blue;">Reset Your Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <hr/>
      <p>If you didn’t request this, you can safely ignore this email.</p>
    `,
  });
};
