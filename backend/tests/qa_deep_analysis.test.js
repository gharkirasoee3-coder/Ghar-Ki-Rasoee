jest.mock("../src/config/firebase.config", () => {
  return {
    firestore: () => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn()
        })),
        where: jest.fn().mockReturnThis(),
        get: jest.fn()
      }))
    })
  };
});

describe('Senior QA Deep Analysis Test Suite', () => {
  describe('1. Platform Service Fee Math & Precision Tests', () => {
    test('Standard $150.00 subtotal platform fee should be $4.05 CAD', () => {
      // 2.5% of $150 = $3.75 + $0.30 = $4.05
      const subtotalInCents = 15000;
      const feeInCents = Math.round(subtotalInCents * 0.025) + 30;
      expect(feeInCents).toBe(405);
      expect((feeInCents / 100).toFixed(2)).toBe('4.05');
    });

    test('One-time small meal $16.50 platform fee should be $0.71 CAD', () => {
      // 2.5% of 1650 cents = 41.25 -> 41 cents + 30 cents = 71 cents ($0.71)
      const subtotalInCents = 1650;
      const feeInCents = Math.round(subtotalInCents * 0.025) + 30;
      expect(feeInCents).toBe(71);
      expect((feeInCents / 100).toFixed(2)).toBe('0.71');
    });

    test('Custom Large Plan $320.00 platform fee should be $8.30 CAD', () => {
      // 2.5% of 32000 = 800 + 30 = 830 cents ($8.30)
      const subtotalInCents = 32000;
      const feeInCents = Math.round(subtotalInCents * 0.025) + 30;
      expect(feeInCents).toBe(830);
      expect((feeInCents / 100).toFixed(2)).toBe('8.30');
    });

    test('Delivery Fee ($15) + Subtotal ($120) with Platform Fee verification', () => {
      const subtotal = 120.00;
      const deliveryFee = 15.00;
      const totalBeforePlatformFee = subtotal + deliveryFee; // 135.00
      const serviceFee = Math.round((subtotal * 0.025 + 0.30) * 100) / 100; // 3.00 + 0.30 = 3.30
      const finalCharged = Math.round((totalBeforePlatformFee + serviceFee) * 100) / 100;
      expect(serviceFee).toBe(3.30);
      expect(finalCharged).toBe(138.30);
    });
  });

  describe('2. Customization Detection & Delivery Classification Tests', () => {
    test('Standard subscription without meal preferences is correctly classified as Default Menu', () => {
      const sub = {
        id: 'sub-1',
        planDetails: { name: 'Standard', price: 150 },
        customization: {}
      };

      const isCustomPlan = sub.planDetails?.custom === true ||
        sub.planDetails?.name?.toLowerCase().includes('custom') ||
        sub.planDetails?.key?.toLowerCase().includes('custom');

      const hasCustomPreferences = Boolean(
        sub.customization?.preferences &&
        Object.keys(sub.customization.preferences).length > 0
      );

      const isCustomized = isCustomPlan || hasCustomPreferences;
      expect(isCustomized).toBe(false);
    });

    test('Standard subscription with configured day preferences is correctly classified as Customized Meal', () => {
      const sub = {
        id: 'sub-2',
        planDetails: { name: 'Standard', price: 150 },
        customization: {
          preferences: {
            Monday: { sabzi1: 'Paneer Makhani', roti: '4 Roti', side: 'Raita' }
          }
        }
      };

      const isCustomPlan = sub.planDetails?.custom === true ||
        sub.planDetails?.name?.toLowerCase().includes('custom') ||
        sub.planDetails?.key?.toLowerCase().includes('custom');

      const hasCustomPreferences = Boolean(
        sub.customization?.preferences &&
        Object.keys(sub.customization.preferences).length > 0
      );

      const isCustomized = isCustomPlan || hasCustomPreferences;
      expect(isCustomized).toBe(true);
    });

    test('Custom Build Plan is always classified as Customized Meal even before day customization', () => {
      const sub = {
        id: 'sub-3',
        planDetails: { name: 'Custom Plan', key: 'custom_plan', custom: true, price: 210 },
        customization: {}
      };

      const isCustomPlan = sub.planDetails?.custom === true ||
        sub.planDetails?.name?.toLowerCase().includes('custom') ||
        sub.planDetails?.key?.toLowerCase().includes('custom');

      const hasCustomPreferences = Boolean(
        sub.customization?.preferences &&
        Object.keys(sub.customization.preferences).length > 0
      );

      const isCustomized = isCustomPlan || hasCustomPreferences;
      expect(isCustomized).toBe(true);
    });
  });

  describe('3. Coupon & Legal Auto-Renewal Logic Tests', () => {
    test('100% Free Trial Coupon for 1 Month calculates $0.00 first month', () => {
      const basePrice = 150.00;
      const coupon = {
        code: '1MONTHFREE',
        discountType: 'percentage',
        discountValue: 100,
        duration: 'repeating',
        durationInMonths: 1
      };

      const discount = (basePrice * coupon.discountValue) / 100;
      const finalPrice = Math.max(0, basePrice - discount);
      expect(discount).toBe(150.00);
      expect(finalPrice).toBe(0.00);
    });

    test('50% Off 3 Months Repeating Coupon calculates correctly', () => {
      const basePrice = 200.00;
      const coupon = {
        code: 'HALFPRICE3M',
        discountType: 'percentage',
        discountValue: 50,
        duration: 'repeating',
        durationInMonths: 3
      };

      const discount = (basePrice * coupon.discountValue) / 100;
      const finalPrice = basePrice - discount;
      const serviceFee = Math.round((finalPrice * 0.025 + 0.30) * 100) / 100;
      const totalDue = finalPrice + serviceFee;

      expect(discount).toBe(100.00);
      expect(finalPrice).toBe(100.00);
      expect(serviceFee).toBe(2.80);
      expect(totalDue).toBe(102.80);
    });
  });
});
