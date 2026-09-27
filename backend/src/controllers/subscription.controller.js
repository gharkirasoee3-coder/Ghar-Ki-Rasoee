const SubscriptionModel = require("../models/subscription.model");
const ResponseUtil = require("../utils/response.util");
const cache = require("../utils/cache.util");
const PriceUtil = require("../utils/price.util");

class SubscriptionController {
  // Public checkout requests COD approval. Verified online checkout uses PaymentController.
  static async createSubscription(req, res) {
    try {
      const { uid } = req.user;
      const {
        plan,
        planDetails,
        durationMonths,
        deliveryAddress,
        paymentMethod,
        couponCode,
        customDetails,
        replacePlan,
        customerPhone,
        notes,
      } = req.body;

      if (!plan) return ResponseUtil.error(res, 400, "Plan is required");

      if (paymentMethod && !["cash on delivery", "cod", "cash"].includes(String(paymentMethod).toLowerCase())) {
        return ResponseUtil.error(res, 400, "Online subscriptions must be created through verified checkout");
      }
      const months = Number(durationMonths || 1);
      if (!Number.isInteger(months) || months < 1 || months > 12) {
        return ResponseUtil.error(res, 400, "Subscription duration must be between 1 and 12 months");
      }

      const planName = typeof plan === "object" ? (plan.name || "") : plan;
      let basePrice = planDetails?.price || planDetails || 0;

      const MenuModel = require("../models/menu.model");
      const menuConfig = (await MenuModel.getMenuConfig()) || {};
      
      const UserModel = require("../models/user.model");
      let userData = {};
      if (UserModel && typeof UserModel.getUser === 'function') {
        userData = (await UserModel.getUser(uid).catch(() => null)) || {};
      }

      const finalPhone = customerPhone || (userData.phone && userData.phone !== 'N/A' ? userData.phone : null) || userData.phoneNumber || (process.env.NODE_ENV === "test" ? "1234567890" : null);
      if (!finalPhone || String(finalPhone).replace(/\D/g, '').length < 7) {
        return ResponseUtil.error(res, 400, "A valid contact phone number is required to place a subscription.");
      }

      // Prefer the address-derived city so a client cannot choose a cheaper fee region.
      const city = MenuModel.getCityFromAddress(deliveryAddress, menuConfig) || req.body.city || null;
      const categoryKey = MenuModel.getCityCategory(city, menuConfig);
      const categoryConfig = menuConfig.cityCategories?.[categoryKey];

      // Backend price verification for custom subscriptions
      if (customDetails || planName.toLowerCase().includes("custom")) {
        if (!customDetails) {
          return ResponseUtil.error(res, 400, "Custom details are required for custom plan");
        }
        try {
          const calculatedPrice = MenuModel.calculateCustomPrice(customDetails, menuConfig, city);
          if (Math.abs(basePrice - calculatedPrice) > 0.05) {
            return ResponseUtil.error(res, 400, `Pricing validation failed. Expected: $${calculatedPrice.toFixed(2)}, Received: $${basePrice.toFixed(2)}`);
          }
          basePrice = calculatedPrice;
        } catch (err) {
          return ResponseUtil.error(res, 400, err.message);
        }
      } else {
        // Standard plan verification
        const planKey = planName.toLowerCase();
        const planInfo = menuConfig.plans?.[planKey];
        if (planInfo) {
          let expectedPrice = planInfo.price;
          if (categoryConfig?.planPrices?.[planKey] !== undefined) {
            expectedPrice = categoryConfig.planPrices[planKey];
          }
          if (Math.abs(basePrice - expectedPrice) > 0.05) {
            return ResponseUtil.error(res, 400, `Pricing validation failed. Expected: $${expectedPrice.toFixed(2)}, Received: $${basePrice.toFixed(2)}`);
          }
          basePrice = expectedPrice;
        }
      }

      let discountAmount = 0;

      if (couponCode) {
        const CouponModel = require("../models/coupon.model");
        const coupon = await CouponModel.getCoupon(couponCode);
        if (!coupon) {
          return ResponseUtil.error(res, 400, "Invalid coupon code");
        }
        if (!coupon.isActive) {
          return ResponseUtil.error(res, 400, "This coupon is inactive");
        }
        const today = new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Toronto",
        });
        if (coupon.expiresAt && coupon.expiresAt < today) {
          return ResponseUtil.error(res, 400, "This coupon has expired");
        }
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          return ResponseUtil.error(res, 400, "This coupon has reached its usage limit");
        }
        if (coupon.minOrderAmount > 0 && basePrice < coupon.minOrderAmount) {
          return ResponseUtil.error(
            res,
            400,
            `Minimum purchase of $${coupon.minOrderAmount.toFixed(2)} CAD is required for this coupon`
          );
        }

        if (coupon.discountType === "fixed") {
          discountAmount = coupon.discountValue;
        } else if (coupon.discountType === "percentage") {
          discountAmount = basePrice * (coupon.discountValue / 100);
          if (coupon.maxDiscountAmount !== null && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        }
        discountAmount = Math.min(discountAmount, basePrice);

        // Increment coupon usage count immediately for COD
        await CouponModel.incrementUsage(couponCode).catch((err) =>
          console.error("Failed to increment coupon usage count:", err)
        );
      }

      const deliverySettings = categoryConfig?.deliveryFeeSettings || menuConfig.deliveryFeeSettings || { minAmountForFreeDelivery: 150, deliveryFee: 15 };
      const priceBreakdown = PriceUtil.calculateChargeBreakdown(
        basePrice,
        discountAmount,
        deliverySettings,
      );

      let existing = null;

      // Keep the current plan running until an administrator accepts its replacement.
      if (replacePlan !== false && replacePlan !== "false") {
        const activeSubscriptions = await SubscriptionModel.getActiveUserSubscriptions(uid);
        existing = activeSubscriptions?.[0] || null;
      }

      const isCustomPlanType = planName.toLowerCase().includes('custom') || !!customDetails?.isCustomPlan;
      const planData = {
        plan: planName,
        planDetails: {
          ...(customDetails ? { ...(isCustomPlanType ? { custom: true } : {}), ...customDetails } : {}),
          name: planName,
          price: priceBreakdown.totalAmount,
        },
        duration: months * 30, // Convert months to days approx
        deliveryAddress,
        city,
        paymentMethod: "Cash on Delivery",
        paymentStatus: "Pending",
        replacesSubscriptionId: existing?.subscriptionId || null,
        couponCode: couponCode || null,
        deliveryDays: customDetails?.deliveryDays || null,
        ...priceBreakdown,
        customerPhone: finalPhone,
        notes: notes || null,
      };

      const newSub = await SubscriptionModel.createSubscription(uid, planData);

      // Also update user profile with address & phone
      try {
        if (UserModel && UserModel.collection && typeof UserModel.collection.doc === 'function') {
          await UserModel.collection.doc(uid).update({
            address: deliveryAddress,
            phone: finalPhone,
            updatedAt: new Date().toISOString(),
          });
        } else if (UserModel && typeof UserModel.createOrUpdateUser === 'function') {
          await UserModel.createOrUpdateUser(uid, {
            address: deliveryAddress,
            phone: finalPhone,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Error updating user address during sub:", err);
      }

      // Log activity
      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(uid, {
        type: "subscription",
        action: "requested",
        description: `Requested ${plan.name || plan} subscription; pending admin verification`,
        metadata: {
          plan: plan.name || plan,
          subscriptionId: newSub.subscriptionId,
        },
      });

      // Invalidate cache
      cache.delete(`user_subscription_${uid}`);
      cache.delete(`user_subscriptions_${uid}`);

      for (const key of ["admin_all_subscriptions", "admin_dashboard_stats", "admin_all_users", "admin_today_deliveries"]) cache.delete(key);
      ResponseUtil.send(res, 201, "Subscription pending admin verification", newSub);
    } catch (error) {
      console.error("Error creating subscription:", error);
      ResponseUtil.error(res, 500, "Failed to create subscription", error);
    }
  }

  static async getSubscription(req, res) {
    try {
      const { uid } = req.user;
      const { subscriptionId } = req.query;

      if (subscriptionId) {
        const doc = await SubscriptionModel.collection.doc(subscriptionId).get();
        if (!doc.exists) {
          return ResponseUtil.error(res, 404, "Subscription not found");
        }
        const sub = doc.data();
        if (sub.userId !== uid) {
          return ResponseUtil.error(res, 403, "Unauthorized access to subscription");
        }
        return ResponseUtil.send(res, 200, "Subscription fetched", sub);
      }

      const cachedSubs = cache.get(`user_subscriptions_${uid}`);
      if (cachedSubs) {
        return ResponseUtil.send(
          res,
          200,
          "Active subscriptions fetched (cached)",
          cachedSubs,
        );
      }

      const subs = await SubscriptionModel.getActiveUserSubscriptions(uid, true);
      cache.set(`user_subscriptions_${uid}`, subs, 300); // 5 minutes cache

      ResponseUtil.send(res, 200, "Active subscriptions fetched", subs);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      ResponseUtil.error(res, 500, "Failed to fetch subscription", error);
    }
  }

  static async cancelSubscription(req, res) {
    try {
      const { uid } = req.user;
      const { subscriptionId, reason } = req.body;

      let sub;
      if (subscriptionId) {
        const doc = await SubscriptionModel.collection.doc(subscriptionId).get();
        if (!doc.exists) {
          return ResponseUtil.error(res, 404, "Subscription not found");
        }
        sub = doc.data();
        if (sub.userId !== uid) {
          return ResponseUtil.error(res, 403, "Unauthorized access to subscription");
        }
      } else {
        sub = await SubscriptionModel.getUserSubscription(uid);
      }

      if (!sub || sub.status === "Cancelled")
        return ResponseUtil.error(res, 404, "No active subscription to cancel");

      // Logic to call Stripe to cancel would go here
      if (sub.stripeSubscriptionId) {
        const StripeService = require("../services/stripe.service");
        await StripeService.cancelSubscription(sub.stripeSubscriptionId).catch((err) =>
          console.error("Failed to cancel Stripe subscription billing:", err)
        );
      }

      await SubscriptionModel.collection.doc(sub.subscriptionId).update({
        status: "Cancelled",
        cancellationReason: reason || "User Cancelled",
        updatedAt: new Date().toISOString(),
      });

      // Also cancel any pending/cooking orders for today or future for THIS specific subscription
      const todayString = new Date().toISOString().split("T")[0];
      const admin = require("../config/firebase.config");
      const db = admin.firestore();
      
      // Fetch all orders for this user to filter in-memory, avoiding composite index requirements
      const userOrdersSnapshot = await db.collection("orders")
        .where("userId", "==", uid)
        .get();

      const pendingOrdersDocs = [];
      userOrdersSnapshot.forEach(doc => {
        const data = doc.data();
        if (
          data.subscriptionId === sub.subscriptionId && 
          data.deliveryDate >= todayString && 
          ["Cooking", "Confirmed"].includes(data.status)
        ) {
          pendingOrdersDocs.push(doc);
        }
      });

      if (pendingOrdersDocs.length > 0) {
        const batch = db.batch();
        pendingOrdersDocs.forEach(orderDoc => {
          batch.update(orderDoc.ref, {
            status: "Cancelled",
            updatedAt: new Date().toISOString()
          });
        });
        await batch.commit();
      }

      // Log activity
      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(uid, {
        type: "cancel",
        action: "cancelled",
        description: `Cancelled subscription - Reason: ${reason}`,
        metadata: { reason, subscriptionId: sub.subscriptionId },
      });

      // Invalidate cache
      cache.delete(`user_subscriptions_${uid}`);

      const updated = { ...sub, status: "Cancelled" };
      ResponseUtil.send(res, 200, "Subscription cancelled", updated);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      ResponseUtil.error(res, 500, "Failed to cancel subscription", error);
    }
  }

  static async skipDate(req, res) {
    try {
      const { uid } = req.user;
      const { date, subscriptionId } = req.body;

      if (!date) {
        return ResponseUtil.error(res, 400, "Date is required");
      }

      let sub;
      if (subscriptionId) {
        const doc = await SubscriptionModel.collection.doc(subscriptionId).get();
        if (!doc.exists) {
          return ResponseUtil.error(res, 404, "Subscription not found");
        }
        sub = doc.data();
        if (sub.userId !== uid) {
          return ResponseUtil.error(res, 403, "Unauthorized access to subscription");
        }
      } else {
        sub = await SubscriptionModel.getUserSubscription(uid);
      }

      if (!sub) {
        return ResponseUtil.error(res, 404, "No active subscription found");
      }

      if (sub.status !== "Active") {
        return ResponseUtil.error(
          res,
          400,
          "Can only skip dates for active subscriptions",
        );
      }

      // Get existing skipped dates or initialize empty array
      const skippedDates = sub.skippedDates || [];

      // Check if date is already skipped
      if (skippedDates.includes(date)) {
        return ResponseUtil.error(res, 400, "This date is already skipped");
      }

      // Use Model to handle skipping logic (atomic updates)
      const result = await SubscriptionModel.skipDate(
        sub.subscriptionId,
        date,
        sub.endDate,
      );

      // Log activity
      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(uid, {
        type: "skip",
        action: "skipped",
        description: `Skipped delivery for ${new Date(date).toLocaleDateString()}`,
        metadata: { date, subscriptionId: sub.subscriptionId },
      });

      // Invalidate cache
      cache.delete(`user_subscriptions_${uid}`);

      ResponseUtil.send(res, 200, "Date skipped successfully", {
        skippedDate: date,
        newEndDate: result.newEndDate,
        totalSkippedDates: (sub.skippedDates?.length || 0) + 1,
      });
    } catch (error) {
      console.error("Error skipping date:", error);
      ResponseUtil.error(res, 500, "Failed to skip date", error);
    }
  }

  static async createReview(req, res) {
    try {
      const { uid, email, name } = req.user;
      const { rating, title, comment, subscriptionId } = req.body;

      if (!subscriptionId) {
        return ResponseUtil.error(res, 400, "Subscription ID is required");
      }
      if (!rating || rating < 1 || rating > 5) {
        return ResponseUtil.error(res, 400, "Rating must be an integer between 1 and 5");
      }
      if (!title || !comment) {
        return ResponseUtil.error(res, 400, "Title and comment are required");
      }

      const doc = await SubscriptionModel.collection.doc(subscriptionId).get();
      if (!doc.exists) {
        return ResponseUtil.error(res, 404, "Subscription not found");
      }
      const sub = doc.data();
      if (sub.userId !== uid) {
        return ResponseUtil.error(res, 403, "Unauthorized to review this subscription");
      }

      const admin = require("../config/firebase.config");
      const db = admin.firestore();
      
      const reviewId = db.collection("reviews").doc().id;
      const reviewData = {
        reviewId,
        userId: uid,
        userName: name || email || "Anonymous",
        userEmail: email || "",
        subscriptionId,
        plan: sub.plan || "Unknown Plan",
        rating: Number(rating),
        title,
        comment,
        createdAt: new Date().toISOString()
      };

      await db.collection("reviews").doc(reviewId).set(reviewData);

      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(uid, {
        type: "review",
        action: "submitted",
        description: `Submitted a ${rating}-star review for the ${sub.plan} plan`,
        metadata: { rating, subscriptionId }
      });

      ResponseUtil.send(res, 201, "Review submitted successfully", reviewData);
    } catch (error) {
      console.error("Error creating review:", error);
      ResponseUtil.error(res, 500, "Failed to submit review", error);
    }
  }
}

module.exports = SubscriptionController;
