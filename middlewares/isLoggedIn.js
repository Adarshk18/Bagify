const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async (req, res, next) => {
    if (!req.cookies.token) {
        req.flash("error", "Please login first");
        return res.redirect("/");
    }

    try {
        let decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
        let user = await userModel.findById(decoded.id).select("-password");

        if (!user) throw new Error("User not found");
        
        req.user = user;

        next();
    } catch (error) {
        req.flash("error", "something went wrong.");
        return res.redirect("/");
    }
};