const mongoose = require("mongoose");

const contactMessageSchema = mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("contactMessage", contactMessageSchema);
