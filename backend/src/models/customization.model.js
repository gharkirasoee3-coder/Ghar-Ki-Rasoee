const admin = require("../config/firebase.config");
const db = admin.firestore();

class CustomizationModel {
  static collection = db.collection("customizations");

  /**
   * Save user's meal preferences
   * @param {string} userId - User ID
   * @param {string} subscriptionId - Associated subscription ID
   * @param {object} preferences - Weekly meal customizations
   */
  static async savePreferences(userId, subscriptionId, preferences) {
    const existing = await this.getBySubscription(subscriptionId);
    if (existing) {
      const updateData = {
        preferences,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (!existing.userId && userId) {
        updateData.userId = userId;
      }
      await this.collection.doc(existing.customizationId).update(updateData);
      const doc = await this.collection.doc(existing.customizationId).get();
      return { customizationId: doc.id, ...doc.data() };
    }

    const customizationData = {
      userId,
      subscriptionId,
      preferences, // { monday: { sabzi1: "...", sabzi2: "..." }, ... }
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await this.collection.add(customizationData);
    return { customizationId: docRef.id, ...customizationData };
  }

  /**
   * Get user's preferences for a subscription
   */
  static async getBySubscription(subscriptionId) {
    const snapshot = await this.collection
      .where("subscriptionId", "==", subscriptionId)
      .get();

    if (snapshot.empty) return null;

    const docs = snapshot.docs.map((doc) => ({
      customizationId: doc.id,
      ...doc.data(),
    }));

    const getTimestampMs = (val) => {
      if (!val) return 0;
      if (val.toMillis) return val.toMillis();
      if (val.toDate) return val.toDate().getTime();
      if (typeof val === "string") return new Date(val).getTime();
      if (typeof val === "number") return val;
      if (val instanceof Date) return val.getTime();
      return 0;
    };

    docs.sort((a, b) => {
      const timeA = getTimestampMs(a.updatedAt || a.createdAt);
      const timeB = getTimestampMs(b.updatedAt || b.createdAt);
      return timeB - timeA;
    });

    return docs[0];
  }

  /**
   * Get user's preferences by user ID
   */
  static async getByUserId(userId) {
    const snapshot = await this.collection.where("userId", "==", userId).get();
    const docs = snapshot.docs.map((doc) => ({
      customizationId: doc.id,
      ...doc.data(),
    }));

    const getTimestampMs = (val) => {
      if (!val) return 0;
      if (val.toMillis) return val.toMillis();
      if (val.toDate) return val.toDate().getTime();
      if (typeof val === "string") return new Date(val).getTime();
      if (typeof val === "number") return val;
      if (val instanceof Date) return val.getTime();
      return 0;
    };

    const latestBySub = {};
    for (const doc of docs) {
      const subId = doc.subscriptionId;
      if (!subId) continue;
      const existing = latestBySub[subId];
      if (!existing) {
        latestBySub[subId] = doc;
      } else {
        const timeExisting = getTimestampMs(existing.updatedAt || existing.createdAt);
        const timeDoc = getTimestampMs(doc.updatedAt || doc.createdAt);
        if (timeDoc > timeExisting) {
          latestBySub[subId] = doc;
        }
      }
    }

    const latestDocs = Object.values(latestBySub);
    return latestDocs.length > 0 ? latestDocs[0] : null;
  }

  /**
   * Update day preference
   */
  static async updateDayPreference(customizationId, day, dayPreferences) {
    const updateData = {
      [`preferences.${day}`]: dayPreferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await this.collection.doc(customizationId).update(updateData);
    return { customizationId, day, ...dayPreferences };
  }

  /**
   * Update entire preferences
   */
  static async updatePreferences(customizationId, preferences) {
    const updateData = {
      preferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await this.collection.doc(customizationId).update(updateData);
    const doc = await this.collection.doc(customizationId).get();
    return { customizationId: doc.id, ...doc.data() };
  }
}

module.exports = CustomizationModel;
