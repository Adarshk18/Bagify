const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

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
