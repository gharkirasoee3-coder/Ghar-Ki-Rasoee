const admin = require("../config/firebase.config");
const { v4: uuidv4 } = require("uuid");
const db = admin.firestore();

class SubscriptionModel {
  static collection = db.collection("subscriptions");

  static async createSubscription(uid, planData) {
    const subscriptionId = uuidv4();
    const startDate = new Date();
    const duration = planData.duration || 30; // Default 30 days
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + duration);

    const deliveryDays = planData.deliveryDays || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const deliveryDaysCount = Math.round((duration / 7) * deliveryDays.length);

    const newSubscription = {
      subscriptionId,
      userId: uid,
      plan: planData.plan || "Custom Plan",
      planDetails: planData.planDetails || {},
      status: "Active",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      remainingDays: deliveryDaysCount,
      deliveryDays,
      skippedDates: [],
      preferences: {
        defaultMeal: "Veg", // Default preference
      },
      deliveryAddress: planData.deliveryAddress || "",
      paymentMethod: planData.paymentMethod || "Online",
      paymentStatus: planData.paymentStatus || "Paid",
      stripeSessionId: planData.stripeSessionId || null,
      stripeSubscriptionId: planData.stripeSubscriptionId || null,
      couponCode: planData.couponCode || null,
      isRecurring: planData.isRecurring === true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.collection.doc(subscriptionId).set(newSubscription);
    return newSubscription;
  }

  static async getActiveUserSubscriptions(uid) {
    const snapshot = await this.collection
      .where("userId", "==", uid)
      .where("status", "==", "Active")
      .get();

    if (snapshot.empty) return [];

    const subscriptions = snapshot.docs.map(doc => doc.data());
    const now = new Date();
    let updated = false;

    for (const sub of subscriptions) {
      if (sub.endDate) {
        const endDate = new Date(sub.endDate);
        if (endDate < now) {
          sub.status = "Expired";
          sub.updatedAt = new Date().toISOString();
          await this.collection.doc(sub.subscriptionId).update({
            status: "Expired",
            updatedAt: sub.updatedAt
          });
          updated = true;
        }
      }
    }

    const activeSubscriptions = updated 
      ? subscriptions.filter(sub => sub.status === "Active")
      : subscriptions;

    activeSubscriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return activeSubscriptions;
  }

  static async getUserSubscription(uid) {
    const snapshot = await this.collection
      .where("userId", "==", uid)
      .get();

    if (snapshot.empty) return null;

    // Get all subscriptions and sort by createdAt descending to find the latest
    const subscriptions = snapshot.docs.map(doc => doc.data());
    subscriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const latestSub = subscriptions[0];

    // Check if it's active but the end date has passed
    if (latestSub.status === "Active" && latestSub.endDate) {
      // Set to start of today for comparison, or direct timestamp? 
      // A direct timestamp comparison works if endDate is an ISO string of the exact expiry time.
      const endDate = new Date(latestSub.endDate);
      const now = new Date();
      
      if (endDate < now) {
        // It has expired. Update database.
        latestSub.status = "Expired";
        latestSub.updatedAt = new Date().toISOString();
        
        await this.collection.doc(latestSub.subscriptionId).update({
          status: "Expired",
          updatedAt: latestSub.updatedAt
        });
      }
    }

    return latestSub;
  }

  static async skipDate(subscriptionId, date, currentEndDate) {
    if (!subscriptionId) throw new Error("Subscription ID is required");

    const updates = {
      skippedDates: admin.firestore.FieldValue.arrayUnion(date),
      updatedAt: new Date().toISOString(),
    };

    // If endDate is provided, extend it by 1 day
    if (currentEndDate) {
      const endDate = new Date(currentEndDate);
      if (!isNaN(endDate.getTime())) {
        endDate.setDate(endDate.getDate() + 1);
        updates.endDate = endDate.toISOString();
      }
    }

    // Also increment remainingDays if it exists
    updates.remainingDays = admin.firestore.FieldValue.increment(1);

    await this.collection.doc(subscriptionId).update(updates);

    return { subscriptionId, skippedDate: date, newEndDate: updates.endDate };
  }
  static async getAllSubscriptions() {
    const snapshot = await this.collection.orderBy("createdAt", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
}

module.exports = SubscriptionModel;
