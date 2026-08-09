const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Create checkout session - Protected
router.post(
  "/create-checkout-session",
  authMiddleware.verifyToken,
  PaymentController.createCheckoutSession,
);

// Verify checkout session status - Protected
router.get(
  "/session-status/:sessionId",
  authMiddleware.verifyToken,
  PaymentController.getSessionStatus,
);

// Validate Coupon - Protected
const CouponController = require("../controllers/coupon.controller");
router.post(
  "/validate-coupon",
  authMiddleware.verifyToken,
  CouponController.validateCoupon,
);

module.exports = router;
