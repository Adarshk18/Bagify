const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.get("/", (req, res) => {
    res.send("hii")
});

router.post("/register", async (req, res) => {
    try {
        let { email, fullname, password } = req.body;

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async(err, hash) => {
                if (err) return res.send(err.message);
                else {
                    let user = await userModel.create({
                        email,
                        fullname,
                        password: hash,
                    });
                    
                    let token = jwt.sign({email, id: user._id},"heyyyyy");
                    res.cookie("token",token);
                    res.send("user created successfully");
                }
            })
        });


    } catch (error) {
        console.log(error);
    }

});


module.exports = router;