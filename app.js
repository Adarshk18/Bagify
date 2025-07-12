const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./config/mongoose-connection");
const expressSession = require("express-session");
const flash = require("connect-flash");

require("dotenv").config();

// Middleware setup
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET,
  })
);
app.use(flash());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Routes
app.use("/", require("./routes/index"));
app.use("/", require("./routes/ownersRouter"));
app.use("/users", require("./routes/usersRouter"));
app.use("/products", require("./routes/productsRouter"));
app.use("/cart", require("./routes/cartRouter"));
app.use("/orders", require("./routes/ordersRouter"));
app.use("/admin", require("./routes/adminRouter"));

// 404 page
app.use((req, res) => {
  res.status(404).render("404");
});



// Start server
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
