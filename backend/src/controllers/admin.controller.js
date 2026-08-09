const admin = require("../config/firebase.config");
const db = admin.firestore();
const ResponseUtil = require("../utils/response.util");
const SubscriptionModel = require("../models/subscription.model");
const cache = require("../utils/cache.util");
const NotificationModel = require("../models/notification.model");

class AdminController {
  static async getDashboardStats(req, res) {
    try {
      const cachedStats = cache.get("admin_dashboard_stats");
      if (cachedStats) {
        return ResponseUtil.send(
          res,
          200,
          "Dashboard stats fetched (cached)",
          cachedStats,
        );
      }

      const ordersSnapshot = await db.collection("orders").get();
      const usersSnapshot = await db.collection("users").get();

      const totalOrders = ordersSnapshot.size;
      
      let totalUsers = 0;
      usersSnapshot.forEach(doc => {
        if (doc.data().role !== "admin") {
          totalUsers++;
        }
      });

      let totalRevenue = 0;
      const paymentMethodsMap = {
        "Credit/Debit": 0,
        UPI: 0,
        "Digital Wallet": 0,
      };

      const friendlyNames = {
        card: "Credit/Debit",
        upi: "UPI",
        apple_pay: "Digital Wallet",
        google_pay: "Digital Wallet",
        wallet: "Digital Wallet",
        "Cash on Delivery": "Cash",
      };

      const subscriptionsSnapshot = await db.collection("subscriptions").get();
      const subMap = {};
      subscriptionsSnapshot.forEach((doc) => {
        const sub = doc.data();
        subMap[doc.id] = sub;
        if (sub.paymentStatus === "Paid") {
          const price = sub.planDetails?.price || sub.price || 0;
          totalRevenue += Number(price);
        }
      });

      const recentOrders = [];
      ordersSnapshot.forEach((doc) => {
        const data = doc.data();
        totalRevenue += Number(data.price || 0);
        let rawMethod = data.paymentMethod || "Online";

        if (rawMethod === "Prepaid (Subscription)") {
          const sub = subMap[data.subscriptionId];
          if (sub) {
            rawMethod = sub.paymentMethod;
          } else {
            const userSub = Object.values(subMap).find(
              (s) => s.userId === data.userId && s.status === "Active",
            );
            rawMethod = userSub?.paymentMethod || "card";
          }
        }

        const method = friendlyNames[rawMethod] || rawMethod;
        if (paymentMethodsMap[method] !== undefined) {
          paymentMethodsMap[method]++;
        } else {
          paymentMethodsMap[method] = 1;
        }

        if (recentOrders.length < 5) {
          recentOrders.push({
            orderId: doc.id,
            user: data.userId,
            amount: data.price,
            status: data.status,
            date: data.createdAt,
          });
        }
      });

      const paymentMethodsStats = Object.keys(paymentMethodsMap).map(
        (name) => ({ name, value: paymentMethodsMap[name] }),
      );

      recentOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      const top5Recent = recentOrders.slice(0, 5);

      const stats = {
        totalOrders,
        totalUsers,
        totalRevenue,
        paymentMethods: paymentMethodsStats,
        recentOrders: top5Recent,
      };

      cache.set("admin_dashboard_stats", stats, 60);
      ResponseUtil.send(res, 200, "Dashboard stats fetched", stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      ResponseUtil.error(res, 500, "Failed to fetch stats", error);
    }
  }

  static async getAllSubscriptions(req, res) {
    try {
      const cachedSubs = cache.get("admin_all_subscriptions");
      if (cachedSubs) {
        return ResponseUtil.send(
          res,
          200,
          "Subscriptions fetched (cached)",
          cachedSubs,
        );
      }

      const subscriptions = await SubscriptionModel.getAllSubscriptions();
      const enrichedSubscriptions = await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            const userDoc = await db.collection("users").doc(sub.userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              let userName = userData.name || userData.displayName;
              if (!userName && userData.email) {
                userName = userData.email.split("@")[0];
                userName = userName.charAt(0).toUpperCase() + userName.slice(1);
              }
              return {
                ...sub,
                userName: userName || "Customer",
                userEmail: userData.email || "",
                userPhone: userData.phone || "N/A",
              };
            }
          } catch (e) {
            console.error(
              `Error fetching user for sub ${sub.subscriptionId}:`,
              e,
            );
          }
          return { ...sub, userName: "Unknown User", userEmail: "", userPhone: "N/A" };
        }),
      );

      cache.set("admin_all_subscriptions", enrichedSubscriptions, 120); // 2 min cache
      ResponseUtil.send(
        res,
        200,
        "Subscriptions fetched",
        enrichedSubscriptions,
      );
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      ResponseUtil.error(res, 500, "Failed to fetch subscriptions", error);
    }
  }

  static async deleteSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;
      if (!subscriptionId)
        return ResponseUtil.error(res, 400, "Subscription ID is required");

      const admin = require("../config/firebase.config");
      const db = admin.firestore();

      // 1. Delete the subscription itself
      await db.collection("subscriptions").doc(subscriptionId).delete();

      // 2. Delete any orphaned customizations linked to this subscription
      const customizationSnapshot = await db.collection("customizations")
        .where("subscriptionId", "==", subscriptionId)
        .get();
        
      if (!customizationSnapshot.empty) {
        const batch = db.batch();
        customizationSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // 3. Clear all relevant caches
      cache.delete("admin_dashboard_stats");
      cache.delete("admin_all_subscriptions");
      cache.delete("admin_today_deliveries");
      cache.delete("admin_all_users");

      ResponseUtil.send(res, 200, "Subscription deleted successfully", {
        subscriptionId,
      });
    } catch (error) {
      console.error("Error deleting subscription:", error);
      ResponseUtil.error(res, 500, "Failed to delete subscription", error);
    }
  }

  static async getTodayDeliveries(req, res) {
    try {
      const cachedDeliveries = cache.get("admin_today_deliveries");
      if (cachedDeliveries) {
        return ResponseUtil.send(
          res,
          200,
          "Today's deliveries fetched (cached)",
          cachedDeliveries,
        );
      }

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" })
        .format(now)
        .toLowerCase();

      const subscriptionsSnapshot = await db
        .collection("subscriptions")
        .where("status", "==", "Active")
        .get();
      const deliveries = [];

      for (const doc of subscriptionsSnapshot.docs) {
        const sub = doc.data();
        if (sub.skippedDates && sub.skippedDates.includes(todayStr)) continue;

        const userDoc = await db.collection("users").doc(sub.userId).get();
        const userData = userDoc.exists
          ? userDoc.data()
          : { name: "Unknown User" };

        let customerName = userData.name || userData.displayName;
        if (!customerName && userData.email) {
          customerName = userData.email.split("@")[0];
          customerName =
            customerName.charAt(0).toUpperCase() + customerName.slice(1);
        }
        customerName = customerName || "Customer";

        const CustomizationModel = require("../models/customization.model");
        const MenuModel = require("../models/menu.model");
        const customization = await CustomizationModel.getBySubscription(
          sub.subscriptionId,
        );
        let todayPreference = customization?.preferences
          ? customization.preferences[dayName]
          : null;

        let finalPreference = {};
        let dayMenu = await MenuModel.getDayMenu(sub.plan, dayName);
        if (!dayMenu) {
          dayMenu = await MenuModel.getDayMenu(sub.plan, "monday");
        }
        if (dayMenu) {
          if (dayMenu.isSaturdaySpecial) {
            finalPreference.specialFood = dayMenu.specialFoodOptions ? dayMenu.specialFoodOptions[0] : "Chef's Special";
            finalPreference.dessert = dayMenu.dessertOptions ? dayMenu.dessertOptions[0] : "Sweet";
          } else {
            if (dayMenu.sabziSet1) finalPreference.sabzi1 = dayMenu.sabziSet1[0];
            if (dayMenu.sabziSet2) finalPreference.sabzi2 = dayMenu.sabziSet2[0];
            if (dayMenu.sabziOptions) {
              finalPreference.sabzi1 = dayMenu.sabziOptions[0];
              if (dayMenu.sabziOptions.length > 1 && (sub.plan.toLowerCase() === "standard" || sub.plan.toLowerCase() === "premium")) {
                finalPreference.sabzi2 = dayMenu.sabziOptions[1];
              }
            }
          }
          if (dayMenu.roti) finalPreference.roti = `${dayMenu.roti} Roti`;
          if (dayMenu.raitaType) finalPreference.side_option = dayMenu.raitaType;
          else if (dayMenu.raita) finalPreference.side_option = "Raita";
        }

        // Merge user's customizations over defaults
        if (todayPreference && Object.keys(todayPreference).length > 0) {
          finalPreference = { ...finalPreference, ...todayPreference };
        }

        if (finalPreference.sideOption) {
          finalPreference.side_option = finalPreference.sideOption;
          delete finalPreference.sideOption;
        }

        // If a user explicitly saved empty strings, clean them up
        Object.keys(finalPreference).forEach(key => {
          if (finalPreference[key] === null || finalPreference[key] === undefined || finalPreference[key] === '') {
            delete finalPreference[key];
          }
        });

        // If nothing was resolved, populate with meaningful defaults based on plan
        if (Object.keys(finalPreference).length === 0) {
          const planLower = (sub.plan || '').toLowerCase();
          if (planLower === 'basic') {
            finalPreference = { sabzi1: 'Default Menu', roti: '4 Roti' };
          } else if (planLower === 'standard') {
            finalPreference = { sabzi1: 'Default Menu', sabzi2: 'Default Menu', roti: '8 Roti' };
          } else if (planLower === 'premium') {
            finalPreference = { sabzi1: 'Default Menu', sabzi2: 'Default Menu', roti: '8 Roti', dessert: 'Wed + Sat' };
          } else {
            finalPreference = { meal: `Default ${sub.plan} Menu` };
          }
        }

        // Apply robust Side Option logic: show 'Raita' by default, or 'Salad' if explicitly selected
        const planLowerClean = (sub.plan || '').toLowerCase();
        const hasSideOption = planLowerClean.includes('premium') || 
                              planLowerClean.includes('standard') || 
                              planLowerClean.includes('basic');

        if (hasSideOption) {
          if (!finalPreference.side_option || finalPreference.side_option === 'Raita or Salad' || finalPreference.side_option !== 'Salad') {
            finalPreference.side_option = 'Raita';
          }
        } else {
          delete finalPreference.side_option;
        }

        const orderSnapshot = await db
          .collection("orders")
          .where("userId", "==", sub.userId)
          .where("deliveryDate", "==", todayStr)
          .where("generatedByScheduler", "==", true)
          .limit(1)
          .get();

        const todayOrder = !orderSnapshot.empty
          ? orderSnapshot.docs[0].data()
          : null;
        const orderId = !orderSnapshot.empty ? orderSnapshot.docs[0].id : null;

        deliveries.push({
          subscriptionId: sub.subscriptionId,
          orderId,
          userId: sub.userId,
          customerName,
          email: userData.email,
          phone: userData.phone || "N/A",
          address:
            sub.deliveryAddress || userData.address || "No address provided",
          plan: sub.plan,
          mealPreference: sub.preferences?.defaultMeal || "Veg",
          todayCustomization: finalPreference,
          deliveryStatus: todayOrder ? todayOrder.status : "Confirmed",
          day: dayName,
        });
      }

      const result = { deliveries, date: todayStr, day: dayName };
      cache.set("admin_today_deliveries", result, 60); // 1 min cache
      ResponseUtil.send(res, 200, "Today's deliveries fetched", result);
    } catch (error) {
      console.error("Error fetching today's deliveries:", error);
      ResponseUtil.error(res, 500, "Failed to fetch today's deliveries", error);
    }
  }

  static async getSubscriptionDetails(req, res) {
    try {
      const { subscriptionId } = req.params;
      const subDoc = await db
        .collection("subscriptions")
        .doc(subscriptionId)
        .get();
      if (!subDoc.exists)
        return ResponseUtil.error(res, 404, "Subscription not found");

      const sub = subDoc.data();
      const userDoc = await db.collection("users").doc(sub.userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      let customerName = userData.name || userData.displayName;
      if (!customerName && userData.email) {
        customerName = userData.email.split("@")[0];
        customerName =
          customerName.charAt(0).toUpperCase() + customerName.slice(1);
      }

      const CustomizationModel = require("../models/customization.model");
      const customization =
        await CustomizationModel.getBySubscription(subscriptionId);

      const combinedData = {
        ...sub,
        customerName: customerName || "Customer",
        userName: customerName || "Customer",
        userEmail: userData.email || "",
        phone: userData.phone || "N/A",
        customization: customization || null,
      };

      ResponseUtil.send(res, 200, "Subscription details fetched", combinedData);
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      ResponseUtil.error(res, 500, "Failed to fetch details", error);
    }
  }

  static async updateDeliveryStatus(req, res) {
    try {
      const { orderId, status } = req.body;
      if (!orderId || !status)
        return ResponseUtil.error(res, 400, "OrderId and status are required");

      await db.collection("orders").doc(orderId).update({
        status,
        updatedAt: new Date().toISOString(),
      });

      cache.delete("admin_dashboard_stats");
      cache.delete("admin_today_deliveries");

      ResponseUtil.send(res, 200, "Delivery status updated", {
        orderId,
        status,
      });
    } catch (error) {
      console.error("Error updating delivery status:", error);
      ResponseUtil.error(res, 500, "Failed to update delivery status", error);
    }
  }

  static async triggerScheduler(req, res) {
    try {
      const SchedulerService = require("../services/scheduler.service");
      await SchedulerService.generateDailyOrders();

      cache.delete("admin_dashboard_stats");
      cache.delete("admin_today_deliveries");

      ResponseUtil.send(res, 200, "Daily orders generated successfully");
    } catch (error) {
      console.error("Error triggering scheduler:", error);
      ResponseUtil.error(res, 500, "Failed to trigger scheduler", error);
    }
  }

  /**
   * Get all users with their subscription summary
   */
  static async getAllUsers(req, res) {
    try {
      const cachedUsers = cache.get("admin_all_users");
      if (cachedUsers) {
        return ResponseUtil.send(
          res,
          200,
          "Users fetched (cached)",
          cachedUsers,
        );
      }

      const usersSnapshot = await db.collection("users").get();
      const subscriptionsSnapshot = await db.collection("subscriptions").get();

      // Build subscription map by userId (latest subscription per user)
      const subMap = {};
      subscriptionsSnapshot.forEach((doc) => {
        const sub = doc.data();
        const uid = sub.userId;
        if (!uid) return;
        // Keep the most recent subscription per user
        if (
          !subMap[uid] ||
          new Date(sub.createdAt) > new Date(subMap[uid].createdAt)
        ) {
          subMap[uid] = sub;
        }
      });

      const users = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const uid = doc.id;
        const sub = subMap[uid] || null;

        let displayName = userData.name || userData.displayName;
        if (!displayName && userData.email) {
          displayName = userData.email.split("@")[0];
          displayName =
            displayName.charAt(0).toUpperCase() + displayName.slice(1);
        }

        users.push({
          uid,
          name: displayName || "Customer",
          email: userData.email || "",
          phone: userData.phone || "N/A",
          address: userData.address || "",
          area: userData.area || "",
          role: userData.role || "customer",
          picture: userData.picture || null,
          lastLoginAt: userData.lastLoginAt || null,
          // Subscription summary
          subscription: sub
            ? {
                subscriptionId: sub.subscriptionId,
                plan: sub.plan,
                status: sub.status,
                startDate: sub.startDate,
                endDate: sub.endDate,
                skippedDatesCount: sub.skippedDates?.length || 0,
                remainingDays: sub.remainingDays || 0,
                paymentStatus: sub.paymentStatus,
              }
            : null,
        });
      });

      // Sort: active subscribers first, then by name
      users.sort((a, b) => {
        const aActive = a.subscription?.status === "Active" ? 0 : 1;
        const bActive = b.subscription?.status === "Active" ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return a.name.localeCompare(b.name);
      });

      cache.set("admin_all_users", users, 60); // 1 min cache
      ResponseUtil.send(res, 200, "Users fetched", users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      ResponseUtil.error(res, 500, "Failed to fetch users", error);
    }
  }

  /**
   * Get detailed user profile with subscription, customization, and activity
   */
  static async getUserDetail(req, res) {
    try {
      const { userId } = req.params;

      // 1. User profile
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return ResponseUtil.error(res, 404, "User not found");
      }
      const userData = userDoc.data();

      let displayName = userData.name || userData.displayName;
      if (!displayName && userData.email) {
        displayName = userData.email.split("@")[0];
        displayName =
          displayName.charAt(0).toUpperCase() + displayName.slice(1);
      }

      // 2. Subscription (latest, any status)
      const subSnapshot = await db
        .collection("subscriptions")
        .where("userId", "==", userId)
        .get();

      let subscription = null;
      if (!subSnapshot.empty) {
        const subs = subSnapshot.docs.map((doc) => doc.data());
        subs.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        subscription = subs[0];
      }

      // 3. Meal Customization
      let customization = null;
      if (subscription) {
        const CustomizationModel = require("../models/customization.model");
        customization = await CustomizationModel.getBySubscription(
          subscription.subscriptionId,
        );
      }

      // 4. Activity log
      const ActivityModel = require("../models/activity.model");
      const activities = await ActivityModel.getUserActivities(userId, 30);

      // 5. Notifications
      const NotificationModel = require("../models/notification.model");
      const notifications = await NotificationModel.getByUserId(userId, 10);

      const detail = {
        uid: userId,
        name: displayName || "Customer",
        email: userData.email || "",
        phone: userData.phone || "N/A",
        address: userData.address || "",
        area: userData.area || "",
        role: userData.role || "customer",
        picture: userData.picture || null,
        lastLoginAt: userData.lastLoginAt || null,
        savedAddresses: userData.savedAddresses || [],
        subscription,
        customization,
        activities,
        notifications,
      };

      ResponseUtil.send(res, 200, "User detail fetched", detail);
    } catch (error) {
      console.error("Error fetching user detail:", error);
      ResponseUtil.error(res, 500, "Failed to fetch user detail", error);
    }
  }

  /**
   * Admin confirms COD payment for an order
   */
  static async confirmCODPayment(req, res) {
    try {
      const { orderId } = req.params;
      if (!orderId) {
        return ResponseUtil.error(res, 400, "Order ID is required");
      }

      const orderDoc = await db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        const subDoc = await db.collection("subscriptions").doc(orderId).get();
        if (subDoc.exists) {
          const subscription = subDoc.data();
          const paymentMethod = (subscription.paymentMethod || "").toLowerCase();
          if (!paymentMethod.includes("cash") && !paymentMethod.includes("cod")) {
            return ResponseUtil.error(res, 400, "This subscription is not a Cash on Delivery subscription");
          }
          if (subscription.paymentStatus === "Paid") {
            return ResponseUtil.error(res, 400, "Payment already confirmed for this subscription");
          }
          await db.collection("subscriptions").doc(orderId).update({
            paymentStatus: "Paid",
            paymentCollectedBy: req.user?.uid || "admin",
            paymentCollectedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          const ActivityModel = require("../models/activity.model");
          const planPrice = subscription.planDetails?.price || subscription.price || 0;

          // Fetch user details for confirmation email
          const userDoc = await db.collection("users").doc(subscription.userId).get();
          const userData = userDoc.exists ? userDoc.data() : {};
          
          // Send payment confirmation email
          const EmailService = require("../services/email.service");
          await EmailService.sendPaymentConfirmationEmail({
            userEmail: userData.email,
            userName: userData.name || userData.displayName || userData.email?.split("@")[0],
            amount: planPrice,
            paymentMethod: "Cash on Delivery",
            paymentType: "subscription",
            details: subscription,
            deliveryAddress: subscription.deliveryAddress,
            transactionId: subscription.subscriptionId
          }).catch(err => console.error("Failed to send subscription payment confirmation email:", err));

          await ActivityModel.logActivity(subscription.userId, {
            type: "subscription",
            action: "cod_collected",
            description: `COD payment of $${planPrice} collected for subscription #${orderId.slice(0, 8)}`,
            metadata: { subscriptionId: orderId, amount: planPrice, collectedBy: "admin" },
          });

          await NotificationModel.create(subscription.userId, {
            type: "payment",
            title: "COD Payment Confirmed",
            message: `Your Cash on Delivery payment of $${Number(planPrice).toFixed(2)} CAD for the ${subscription.plan} subscription plan has been confirmed.`,
            metadata: { subscriptionId: orderId, amount: planPrice }
          }).catch(err => console.error("Failed to create subscription COD payment notification:", err));
          cache.delete("admin_dashboard_stats");
          cache.delete("admin_all_subscriptions");
          cache.delete("admin_all_users");
          cache.delete(`user_subscription_${subscription.userId}`);
          cache.delete(`user_subscriptions_${subscription.userId}`);
          return ResponseUtil.send(res, 200, "Subscription COD payment confirmed successfully", {
            orderId,
            paymentStatus: "Paid",
          });
        }
        return ResponseUtil.error(res, 404, "Order not found");
      }

      const order = orderDoc.data();

      // Validate it's a COD order
      const paymentMethod = (order.paymentMethod || "").toLowerCase();
      if (!paymentMethod.includes("cash") && !paymentMethod.includes("cod")) {
        return ResponseUtil.error(res, 400, "This order is not a Cash on Delivery order");
      }

      if (order.paymentStatus === "Paid") {
        return ResponseUtil.error(res, 400, "Payment already confirmed for this order");
      }

      // Update payment status to Paid
      await db.collection("orders").doc(orderId).update({
        paymentStatus: "Paid",
        paymentCollectedBy: req.user?.uid || "admin",
        paymentCollectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Fetch user details for confirmation email
      const userDoc = await db.collection("users").doc(order.userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      // Send payment confirmation email
      const EmailService = require("../services/email.service");
      await EmailService.sendPaymentConfirmationEmail({
        userEmail: userData.email,
        userName: userData.name || userData.displayName || userData.email?.split("@")[0],
        amount: order.price || 0,
        paymentMethod: "Cash on Delivery",
        paymentType: "one-time",
        details: order.items,
        deliveryAddress: order.deliveryAddress,
        transactionId: order.orderId
      }).catch(err => console.error("Failed to send order payment confirmation email:", err));

      // Log activity
      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(order.userId, {
        type: "payment",
        action: "cod_collected",
        description: `COD payment of $${order.price || 0} collected for order #${orderId.slice(0, 8)}`,
        metadata: { orderId, amount: order.price, collectedBy: "admin" },
      });

      await NotificationModel.create(order.userId, {
        type: "payment",
        title: "COD Payment Confirmed",
        message: `Your Cash on Delivery payment of $${Number(order.price || 0).toFixed(2)} CAD for order #${orderId.slice(0, 8)} has been confirmed.`,
        metadata: { orderId, amount: order.price }
      }).catch(err => console.error("Failed to create order COD payment notification:", err));

      // Invalidate caches
      cache.delete("admin_dashboard_stats");
      cache.delete("admin_today_deliveries");
      cache.delete("admin_all_users");

      ResponseUtil.send(res, 200, "COD payment confirmed successfully", {
        orderId,
        paymentStatus: "Paid",
      });
    } catch (error) {
      console.error("Error confirming COD payment:", error);
      ResponseUtil.error(res, 500, "Failed to confirm payment", error);
    }
  }

  /**
   * Admin confirms COD payment for a subscription
   */
  static async confirmSubscriptionPayment(req, res) {
    try {
      const { subscriptionId } = req.params;
      if (!subscriptionId) {
        return ResponseUtil.error(res, 400, "Subscription ID is required");
      }

      const subDoc = await db.collection("subscriptions").doc(subscriptionId).get();
      if (!subDoc.exists) {
        return ResponseUtil.error(res, 404, "Subscription not found");
      }

      const subscription = subDoc.data();

      // Validate it's a COD subscription
      const paymentMethod = (subscription.paymentMethod || "").toLowerCase();
      if (!paymentMethod.includes("cash") && !paymentMethod.includes("cod")) {
        return ResponseUtil.error(res, 400, "This subscription is not a Cash on Delivery subscription");
      }

      if (subscription.paymentStatus === "Paid") {
        return ResponseUtil.error(res, 400, "Payment already confirmed for this subscription");
      }

      // Update payment status to Paid
      await db.collection("subscriptions").doc(subscriptionId).update({
        paymentStatus: "Paid",
        paymentCollectedBy: req.user?.uid || "admin",
        paymentCollectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const planPrice = subscription.planDetails?.price || subscription.price || 0;

      // Fetch user details for confirmation email
      const userDoc = await db.collection("users").doc(subscription.userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      // Send payment confirmation email
      const EmailService = require("../services/email.service");
      await EmailService.sendPaymentConfirmationEmail({
        userEmail: userData.email,
        userName: userData.name || userData.displayName || userData.email?.split("@")[0],
        amount: planPrice,
        paymentMethod: "Cash on Delivery",
        paymentType: "subscription",
        details: subscription,
        deliveryAddress: subscription.deliveryAddress,
        transactionId: subscription.subscriptionId
      }).catch(err => console.error("Failed to send subscription payment confirmation email:", err));

      // Log activity
      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(subscription.userId, {
        type: "subscription",
        action: "cod_collected",
        description: `COD payment of $${planPrice} collected for subscription #${subscriptionId.slice(0, 8)}`,
        metadata: { subscriptionId, amount: planPrice, collectedBy: "admin" },
      });

      await NotificationModel.create(subscription.userId, {
        type: "payment",
        title: "COD Payment Confirmed",
        message: `Your Cash on Delivery payment of $${Number(planPrice).toFixed(2)} CAD for the ${subscription.plan} subscription plan has been confirmed.`,
        metadata: { subscriptionId, amount: planPrice }
      }).catch(err => console.error("Failed to create subscription COD payment notification:", err));

      // Invalidate caches
      cache.delete("admin_dashboard_stats");
      cache.delete("admin_all_subscriptions");
      cache.delete("admin_all_users");
      cache.delete(`user_subscription_${subscription.userId}`);
      cache.delete(`user_subscriptions_${subscription.userId}`);

      ResponseUtil.send(res, 200, "Subscription COD payment confirmed successfully", {
        subscriptionId,
        paymentStatus: "Paid",
      });
    } catch (error) {
      console.error("Error confirming subscription COD payment:", error);
      ResponseUtil.error(res, 500, "Failed to confirm payment", error);
    }
  }

  /**
   * Admin cancels a user's subscription with reason + notification
   */
  static async adminCancelSubscription(req, res) {
    try {
      const { userId } = req.params;
      const { subscriptionId, reason } = req.body;

      if (!subscriptionId || !reason) {
        return ResponseUtil.error(
          res,
          400,
          "subscriptionId and reason are required",
        );
      }

      // Verify subscription exists and belongs to this user
      const subDoc = await db
        .collection("subscriptions")
        .doc(subscriptionId)
        .get();
      if (!subDoc.exists) {
        return ResponseUtil.error(res, 404, "Subscription not found");
      }

      const sub = subDoc.data();
      if (sub.userId !== userId) {
        return ResponseUtil.error(
          res,
          400,
          "Subscription does not belong to this user",
        );
      }

      if (sub.status === "Cancelled") {
        return ResponseUtil.error(
          res,
          400,
          "Subscription is already cancelled",
        );
      }

      // Cancel the subscription
      await db.collection("subscriptions").doc(subscriptionId).update({
        status: "Cancelled",
        cancellationReason: reason,
        cancelledByAdmin: true,
        updatedAt: new Date().toISOString(),
      });

      // Also cancel any pending/cooking orders for today or future
      const todayString = new Date().toISOString().split("T")[0];
      const pendingOrdersSnapshot = await db.collection("orders")
        .where("userId", "==", userId)
        .where("deliveryDate", ">=", todayString)
        .where("status", "in", ["Cooking", "Confirmed"])
        .get();

      if (!pendingOrdersSnapshot.empty) {
        const batch = db.batch();
        pendingOrdersSnapshot.forEach(orderDoc => {
          batch.update(orderDoc.ref, {
            status: "Cancelled",
            updatedAt: new Date().toISOString()
          });
        });
        await batch.commit();
      }

      // Create notification for the user
      const NotificationModel = require("../models/notification.model");
      await NotificationModel.create(userId, {
        type: "subscription_cancelled",
        title: "Subscription Cancelled by Admin",
        message: reason,
        metadata: {
          subscriptionId,
          cancelledBy: "admin",
        },
      });

      // Log activity
      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(userId, {
        type: "cancel",
        action: "admin_cancelled",
        description: `Subscription cancelled by admin - Reason: ${reason}`,
        metadata: { reason, subscriptionId, cancelledBy: "admin" },
      });

      // Invalidate all relevant caches
      cache.delete("admin_all_users");
      cache.delete("admin_all_subscriptions");
      cache.delete("admin_dashboard_stats");
      cache.delete("admin_today_deliveries");
      cache.delete(`user_subscription_${userId}`);
      cache.delete(`user_subscriptions_${userId}`);

      ResponseUtil.send(res, 200, "Subscription cancelled by admin", {
        subscriptionId,
        userId,
        reason,
      });
    } catch (error) {
      console.error("Error admin cancelling subscription:", error);
      ResponseUtil.error(
        res,
        500,
        "Failed to cancel subscription",
        error,
      );
    }
  }

  static async getMenuConfig(req, res) {
    try {
      const MenuModel = require("../models/menu.model");
      const config = await MenuModel.getMenuConfig();
      ResponseUtil.send(res, 200, "Menu configuration retrieved successfully", config);
    } catch (error) {
      console.error("Error retrieving menu config:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve menu config", error);
    }
  }

  static async updateMenuConfig(req, res) {
    try {
      const MenuModel = require("../models/menu.model");
      const newConfig = req.body;
      
      if (!newConfig || !newConfig.plans || !newConfig.weeklyMenus) {
        return ResponseUtil.error(res, 400, "Invalid menu configuration data");
      }

      await MenuModel.updateMenuConfig(newConfig);
      
      // Invalidate cache
      cache.delete("admin_today_deliveries");
      
      ResponseUtil.send(res, 200, "Menu configuration updated successfully", newConfig);
    } catch (error) {
      console.error("Error updating menu config:", error);
      ResponseUtil.error(res, 500, "Failed to update menu config", error);
    }
  }

  static async uploadMenuImage(req, res) {
    try {
      if (!req.file) {
        return ResponseUtil.error(res, 400, "No file uploaded");
      }

      const cloudinary = require("../config/cloudinary.config");
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "menu-sheets",
          resource_type: "image"
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return ResponseUtil.error(res, 500, "Cloudinary upload failed", error);
          }
          ResponseUtil.send(res, 200, "Image uploaded successfully", {
            url: result.secure_url
          });
        }
      );

      uploadStream.end(req.file.buffer);
    } catch (error) {
      console.error("Error in uploadMenuImage:", error);
      ResponseUtil.error(res, 500, "Internal server error during upload", error);
    }
  }

  static async getAllReviews(req, res) {
    try {
      const admin = require("../config/firebase.config");
      const db = admin.firestore();
      
      const snapshot = await db.collection("reviews")
        .orderBy("createdAt", "desc")
        .get();

      const reviews = [];
      snapshot.forEach(doc => {
        reviews.push(doc.data());
      });

      ResponseUtil.send(res, 200, "All reviews retrieved successfully", reviews);
    } catch (error) {
      console.error("Error retrieving reviews:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve reviews", error);
    }
  }

  static async deleteReview(req, res) {
    try {
      const { reviewId } = req.params;
      if (!reviewId) {
        return ResponseUtil.error(res, 400, "Review ID is required");
      }

      const admin = require("../config/firebase.config");
      const db = admin.firestore();

      const docRef = db.collection("reviews").doc(reviewId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return ResponseUtil.error(res, 404, "Review not found");
      }

      await docRef.delete();
      
      ResponseUtil.send(res, 200, "Review deleted successfully", { reviewId });
    } catch (error) {
      console.error("Error deleting review:", error);
      ResponseUtil.error(res, 500, "Failed to delete review", error);
    }
  }
}

module.exports = AdminController;
