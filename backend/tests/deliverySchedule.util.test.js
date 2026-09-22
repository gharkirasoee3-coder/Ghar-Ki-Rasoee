const DeliveryScheduleUtil = require('../src/utils/deliverySchedule.util');

describe('DeliveryScheduleUtil', () => {
  describe('Standard Monday - Saturday Deliveries (Sunday Off)', () => {
    // Mon 2026-09-21 14:00 (Before 10 PM cutoff)
    it('should schedule next day 8:00 AM when ordered before 10 PM on Monday', () => {
      const orderDate = new Date('2026-09-21T14:00:00'); // Monday 2:00 PM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('tuesday');
      expect(result.deliveryDate).toBe('2026-09-22');
      expect(result.deliveryTime).toBe('8:00 AM');
      expect(result.isAfterCutoff).toBe(false);
    });

    // Mon 2026-09-21 23:00 (After 10 PM cutoff) -> Wednesday 8:00 AM (User's specific example!)
    it('should schedule next-to-next day 8:00 AM when ordered after 10 PM on Monday', () => {
      const orderDate = new Date('2026-09-21T23:00:00'); // Monday 11:00 PM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('wednesday');
      expect(result.deliveryDate).toBe('2026-09-23');
      expect(result.deliveryTime).toBe('8:00 AM');
      expect(result.isAfterCutoff).toBe(true);
    });

    // Exactly at 10 PM cutoff
    it('should treat 10:00 PM (22:00) as after cutoff', () => {
      const orderDate = new Date('2026-09-21T22:00:00'); // Monday 10:00 PM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('wednesday');
      expect(result.deliveryDate).toBe('2026-09-23');
      expect(result.isAfterCutoff).toBe(true);
    });

    // Friday before 10 PM -> Saturday 8:00 AM
    it('should schedule Saturday 8:00 AM when ordered Friday before 10 PM', () => {
      const orderDate = new Date('2026-09-25T15:30:00'); // Friday 3:30 PM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('saturday');
      expect(result.deliveryDate).toBe('2026-09-26');
      expect(result.deliveryTime).toBe('8:00 AM');
    });

    // Friday after 10 PM -> Sunday skipped -> Monday 8:00 AM
    it('should skip Sunday and schedule Monday 8:00 AM when ordered Friday after 10 PM', () => {
      const orderDate = new Date('2026-09-25T22:30:00'); // Friday 10:30 PM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('monday');
      expect(result.deliveryDate).toBe('2026-09-28');
      expect(result.deliveryTime).toBe('8:00 AM');
    });

    // Saturday before 10 PM -> Sunday skipped -> Monday 8:00 AM
    it('should skip Sunday and schedule Monday 8:00 AM when ordered Saturday before 10 PM', () => {
      const orderDate = new Date('2026-09-26T12:00:00'); // Saturday 12:00 PM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('monday');
      expect(result.deliveryDate).toBe('2026-09-28');
      expect(result.deliveryTime).toBe('8:00 AM');
    });

    // Saturday after 10 PM -> Monday 8:00 AM
    it('should schedule Monday 8:00 AM when ordered Saturday after 10 PM', () => {
      const orderDate = new Date('2026-09-26T23:15:00'); // Saturday 11:15 PM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('monday');
      expect(result.deliveryDate).toBe('2026-09-28');
      expect(result.deliveryTime).toBe('8:00 AM');
    });

    // Sunday before 10 PM -> Monday 8:00 AM
    it('should schedule Monday 8:00 AM when ordered Sunday before 10 PM', () => {
      const orderDate = new Date('2026-09-27T10:00:00'); // Sunday 10:00 AM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('monday');
      expect(result.deliveryDate).toBe('2026-09-28');
      expect(result.deliveryTime).toBe('8:00 AM');
    });

    // Sunday after 10 PM -> Tuesday 8:00 AM
    it('should schedule Tuesday 8:00 AM when ordered Sunday after 10 PM', () => {
      const orderDate = new Date('2026-09-27T22:45:00'); // Sunday 10:45 PM
      const result = DeliveryScheduleUtil.getNextDeliveryDate(orderDate);

      expect(result.dayName).toBe('tuesday');
      expect(result.deliveryDate).toBe('2026-09-29');
      expect(result.deliveryTime).toBe('8:00 AM');
    });
  });

  describe('Custom Subscribed Days', () => {
    it('should advance to the next available subscribed day if candidate is not subscribed', () => {
      // User only subscribes on MWF (Monday, Wednesday, Friday)
      const subscribedDays = ['monday', 'wednesday', 'friday'];
      // Order placed Monday 11:00 PM (after 10 PM cutoff) -> Normal candidate is Wednesday -> Subscribed!
      const monOrder = new Date('2026-09-21T23:00:00');
      const monResult = DeliveryScheduleUtil.getNextDeliveryDate(monOrder, subscribedDays);
      expect(monResult.dayName).toBe('wednesday');
      expect(monResult.deliveryDate).toBe('2026-09-23');

      // Order placed Wednesday 11:00 PM (after 10 PM cutoff) -> Normal candidate is Friday -> Subscribed!
      const wedOrder = new Date('2026-09-23T23:00:00');
      const wedResult = DeliveryScheduleUtil.getNextDeliveryDate(wedOrder, subscribedDays);
      expect(wedResult.dayName).toBe('friday');
      expect(wedResult.deliveryDate).toBe('2026-09-25');

      // Order placed Thursday 11:00 PM (after 10 PM cutoff) -> Normal candidate is Saturday (not subscribed), Sunday (off) -> Monday!
      const thuOrder = new Date('2026-09-24T23:00:00');
      const thuResult = DeliveryScheduleUtil.getNextDeliveryDate(thuOrder, subscribedDays);
      expect(thuResult.dayName).toBe('monday');
      expect(thuResult.deliveryDate).toBe('2026-09-28');
    });
  });

  describe('getDeliveryScheduleInfo', () => {
    it('should return correct schedule metadata', () => {
      const info = DeliveryScheduleUtil.getDeliveryScheduleInfo();
      expect(info.deliveryTime).toBe('8:00 AM');
      expect(info.cutoffTime).toBe('10:00 PM');
      expect(info.cutoffHour).toBe(22);
      expect(info.sundayOff).toBe(true);
      expect(info.deliveryDays).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
    });
  });
});
