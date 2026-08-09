const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/order.controller");
const { verifyToken, verifyAdmin } = require("../middlewares/auth.middleware");

router.use(verifyToken);

router.post("/", OrderController.createOrder);
router.get("/", OrderController.getMyOrders);
router.get("/all", verifyToken, verifyAdmin, OrderController.getAllOrders);
router.patch(
  "/:orderId/status",
  verifyToken,
  verifyAdmin,
  OrderController.updateStatus,
);
router.delete(
  "/:orderId",
  verifyToken,
  verifyAdmin,
  OrderController.deleteOrder,
);

module.exports = router;
