const express = require("express");
const router = express.Router();
const upload = require("../config/multer-config");
const productModel = require("../models/product-model");

router.get("/create", (req, res) => {
    res.render("createproducts", { success: "" }); // Assuming you have a createproducts.ejs in /views
});

router.post("/create",upload.single("image"), async(req,res)=>{
    try {
    let { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;
    

    let product = await productModel.create({
      name,
      price,
      discount,
      bgcolor,
      panelcolor,
      textcolor,
      image: req.file.filename,
    });

    // Redirect or show success message
    req.flash("success", "Product Created!");
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to create product");
  }
});


module.exports = router;