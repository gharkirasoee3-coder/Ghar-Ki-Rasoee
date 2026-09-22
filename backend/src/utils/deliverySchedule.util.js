/**
 * Delivery Schedule Utility
 * 
 * Rules:
 * - Delivery Time: 8:00 AM
 * - Delivery Days: Monday – Saturday
 * - Sunday: OFF (No deliveries)
 * - Cutoff Time: 10:00 PM (22:00)
 *   - Orders placed BEFORE 10:00 PM (hour < 22) -> Next delivery day (D+1, skipping Sunday) at 8:00 AM
 *   - Orders placed AT OR AFTER 10:00 PM (hour >= 22) -> Next-to-next delivery day (D+2, skipping Sunday) at 8:00 AM
 */

class DeliveryScheduleUtil {
  static CUTOFF_HOUR = 22; // 10:00 PM
  static DELIVERY_TIME = "8:00 AM";
  static DELIVERY_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  /**
   * Get the next scheduled delivery date based on order timestamp and 10 PM cutoff
   * @param {Date|string|number} orderDate - The timestamp when order is placed
   * @param {string[]} [subscribedDays] - Optional array of subscribed delivery days (e.g. ['monday', 'wednesday', 'friday'])
   * @returns {Object} Delivery schedule calculation result
   */
  static getNextDeliveryDate(orderDate = new Date(), subscribedDays = null) {
    const dateObj = new Date(orderDate);
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

    const currentHour = validDate.getHours();
    const isAfterCutoff = currentHour >= this.CUTOFF_HOUR;

    // Determine candidate days to advance from current date:
    // If before 10 PM -> advance 1 day (Tomorrow)
    // If at or after 10 PM -> advance 2 days (Day after tomorrow)
    const daysToAdvance = isAfterCutoff ? 2 : 1;

    const candidate = new Date(validDate);
    candidate.setDate(candidate.getDate() + daysToAdvance);

    const normalizedSubscribedDays = Array.isArray(subscribedDays) && subscribedDays.length > 0
      ? subscribedDays.map(d => String(d).toLowerCase().trim())
      : this.DELIVERY_DAYS;

    const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    // Ensure candidate date is not Sunday and is within allowed delivery days
    let safetyCounter = 0;
    while (safetyCounter < 14) {
      const dayName = weekdayNames[candidate.getDay()];
      const isSunday = candidate.getDay() === 0;
      const isAllowedDay = normalizedSubscribedDays.includes(dayName);

      if (!isSunday && isAllowedDay) {
        break;
      }
      // Advance to next day
      candidate.setDate(candidate.getDate() + 1);
      safetyCounter++;
    }

    const year = candidate.getFullYear();
    const month = String(candidate.getMonth() + 1).padStart(2, "0");
    const day = String(candidate.getDate()).padStart(2, "0");
    const deliveryDateStr = `${year}-${month}-${day}`;
    const dayName = weekdayNames[candidate.getDay()];

    const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = `${dayNameCapitalized}, ${monthNames[candidate.getMonth()]} ${candidate.getDate()}`;

    return {
      deliveryDate: deliveryDateStr,
      dayName,
      dayNameCapitalized,
      formattedDate,
      deliveryTime: this.DELIVERY_TIME,
      isAfterCutoff,
      cutoffTime: "10:00 PM",
      fullScheduleText: `${formattedDate} at ${this.DELIVERY_TIME}`
    };
  }

  /**
   * Get service delivery info metadata
   */
  static getDeliveryScheduleInfo() {
    return {
      deliveryTime: this.DELIVERY_TIME,
      cutoffTime: "10:00 PM",
      cutoffHour: this.CUTOFF_HOUR,
      deliveryDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      sundayOff: true,
      description: "Orders placed before 10:00 PM are delivered next scheduled day at 8:00 AM. Orders after 10:00 PM are delivered the following scheduled day at 8:00 AM. Sundays are off."
    };
  }
}

module.exports = DeliveryScheduleUtil;
