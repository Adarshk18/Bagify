const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/generateToken");



module.exports.registerUser = async (req, res) => {
    try {
        let { email, fullname, password } = req.body;

        let user = await userModel.findOne({ email: email });
        if (user) {
            req.flash("error", "User already exists!");
            return res.redirect("/");
        }

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("/");
                }
                else {
                    let user = await userModel.create({
                        email,
                        fullname,
                        password: hash,
                    });

                    let token = generateToken(user);
                    res.cookie("token", token);
                    req.flash("success", "Account created successfully");
                    return res.redirect("/shop");
                }
            })
        });


    } catch (error) {
        console.log(error);
        req.flash("error", "Internal server error");
        return res.redirect("/");
    }

}

module.exports.loginUser = async (req, res) => {
    try {
        let { email, password } = req.body;

        let user = await userModel.findOne({ email: email });

        if (!user) {
            req.flash("error", "Email or Password is incorrect!");
            return res.redirect("/");
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                let token = generateToken(user);
                res.cookie("token", token);
                req.flash("success", "Login successful");
                return res.redirect("/shop");
            } else {
                req.flash("error", "Email or Password is incorrect!");
                return res.redirect("/");
            }
        })
    } catch (err) {
        console.log(err);
        req.flash("error", "Something went wrong");
        return res.redirect("/");
    }
}

module.exports.logout = (req,res)=>{
    res.cookie("token", "");
    res.redirect("/");
}