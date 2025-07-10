const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/generateToken");

module.exports.registerUser = async (req, res) => {
  try {
    const { email, fullname, password } = req.body;

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      req.flash("error", "User already exists!");
      return res.redirect("/users");
    }

    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        console.error("Salt generation error:", err);
        req.flash("error", "Error generating salt.");
        return res.redirect("/users");
      }

      bcrypt.hash(password, salt, async (err, hashedPassword) => {
        if (err) {
          console.error("Hashing error:", err);
          req.flash("error", "Error encrypting password.");
          return res.redirect("/users");
        }

        const user = await userModel.create({
          email,
          fullname,
          password: hashedPassword,
        });

        const token = generateToken(user);
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        req.session.user = user; // attach to session
        req.flash("success", "Account created successfully.");
        return res.redirect("/shop");
      });
    });

  } catch (error) {
    console.error("Registration error:", error);
    req.flash("error", "Internal server error.");
    return res.redirect("/users");
  }
};

module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      req.flash("error", "Email or password is incorrect.");
      return res.redirect("/users");
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        req.flash("error", "Email or password is incorrect.");
        return res.redirect("/users");
      }

      const token = generateToken(user);
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "development",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      req.session.user = user;
      req.flash("success", "Login successful.");
      return res.redirect("/shop");
    });

  } catch (err) {
    console.error("Login error:", err);
    req.flash("error", "Something went wrong.");
    return res.redirect("/users");
  }
};

module.exports.logoutUser = (req, res) => {
  res.clearCookie("token");
  req.session.destroy(() => {
    res.redirect("/");
  });
};
