const ActivityModel = require("../models/activity.model");
const ResponseUtil = require("../utils/response.util");

class ActivityController {
  /**
   * Get user activity history
   */
  static async getUserActivities(req, res) {
    try {
      const { uid } = req.user;
      const { limit, type } = req.query;
      console.log(
        `GET activities request for uid: ${uid}, limit: ${limit}, type: ${type}`,
      );

      let activities;
      if (type) {
        activities = await ActivityModel.getUserActivitiesByType(
          uid,
          type,
          parseInt(limit) || 20,
        );
      } else {
        activities = await ActivityModel.getUserActivities(
          uid,
          parseInt(limit) || 50,
        );
      }

      ResponseUtil.send(
        res,
        200,
        "Activities fetched successfully",
        activities,
      );
    } catch (error) {
      console.error("Error fetching activities:", error);
      ResponseUtil.error(res, 500, "Failed to fetch activities", error);
    }
  }

  /**
   * Log a new activity (usually called internally by other controllers)
   */
  static async logActivity(req, res) {
    try {
      const { uid } = req.user;
      const activityData = req.body;

      const activity = await ActivityModel.logActivity(uid, activityData);
      ResponseUtil.send(res, 201, "Activity logged", activity);
    } catch (error) {
      console.error("Error logging activity:", error);
      ResponseUtil.error(res, 500, "Failed to log activity", error);
    }
  }
}

module.exports = ActivityController;
