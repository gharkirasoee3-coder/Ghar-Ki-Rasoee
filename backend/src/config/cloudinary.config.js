const cloudinary = require("cloudinary").v2;
const env = require("./env.config");

cloudinary.config({
  cloud_name: env.CLOUDINARY.CLOUD_NAME,
  api_key: env.CLOUDINARY.API_KEY,
  api_secret: env.CLOUDINARY.API_SECRET,
});

module.exports = cloudinary;
