const express = require("express");
const router = express.Router();
const isLoggedin = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const axios = require("axios");
const contactMessageModel = require("../models/contactMessage-model");
const { sendContactMail } = require("../utils/mailer");

router.get("/", (req, res) => {
  let error = req.flash("error");
  res.render("index", { error });
});

router.get("/shop", async (req, res) => {
  try {
    let filter = {};
    let sort = {};

    // Filter by discount
    if (req.query.discount === "yes") {
      filter.discount = { $gt: 0 };
    }

    // Filter by price range
    if (req.query.min || req.query.max) {
      filter.price = {};
      if (req.query.min) filter.price.$gte = parseInt(req.query.min);
      if (req.query.max) filter.price.$lte = parseInt(req.query.max);
    }

    // Sorting
    if (req.query.sortby === "price_asc") {
      sort.price = 1;
    } else if (req.query.sortby === "price_desc") {
      sort.price = -1;
    }

    const products = await productModel.find(filter).sort(sort);
    res.render("shop", { products,user: req.session.user || null });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load products");
    res.redirect("/");
  }
});

router.get("/about", (req, res) => {
  const success = req.flash("success");
  const error = req.flash("error");
  res.render("about", { success, error });
});

router.get("/contact", (req, res) => {
  const success = req.flash("success");
  const error = req.flash("error");
  res.render("contact", { success, error });
});

router.post("/contact", async (req, res) => {
  const { name, email, message, "g-recaptcha-response": token } = req.body;

  if (!name || !email || !message || !token) {
    req.flash("error", "All fields and CAPTCHA are required.");
    return res.redirect("/contact");
  }

  // reCAPTCHA Verification
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;
  const { data } = await axios.post(verifyURL);

  if (!data.success) {
    req.flash("error", "CAPTCHA verification failed.");
    return res.redirect("/contact");
  }

  try {
    // Save to DB
    await contactMessageModel.create({ name, email, message });

    // Send email
    await sendContactMail({ name, email, message });

    req.flash("success", "Message sent successfully!");
    res.redirect("/contact");
  } catch (err) {
    console.error("Contact error:", err);
    req.flash("error", "Failed to send message. Try again later.");
    res.redirect("/contact");
  }
});





module.exports = router;