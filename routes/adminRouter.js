const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/ownerController");
const isAdmin = require("../middlewares/isAdmin");

// 👉 Admin Login Page
router.get("/login", ownerController.renderAdminLogin);

// 👉 Admin Login POST
router.post("/login", ownerController.loginAdmin);

// 👉 Admin Logout
router.get("/logout", ownerController.logoutAdmin);

// 👉 Admin Dashboard
router.get("/", isAdmin, ownerController.renderAdminPage);
router.get("/orders", isAdmin, ownerController.viewAllOrders);
router.post("/orders/update/:orderId", isAdmin, ownerController.updateOrderStatus);

// Optional: Product creation page already exists at /admin (admin/createproduct.ejs)
// You could expand more admin features here as needed

module.exports = router;
