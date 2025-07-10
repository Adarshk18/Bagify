const bcrypt = require("bcrypt");
const ownerModel = require("../models/owner-model");

exports.createOwner = async (req, res) => {
    try {
        const owners = await ownerModel.find();
        if (owners.length > 0) {
            return res.status(403).send({ error: "Owner already exists" });
        }

        const { fullname, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);

        const newOwner = await ownerModel.create({ fullname, email, password: hashed });
        return res.status(201).send(newOwner);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Creation failed" });
    }
};

exports.renderAdminPage = (req, res) => {
    const success = req.flash("success");
    res.render("admin/createproduct", { success });
};
