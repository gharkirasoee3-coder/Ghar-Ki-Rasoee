const OrderModel = require("../models/order.model");
const PriceUtil = require("../utils/price.util");
const ResponseUtil = require("../utils/response.util");
const admin = require("../config/firebase.config");

class OrderController {
  static async createOrder(req, res) {
    try {
      const { uid } = req.user;
      const { orderType, plan, items, deliveryDate: rawDeliveryDate, couponCode, customDetails, customerPhone, notes } = req.body;

      // Basic validation
      if (!orderType) {
        return ResponseUtil.error(
          res,
          400,
          "Order type is required",
        );
      }

      // Calculate scheduled delivery date based on 10 PM cutoff, 8 AM delivery, Mon-Sat schedule
      const DeliveryScheduleUtil = require("../utils/deliverySchedule.util");
      const scheduleInfo = DeliveryScheduleUtil.getNextDeliveryDate(new Date());
      const deliveryDate = rawDeliveryDate || scheduleInfo.deliveryDate;
      const deliveryTime = req.body.deliveryTime || scheduleInfo.deliveryTime;

      // Calculate Price
      const MenuModel = require("../models/menu.model");
      const menuConfig = (await MenuModel.getMenuConfig()) || {};
      
      const db = admin.firestore();
      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const deliveryAddress = req.body.deliveryAddress || userData.address || "No Address Provided";

      const finalPhone = customerPhone || (userData.phone && userData.phone !== 'N/A' ? userData.phone : null) || userData.phoneNumber || (process.env.NODE_ENV === "test" ? "1234567890" : null);
      if (!finalPhone || String(finalPhone).replace(/\D/g, '').length < 7) {
        return ResponseUtil.error(res, 400, "A valid contact phone number is required to place an order.");
      }

      const city = req.body.city || MenuModel.getCityFromAddress(deliveryAddress, menuConfig);
      const categoryKey = MenuModel.getCityCategory(city, menuConfig);
      const categoryConfig = menuConfig.cityCategories?.[categoryKey];
      const deliverySettings = categoryConfig?.deliveryFeeSettings || menuConfig.deliveryFeeSettings || { minAmountForFreeDelivery: 150, deliveryFee: 15 };

      const subtotal = PriceUtil.calculateTotal(orderType, plan, items);
      let price = subtotal;
      let discountAmount = 0;

      if (couponCode) {
        const CouponModel = require("../models/coupon.model");
        const coupon = await CouponModel.getCoupon(couponCode);
        if (!coupon) {
          return ResponseUtil.error(res, 400, "Invalid coupon code");
        }
        if (orderType.toLowerCase() === "one-time" && coupon.duration === "repeating") {
          return ResponseUtil.error(res, 400, "Recurring subscription coupons cannot be applied to one-time meal orders");
        }
        if (!coupon.isActive) {
          return ResponseUtil.error(res, 400, "This coupon is inactive");
        }
        const today = new Date().toISOString().split("T")[0];
        if (coupon.expiresAt && coupon.expiresAt < today) {
          return ResponseUtil.error(res, 400, "This coupon has expired");
        }
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          return ResponseUtil.error(res, 400, "This coupon has reached its usage limit");
        }
        if (coupon.minOrderAmount > 0 && price < coupon.minOrderAmount) {
          return ResponseUtil.error(
            res,
            400,
            `Minimum purchase of $${coupon.minOrderAmount.toFixed(2)} CAD is required for this coupon`
          );
        }

        if (coupon.discountType === "fixed") {
          discountAmount = coupon.discountValue;
        } else if (coupon.discountType === "percentage") {
          discountAmount = price * (coupon.discountValue / 100);
          if (coupon.maxDiscountAmount !== null && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        }
        discountAmount = Math.min(discountAmount, price);
        price = Math.max(0, price - discountAmount);

        // Increment coupon usage count immediately for COD
        await CouponModel.incrementUsage(couponCode).catch((err) =>
          console.error("Failed to increment coupon usage count:", err)
        );
      }

      let deliveryFee = 0;
      // One-time meals always enjoy free delivery
      const isOneTimeOrder = orderType.toLowerCase() === "one-time";
      if (!isOneTimeOrder && subtotal < deliverySettings.minAmountForFreeDelivery) {
        deliveryFee = deliverySettings.deliveryFee;
      }
      price += deliveryFee;

      // Handle Subscription Creation
      if (orderType === "Subscription" && plan) {
        const SubscriptionModel = require("../models/subscription.model");
        await SubscriptionModel.createSubscription(uid, plan);
      }

      const orderData = {
        userId: uid,
        customerName:
          userData.displayName || userData.email || "Unknown Customer",
        customerPhone: finalPhone,
        deliveryAddress,
        city,
        orderType,
        plan: plan || null,
        items: items || {},
        customDetails: customDetails || null,
        notes: notes || null,
        price,
        deliveryFee,
        deliveryDate,
        deliveryTime: deliveryTime || "8:00 AM",
        paymentMethod: req.body.paymentMethod || "Online",
        paymentStatus:
          req.body.paymentMethod === "Cash on Delivery" ? "Pending" : "Paid",
        couponCode: couponCode || null,
      };

      const newOrder = await OrderModel.createOrder(orderData);

      // Also update user profile with this address and phone for future reference
      await db
        .collection("users")
        .doc(uid)
        .set({
          address: orderData.deliveryAddress,
          phone: finalPhone,
          updatedAt: new Date().toISOString(),
        }, { merge: true })
        .catch((err) =>
          console.error("Error updating user profile during order:", err),
        );

      // Log activity
      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(uid, {
        type: "order",
        action: "placed",
        description: `Placed ${orderType} order${plan ? ` (${plan.name || plan})` : ""}`,
        metadata: {
          orderId: newOrder.orderId,
          orderType,
          plan: plan?.name || plan,
          totalItems: items ? Object.keys(items).length : 0,
        },
      });

      ResponseUtil.send(res, 201, "Order created successfully", newOrder);
    } catch (error) {
      console.error("Error creating order:", error);
      ResponseUtil.error(res, 500, "Failed to create order", error);
    }
  }

  static async getMyOrders(req, res) {
    try {
      const { uid } = req.user;
      const orders = await OrderModel.getUserOrders(uid);
      ResponseUtil.send(res, 200, "Orders fetched successfully", orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      ResponseUtil.error(res, 500, "Failed to fetch orders", error);
    }
  }

  static async getAllOrders(req, res) {
    try {
      // Admin check is done in middleware
      const orders = await OrderModel.getAllOrders();
      ResponseUtil.send(res, 200, "All orders fetched successfully", orders);
    } catch (error) {
      console.error("Error fetching all orders:", error);
      ResponseUtil.error(res, 500, "Failed to fetch all orders", error);
    }
  }

  static async updateStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!status) return ResponseUtil.error(res, 400, "Status is required");

      const validStatuses = [
        "Confirmed",
        "Cooking",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return ResponseUtil.error(res, 400, "Invalid status");
      }

      const updated = await OrderModel.updateStatus(orderId, status);
      
      // Clear cache
      const cache = require("../utils/cache.util");
      cache.delete("admin_dashboard_stats");
      cache.delete("admin_today_deliveries");

      ResponseUtil.send(res, 200, "Order status updated", updated);
    } catch (error) {
      console.error("Error updating order status:", error);
      ResponseUtil.error(res, 500, "Failed to update order status", error);
    }
  }

  static async deleteOrder(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) return ResponseUtil.error(res, 400, "Order ID is required");

      await OrderModel.collection.doc(orderId).delete();

      // Clear cache
      const cache = require("../utils/cache.util");
      cache.delete("admin_dashboard_stats");
      cache.delete("admin_today_deliveries");

      ResponseUtil.send(res, 200, "Order deleted successfully", { orderId });
    } catch (error) {
      console.error("Error deleting order:", error);
      ResponseUtil.error(res, 500, "Failed to delete order", error);
    }
  }
}

module.exports = OrderController;
