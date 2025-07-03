const mongoose = require("mongoose");
const dgbr = require("debug")("development: mongoose");
const config = require("config");

mongoose.connect(`${config.get("MONGODB_URI")}/Bagify`)
    .then(() => {
        dgbr("connected");
    })
    .catch((err) => {
        dgbr(err);
    })

module.exports = mongoose.connection;