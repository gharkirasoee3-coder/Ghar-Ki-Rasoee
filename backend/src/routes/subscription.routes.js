const express = require("express");
const router = express.Router();
const SubscriptionController = require("../controllers/subscription.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.use(verifyToken);

router.post("/", SubscriptionController.createSubscription);
router.get("/", SubscriptionController.getSubscription);
router.post("/cancel", SubscriptionController.cancelSubscription);
router.post("/skip", SubscriptionController.skipDate);
router.post("/reviews", SubscriptionController.createReview);

module.exports = router;
