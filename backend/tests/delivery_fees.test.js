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

  describe("COD One-Time Order Delivery Fee (OrderController)", () => {
    it("should have free delivery (deliveryFee: 0) for one-time meal orders regardless of subtotal", async () => {
      const OrderModel = require("../src/models/order.model");
      OrderModel.createOrder.mockResolvedValue({ orderId: "ord_123" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        orderType: "one-time",
        plan: "Single Meal",
        items: [{ price: 20, quantity: 1 }],
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      // Price should be 20 with 0 delivery fee
      expect(OrderModel.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 20,
          deliveryFee: 0,
        })
      );
      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        201,
        "Order created successfully",
        expect.any(Object)
      );
    });

    it("should have free delivery (deliveryFee: 0) when subtotal is at or above threshold", async () => {
      const OrderModel = require("../src/models/order.model");
      OrderModel.createOrder.mockResolvedValue({ orderId: "ord_123" });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        orderType: "one-time",
        plan: "Massive Meal Order",
        items: [{ price: 160, quantity: 1 }],
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      // Price should be 160 with 0 delivery fee
      expect(OrderModel.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 160,
          deliveryFee: 0,
        })
      );
    });
  });

  describe("COD Subscription Delivery Fee (SubscriptionController)", () => {
    it("should add delivery fee to finalPrice when subscription base price is below threshold", async () => {
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
            price: 115, // 100 + 15
          }),
          deliveryFee: 15,
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

      // Toronto is "far" per the mock, so $25 fee, total = 120 + 25 = 145
      expect(SubscriptionModel.createSubscription).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          planDetails: expect.objectContaining({
            price: 145,
          }),
          deliveryFee: 25,
        })
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
          deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        }),
      });

      req.body = {
        orderType: "one-time",
        plan: "Exactly At Threshold",
        items: [{ price: 150, quantity: 1 }],
        deliveryAddress: "123 Main St",
        paymentMethod: "Cash on Delivery",
      };

      await OrderController.createOrder(req, res);

      // $150 is NOT < $150, so no delivery fee
      expect(OrderModel.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 150,
          deliveryFee: 0,
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
