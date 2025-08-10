const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./config/mongoose-connection");
const expressSession = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const ownerModel = require("./models/owner-model");
const chatbotRouter = require('./routes/chatbotRouter');

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

app.use('/api/chatbot', chatbotRouter); 
// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id); // serialize the MongoDB _id
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await ownerModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existing = await ownerModel.findOne({ googleId: profile.id });

        if (existing) {
          return done(null, existing);
        }

        const newOwner = await ownerModel.create({
          fullname: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          picture: profile.photos[0].value,
        });

        return done(null, newOwner);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Flash + locals
app.use(flash());
app.use((req, res, next) => {
  res.locals.user = req.session.user || req.user || null;
  res.locals.url = req.originalUrl;
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

// Google Auth Routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/admin/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.session.user = req.user;
    req.session.user.role = "admin"; // mark as admin
    req.flash("success", "Logged in via Google!");
    res.redirect("/admin");
  }
);

// 404 page
app.use((req, res) => {
  res.status(404).render("404");
});

// Start server
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
