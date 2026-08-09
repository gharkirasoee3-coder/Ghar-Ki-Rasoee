const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller");
const AuthMiddleware = require("../middlewares/auth.middleware");

// All routes here should be protected by verifyToken AND verifyAdmin
router.use(AuthMiddleware.verifyToken);
router.use(AuthMiddleware.verifyAdmin);

router.get("/stats", AdminController.getDashboardStats);
router.get("/subscriptions", AdminController.getAllSubscriptions);
router.get(
  "/subscriptions/:subscriptionId",
  AdminController.getSubscriptionDetails,
);
router.get("/deliveries/today", AdminController.getTodayDeliveries);
router.post("/deliveries/trigger-scheduler", AdminController.triggerScheduler);
router.patch("/deliveries/status", AdminController.updateDeliveryStatus);
router.delete(
  "/subscriptions/:subscriptionId",
  AdminController.deleteSubscription,
);

// COD Payment Verification
router.patch(
  "/orders/:orderId/confirm-payment",
  AdminController.confirmCODPayment,
);
router.patch(
  "/subscriptions/:subscriptionId/confirm-payment",
  AdminController.confirmSubscriptionPayment,
);

// User Management
router.get("/users", AdminController.getAllUsers);
router.get("/users/:userId", AdminController.getUserDetail);
router.post(
  "/users/:userId/cancel-subscription",
  AdminController.adminCancelSubscription,
);

// Coupon Management
const CouponController = require("../controllers/coupon.controller");
router.get("/coupons", CouponController.getAllCoupons);
router.post("/coupons", CouponController.createCoupon);
router.put("/coupons/:couponId", CouponController.updateCoupon);
router.delete("/coupons/:couponId", CouponController.deleteCoupon);

// Menu Configuration Management
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/menu/config", AdminController.getMenuConfig);
router.put("/menu/config", AdminController.updateMenuConfig);
router.post("/menu/upload", upload.single("image"), AdminController.uploadMenuImage);

// Reviews management
router.get("/reviews", AdminController.getAllReviews);
router.delete("/reviews/:reviewId", AdminController.deleteReview);

// Testimonial management
const TestimonialController = require("../controllers/testimonial.controller");
router.post("/testimonials", TestimonialController.upsertTestimonial);
router.delete("/testimonials/:id", TestimonialController.deleteTestimonial);

// Holiday management
const HolidayController = require("../controllers/holiday.controller");
router.post("/holidays", HolidayController.createHoliday);
router.delete("/holidays/:id", HolidayController.deleteHoliday);

module.exports = router;