const express = require("express");
const router = express.Router();
const ActivityController = require("../controllers/activity.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.use(verifyToken);

router.get("/", ActivityController.getUserActivities);
router.post("/", ActivityController.logActivity);

module.exports = router;
