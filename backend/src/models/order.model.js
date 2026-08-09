const admin = require("../config/firebase.config");
const db = admin.firestore();
const { v4: uuidv4 } = require("uuid");

class OrderModel {
  static collection = db.collection("orders");

  static async createOrder(orderData) {
    const orderId = uuidv4();
    const newOrder = {
      orderId,
      ...orderData,
      paymentMethod: orderData.paymentMethod || "Online", // Default to Online if not provided
      status: "Confirmed", // Default status
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.collection.doc(orderId).set(newOrder);
    return newOrder;
  }

  static async getUserOrders(userId) {
    const snapshot = await this.collection
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }

  static async getAllOrders() {
    const [ordersSnapshot, subscriptionsSnapshot] = await Promise.all([
      this.collection.get(),
      db.collection("subscriptions").get()
    ]);

    const rawOrders = ordersSnapshot.docs.map((doc) => ({
      orderId: doc.id,
      ...doc.data(),
    }));

    const rawSubscriptions = subscriptionsSnapshot.docs.map((doc) => doc.data());

    // Collect all unique userIds
    const userIds = [
      ...new Set([
        ...rawOrders.map((o) => o.userId).filter(Boolean),
        ...rawSubscriptions.map((s) => s.userId).filter(Boolean)
      ])
    ];

    // Fetch user details for all involved user IDs
    const userDocs = await Promise.all(
      userIds.map((id) => db.collection("users").doc(id).get())
    );

    const userMap = {};
    userDocs.forEach((doc) => {
      if (doc.exists) userMap[doc.id] = doc.data();
    });

    // Map rawOrders
    const mappedOrders = rawOrders.map((order) => {
      const user = userMap[order.userId] || {};
      return {
        ...order,
        customerName:
          order.customerName ||
          user.name ||
          user.displayName ||
          user.email ||
          "Unknown Customer",
        customerPhone:
          order.customerPhone ||
          user.phone ||
          "N/A",
        deliveryAddress:
          order.deliveryAddress ||
          user.address ||
          "No Address Provided",
      };
    });

    // Map rawSubscriptions to order-like objects
    const mappedSubOrders = rawSubscriptions.map((sub) => {
      const user = userMap[sub.userId] || {};
      const planPrice = sub.planDetails?.price || sub.price || 0;
      
      let status = "Confirmed";
      if (sub.status === "Cancelled") status = "Cancelled";
      else if (sub.status === "Expired") status = "Cancelled";

      return {
        orderId: sub.subscriptionId,
        userId: sub.userId,
        customerName:
          user.name ||
          user.displayName ||
          user.email ||
          "Unknown Customer",
        customerPhone:
          user.phone ||
          "N/A",
        deliveryAddress:
          sub.deliveryAddress ||
          user.address ||
          "No Address Provided",
        orderType: "Subscription",
        plan: sub.plan,
        items: [
          {
            name: `${sub.plan} Subscription`,
            quantity: 1,
            price: planPrice,
          }
        ],
        price: planPrice,
        deliveryDate: sub.startDate ? sub.startDate.split("T")[0] : "",
        paymentMethod: sub.paymentMethod || "Online",
        paymentStatus: sub.paymentStatus || "Paid",
        status: status,
        createdAt: sub.createdAt || sub.startDate || new Date().toISOString(),
        updatedAt: sub.updatedAt || new Date().toISOString(),
      };
    });

    // Combine both lists and sort by createdAt descending
    const allCombined = [...mappedOrders, ...mappedSubOrders];
    allCombined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allCombined;
  }

  static async getOrderById(orderId) {
    const doc = await this.collection.doc(orderId).get();
    if (!doc.exists) return null;
    return doc.data();
  }

  static async updateStatus(orderId, status) {
    const docRef = this.collection.doc(orderId);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.update({
        status,
        updatedAt: new Date().toISOString(),
      });
      return { orderId, status };
    } else {
      const subRef = db.collection("subscriptions").doc(orderId);
      const subDoc = await subRef.get();
      if (subDoc.exists) {
        let subStatus = "Active";
        if (status === "Cancelled") {
          subStatus = "Cancelled";
        }
        await subRef.update({
          status: subStatus,
          updatedAt: new Date().toISOString(),
        });
        return { orderId, status };
      }
    }
    throw new Error("Document not found");
  }

  static async updatePaymentStatus(orderId, paymentStatus) {
    const docRef = this.collection.doc(orderId);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.update({
        paymentStatus,
        updatedAt: new Date().toISOString(),
      });
      return { orderId, paymentStatus };
    } else {
      const subRef = db.collection("subscriptions").doc(orderId);
      const subDoc = await subRef.get();
      if (subDoc.exists) {
        await subRef.update({
          paymentStatus,
          updatedAt: new Date().toISOString(),
        });
        return { orderId, paymentStatus };
      }
    }
    throw new Error("Document not found");
  }
}

module.exports = OrderModel;
