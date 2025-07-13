const mongoose = require("mongoose");

const ownerSchema = mongoose.Schema({
    fullname: {
        type: String,
        minLength: 3,
        trim: true,
    },
    email: String,
    password: String,
    products: { type: [mongoose.Schema.Types.ObjectId], ref: "Product" },
    picture: String,
    gstin: String,
    role: {
    type: String,
    default: "admin", // 👈 ensure role is added
  },
});

module.exports = mongoose.model("owner", ownerSchema);