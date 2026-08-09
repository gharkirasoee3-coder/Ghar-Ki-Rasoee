const StripeService = require("../services/stripe.service");
const ResponseUtil = require("../utils/response.util");
const SubscriptionModel = require("../models/subscription.model");
const OrderModel = require("../models/order.model");
const ActivityModel = require("../models/activity.model");
const admin = require("../config/firebase.config");
const db = admin.firestore();
const cache = require("../utils/cache.util");
const NotificationModel = require("../models/notification.model");

class PaymentController {
  /**
   * Create Stripe Checkout Session for subscription or one-time payment
   */
  static async createCheckoutSession(req, res) {
    try {
      const { uid, email } = req.user;
      const { type, planName, amount, deliveryAddress, deliveryDate, items, couponCode, isRecurring, customDetails, replacePlan } = req.body;

      if (!amount || amount <= 0) {
        return ResponseUtil.error(res, 400, "Invalid amount");
      }

      if (!deliveryAddress) {
        return ResponseUtil.error(res, 400, "Delivery address is required");
      }

      // Backend price verification for custom subscriptions
      if (type === "subscription" && (customDetails || (planName && planName.toLowerCase().includes("custom")))) {
        if (!customDetails) {
          return ResponseUtil.error(res, 400, "Custom details are required for custom plan");
        }
        const MenuModel = require("../models/menu.model");
        const menuConfig = await MenuModel.getMenuConfig();
        try {
          const calculatedPrice = MenuModel.calculateCustomPrice(customDetails, menuConfig);
          if (Math.abs(amount - calculatedPrice) > 0.05) {
            return ResponseUtil.error(res, 400, `Pricing validation failed. Expected: $${calculatedPrice.toFixed(2)}, Received: $${amount.toFixed(2)}`);
          }
        } catch (err) {
          return ResponseUtil.error(res, 400, err.message);
        }
      }

      let finalAmount = amount;
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
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
        if (coupon.expiresAt && coupon.expiresAt < today) {
          return ResponseUtil.error(res, 400, "This coupon has expired");
        }
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          return ResponseUtil.error(res, 400, "This coupon has reached its usage limit");
        }
        if (coupon.minOrderAmount > 0 && amount < coupon.minOrderAmount) {
          return ResponseUtil.error(
            res,
            400,
            `Minimum purchase of $${coupon.minOrderAmount.toFixed(2)} CAD is required for this coupon`
          );
        }

        if (coupon.discountType === "fixed") {
          discountAmount = coupon.discountValue;
        } else if (coupon.discountType === "percentage") {
          discountAmount = amount * (coupon.discountValue / 100);
          if (coupon.maxDiscountAmount !== null && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        }
        discountAmount = Math.min(discountAmount, amount);
        finalAmount = Math.max(0.50, amount - discountAmount); // Stripe requires min 50 cents CAD
      }

      // Fetch user's display name
      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const userName = userData.displayName || userData.email || "GKR Customer";

      const successUrl = `${req.headers.origin || "http://localhost:5173"}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${req.headers.origin || "http://localhost:5173"}/payment-cancelled`;

      // For auto-renewing subscriptions, pass the undiscounted base price. Stripe will apply the discount.
      const isSubscriptionMode = type === "subscription" && isRecurring;
      const stripeAmount = isSubscriptionMode ? amount : finalAmount;

      const session = await StripeService.createCheckoutSession({
        userId: uid,
        userEmail: email || userData.email,
        userName,
        type, // 'subscription' or 'one-time'
        amount: stripeAmount,
        planName,
        deliveryAddress,
        deliveryDate,
        items,
        successUrl,
        cancelUrl,
        couponCode,
        isRecurring,
        customDetails,
        replacePlan,
      });

      return ResponseUtil.send(res, 200, "Checkout session created successfully", {
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return ResponseUtil.error(res, 500, "Failed to create checkout session", error);
    }
  }

  /**
   * Retrieve Checkout Session status (used by success redirect page)
   */
  static async getSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        return ResponseUtil.error(res, 400, "Session ID is required");
      }

      const session = await StripeService.retrieveSession(sessionId);

      return ResponseUtil.send(res, 200, "Session retrieved successfully", {
        status: session.payment_status,
        customerEmail: session.customer_details?.email,
        amount: session.amount_total / 100,
        metadata: session.metadata,
      });
    } catch (error) {
      console.error("Error retrieving session status:", error);
      return ResponseUtil.error(res, 500, "Failed to retrieve session status", error);
    }
  }

  /**
   * Handle Stripe webhook events securely
   */
  static async handleWebhook(req, res) {
    const signature = req.headers["stripe-signature"];
    let event;

    try {
      // req.body here is the raw Buffer since we mounted raw parser before express.json()
      event = StripeService.constructEvent(req.body, signature);
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    console.log("Received Stripe Webhook Event:", event.type);

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { userId, type, planName, deliveryAddress, deliveryDate, items, couponCode, isRecurring, customDetails, replacePlan } = session.metadata;

        console.log(`Processing successful payment for user ${userId}, type ${type}`);

        if (type === "subscription") {
          // Idempotency: Check if subscription with this session ID already exists
          const duplicateCheck = await SubscriptionModel.collection
            .where("stripeSessionId", "==", session.id)
            .limit(1)
            .get();

          if (!duplicateCheck.empty) {
            console.log(`Webhook already processed for session ${session.id}. Skipping.`);
            return res.json({ received: true });
          }

          // Check if user already has an active subscription to mark it as replaced (only if replacePlan !== "false")
          if (replacePlan !== "false") {
            const existing = await SubscriptionModel.getUserSubscription(userId);
            if (existing) {
              await SubscriptionModel.collection.doc(existing.subscriptionId).update({
                status: "Renewed",
                updatedAt: new Date().toISOString(),
              });

              // Cancel the recurring billing on Stripe for the old subscription to avoid double-charging
              if (existing.stripeSubscriptionId) {
                await StripeService.cancelSubscription(existing.stripeSubscriptionId).catch((err) =>
                  console.error("Failed to cancel old Stripe subscription billing via webhook:", err)
                );
              }
            }
          }

          const parsedCustomDetails = customDetails ? JSON.parse(customDetails) : null;

          const planData = {
            plan: planName,
            planDetails: { 
              name: planName, 
              price: session.amount_total / 100,
              ...(parsedCustomDetails ? { custom: true, ...parsedCustomDetails } : {})
            },
            duration: 30, // 30 days
            deliveryAddress,
            paymentMethod: "Stripe",
            paymentStatus: "Paid",
            stripeSessionId: session.id,
            stripeSubscriptionId: session.subscription || null,
            couponCode: couponCode || null,
            isRecurring: isRecurring === "true",
          };

          const newSub = await SubscriptionModel.createSubscription(userId, planData);

          // Update user address
          await db.collection("users").doc(userId).update({
            address: deliveryAddress,
            updatedAt: new Date().toISOString(),
          });

          // Fetch user details for payment confirmation email
          const userDoc = await db.collection("users").doc(userId).get();
          const userData = userDoc.exists ? userDoc.data() : {};

          // Send payment confirmation email
          const EmailService = require("../services/email.service");
          await EmailService.sendPaymentConfirmationEmail({
            userEmail: userData.email,
            userName: userData.name || userData.displayName || userData.email?.split("@")[0],
            amount: session.amount_total / 100,
            paymentMethod: "Stripe (Credit/Debit Card)",
            paymentType: "subscription",
            details: newSub,
            deliveryAddress,
            transactionId: newSub.subscriptionId
          }).catch(err => console.error("Failed to send subscription payment confirmation email:", err));

          // Log activity
          await ActivityModel.logActivity(userId, {
            type: "subscription",
            action: "created",
            description: `Subscribed to ${planName} Plan via Stripe (CAD)${couponCode ? ` with coupon ${couponCode}` : ''}`,
            metadata: {
              plan: planName,
              subscriptionId: newSub.subscriptionId,
              couponCode: couponCode || null,
            },
          });

          await NotificationModel.create(userId, {
            type: "payment",
            title: "Payment Confirmed",
            message: `Your payment of $${(session.amount_total / 100).toFixed(2)} CAD for the ${planName} subscription plan has been confirmed.`,
            metadata: { subscriptionId: newSub.subscriptionId, amount: session.amount_total / 100 }
          }).catch(err => console.error("Failed to create subscription payment notification:", err));

          // Invalidate cache
          cache.delete(`user_subscription_${userId}`);
          cache.delete(`user_subscriptions_${userId}`);
          cache.delete("admin_dashboard_stats");
          cache.delete("admin_all_subscriptions");
          cache.delete("admin_today_deliveries");
          cache.delete("admin_all_users");
        } else if (type === "one-time") {
          // Idempotency: Check if order with this session ID already exists
          const duplicateCheck = await OrderModel.collection
            .where("stripeSessionId", "==", session.id)
            .limit(1)
            .get();

          if (!duplicateCheck.empty) {
            console.log(`Webhook already processed for session ${session.id}. Skipping.`);
            return res.json({ received: true });
          }

          // Create order in Firestore
          const userDoc = await db.collection("users").doc(userId).get();
          const userData = userDoc.exists ? userDoc.data() : {};

          let parsedItems = [];
          try {
            parsedItems = JSON.parse(items || "[]");
          } catch (e) {
            console.error("Failed to parse items from metadata:", e);
          }

          const orderData = {
            userId,
            customerName: userData.displayName || userData.email || "Unknown Customer",
            deliveryAddress,
            orderType: "one-time",
            plan: null,
            items: parsedItems,
            price: session.amount_total / 100,
            deliveryDate,
            paymentMethod: "Stripe",
            paymentStatus: "Paid",
            stripeSessionId: session.id,
            couponCode: couponCode || null,
          };

          const newOrder = await OrderModel.createOrder(orderData);

          // Update user address
          await db.collection("users").doc(userId).update({
            address: deliveryAddress,
            updatedAt: new Date().toISOString(),
          });

          // Send payment confirmation email
          const EmailService = require("../services/email.service");
          await EmailService.sendPaymentConfirmationEmail({
            userEmail: userData.email,
            userName: userData.name || userData.displayName || userData.email?.split("@")[0],
            amount: session.amount_total / 100,
            paymentMethod: "Stripe (Credit/Debit Card)",
            paymentType: "one-time",
            details: parsedItems,
            deliveryAddress,
            transactionId: newOrder.orderId
          }).catch(err => console.error("Failed to send order payment confirmation email:", err));

          // Log activity
          await ActivityModel.logActivity(userId, {
            type: "order",
            action: "placed",
            description: `Placed one-time meal order via Stripe (CAD)${couponCode ? ` with coupon ${couponCode}` : ''}`,
            metadata: {
              orderId: newOrder.orderId,
              orderType: "one-time",
              totalItems: parsedItems.length,
              couponCode: couponCode || null,
            },
          });

          await NotificationModel.create(userId, {
            type: "payment",
            title: "Payment Confirmed",
            message: `Your payment of $${(session.amount_total / 100).toFixed(2)} CAD for order #${newOrder.orderId.slice(0, 8)} has been confirmed.`,
            metadata: { orderId: newOrder.orderId, amount: session.amount_total / 100 }
          }).catch(err => console.error("Failed to create order payment notification:", err));

          // Invalidate cache
          cache.delete("admin_dashboard_stats");
          cache.delete("admin_today_deliveries");
        }

        // Increment coupon usage count
        if (couponCode) {
          const CouponModel = require("../models/coupon.model");
          await CouponModel.incrementUsage(couponCode).catch((err) =>
            console.error("Failed to increment coupon usage count:", err)
          );
        }
      } else if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;

        // Skip initial creation invoice to prevent double-extending the subscription
        if (stripeSubscriptionId && invoice.billing_reason !== "subscription_create") {
          console.log(`Processing invoice renewal payment for Stripe Subscription ${stripeSubscriptionId}`);

          const subSnapshot = await SubscriptionModel.collection
            .where("stripeSubscriptionId", "==", stripeSubscriptionId)
            .get();

          if (!subSnapshot.empty) {
            const docs = subSnapshot.docs;
            docs.sort((a, b) => new Date(b.data().createdAt).getTime() - new Date(a.data().createdAt).getTime());
            const latestSubDoc = docs[0];
            const latestSub = latestSubDoc.data();

            const currentEndDate = new Date(latestSub.endDate);
            const now = new Date();
            const baseDate = currentEndDate > now ? currentEndDate : now;

            const newEndDate = new Date(baseDate);
            newEndDate.setDate(baseDate.getDate() + 30);

            await latestSubDoc.ref.update({
              status: "Active",
              endDate: newEndDate.toISOString(),
              remainingDays: 30,
              updatedAt: new Date().toISOString()
            });

            // Fetch user info for renewal email
            const userDoc = await db.collection("users").doc(latestSub.userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const amountPaid = invoice.amount_paid ? (invoice.amount_paid / 100) : (latestSub.planDetails?.price || latestSub.price || 0);

            const EmailService = require("../services/email.service");
            await EmailService.sendPaymentConfirmationEmail({
              userEmail: userData.email,
              userName: userData.name || userData.displayName || userData.email?.split("@")[0],
              amount: amountPaid,
              paymentMethod: "Stripe (Credit/Debit Card)",
              paymentType: "renewal",
              details: latestSub,
              deliveryAddress: latestSub.deliveryAddress,
              transactionId: latestSub.subscriptionId
            }).catch(err => console.error("Failed to send subscription renewal payment confirmation email:", err));

            await ActivityModel.logActivity(latestSub.userId, {
              type: "subscription",
              action: "renewed",
              description: `Subscription automatically renewed via Stripe. Next payment due: ${newEndDate.toLocaleDateString()}`,
              metadata: {
                subscriptionId: latestSub.subscriptionId,
                stripeSubscriptionId,
                newEndDate: newEndDate.toISOString()
              }
            });

            await NotificationModel.create(latestSub.userId, {
              type: "payment",
              title: "Subscription Renewed",
              message: `Your subscription to the ${latestSub.plan} plan has been successfully renewed. Next payment due: ${newEndDate.toLocaleDateString('en-CA')}.`,
              metadata: { subscriptionId: latestSub.subscriptionId, amount: amountPaid }
            }).catch(err => console.error("Failed to create subscription renewal notification:", err));

            // Invalidate cache
            cache.delete(`user_subscription_${latestSub.userId}`);
            cache.delete(`user_subscriptions_${latestSub.userId}`);
            cache.delete("admin_dashboard_stats");
            cache.delete("admin_all_subscriptions");
            cache.delete("admin_today_deliveries");
            cache.delete("admin_all_users");
            console.log(`Successfully extended subscription ${latestSub.subscriptionId} to ${newEndDate.toISOString()}`);
          } else {
            console.log(`No GKR subscription found matching Stripe ID ${stripeSubscriptionId}`);
          }
        }
      } else if (event.type === "customer.subscription.deleted") {
        const stripeSubscription = event.data.object;
        const stripeSubscriptionId = stripeSubscription.id;

        if (stripeSubscriptionId) {
          console.log(`Processing subscription cancellation for Stripe Subscription ${stripeSubscriptionId}`);

          const subSnapshot = await SubscriptionModel.collection
            .where("stripeSubscriptionId", "==", stripeSubscriptionId)
            .get();

          if (!subSnapshot.empty) {
            const batch = db.batch();
            subSnapshot.forEach(doc => {
              batch.update(doc.ref, {
                status: "Cancelled",
                updatedAt: new Date().toISOString()
              });
            });
            await batch.commit();

            const docs = subSnapshot.docs;
            docs.sort((a, b) => new Date(b.data().createdAt).getTime() - new Date(a.data().createdAt).getTime());
            const latestSub = docs[0].data();

            await ActivityModel.logActivity(latestSub.userId, {
              type: "subscription",
              action: "cancelled",
              description: "Subscription cancelled or ended in Stripe.",
              metadata: {
                subscriptionId: latestSub.subscriptionId,
                stripeSubscriptionId
              }
            });
            console.log(`Successfully cancelled subscription(s) matching Stripe ID ${stripeSubscriptionId}`);
          }
        }
      }

      return res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook database actions:", error);
      return res.status(500).json({ error: "Failed to process webhook events" });
    }
  }
}

module.exports = PaymentController;
