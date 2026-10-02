const PriceUtil = require("../src/utils/price.util");

describe("subscription delivery fee pricing", () => {
  const perDaySettings = {
    minAmountForFreeDelivery: 150,
    deliveryFee: 15,
    deliveryFeePerSelectedDay: 2.75,
  };

  it.each([
    [["monday"], 2.75],
    [["monday", "wednesday", "friday"], 8.25],
    [["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"], 16.5],
  ])("charges the configured daily rate for %j", (deliveryDays, expectedFee) => {
    expect(PriceUtil.calculateSubscriptionDeliveryFee(
      100,
      perDaySettings,
      deliveryDays,
    )).toBe(expectedFee);
  });

  it("does not let duplicate weekdays inflate the charge", () => {
    expect(PriceUtil.calculateSubscriptionDeliveryFee(
      100,
      perDaySettings,
      ["Monday", "monday", "wednesday", "WEDNESDAY", "friday"],
    )).toBe(8.25);
  });

  it("defaults a missing legacy schedule to six days", () => {
    expect(PriceUtil.calculateSubscriptionDeliveryFee(
      100,
      perDaySettings,
    )).toBe(16.5);
  });

  it("prorates the legacy six-day flat fee without changing its six-day total", () => {
    const legacySettings = {
      minAmountForFreeDelivery: 150,
      deliveryFee: 15,
    };

    expect(PriceUtil.calculateSubscriptionDeliveryFee(
      100,
      legacySettings,
      ["monday"],
    )).toBe(2.5);
    expect(PriceUtil.calculateSubscriptionDeliveryFee(
      100,
      legacySettings,
      ["monday", "wednesday", "friday"],
    )).toBe(7.5);
    expect(PriceUtil.calculateSubscriptionDeliveryFee(
      100,
      legacySettings,
    )).toBe(15);
  });

  it("snapshots a legacy-derived daily rate without cent-rounding drift", () => {
    expect(PriceUtil.getSubscriptionDeliveryFeeRate({ deliveryFee: 25 })).toBe(4.166667);
    expect(PriceUtil.calculateSubscriptionDeliveryFee(
      100,
      { minAmountForFreeDelivery: 150, deliveryFee: 25 },
    )).toBe(25);
  });

  it("keeps free-delivery threshold eligibility based on the base subtotal", () => {
    expect(PriceUtil.calculateSubscriptionDeliveryFee(
      150,
      perDaySettings,
      ["monday", "wednesday", "friday"],
    )).toBe(0);
  });

  it.each([[], ["sunday"], "monday"])(
    "rejects an explicitly invalid schedule: %j",
    (deliveryDays) => {
      expect(() => PriceUtil.calculateSubscriptionDeliveryFee(
        100,
        perDaySettings,
        deliveryDays,
      )).toThrow();
    },
  );

  it("uses the same fee in the canonical COD charge breakdown", () => {
    expect(PriceUtil.calculateChargeBreakdown(
      100,
      0,
      perDaySettings,
      {
        subscriptionDeliveryFee: true,
        deliveryDays: ["monday", "wednesday", "friday"],
      },
    )).toEqual(expect.objectContaining({
      deliveryFee: 8.25,
      totalAmount: 111.05,
    }));
  });

  it("leaves the existing non-subscription breakdown semantics unchanged", () => {
    expect(PriceUtil.calculateChargeBreakdown(100, 0, perDaySettings)).toEqual(
      expect.objectContaining({ deliveryFee: 15, totalAmount: 117.8 }),
    );
  });
});
