const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const isAdmin = require("../middlewares/isAdmin");
const productModel = require("../models/product-model");

if (process.env.NODE_ENV === "development") {
    router.post("/create", async (req, res) => {

        let owners = await ownerModel.find();
        if (owners.length > 0) {
            return res.status(500).send({ error: "You dont have permission to create a new owner" });
        }

        let { fullname, email, password } = req.body;
        let createdOwner = await ownerModel.create({
            fullname,
            email,
            password,
        });
        res.status(201).send(createdOwner);
    });
}

router.get("/admin", (req, res) => {
    let success = req.flash("success");
    res.render("createproducts", { success}); // or success: null / success: undefined as needed
});

// GET: Edit form
router.get("/admin/edit/:id", isAdmin, async (req, res) => {
  const product = await productModel.findById(req.params.id);
  res.render("editproduct", { product });
});

// POST: Update data
router.post("/admin/edit/:id", isAdmin, upload.single("image"), async (req, res) => {
  const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;

  const updated = {
    name,
    price,
    discount,
    bgcolor,
    panelcolor,
    textcolor,
  };

  if (req.file) {
    updated.image = req.file.filename;
  }

  await productModel.findByIdAndUpdate(req.params.id, updated);
  req.flash("success", "Product updated.");
  res.redirect("/admin");
});


// Delete individual product
router.get("/admin/delete/:id", isAdmin, async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.params.id);
    req.flash("success", "Product deleted.");
    res.redirect("/admin");
  } catch (err) {
    req.flash("error", "Delete failed.");
    res.redirect("/admin");
  }
});

router.get("/admin/delete-all", isAdmin, async (req, res) => {
  await productModel.deleteMany({});
  req.flash("success", "All products deleted.");
  res.redirect("/admin");
});



module.exports = router;