const express = require("express");
const router = express.Router();
const TestimonialController = require("../controllers/testimonial.controller");

router.get("/", TestimonialController.getAllTestimonials);

module.exports = router;
