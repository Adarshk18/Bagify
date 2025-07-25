const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema({
  fullname: {
    type: String,
    minLength: 3,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: String,
  googleId: String, // 👈 for Google OAuth logins
  picture: String,
  gstin: String,
  role: {
    type: String,
    default: "admin",
  },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

  // 👉 Forgot Password Fields
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

module.exports = mongoose.model("owner", ownerSchema);
