jest.unmock("../src/models/menu.model");
jest.mock("../src/config/firebase.config", () => {
  const mockGet = jest.fn();
  const mockUpdate = jest.fn();
  const mockSet = jest.fn();
  const mockDoc = jest.fn(() => ({
    get: mockGet,
    update: mockUpdate,
    set: mockSet,
    id: "mock-id",
  }));
  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    where: jest.fn().mockReturnThis(),
    get: jest.fn(),
  }));
  return {
    firestore: () => ({
      collection: mockCollection,
    }),
    _mocks: {
      mockGet,
      mockUpdate,
      mockSet,
      mockDoc,
      mockCollection,
    }
  };
});

const admin = require("../src/config/firebase.config");
const { mockGet, mockCollection, mockUpdate, mockSet } = admin._mocks;

const PaymentController = require("../src/controllers/payment.controller");
const OrderController = require("../src/controllers/order.controller");
const SubscriptionController = require("../src/controllers/subscription.controller");
const MenuModel = require("../src/models/menu.model");
const StripeService = require("../src/services/stripe.service");
const ResponseUtil = require("../src/utils/response.util");

// Mock Models & Services
jest.mock("../src/models/subscription.model", () => ({
  getUserSubscription: jest.fn(),
  getActiveUserSubscriptions: jest.fn().mockResolvedValue([]),
  createSubscription: jest.fn(),
  collection: {
    doc: jest.fn(),
  },
}));

jest.mock("../src/models/order.model", () => ({
  createOrder: jest.fn(),
}));

jest.mock("../src/models/coupon.model", () => ({
  getCoupon: jest.fn(),
  incrementUsage: jest.fn(),
}));

jest.mock("../src/models/activity.model", () => ({
  logActivity: jest.fn(),
}));

jest.mock("../src/services/stripe.service", () => ({
  createCheckoutSession: jest.fn(),
  createCustomer: jest.fn().mockResolvedValue({ id: "cus_mock" }),
  cancelSubscription: jest.fn(),
}));

jest.mock("../src/utils/response.util", () => ({
  send: jest.fn(),
  error: jest.fn(),
}));

describe("Dynamic Delivery Fees Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    MenuModel.clearCache();
    req = {
      user: { uid: "user-1", email: "test@example.com" },
      body: {},
      headers: { origin: "http://localhost:5173" },
    };
    res = {};

    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ displayName: "John Doe", email: "test@example.com" }),
    });
    mockUpdate.mockResolvedValue(true);
    mockSet.mockResolvedValue(true);
  });

  describe("MenuModel Delivery Settings Default Fallbacks", () => {
    it("should fallback to default deliveryFeeSettings if Firestore is missing it", async () => {
      // Setup mockGet to return menu config without delivery settings
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          plans: {},
          customPricingConfig: {},
        }),
      });

      const config = await MenuModel.getMenuConfig();
      expect(config.deliveryFeeSettings).toEqual({
        minAmountForFreeDelivery: 150,
        deliveryFee: 15,
      });
    });
  });

  describe("Stripe Checkout Session Delivery Fee Injection", () => {
    it("should append a recurring delivery fee line item if subscription is below threshold", async () => {
      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess_123", url: "https://stripe.com" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        type: "subscription",
        planName: "Basic",
        amount: 100, // below 150
        deliveryAddress: "123 Main St",
        isRecurring: true,
      };

      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          deliveryFee: 15,
        })
      );
    });

    it("should not append delivery fee if subscription amount is at or above threshold", async () => {
      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess_123", url: "https://stripe.com" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        type: "subscription",
        planName: "Premium",
        amount: 200, // above 150
        deliveryAddress: "123 Main St",
        isRecurring: true,
      };

      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 200,
          deliveryFee: 0,
        })
      );
    });
  });

  describe("COD One-Time Order Full Fees (OrderController)", () => {
    it("should include configured delivery and platform fees below the free-delivery threshold", async () => {
      const OrderModel = require("../src/models/order.model");
      OrderModel.createOrder.mockResolvedValue({ orderId: "ord_123" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          customPricingConfig: { oneTimeBasePrice: 20, oneTimeBaseRoti: 8, oneTimeBaseSabzi: 2 },
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        orderType: "one-time",
        plan: "Single Meal",
        items: [{ price: 20, quantity: 1 }],
        customDetails: { rotiCount: 8, sabziBoxes: 2 },
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      // $20 subtotal + $15 delivery + ($20 * 2.5% + $0.30) platform fee.
      expect(OrderModel.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 20,
          discountedSubtotal: 20,
          deliveryFee: 15,
          platformServiceFee: 0.8,
          totalAmount: 35.8,
          price: 35.8,
        })
      );
      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        201,
        "Order created successfully",
        expect.any(Object)
      );
    });

    it("should have free delivery but still charge the platform fee at or above threshold", async () => {
      const OrderModel = require("../src/models/order.model");
      OrderModel.createOrder.mockResolvedValue({ orderId: "ord_123" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          customPricingConfig: { oneTimeBasePrice: 160, oneTimeBaseRoti: 8, oneTimeBaseSabzi: 2 },
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        orderType: "one-time",
        plan: "Massive Meal Order",
        items: [{ price: 160, quantity: 1 }],
        customDetails: { rotiCount: 8, sabziBoxes: 2 },
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      // $160 subtotal + ($160 * 2.5% + $0.30) platform fee.
      expect(OrderModel.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 164.3,
          subtotal: 160,
          discountedSubtotal: 160,
          deliveryFee: 0,
          platformServiceFee: 4.3,
          totalAmount: 164.3,
        })
      );
    });

    it("calculates coupon, delivery, and platform fees server-side and ignores forged client totals", async () => {
      const OrderModel = require("../src/models/order.model");
      const CouponModel = require("../src/models/coupon.model");
      OrderModel.createOrder.mockResolvedValue({ orderId: "ord_discounted" });
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "percentage",
        discountValue: 10,
        maxDiscountAmount: null,
        minOrderAmount: 0,
      });
      CouponModel.incrementUsage.mockResolvedValue(true);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          customPricingConfig: { oneTimeBasePrice: 100, oneTimeBaseRoti: 8, oneTimeBaseSabzi: 2 },
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        orderType: "one-time",
        items: [{ price: 100, quantity: 1 }],
        customDetails: { rotiCount: 8, sabziBoxes: 2 },
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
        couponCode: "SAVE10",
        price: 0.01,
        subtotal: 0.01,
        discountAmount: 99,
        deliveryFee: 0,
        platformServiceFee: 0,
        totalAmount: 0.01,
      };

      await OrderController.createOrder(req, res);

      expect(OrderModel.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 100,
          discountAmount: 10,
          discountedSubtotal: 90,
          deliveryFee: 15,
          platformServiceFee: 2.55,
          totalAmount: 107.55,
          price: 107.55,
        })
      );
    });

    it("uses authoritative customization pricing instead of forged item prices", async () => {
      const OrderModel = require("../src/models/order.model");
      OrderModel.createOrder.mockResolvedValue({ orderId: "ord_trusted_price" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          customPricingConfig: {
            oneTimeBasePrice: 13,
            oneTimeBaseRoti: 8,
            oneTimeBaseSabzi: 2,
            oneTimePricePerRoti: 0.6,
            oneTimePricePerSabzi: 3,
            oneTimeRaitaPrice: 2,
            oneTimeDessertPrice: 3,
          },
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        orderType: "one-time",
        items: [{ id: "custom-meal", price: 0.01, quantity: 1 }],
        customDetails: { rotiCount: 10, sabziBoxes: 3 },
        price: 0.01,
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      expect(ResponseUtil.error).not.toHaveBeenCalled();
      expect(OrderModel.createOrder).toHaveBeenCalledWith(expect.objectContaining({
        subtotal: 17.2,
        deliveryFee: 15,
        platformServiceFee: 0.73,
        totalAmount: 32.93,
        price: 32.93,
      }));
    });

    it("rejects one-time COD payloads that cannot be priced by the server", async () => {
      const OrderModel = require("../src/models/order.model");
      req.body = {
        orderType: "one-time",
        items: [{ id: "unknown", price: 0.01, quantity: 1 }],
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "One-time COD orders require meal customization details",
      );
      expect(OrderModel.createOrder).not.toHaveBeenCalled();
    });
  });

  describe("COD Subscription Delivery Fee (SubscriptionController)", () => {
    it("should persist the complete server-calculated COD total when below threshold", async () => {
      const SubscriptionModel = require("../src/models/subscription.model");
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub_123" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        plan: "Basic",
        planDetails: { price: 100 },
        durationMonths: 1,
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await SubscriptionController.createSubscription(req, res);

      expect(SubscriptionModel.createSubscription).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          planDetails: expect.objectContaining({
            price: 117.8, // $100 + $15 delivery + $2.80 platform fee
          }),
          subtotal: 100,
          discountAmount: 0,
          discountedSubtotal: 100,
          deliveryFee: 15,
          platformServiceFee: 2.8,
          totalAmount: 117.8,
        })
      );
    });

    it("applies coupon before the platform fee and ignores forged client fee totals", async () => {
      const SubscriptionModel = require("../src/models/subscription.model");
      const CouponModel = require("../src/models/coupon.model");
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub_discounted" });
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "percentage",
        discountValue: 10,
        maxDiscountAmount: null,
        minOrderAmount: 0,
      });
      CouponModel.incrementUsage.mockResolvedValue(true);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          plans: { basic: { price: 100 } },
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        plan: "Basic",
        planDetails: { price: 100 },
        durationMonths: 1,
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
        couponCode: "SAVE10",
        discountAmount: 99,
        deliveryFee: 0,
        platformServiceFee: 0,
        totalAmount: 0.01,
      };

      await SubscriptionController.createSubscription(req, res);

      expect(SubscriptionModel.createSubscription).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          planDetails: expect.objectContaining({ price: 107.55 }),
          subtotal: 100,
          discountAmount: 10,
          discountedSubtotal: 90,
          deliveryFee: 15,
          platformServiceFee: 2.55,
          totalAmount: 107.55,
        })
      );
    });
  });

  describe("City-Specific Delivery Fee Override", () => {
    it("should use city-specific delivery fee ($25) for far cities for subscription below threshold", async () => {
      const SubscriptionModel = require("../src/models/subscription.model");
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub_city" });

      // Return config with city-specific delivery settings
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
          cityCategories: {
            far: {
              deliveryFeeSettings: { minAmountForFreeDelivery: 200, deliveryFee: 25 },
            },
          },
        }),
      });

      req.body = {
        plan: "Basic",
        planDetails: { price: 120 },
        durationMonths: 1,
        deliveryAddress: "Toronto, ON",
        city: "Toronto",
        paymentMethod: "Cash on Delivery",
      };

      await SubscriptionController.createSubscription(req, res);

      // Toronto is "far": $120 + $25 delivery + $3.30 platform fee.
      expect(SubscriptionModel.createSubscription).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          planDetails: expect.objectContaining({
            price: 148.3,
          }),
          deliveryFee: 25,
          platformServiceFee: 3.3,
          totalAmount: 148.3,
        })
      );
    });

    it("derives a subscription delivery zone from the address instead of a claimed cheaper city", async () => {
      const SubscriptionModel = require("../src/models/subscription.model");
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub_address_city" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          plans: { basic: { price: 100 } },
          cityCategories: {
            local: {
              cities: ["Vancouver"],
              planPrices: { basic: 100 },
              deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
            },
            far: {
              cities: ["Toronto"],
              planPrices: { basic: 120 },
              deliveryFeeSettings: { minAmountForFreeDelivery: 200, deliveryFee: 25 },
            },
          },
        }),
      });
      req.body = {
        plan: "Basic",
        planDetails: { price: 120 },
        deliveryAddress: "25 King Street, Toronto, ON",
        city: "Vancouver",
        paymentMethod: "Cash on Delivery",
      };

      await SubscriptionController.createSubscription(req, res);

      expect(ResponseUtil.error).not.toHaveBeenCalled();
      expect(SubscriptionModel.createSubscription).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ city: "Toronto", deliveryFee: 25, totalAmount: 148.3 }),
      );
    });

    it("derives a one-time COD delivery zone from the address instead of a claimed cheaper city", async () => {
      const OrderModel = require("../src/models/order.model");
      OrderModel.createOrder.mockResolvedValue({ orderId: "ord_address_city" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          customPricingConfig: { oneTimeBasePrice: 100, oneTimeBaseRoti: 8, oneTimeBaseSabzi: 2 },
          cityCategories: {
            local: {
              cities: ["Vancouver"],
              deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
            },
            far: {
              cities: ["Toronto"],
              deliveryFeeSettings: { minAmountForFreeDelivery: 200, deliveryFee: 25 },
            },
          },
        }),
      });
      req.body = {
        orderType: "one-time",
        items: [{ price: 0.01, quantity: 1 }],
        customDetails: { rotiCount: 8, sabziBoxes: 2 },
        deliveryAddress: "25 King Street, Toronto, ON",
        city: "Vancouver",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      expect(ResponseUtil.error).not.toHaveBeenCalled();
      expect(OrderModel.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Toronto", subtotal: 100, deliveryFee: 25, totalAmount: 127.8 }),
      );
    });
  });

  describe("Exact Threshold Boundary", () => {
    it("should have free delivery when amount equals exact threshold ($150)", async () => {
      const OrderModel = require("../src/models/order.model");
      OrderModel.createOrder.mockResolvedValue({ orderId: "ord_boundary" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          customPricingConfig: { oneTimeBasePrice: 150, oneTimeBaseRoti: 8, oneTimeBaseSabzi: 2 },
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        orderType: "one-time",
        plan: "Exactly At Threshold",
        items: [{ price: 150, quantity: 1 }],
        customDetails: { rotiCount: 8, sabziBoxes: 2 },
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      // $150 is NOT < $150, so no delivery fee; platform fee still applies.
      expect(OrderModel.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 154.05,
          deliveryFee: 0,
          platformServiceFee: 4.05,
          totalAmount: 154.05,
        })
      );
    });
  });

  describe("Recurring Coupon Restrictions on One-Time Orders", () => {
    const CouponController = require("../src/controllers/coupon.controller");
    const CouponModel = require("../src/models/coupon.model");

    it("should reject repeating coupon during validation for one-time meal orders", async () => {
      CouponModel.getCoupon.mockResolvedValue({
        code: "SAVE20RECURRING",
        isActive: true,
        duration: "repeating",
        durationInMonths: 3,
        discountType: "percentage",
        discountValue: 20,
      });

      req.body = {
        code: "SAVE20RECURRING",
        amount: 25,
        type: "one-time",
      };

      await CouponController.validateCoupon(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "Recurring subscription coupons cannot be applied to one-time meal orders"
      );
    });

    it("should allow repeating coupon for subscription orders", async () => {
      CouponModel.getCoupon.mockResolvedValue({
        code: "SAVE20RECURRING",
        isActive: true,
        duration: "repeating",
        durationInMonths: 3,
        discountType: "percentage",
        discountValue: 20,
      });

      req.body = {
        code: "SAVE20RECURRING",
        amount: 190,
        type: "subscription",
      };

      await CouponController.validateCoupon(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        200,
        "Coupon validated successfully",
        expect.objectContaining({
          code: "SAVE20RECURRING",
          duration: "repeating",
          discountAmount: 38,
          finalAmount: 152,
        })
      );
    });

    it("should reject creating one-time COD order with repeating coupon", async () => {
      CouponModel.getCoupon.mockResolvedValue({
        code: "REPEATING50",
        isActive: true,
        duration: "repeating",
        discountType: "percentage",
        discountValue: 50,
      });

      req.body = {
        orderType: "one-time",
        items: [{ price: 20, quantity: 1 }],
        customDetails: { rotiCount: 8, sabziBoxes: 2 },
        deliveryAddress: "123 Main St",
        couponCode: "REPEATING50",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "Recurring subscription coupons cannot be applied to one-time meal orders"
      );
    });
  });
});
