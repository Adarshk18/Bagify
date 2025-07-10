const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");

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


/*

const express = require("express");
const router = express.Router();
const { createOwner, renderAdminPage } = require("../controllers/ownerController");
const { renderCreateForm, createProduct } = require("../controllers/productController");
const upload = require("../config/multer-config");

if (process.env.NODE_ENV === "development") {
  router.post("/admin/create-owner", createOwner);
}

router.get("/admin", renderAdminPage);
router.get("/admin/create-product", renderCreateForm);
router.post("/admin/create-product", upload.single("image"), createProduct);

module.exports = router;





*/


module.exports = router;