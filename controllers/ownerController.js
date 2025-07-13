const bcrypt = require("bcrypt");
const ownerModel = require("../models/owner-model");

// 👤 Admin Registration (One-time setup)
exports.createOwner = async (req, res) => {
  try {
    const owners = await ownerModel.find();
    if (owners.length > 0) {
      return res.status(403).send({ error: "Owner already exists" });
    }

    const { fullname, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const newOwner = await ownerModel.create({
      fullname,
      email,
      password: hashed,
    });

    return res.status(201).send(newOwner);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Creation failed" });
  }
};

// 👨‍💼 Render Admin Dashboard
exports.renderAdminPage = (req, res) => {
  const success = req.flash("success");
  res.render("admin/createproduct", { success });
};

// 🔐 Admin Login POST
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const owner = await ownerModel.findOne({ email });

    if (!owner) {
      req.flash("error", "Admin not found");
      return res.redirect("/admin/login");
    }

    const match = await bcrypt.compare(password, owner.password);

    if (!match) {
      req.flash("error", "Incorrect password");
      return res.redirect("/admin/login");
    }

    req.session.user = owner;
    req.session.user.role = "admin"; // Mark this session as admin
    req.flash("success", "Welcome Admin!");
    return res.redirect("/admin");
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Something went wrong");
    res.redirect("/admin/login");
  }
};

// 🔓 Logout Admin
exports.logoutAdmin = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err.message);
      return res.redirect("/admin");
    }
    res.redirect("/");
  });
};

// 🖥️ Admin Login Form View
exports.renderAdminLogin = (req, res) => {
  const error = req.flash("error");
  const success = req.flash("success");
  res.render("owner-login", { error, success });
};
