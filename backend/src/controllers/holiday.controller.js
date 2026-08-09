const admin = require("../config/firebase.config");
const ResponseUtil = require("../utils/response.util");

class HolidayController {
  static async getAllHolidays(req, res) {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection("holidays")
        .orderBy("startDate", "asc")
        .get();

      const holidays = [];
      snapshot.forEach(doc => {
        holidays.push(doc.data());
      });

      ResponseUtil.send(res, 200, "Holidays retrieved successfully", holidays);
    } catch (error) {
      console.error("Error retrieving holidays:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve holidays", error);
    }
  }

  static async createHoliday(req, res) {
    try {
      const { startDate, endDate, description } = req.body;
      if (!startDate || !endDate || !description) {
        return ResponseUtil.error(res, 400, "Start date, end date, and description are required");
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return ResponseUtil.error(res, 400, "Invalid start or end date format");
      }

      if (end < start) {
        return ResponseUtil.error(res, 400, "End date cannot be before start date");
      }

      // Calculate number of holiday days
      const diffTime = Math.abs(end - start);
      const numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const db = admin.firestore();
      const holidayId = db.collection("holidays").doc().id;

      const holidayData = {
        id: holidayId,
        startDate,
        endDate,
        description,
        numDays,
        createdAt: new Date().toISOString()
      };

      // Save holiday
      await db.collection("holidays").doc(holidayId).set(holidayData);

      // Now scan and extend all Active subscriptions
      const subscriptionsSnapshot = await db.collection("subscriptions")
        .where("status", "==", "Active")
        .get();

      const batch = db.batch();
      let extendedCount = 0;

      subscriptionsSnapshot.forEach(doc => {
        const sub = doc.data();
        const processedHolidays = sub.processedHolidays || [];

        if (!processedHolidays.includes(holidayId)) {
          // Calculate new end date
          const currentEndDate = new Date(sub.endDate);
          currentEndDate.setUTCDate(currentEndDate.getUTCDate() + numDays);

          const updatedProcessed = [...processedHolidays, holidayId];
          const remainingDays = (sub.remainingDays || 0) + numDays;

          const docRef = db.collection("subscriptions").doc(sub.subscriptionId);
          batch.update(docRef, {
            endDate: currentEndDate.toISOString(),
            remainingDays,
            processedHolidays: updatedProcessed,
            updatedAt: new Date().toISOString()
          });
          extendedCount++;
        }
      });

      if (extendedCount > 0) {
        await batch.commit();
      }

      ResponseUtil.send(res, 200, `Holiday scheduled successfully. Extended ${extendedCount} subscriptions by ${numDays} days.`, holidayData);
    } catch (error) {
      console.error("Error creating holiday:", error);
      ResponseUtil.error(res, 500, "Failed to create holiday", error);
    }
  }

  static async deleteHoliday(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return ResponseUtil.error(res, 400, "Holiday ID is required");
      }

      const db = admin.firestore();
      const docRef = db.collection("holidays").doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return ResponseUtil.error(res, 404, "Holiday not found");
      }

      await docRef.delete();

      ResponseUtil.send(res, 200, "Holiday cancelled successfully", { id });
    } catch (error) {
      console.error("Error deleting holiday:", error);
      ResponseUtil.error(res, 500, "Failed to delete holiday", error);
    }
  }
}

module.exports = HolidayController;
