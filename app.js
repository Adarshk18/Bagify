const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./config/mongoose-connection");
const ownersRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const productsRouter = require("./routes/productsRouter");
const adminRouter = require("./routes/authRouter");
const indexRouter = require("./routes/index");
const expressSession = require("express-session");
const flash = require("connect-flash");

require("dotenv").config();

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET,

})
);
app.use(flash());

//acquiring routes
app.use("/",indexRouter);
app.use("/", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);
app.use("/", authRouter);
app.use("/cart", require("./routes/cartRouter"));
app.use("/orders", require("./routes/ordersRouter"));




app.get("/", (req, res) => {
  const error = req.flash("error");
  res.render("index", { error });
});



app.listen(3000);

