const express = require("express");
const router = express.Router();
const HolidayController = require("../controllers/holiday.controller");

router.get("/", HolidayController.getAllHolidays);

module.exports = router;
