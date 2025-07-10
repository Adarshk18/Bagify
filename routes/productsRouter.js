const express = require("express");
const router = express.Router();
const { getAllProducts } = require("../controllers/productController");
const isLoggedIn = require("../middlewares/isLoggedIn");

router.get("/shop", isLoggedIn, getAllProducts);

module.exports = router;
