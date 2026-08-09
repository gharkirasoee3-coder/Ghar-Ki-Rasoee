const admin = require("../config/firebase.config");
const db = admin.firestore();

class NotificationModel {
  static collection = db.collection("notifications");

  /**
   * Create a notification for a user
   * @param {string} userId - Target user ID
   * @param {object} data - Notification data
   * @returns {Promise<object>} Created notification
   */
  static async create(userId, data) {
    const docRef = this.collection.doc();
    const notification = {
      notificationId: docRef.id,
      userId,
      type: data.type || "info",
      title: data.title || "Notification",
      message: data.message || "",
      read: false,
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
    };

    await docRef.set(notification);
    return notification;
  }

  /**
   * Get all notifications for a user (newest first)
   * @param {string} userId - User ID
   * @param {number} limit - Max notifications to fetch
   * @returns {Promise<Array>} User notifications
   */
  static async getByUserId(userId, limit = 50) {
    const snapshot = await this.collection
      .where("userId", "==", userId)
      .limit(limit)
      .get();

    if (snapshot.empty) return [];

    const notifications = snapshot.docs.map((doc) => doc.data());
    // Sort in memory to avoid composite index requirement
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return notifications;
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId - Notification ID
   */
  static async markAsRead(notificationId) {
    await this.collection.doc(notificationId).update({ read: true });
    return { notificationId, read: true };
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   */
  static async markAllAsRead(userId) {
    const snapshot = await this.collection
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
    return { userId, markedCount: snapshot.size };
  }
}

module.exports = NotificationModel;
