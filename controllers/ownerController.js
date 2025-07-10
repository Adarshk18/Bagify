const ownerModel = require("../models/owner-model");

exports.createOwner = async (req, res) => {
  const { fullname, email, password } = req.body;

  const existing = await ownerModel.findOne({ email });
  if (existing) return res.status(400).send("Owner already exists");

  const createdOwner = await ownerModel.create({
    fullname,
    email,
    password,
  });

  res.status(201).json(createdOwner);
};
