const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth.controller");
const NotificationModel = require("../models/notification.model");
const ResponseUtil = require("../utils/response.util");
const { verifyToken } = require("../middlewares/auth.middleware");

// Public OTP verification routes
router.post("/send-otp", AuthController.sendOtp);
router.post("/verify-otp", AuthController.verifyOtp);

// Protect all following auth routes
router.use(verifyToken);

router.post("/sync", AuthController.syncUser);
router.post("/save-address", AuthController.saveAddress);
router.get("/profile", AuthController.getProfile);

// Notification routes
router.get("/notifications", async (req, res) => {
  try {
    const { uid } = req.user;
    const notifications = await NotificationModel.getByUserId(uid, 50);
    ResponseUtil.send(res, 200, "Notifications fetched", notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    ResponseUtil.error(res, 500, "Failed to fetch notifications", error);
  }
});

router.patch("/notifications/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const result = await NotificationModel.markAsRead(notificationId);
    ResponseUtil.send(res, 200, "Notification marked as read", result);
  } catch (error) {
    console.error("Error marking notification:", error);
    ResponseUtil.error(res, 500, "Failed to mark notification", error);
  }
});

module.exports = router;
