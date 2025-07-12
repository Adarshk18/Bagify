const express = require("express");
const router = express.Router();
const isAdmin = require("../middlewares/isAdmin");
const adminController = require("../controllers/ownerController");

// GET: Admin dashboard
router.get("/", isAdmin, (req, res) => {
  res.render("admin/admin"); // your admin.ejs dashboard file
});

// GET: Create product form
router.get("/create", isAdmin, adminController.renderAdminPage);

// POST: Create new product
router.post("/create", isAdmin, require("../controllers/productController").createProduct);

module.exports = router;
