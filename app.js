require("dotenv").config();

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./config/mongoose-connection");
const expressSession = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const ownerModel = require("./models/owner-model");
const http = require("http");
const { Server } = require("socket.io");
const MongoStore = require("connect-mongo");
const adminRouter = require("./routes/adminRouter");
const config = require("./config/development.json");
// const owner = require("./models/owner-model");

const ADMIN_EMAIL = "dev.adarsh286@gmail.com"; // ✅ Only this email allowed

// ✅ Normalize env vars (support both .env and development.json)
["MONGO_URI", "EXPRESS_SESSION_SECRET", "MAIL_USER", "MAIL_PASS"].forEach((key) => {
  if (
    !process.env[key] &&
    !config[key] &&
    !(key === "MONGO_URI" && config.MONGODB_URI)
  ) {
    throw new Error(`❌ Missing required env variable: ${key}`);
  }
});
process.env.MONGO_URI =
  process.env.MONGO_URI || config.MONGO_URI || config.MONGODB_URI;

// -------------------- Server + Socket.io --------------------
const server = http.createServer(app);
const io = new Server(server);

// -------------------- Middleware Setup --------------------
app.set("view engine", "ejs");
app.set("io", io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 86400000 },
  })
);

// -------------------- Passport Setup --------------------
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await ownerModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ✅ Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        const owner = await ownerModel.findOne({ email });
        if (!owner) {
          return done(null, false, { message: "Unauthorized admin email" });
        }


      
        if (!owner) {
          owner = await ownerModel.create({
            fullname: profile.displayName,
            email,
            googleId: profile.id,
            picture: profile.photos?.[0]?.value,
          });
        }

        return done(null, owner);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ✅ GitHub OAuth Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/auth/github/callback",
      scope: ["user:email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (email !== ADMIN_EMAIL) {
          return done(null, false, { message: "Unauthorized admin email" });
        }

        let owner = await ownerModel.findOne({ email });
        if (!owner) {
          owner = await ownerModel.create({
            fullname: profile.displayName || profile.username,
            email,
            githubId: profile.id,
            picture: profile.photos?.[0]?.value,
          });
        }

        return done(null, owner);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// -------------------- Flash + Locals --------------------
app.use(flash());
app.use((req, res, next) => {
  res.locals.user = req.session.user || req.user || null;
  res.locals.url = req.originalUrl;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// -------------------- Routes --------------------
app.use("/", require("./routes/index"));
app.use("/", require("./routes/ownersRouter"));
app.use("/users", require("./routes/usersRouter"));
app.use("/products", require("./routes/productsRouter"));
app.use("/cart", require("./routes/cartRouter"));
app.use("/orders", require("./routes/ordersRouter"));
app.use("/admin", adminRouter);
// PDF Cheatsheet Generation Route
// const { generateCheatsheetPdf } = require("./utils/cheatsheetPdfGenerator");
// app.get("/cheatsheet/pdf", async (req, res) => {
//   try {
//     const pdfBuffer = await generateCheatsheetPdf();
//     res.set({
//       "Content-Type": "application/pdf",
//       "Content-Disposition": "attachment; filename=project_cheatsheet.pdf",
//     });
//     res.send(pdfBuffer);
//   } catch (err) {
//     console.error("Failed to generate cheatsheet PDF:", err);
//     req.flash("error", "Could not generate cheatsheet PDF.");
//     res.redirect("/");
//   }
// });

// ✅ Google Auth Routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/admin/login",
    failureFlash: true,
  }),
  (req, res) => {
    if (!req.user) return res.redirect("/admin/login");
    req.session.user = req.user;
    req.session.user.role = "admin";
    req.flash("success", "Logged in via Google!");
    res.redirect("/admin");
  }
);

// ✅ GitHub Auth Routes
app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
app.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/admin/login",
    failureFlash: true,
  }),
  (req, res) => {
    if (!req.user) return res.redirect("/admin/login");
    req.session.user = req.user;
    req.session.user.role = "admin";
    req.flash("success", "Logged in via GitHub!");
    res.redirect("/admin");
  }
);

// -------------------- 404 Page --------------------
app.use((req, res) => {
  res.status(404).render("404");
});

// -------------------- Socket.io --------------------
io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("🔴 A user disconnected:", socket.id);
  });
});

module.exports = { app, server, io };
require("./utils/cartRecoveryJob");

// -------------------- Start Server --------------------
server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
