const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/avatars"); // store in public/uploads/avatars
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, req.session.user._id + ext); // save as userId.jpg
  }
});

const upload = multer({ storage });
module.exports = upload;
