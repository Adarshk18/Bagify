const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {generateToken} = require("../utils/generateToken");



module.exports.registerUser = async(req, res) => {
    try {
        let { email, fullname, password } = req.body;

        let user = await userModel.findOne({email: email});
        if(user){
            return res.status(401).send("user already exists!");
        }

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) return res.send(err.message);
                else {
                    let user = await userModel.create({
                        email,
                        fullname,
                        password: hash,
                    });

                    let token = generateToken(user);
                    res.cookie("token", token);
                    res.send("user created successfully");
                }
            })
        });


    } catch (error) {
        console.log(error);
    }

}

module.exports.loginUser = async(req,res)=>{
    try{
        let {email,password} = req.body;

        let user = userModel.findOne({email: email});

        if(!user){
            return res.send("Email or Pawword is incorrect!")
        }

        bcrypt.compare(password, user.password,(err,result)=>{
            if(result){
                let token = generateToken(user);
                res.cookie("token",token);
                res.send("you can login");
            }else{
                return res.send("Email or Pawword is incorrect!")
            }
        })
    }catch(err){
        console.log(err);
    }
}