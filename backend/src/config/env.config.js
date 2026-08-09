const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  FIREBASE: {
    PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  },
  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },
  BASE_URL: process.env.BASE_URL,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  SMTP: {
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
  },
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET,
  },
};
