const CustomizationModel = require("../models/customization.model");
const ResponseUtil = require("../utils/response.util");
const cache = require("../utils/cache.util");

class CustomizationController {
  /**
   * Save user's meal preferences
   */
  static async savePreferences(req, res) {
    try {
      const { uid: userId } = req.user; // From auth middleware
      const { subscriptionId, preferences } = req.body;

      if (!subscriptionId || !preferences) {
        return ResponseUtil.error(
          res,
          400,
          "subscriptionId and preferences are required",
        );
      }

      // Validate subscription ownership
      const SubscriptionModel = require("../models/subscription.model");
      const doc = await SubscriptionModel.collection.doc(subscriptionId).get();
      if (!doc.exists) {
        return ResponseUtil.error(res, 404, "Subscription not found");
      }
      const sub = doc.data();
      if (sub.userId !== userId) {
        return ResponseUtil.error(res, 403, "Unauthorized access to subscription customizations");
      }

      const customization = await CustomizationModel.savePreferences(
        userId,
        subscriptionId,
        preferences,
      );

      // Log activity
      const ActivityModel = require("../models/activity.model");
      await ActivityModel.logActivity(userId, {
        type: "customization",
        action: "updated",
        description: "Updated meal customization preferences",
        metadata: {
          subscriptionId,
          customizationId: customization.customizationId,
        },
      });

      // Invalidate both potential caches
      cache.delete(`user_customization_${userId}`);
      cache.delete(`sub_customization_${subscriptionId}`);

      ResponseUtil.send(res, 201, "Preferences saved successfully", {
        customization,
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      ResponseUtil.error(res, 500, "Failed to save preferences", error);
    }
  }

  static async getPreferences(req, res) {
    try {
      const { uid: userId } = req.user;
      const { subscriptionId } = req.params;

      // Validate subscription ownership
      const SubscriptionModel = require("../models/subscription.model");
      const doc = await SubscriptionModel.collection.doc(subscriptionId).get();
      if (!doc.exists) {
        return ResponseUtil.error(res, 404, "Subscription not found");
      }
      const sub = doc.data();
      if (sub.userId !== userId) {
        return ResponseUtil.error(res, 403, "Unauthorized access to subscription customizations");
      }

      const cachedCustomization = cache.get(
        `sub_customization_${subscriptionId}`,
      );
      if (cachedCustomization) {
        return ResponseUtil.send(
          res,
          200,
          "Preferences retrieved successfully (cached)",
          {
            customization: cachedCustomization,
          },
        );
      }

      const customization =
        await CustomizationModel.getBySubscription(subscriptionId);

      if (!customization) {
        return ResponseUtil.send(res, 200, "No customizations found", {
          customization: null,
        });
      }

      cache.set(`sub_customization_${subscriptionId}`, customization, 300); // 5 min cache

      ResponseUtil.send(res, 200, "Preferences retrieved successfully", {
        customization,
      });
    } catch (error) {
      console.error("Error getting preferences:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve preferences", error);
    }
  }

  /**
   * Get all user's preferences
   */
  static async getUserPreferences(req, res) {
    try {
      const { uid: userId } = req.user;

      const cachedCustomizations = cache.get(`user_customization_${userId}`);
      if (cachedCustomizations) {
        return ResponseUtil.send(
          res,
          200,
          "User preferences retrieved successfully (cached)",
          {
            customizations: cachedCustomizations,
          },
        );
      }

      const customizations = await CustomizationModel.getByUserId(userId);

      cache.set(`user_customization_${userId}`, customizations, 300); // 5 min cache

      ResponseUtil.send(res, 200, "User preferences retrieved successfully", {
        customizations,
      });
    } catch (error) {
      console.error("Error getting user preferences:", error);
      ResponseUtil.error(
        res,
        500,
        "Failed to retrieve user preferences",
        error,
      );
    }
  }

  static async updateDayPreference(req, res) {
    try {
      const { uid: userId } = req.user;
      const { customizationId } = req.params;
      const { day, preferences } = req.body;

      if (!day || !preferences) {
        return ResponseUtil.error(res, 400, "day and preferences are required");
      }

      // Validate customization document ownership
      const custDoc = await CustomizationModel.collection.doc(customizationId).get();
      if (!custDoc.exists) {
        return ResponseUtil.error(res, 404, "Customization not found");
      }
      const cust = custDoc.data();
      if (cust.userId !== userId) {
        return ResponseUtil.error(res, 403, "Unauthorized access to customization");
      }

      const updated = await CustomizationModel.updateDayPreference(
        customizationId,
        day,
        preferences,
      );

      // Invalidate relevant caches (we'd ideally need userId or subId here to be precise,
      // but if we don't have them easily, we rely on TTL or clear globally if critical.
      // For now, let's assume we can tolerate eventual consistency or the user will reload)
      // To be safe, if we had the subscriptionId in the response or method, we'd clear it.
      // Since CustomizationModel.updateDayPreference likely returns the updated obj with subId:
      if (updated && updated.subscriptionId) {
        cache.delete(`sub_customization_${updated.subscriptionId}`);
        cache.delete(`user_customization_${updated.userId}`);
      }

      ResponseUtil.send(res, 200, "Day preference updated successfully", {
        updated,
      });
    } catch (error) {
      console.error("Error updating day preference:", error);
      ResponseUtil.error(res, 500, "Failed to update day preference", error);
    }
  }

  static async updatePreferences(req, res) {
    try {
      const { uid: userId } = req.user;
      const { customizationId } = req.params;
      const { preferences } = req.body;

      if (!preferences) {
        return ResponseUtil.error(res, 400, "preferences are required");
      }

      // Validate customization document ownership
      const custDoc = await CustomizationModel.collection.doc(customizationId).get();
      if (!custDoc.exists) {
        return ResponseUtil.error(res, 404, "Customization not found");
      }
      const cust = custDoc.data();
      if (cust.userId !== userId) {
        return ResponseUtil.error(res, 403, "Unauthorized access to customization");
      }

      const customization = await CustomizationModel.updatePreferences(
        customizationId,
        preferences,
      );

      if (customization && customization.subscriptionId) {
        cache.delete(`sub_customization_${customization.subscriptionId}`);
        cache.delete(`user_customization_${customization.userId}`);
      }

      ResponseUtil.send(res, 200, "Preferences updated successfully", {
        customization,
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      ResponseUtil.error(res, 500, "Failed to update preferences", error);
    }
  }
}

module.exports = CustomizationController;
