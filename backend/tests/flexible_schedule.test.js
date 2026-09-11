jest.mock("uuid", () => ({
  v4: () => "mock-uuid-v4",
}));

jest.mock("../src/config/firebase.config", () => {
  const mAdd = jest.fn();
  const mUpdate = jest.fn();
  const mSet = jest.fn();
  const mDoc = jest.fn(() => ({
    set: mSet,
    update: mUpdate,
  }));
  const mCollection = jest.fn(() => ({
    doc: mDoc,
    add: mAdd,
  }));
  return {
    firestore: () => ({
      collection: mCollection,
    }),
    _mocks: {
      mockAdd: mAdd,
      mockUpdate: mUpdate,
      mockSet: mSet,
      mockDoc: mDoc,
      mockCollection: mCollection,
    }
  };
});

const MenuModel = require("../src/models/menu.model");
const SubscriptionModel = require("../src/models/subscription.model");
const admin = require("../src/config/firebase.config");

const { mockSet } = admin._mocks;

describe("Flexible Subscription Scheduling & Pricing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("MenuModel.calculateCustomPrice", () => {
    const mockConfig = {
      customPricingConfig: {
        basePrice: 100,
        pricePerRoti: 5,
        pricePerSabzi: 20,
        raitaPrice3Days: 10,
        raitaPriceDaily: 20,
        dessertPriceWeekly: 10,
        dessertPriceDaily: 30,
        saturdaySpecialPrice: 15
      }
    };

    it("should calculate standard custom price for 6 delivery days (scale = 1.0)", () => {
      const customDetails = {
        roti: 6,
        sabziChoices: 2,
        raitaOption: "daily",
        dessertOption: "none",
        saturdaySpecial: false,
        deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      };

      const price = MenuModel.calculateCustomPrice(customDetails, mockConfig);
      expect(price).toBeCloseTo(190);
    });

    it("should calculate standard custom price pro-rated for 3 delivery days (scale = 0.5)", () => {
      const customDetails = {
        roti: 6,
        sabziChoices: 2,
        raitaOption: "daily",
        dessertOption: "none",
        saturdaySpecial: false,
        deliveryDays: ["monday", "wednesday", "friday"],
      };

      const price = MenuModel.calculateCustomPrice(customDetails, mockConfig);
      expect(price).toBeCloseTo(95);
    });

    it("should fallback to 6/6 scale if deliveryDays is missing or empty", () => {
      const customDetailsMissing = {
        roti: 6,
        sabziChoices: 2,
        raitaOption: "daily",
        dessertOption: "none",
        saturdaySpecial: false,
      };

      const customDetailsEmpty = {
        roti: 6,
        sabziChoices: 2,
        raitaOption: "daily",
        dessertOption: "none",
        saturdaySpecial: false,
        deliveryDays: [],
      };

      const priceMissing = MenuModel.calculateCustomPrice(customDetailsMissing, mockConfig);
      const priceEmpty = MenuModel.calculateCustomPrice(customDetailsEmpty, mockConfig);

      expect(priceMissing).toBeCloseTo(190);
      expect(priceEmpty).toBeCloseTo(190);
    });

    it("should fallback to base plan pricing defaults if customDetails has a basePlan", () => {
      const customDetails = {
        basePlan: "Basic",
        deliveryDays: ["monday", "wednesday", "friday"], // 3 days (scale = 0.5)
      };
      
      const mockConfigWithPlans = {
        customPricingConfig: mockConfig.customPricingConfig,
        plans: {
          basic: { price: 100 }
        }
      };

      const price = MenuModel.calculateCustomPrice(customDetails, mockConfigWithPlans);
      expect(price).toBeCloseTo(50);
    });

    it("should calculate $0 sabzi addon when sabziChoices is 0 (no sabzi plan)", () => {
      const customDetails = {
        roti: 6,
        sabziChoices: 0,
        raitaOption: "daily",
        dessertOption: "none",
        saturdaySpecial: false,
        deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      };

      const price = MenuModel.calculateCustomPrice(customDetails, mockConfig);
      // base $100 + roti 6*$5=$30 + sabzi 0*$20=$0 + raita daily $20 + dessert $0 + sat $0 = $150
      expect(price).toBeCloseTo(150);
    });

    it("should handle roti count of 40 correctly with linear scaling", () => {
      const customDetails = {
        roti: 40,
        sabziChoices: 1,
        raitaOption: "none",
        dessertOption: "none",
        saturdaySpecial: false,
        deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      };

      const price = MenuModel.calculateCustomPrice(customDetails, mockConfig);
      // base $100 + roti 40*$5=$200 + sabzi 1*$20=$20 + raita $0 + dessert $0 + sat $0 = $320
      expect(price).toBeCloseTo(320);
    });

    it("should handle single delivery day (minimum) with correct pro-ration", () => {
      const customDetails = {
        roti: 6,
        sabziChoices: 2,
        raitaOption: "daily",
        dessertOption: "none",
        saturdaySpecial: false,
        deliveryDays: ["saturday"], // 1 day only
      };

      const price = MenuModel.calculateCustomPrice(customDetails, mockConfig);
      // Full price = base $100 + roti $30 + sabzi $40 + raita $20 = $190
      // Pro-rated: $190 * (1/6) ≈ $31.67
      expect(price).toBeCloseTo(190 * (1 / 6));
    });
  });

  describe("SubscriptionModel.createSubscription", () => {
    it("should set remainingDays to 24 and store all 6 delivery days by default", async () => {
      const data = {
        plan: "Premium",
        price: 249,
        duration: 28,
      };

      const result = await SubscriptionModel.createSubscription("user-1", data);

      expect(result.subscriptionId).toBe("mock-uuid-v4");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          remainingDays: 24,
          deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        })
      );
    });

    it("should set remainingDays proportionally based on custom delivery days", async () => {
      const data = {
        plan: "Custom Plan",
        price: 124.5,
        duration: 28,
        deliveryDays: ["monday", "wednesday", "friday"], // 3 days
      };

      const result = await SubscriptionModel.createSubscription("user-1", data);

      expect(result.subscriptionId).toBe("mock-uuid-v4");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          remainingDays: 12, // (28 / 7) * 3 = 12 days
          deliveryDays: ["monday", "wednesday", "friday"],
        })
      );
    });
  });
});
