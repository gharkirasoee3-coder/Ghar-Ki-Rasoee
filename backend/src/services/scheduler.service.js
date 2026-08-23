const SubscriptionModel = require("../models/subscription.model");
const OrderModel = require("../models/order.model");
const admin = require("../config/firebase.config");
const db = admin.firestore();

class SchedulerService {
  static async generateDailyOrders() {
    console.log("Starting Daily Order Generation...");
    const today = new Date();
    // Normalize today to YYYY-MM-DD for comparison
    const todayString = today.toISOString().split("T")[0];

    try {
      // 1. Get all Active Subscriptions
      const subscriptionsSnapshot = await SubscriptionModel.collection
        .where("status", "==", "Active")
        .get();

      if (subscriptionsSnapshot.empty) {
        console.log("No active subscriptions found.");
        return;
      }

      console.log(`Found ${subscriptionsSnapshot.size} active subscriptions.`);

      // 2. Process each subscription
      const batchPromises = subscriptionsSnapshot.docs.map(async (doc) => {
        const sub = doc.data();

        // Fetch User details for address
        const userDoc = await db.collection("users").doc(sub.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        // Check if today is skipped
        if (sub.skippedDates && sub.skippedDates.includes(todayString)) {
          console.log(`Skipping order for user ${sub.userId} (Date Skipped)`);
          return;
        }

        // Check if remaining days > 0
        if (sub.remainingDays <= 0) {
          console.log(`Subscription expired for user ${sub.userId}`);
          // Optionally auto-expire here
          await SubscriptionModel.collection
            .doc(sub.subscriptionId)
            .update({ status: "Expired" });
          return;
        }

        // Prevent duplicate daily orders for this subscription
        const existingOrderSnapshot = await db.collection("orders")
            .where("subscriptionId", "==", sub.subscriptionId)
            .where("deliveryDate", "==", todayString)
            .where("generatedByScheduler", "==", true)
            .limit(1)
            .get();

        if (!existingOrderSnapshot.empty) {
            console.log(`Order already generated for subscription ${sub.subscriptionId} today.`);
            return;
        }

        // Resolve actual meal contents for the day
        const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(today).toLowerCase();
        
        // Skip Sundays
        if (dayName === "sunday") {
           console.log(`Skipping order for user ${sub.userId} (Sunday)`);
           return;
        }

        // Skip if not a scheduled delivery day for this subscription
        if (sub.deliveryDays && !sub.deliveryDays.includes(dayName)) {
          console.log(`Skipping order for user ${sub.userId} today (not a scheduled delivery day: ${dayName})`);
          return;
        }

        const CustomizationModel = require("../models/customization.model");
        const MenuModel = require("../models/menu.model");
        const customization = await CustomizationModel.getBySubscription(sub.subscriptionId);
        let todayPreference = customization?.preferences ? customization.preferences[dayName] : null;

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

        // Clean up empty fields
        Object.keys(finalPreference).forEach(key => {
          if (finalPreference[key] === null || finalPreference[key] === undefined || finalPreference[key] === '') {
            delete finalPreference[key];
          }
        });

        // If nothing was resolved, fallback to a default label
        if (Object.keys(finalPreference).length === 0) {
          finalPreference = { meal: `Default ${sub.plan} Menu` };
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

        // Create the Daily Order
        const orderData = {
          userId: sub.userId,
          subscriptionId: sub.subscriptionId,
          customerName:
            userData.displayName || userData.email || "Unknown Customer",
          deliveryAddress:
            sub.deliveryAddress || userData.address || "No Address Provided",
          orderType: "Subscription",
          plan: sub.plan, // e.g. "Weekly Plan"
          items: finalPreference, // Store the exact meal items!
          price: 0, // Already paid via subscription
          deliveryDate: todayString,
          paymentMethod: "Prepaid (Subscription)",
          paymentStatus: "Paid",
          status: "Cooking", // Auto-set to cooking for the day
          generatedByScheduler: true,
        };

        await OrderModel.createOrder(orderData);

        // Decrement remaining days
        await SubscriptionModel.collection.doc(sub.subscriptionId).update({
          remainingDays: admin.firestore.FieldValue.increment(-1),
        });

        console.log(`Generated order for user ${sub.userId}`);
      });

      await Promise.all(batchPromises);
      console.log("Daily Order Generation Completed.");
    } catch (error) {
      console.error("Error in generateDailyOrders:", error);
    }
  }
}

module.exports = SchedulerService;
