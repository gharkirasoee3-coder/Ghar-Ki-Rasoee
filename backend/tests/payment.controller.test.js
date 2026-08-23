const ResponseUtil = require("../src/utils/response.util");
const cache = require("../src/utils/cache.util");
const StripeService = require("../src/services/stripe.service");
const SubscriptionModel = require("../src/models/subscription.model");
const OrderModel = require("../src/models/order.model");
const ActivityModel = require("../src/models/activity.model");
const NotificationModel = require("../src/models/notification.model");

// Mock Stripe Service
jest.mock("../src/services/stripe.service", () => ({
  createCheckoutSession: jest.fn(),
  retrieveSession: jest.fn(),
  constructEvent: jest.fn(),
  cancelSubscription: jest.fn(),
}));

// Mock Response Utility
jest.mock("../src/utils/response.util", () => ({
  send: jest.fn(),
  error: jest.fn(),
}));

// Mock Cache Utility
jest.mock("../src/utils/cache.util", () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}));

// Mock Models
jest.mock("../src/models/subscription.model", () => ({
  getUserSubscription: jest.fn(),
  createSubscription: jest.fn(),
  collection: {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
    doc: jest.fn(),
  },
}));

jest.mock("../src/models/order.model", () => ({
  createOrder: jest.fn(),
  collection: {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
  },
}));

jest.mock("../src/models/activity.model", () => ({
  logActivity: jest.fn(),
}));

jest.mock("../src/models/notification.model", () => ({
  create: jest.fn().mockResolvedValue(true),
}));

// Mock virtual dependencies
jest.mock("../src/models/menu.model", () => ({
  getMenuConfig: jest.fn(),
  calculateCustomPrice: jest.fn(),
  getCityCategory: jest.fn((city) => (city && city.toLowerCase() === "toronto" ? "far" : "local")),
  getCityFromAddress: jest.fn((addr) => {
    if (!addr) return null;
    if (addr.toLowerCase().includes("toronto")) return "Toronto";
    if (addr.toLowerCase().includes("vancouver")) return "Vancouver";
    return null;
  }),
}), { virtual: true });

jest.mock("../src/models/coupon.model", () => ({
  getCoupon: jest.fn(),
  incrementUsage: jest.fn().mockResolvedValue(true),
}), { virtual: true });

jest.mock("../src/services/email.service", () => ({
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(true),
}), { virtual: true });

// Mock Firebase Admin SDK
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  update: mockUpdate,
  set: mockSet,
  id: "mock-user-id",
}));

const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));

const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatch = jest.fn(() => ({
  update: mockBatchUpdate,
  commit: mockBatchCommit,
}));

jest.mock("../src/config/firebase.config", () => ({
  firestore: () => ({
    collection: mockCollection,
    batch: mockBatch,
  }),
}));

const PaymentController = require("../src/controllers/payment.controller");

describe("PaymentController", () => {
  let req, res, spyConsoleError, spyConsoleLog;

  beforeEach(() => {
    jest.clearAllMocks();
    spyConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    spyConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

    req = {
      user: { uid: "user-123", email: "user@example.com" },
      body: {},
      query: {},
      params: {},
      headers: { origin: "http://localhost:3000" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Default implementations
    mockDoc.mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      set: mockSet,
      id: "mock-user-id",
    });
    SubscriptionModel.collection.doc.mockReturnValue({
      update: mockUpdate,
    });
  });

  afterEach(() => {
    spyConsoleError.mockRestore();
    spyConsoleLog.mockRestore();
  });

  describe("createCheckoutSession", () => {
    it("should fail if amount is missing or invalid", async () => {
      req.body = { amount: 0, deliveryAddress: "123 Main St" };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Invalid amount");

      req.body = { amount: -5, deliveryAddress: "123 Main St" };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Invalid amount");
    });

    it("should fail if delivery address is missing", async () => {
      req.body = { amount: 150 };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Delivery address is required");
    });

    it("should fail custom plan checkout if customDetails is missing", async () => {
      req.body = { amount: 150, deliveryAddress: "123 Main St", type: "subscription", planName: "Custom Plan" };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Custom details are required for custom plan");
    });

    it("should fail custom plan checkout if pricing validation fails", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({});
      MenuModel.calculateCustomPrice.mockReturnValue(160); // Expected 160 but we send 150

      req.body = {
        amount: 150,
        deliveryAddress: "123 Main St",
        type: "subscription",
        planName: "Custom Plan",
        customDetails: { roti: 3 },
      };

      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "Pricing validation failed. Expected: $160.00, Received: $150.00"
      );
    });

    it("should handle custom price validation error throw", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({});
      MenuModel.calculateCustomPrice.mockImplementation(() => {
        throw new Error("Invalid items structure");
      });

      req.body = {
        amount: 150,
        deliveryAddress: "123 Main St",
        type: "subscription",
        planName: "Custom Plan",
        customDetails: { roti: -1 },
      };

      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Invalid items structure");
    });

    it("should fail if coupon code is invalid", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue(null);

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "INVALID" };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Invalid coupon code");
    });

    it("should fail if coupon is inactive", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({ isActive: false });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "INACTIVE" };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This coupon is inactive");
    });

    it("should fail if coupon has expired", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({ isActive: true, expiresAt: "2020-01-01" });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "EXPIRED" };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This coupon has expired");
    });

    it("should fail if coupon has reached max usage limit", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({ isActive: true, maxUses: 5, usedCount: 5 });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "LIMIT" };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This coupon has reached its usage limit");
    });

    it("should fail if order amount is less than coupon minimum order amount", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({ isActive: true, minOrderAmount: 150 });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "MIN" };
      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "Minimum purchase of $150.00 CAD is required for this coupon"
      );
    });

    it("should successfully apply fixed discount coupon and create session", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "fixed",
        discountValue: 20,
        minOrderAmount: 0,
      });

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ displayName: "John Doe", email: "john@example.com" }),
      });

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-123", url: "https://stripe.com/checkout" });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "FIXED" };
      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 80, // 100 - 20
          couponCode: "FIXED",
        })
      );
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Checkout session created successfully", {
        sessionId: "sess-123",
        url: "https://stripe.com/checkout",
      });
    });

    it("should successfully apply percentage discount coupon (with cap) and create session", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "percentage",
        discountValue: 10,
        maxDiscountAmount: 5,
        minOrderAmount: 0,
      });

      mockGet.mockResolvedValue({ exists: false }); // Test fallback username

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-123", url: "https://stripe.com/checkout" });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "PERCENT_CAP" };
      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 95, // 10% of 100 is 10, capped at 5 -> 100 - 5 = 95
          userName: "GKR Customer",
        })
      );
    });

    it("should successfully apply percentage discount coupon (without cap) and create session", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "percentage",
        discountValue: 10,
        maxDiscountAmount: null,
        minOrderAmount: 0,
      });

      mockGet.mockResolvedValue({ exists: true, data: () => ({ displayName: "" }) }); // fallback to email or GKR customer

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-123", url: "https://stripe.com/checkout" });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "PERCENT_NO_CAP" };
      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 90, // 100 - 10
        })
      );
    });

    it("should caps finalAmount to minimum 0.50 Stripe limits", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "fixed",
        discountValue: 100,
        minOrderAmount: 0,
      });

      mockGet.mockResolvedValue({ exists: true, data: () => ({ name: "Test" }) });

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-123", url: "https://stripe.com/checkout" });

      req.body = { amount: 20, deliveryAddress: "123 Main St", couponCode: "HUGE_DISCOUNT" };
      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0.5, // 20 - 100 => max(0.50, -80) = 0.50
        })
      );
    });

    it("should use undiscounted base price for recurring subscription mode", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "fixed",
        discountValue: 20,
        minOrderAmount: 0,
      });

      mockGet.mockResolvedValue({ exists: false });

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-123", url: "https://stripe.com/checkout" });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "FIXED", type: "subscription", isRecurring: true };
      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100, // recurring subscription checkout uses the base amount
        })
      );
    });

    it("should validate standard plan price and succeed if correct", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({
        plans: {
          standard: { price: 190 },
        },
      });

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-std", url: "https://stripe.com/checkout" });

      req.body = {
        amount: 190,
        deliveryAddress: "123 Main St",
        planName: "Standard",
        type: "subscription",
      };

      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).not.toHaveBeenCalled();
      expect(StripeService.createCheckoutSession).toHaveBeenCalled();
    });

    it("should fail standard plan checkout if pricing validation fails", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({
        plans: {
          standard: { price: 190 },
        },
      });

      req.body = {
        amount: 100, // incorrect
        deliveryAddress: "123 Main St",
        planName: "Standard",
        type: "subscription",
      };

      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, expect.stringContaining("Pricing validation failed"));
    });

    it("should validate standard plan price using city override if present", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({
        plans: {
          standard: { price: 190 },
        },
        cityCategories: {
          far: {
            planPrices: {
              standard: 210,
            },
          },
        },
      });

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-override", url: "https://stripe.com/checkout" });

      // Toronto is "far" according to the mock getCityCategory
      req.body = {
        amount: 210,
        deliveryAddress: "Toronto, ON",
        planName: "Standard",
        type: "subscription",
        city: "Toronto",
      };

      await PaymentController.createCheckoutSession(req, res);
      expect(ResponseUtil.error).not.toHaveBeenCalled();
      expect(StripeService.createCheckoutSession).toHaveBeenCalled();
    });

    it("should successfully create session for custom plan when pricing validation succeeds", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({ some: "config" });
      MenuModel.calculateCustomPrice.mockReturnValue(190);

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-custom", url: "https://stripe.com/checkout" });

      req.body = {
        amount: 190.02, // within 0.05 margin of 190
        deliveryAddress: "123 Main St",
        planName: "Custom",
        customDetails: { items: [] },
        type: "subscription",
      };

      await PaymentController.createCheckoutSession(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        200,
        "Checkout session created successfully",
        expect.objectContaining({ sessionId: "sess-custom" })
      );
    });

    it("should handle coupon discountType fallback when discountType is unrecognized", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "unrecognized_type",
        discountValue: 10,
        minOrderAmount: 0,
      });

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-fallback", url: "https://stripe.com/checkout" });

      req.body = { amount: 100, deliveryAddress: "123 Main St", couponCode: "UNRECOGNIZED" };
      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100, // no discount applied
        })
      );
    });

    it("should use default localhost origin when req.headers.origin is missing", async () => {
      delete req.headers.origin;

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-no-origin", url: "https://stripe.com/checkout" });

      req.body = { amount: 100, deliveryAddress: "123 Main St" };
      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: "http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}",
          cancelUrl: "http://localhost:5173/payment-cancelled",
        })
      );
    });

    it("should fall back to userData.email when req.user.email is missing", async () => {
      delete req.user.email;
      mockGet.mockResolvedValue({ exists: true, data: () => ({ email: "fallback-email@example.com" }) });

      StripeService.createCheckoutSession.mockResolvedValue({ id: "sess-fallback-email", url: "https://stripe.com/checkout" });

      req.body = { amount: 100, deliveryAddress: "123 Main St" };
      await PaymentController.createCheckoutSession(req, res);

      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: "fallback-email@example.com",
        })
      );
    });

    it("should handle createCheckoutSession exceptions", async () => {
      StripeService.createCheckoutSession.mockRejectedValue(new Error("Stripe API down"));

      req.body = { amount: 100, deliveryAddress: "123 Main St" };
      await PaymentController.createCheckoutSession(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        500,
        "Failed to create checkout session",
        expect.any(Error)
      );
      expect(spyConsoleError).toHaveBeenCalledWith("Error creating checkout session:", expect.any(Error));
    });
  });

  describe("getSessionStatus", () => {
    it("should fail if sessionId is missing", async () => {
      req.params = { sessionId: "" };
      await PaymentController.getSessionStatus(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Session ID is required");
    });

    it("should successfully retrieve session status", async () => {
      req.params = { sessionId: "sess-123" };
      StripeService.retrieveSession.mockResolvedValue({
        payment_status: "paid",
        customer_details: { email: "customer@example.com" },
        amount_total: 15000,
        metadata: { planName: "Standard" },
      });

      await PaymentController.getSessionStatus(req, res);

      expect(StripeService.retrieveSession).toHaveBeenCalledWith("sess-123");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Session retrieved successfully", {
        status: "paid",
        customerEmail: "customer@example.com",
        amount: 150,
        metadata: { planName: "Standard" },
      });
    });

    it("should successfully retrieve session status even if customer_details is missing", async () => {
      req.params = { sessionId: "sess-123" };
      StripeService.retrieveSession.mockResolvedValue({
        payment_status: "paid",
        customer_details: null,
        amount_total: 15000,
        metadata: { planName: "Standard" },
      });

      await PaymentController.getSessionStatus(req, res);

      expect(StripeService.retrieveSession).toHaveBeenCalledWith("sess-123");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Session retrieved successfully", {
        status: "paid",
        customerEmail: undefined,
        amount: 150,
        metadata: { planName: "Standard" },
      });
    });

    it("should handle retrieveSession exceptions", async () => {
      req.params = { sessionId: "sess-123" };
      StripeService.retrieveSession.mockRejectedValue(new Error("Network timeout"));

      await PaymentController.getSessionStatus(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        500,
        "Failed to retrieve session status",
        expect.any(Error)
      );
      expect(spyConsoleError).toHaveBeenCalledWith("Error retrieving session status:", expect.any(Error));
    });

    it("should trigger synchronous fulfillment fallback for subscription session if status is paid", async () => {
      req.params = { sessionId: "sess-paid-123" };
      StripeService.retrieveSession.mockResolvedValue({
        id: "sess-paid-123",
        payment_status: "paid",
        customer_details: { email: "customer@example.com" },
        amount_total: 15000,
        subscription: "stripe-sub-id",
        metadata: {
          userId: "user-456",
          type: "subscription",
          planName: "Standard",
          deliveryAddress: "123 Main St",
          deliveryDate: "2026-08-05",
          items: "[]",
          isRecurring: "true",
          replacePlan: "true",
          couponCode: "PROMO",
        },
      });

      // Mock idempotency check to return empty (not processed yet)
      SubscriptionModel.collection.where.mockReturnThis();
      SubscriptionModel.collection.limit.mockReturnThis();
      SubscriptionModel.collection.get.mockResolvedValueOnce({ empty: true });

      // Mock other things for fulfillment
      SubscriptionModel.getUserSubscription.mockResolvedValueOnce(null);
      SubscriptionModel.createSubscription.mockResolvedValue({
        subscriptionId: "sub-999",
        plan: "Standard",
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "subscriber@gmail.com", name: "Alice" }),
      });

      const EmailService = require("../src/services/email.service");
      EmailService.sendPaymentConfirmationEmail.mockResolvedValue(true);

      await PaymentController.getSessionStatus(req, res);

      // Verify retrieves session and triggers fulfillment
      expect(StripeService.retrieveSession).toHaveBeenCalledWith("sess-paid-123");
      expect(SubscriptionModel.createSubscription).toHaveBeenCalledWith(
        "user-456",
        expect.objectContaining({
          plan: "Standard",
          stripeSessionId: "sess-paid-123",
        })
      );
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Session retrieved successfully", expect.any(Object));
    });

    it("should skip synchronous fulfillment if session status is unpaid", async () => {
      req.params = { sessionId: "sess-unpaid-123" };
      StripeService.retrieveSession.mockResolvedValue({
        id: "sess-unpaid-123",
        payment_status: "unpaid",
        customer_details: { email: "customer@example.com" },
        amount_total: 15000,
        metadata: {
          userId: "user-456",
          type: "subscription",
          planName: "Standard",
        },
      });

      await PaymentController.getSessionStatus(req, res);

      expect(StripeService.retrieveSession).toHaveBeenCalledWith("sess-unpaid-123");
      expect(SubscriptionModel.createSubscription).not.toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Session retrieved successfully", expect.any(Object));
    });
  });

  describe("handleWebhook", () => {
    it("should fail if Stripe signature verification fails", async () => {
      req.headers["stripe-signature"] = "invalid-sig";
      req.body = Buffer.from("raw-body");
      StripeService.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await PaymentController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Webhook Error: Invalid signature");
    });

    describe("checkout.session.completed (subscription)", () => {
      let mockSession;

      beforeEach(() => {
        mockSession = {
          id: "sess-completed-123",
          amount_total: 19000,
          subscription: "stripe-sub-id",
          metadata: {
            userId: "user-456",
            type: "subscription",
            planName: "Premium",
            deliveryAddress: "123 Delivery Ln",
            deliveryDate: "2026-08-05",
            items: "[]",
            isRecurring: "true",
            replacePlan: "true",
            couponCode: "PROMO",
          },
        };
        StripeService.constructEvent.mockReturnValue({
          type: "checkout.session.completed",
          data: { object: mockSession },
        });
      });

      it("should skip processing if webhook already processed (idempotency)", async () => {
        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.limit.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValue({ empty: false }); // Already exists

        await PaymentController.handleWebhook(req, res);

        expect(res.json).toHaveBeenCalledWith({ received: true });
        expect(SubscriptionModel.createSubscription).not.toHaveBeenCalled();
      });

      it("should process checkout.session.completed subscription, cancel old sub, create new sub, send email, log activity, and clear cache", async () => {
        // Idempotency check: not exists
        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.limit.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValueOnce({ empty: true });

        // Existing sub check for replacePlan
        SubscriptionModel.getUserSubscription.mockResolvedValue({
          subscriptionId: "old-sub-abc",
          stripeSubscriptionId: "stripe-old-sub-abc",
        });

        // Mock Firebase Batch cancel old Stripe subscription
        StripeService.cancelSubscription.mockResolvedValue(true);

        // CustomDetails parsing test
        mockSession.metadata.customDetails = JSON.stringify({ roti: 5 });

        // Create subscription model mock
        SubscriptionModel.createSubscription.mockResolvedValue({
          subscriptionId: "new-sub-999",
          plan: "Premium",
        });

        // User profile fetch mock
        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ email: "subscriber@gmail.com", name: "Alice" }),
        });

        // Email Service confirmation mock
        const EmailService = require("../src/services/email.service");
        EmailService.sendPaymentConfirmationEmail.mockResolvedValue(true);

        await PaymentController.handleWebhook(req, res);

        expect(SubscriptionModel.collection.doc).toHaveBeenCalledWith("old-sub-abc");
        expect(mockUpdate).toHaveBeenCalledWith({
          status: "Renewed",
          updatedAt: expect.any(String),
        });
        expect(StripeService.cancelSubscription).toHaveBeenCalledWith("stripe-old-sub-abc");
        expect(SubscriptionModel.createSubscription).toHaveBeenCalledWith(
          "user-456",
          expect.objectContaining({
            plan: "Premium",
            stripeSessionId: "sess-completed-123",
            couponCode: "PROMO",
          })
        );
        expect(EmailService.sendPaymentConfirmationEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            userEmail: "subscriber@gmail.com",
            userName: "Alice",
            amount: 190,
          })
        );
        expect(ActivityModel.logActivity).toHaveBeenCalledWith(
          "user-456",
          expect.objectContaining({
            type: "subscription",
            action: "created",
          })
        );
        expect(NotificationModel.create).toHaveBeenCalledWith(
          "user-456",
          expect.objectContaining({
            type: "payment",
            title: "Payment Confirmed",
          })
        );
        expect(cache.delete).toHaveBeenCalledWith("user_subscription_user-456");
        expect(cache.delete).toHaveBeenCalledWith("admin_dashboard_stats");
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      it("should handle optional replacePlan false and handle errors in Stripe cancellation, email sending, notification creation gracefully", async () => {
        // Idempotency check: not exists
        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.limit.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValueOnce({ empty: true });

        mockSession.metadata.replacePlan = "false"; // Skip replace
        mockSession.metadata.customDetails = ""; // No custom details

        // Mock Stripe cancel fail
        SubscriptionModel.getUserSubscription.mockResolvedValue({
          subscriptionId: "old-sub-abc",
          stripeSubscriptionId: "stripe-old-sub-abc",
        });
        StripeService.cancelSubscription.mockRejectedValue(new Error("Stripe offline"));

        SubscriptionModel.createSubscription.mockResolvedValue({
          subscriptionId: "new-sub-999",
        });

        mockGet.mockResolvedValueOnce({
          exists: false, // fallback username to split email
        });

        // Mock Email Service failure
        const EmailService = require("../src/services/email.service");
        EmailService.sendPaymentConfirmationEmail.mockRejectedValue(new Error("SMTP offline"));

        // Mock Notification Service failure
        NotificationModel.create.mockRejectedValue(new Error("Notification DB offline"));

        // Mock Coupon Increment failure
        const CouponModel = require("../src/models/coupon.model");
        CouponModel.incrementUsage.mockRejectedValue(new Error("Coupon DB offline"));

        await PaymentController.handleWebhook(req, res);

        expect(SubscriptionModel.getUserSubscription).not.toHaveBeenCalled(); // Skips since replacePlan === "false"
        expect(spyConsoleError).toHaveBeenCalledWith(
          "Failed to send subscription payment confirmation email:",
          expect.any(Error)
        );
        expect(spyConsoleError).toHaveBeenCalledWith(
          "Failed to create subscription payment notification:",
          expect.any(Error)
        );
        expect(spyConsoleError).toHaveBeenCalledWith(
          "Failed to increment coupon usage count:",
          expect.any(Error)
        );
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      it("should handle error when canceling Stripe subscription during subscription checkout webhook processing", async () => {
        delete mockSession.metadata.couponCode;
        // Idempotency check: not exists
        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.limit.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValueOnce({ empty: true });

        SubscriptionModel.getUserSubscription.mockResolvedValue({
          subscriptionId: "old-sub-abc",
          stripeSubscriptionId: "stripe-old-sub-abc",
        });

        // Force cancelSubscription to throw to execute line 196 catch block
        StripeService.cancelSubscription.mockRejectedValueOnce(new Error("Stripe cancel error"));

        SubscriptionModel.createSubscription.mockResolvedValue({
          subscriptionId: "new-sub-999",
          plan: "Premium",
        });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ email: "subscriber@gmail.com", name: "Alice" }),
        });

        await PaymentController.handleWebhook(req, res);

        expect(spyConsoleError).toHaveBeenCalledWith(
          "Failed to cancel old Stripe subscription billing via webhook:",
          expect.any(Error)
        );
      });

      it("should process checkout.session.completed subscription without existing old subscription and no Stripe subscription ID", async () => {
        mockSession.metadata.replacePlan = "true";
        mockSession.subscription = null;
        delete mockSession.metadata.customDetails;

        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.limit.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValueOnce({ empty: true });

        SubscriptionModel.getUserSubscription.mockResolvedValueOnce(null);

        SubscriptionModel.createSubscription.mockResolvedValue({
          subscriptionId: "new-sub-nodisp",
          plan: "Premium",
        });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: "Alice" }),
        });

        await PaymentController.handleWebhook(req, res);

        expect(SubscriptionModel.getUserSubscription).toHaveBeenCalledWith("user-456");
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      it("should process checkout.session.completed subscription with existing subscription but no Stripe subscription ID", async () => {
        mockSession.metadata.replacePlan = "true";

        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.limit.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValueOnce({ empty: true });

        SubscriptionModel.getUserSubscription.mockResolvedValueOnce({
          subscriptionId: "old-sub-123",
          stripeSubscriptionId: null,
        });

        SubscriptionModel.createSubscription.mockResolvedValue({
          subscriptionId: "new-sub-999",
          plan: "Premium",
        });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ email: "alice@gmail.com" }),
        });

        await PaymentController.handleWebhook(req, res);

        expect(StripeService.cancelSubscription).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      it("should do nothing if checkout.session.completed metadata type is unrecognized", async () => {
        StripeService.constructEvent.mockReturnValue({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "sess-unrecognized",
              metadata: {
                type: "unrecognized",
              },
            },
          },
        });

        await PaymentController.handleWebhook(req, res);

        expect(res.json).toHaveBeenCalledWith({ received: true });
      });
    });

    describe("checkout.session.completed (one-time)", () => {
      let mockSession;

      beforeEach(() => {
        mockSession = {
          id: "sess-completed-456",
          amount_total: 8000,
          metadata: {
            userId: "user-789",
            type: "one-time",
            deliveryAddress: "456 Delivery Rd",
            deliveryDate: "2026-08-06",
            items: JSON.stringify([{ id: "meal-1", quantity: 2 }]),
            couponCode: "ONE_TIME_PROMO",
          },
        };
        StripeService.constructEvent.mockReturnValue({
          type: "checkout.session.completed",
          data: { object: mockSession },
        });
      });

      it("should skip processing if webhook already processed (idempotency)", async () => {
        OrderModel.collection.where.mockReturnThis();
        OrderModel.collection.limit.mockReturnThis();
        OrderModel.collection.get.mockResolvedValue({ empty: false }); // Already exists

        await PaymentController.handleWebhook(req, res);

        expect(res.json).toHaveBeenCalledWith({ received: true });
        expect(OrderModel.createOrder).not.toHaveBeenCalled();
      });

      it("should successfully process checkout.session.completed one-time, create order, email, log activity, and clear cache", async () => {
        OrderModel.collection.where.mockReturnThis();
        OrderModel.collection.limit.mockReturnThis();
        OrderModel.collection.get.mockResolvedValueOnce({ empty: true });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ displayName: "Bob", email: "bob@example.com" }),
        });

        OrderModel.createOrder.mockResolvedValue({
          orderId: "order-12345678",
        });

        const EmailService = require("../src/services/email.service");
        EmailService.sendPaymentConfirmationEmail.mockResolvedValue(true);

        await PaymentController.handleWebhook(req, res);

        expect(OrderModel.createOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "user-789",
            price: 80,
            orderType: "one-time",
          })
        );
        expect(EmailService.sendPaymentConfirmationEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            userEmail: "bob@example.com",
            userName: "Bob",
            paymentType: "one-time",
          })
        );
        expect(ActivityModel.logActivity).toHaveBeenCalledWith(
          "user-789",
          expect.objectContaining({
            type: "order",
            action: "placed",
          })
        );
        expect(NotificationModel.create).toHaveBeenCalledWith(
          "user-789",
          expect.objectContaining({
            type: "payment",
            title: "Payment Confirmed",
            message: expect.stringContaining("order #order-12"),
          })
        );
        expect(cache.delete).toHaveBeenCalledWith("admin_dashboard_stats");
        expect(cache.delete).toHaveBeenCalledWith("admin_today_deliveries");
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      it("should handle parse errors in items metadata gracefully", async () => {
        OrderModel.collection.where.mockReturnThis();
        OrderModel.collection.limit.mockReturnThis();
        OrderModel.collection.get.mockResolvedValueOnce({ empty: true });

        mockSession.metadata.items = "invalid-json-items"; // Trigger parse error

        mockGet.mockResolvedValueOnce({ exists: false });

        OrderModel.createOrder.mockResolvedValue({ orderId: "order-123" });

        await PaymentController.handleWebhook(req, res);

        expect(spyConsoleError).toHaveBeenCalledWith("Failed to parse items from metadata:", expect.any(Error));
        expect(OrderModel.createOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [], // Fallback
          })
        );
      });

      it("should handle error when sending email during one-time checkout webhook processing", async () => {
        delete mockSession.metadata.couponCode;
        delete mockSession.metadata.items;
        OrderModel.collection.where.mockReturnThis();
        OrderModel.collection.limit.mockReturnThis();
        OrderModel.collection.get.mockResolvedValueOnce({ empty: true });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ displayName: "Bob", email: "bob@example.com" }),
        });

        OrderModel.createOrder.mockResolvedValue({
          orderId: "order-12345678",
        });

        const EmailService = require("../src/services/email.service");
        EmailService.sendPaymentConfirmationEmail.mockRejectedValueOnce(new Error("Email send failed"));
        NotificationModel.create.mockRejectedValueOnce(new Error("Notification failed"));

        await PaymentController.handleWebhook(req, res);

        expect(spyConsoleError).toHaveBeenCalledWith(
          "Failed to send order payment confirmation email:",
          expect.any(Error)
        );
        expect(spyConsoleError).toHaveBeenCalledWith(
          "Failed to create order payment notification:",
          expect.any(Error)
        );
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });
    });

    describe("invoice.payment_succeeded", () => {
      let mockInvoice;

      beforeEach(() => {
        mockInvoice = {
          billing_reason: "subscription_cycle",
          subscription: "stripe-sub-id-active",
          amount_paid: 15000,
        };
        StripeService.constructEvent.mockReturnValue({
          type: "invoice.payment_succeeded",
          data: { object: mockInvoice },
        });
      });

      it("should skip cycle checks if billing_reason is subscription_create", async () => {
        mockInvoice.billing_reason = "subscription_create";
        await PaymentController.handleWebhook(req, res);
        expect(SubscriptionModel.collection.where).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      it("should renew the active subscription by extending the end date (base date is currentEndDate)", async () => {
        const mockSubData1 = {
          userId: "user-renew-1",
          endDate: "2026-09-01T00:00:00.000Z", // Future date
          plan: "Standard",
          subscriptionId: "sub-to-renew-1",
          createdAt: "2026-08-01",
        };
        const mockSubData2 = {
          userId: "user-renew-1",
          endDate: "2026-09-01T00:00:00.000Z", // Future date
          plan: "Standard",
          subscriptionId: "sub-to-renew-2",
          createdAt: "2026-08-02",
        };

        const mockSubDoc1 = {
          ref: { update: mockUpdate },
          data: () => mockSubData1,
        };
        const mockSubDoc2 = {
          ref: { update: mockUpdate },
          data: () => mockSubData2,
        };

        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValue({
          empty: false,
          docs: [mockSubDoc1, mockSubDoc2],
        });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ email: "renew@test.com", name: "Renewable User" }),
        });

        await PaymentController.handleWebhook(req, res);

        const expectedNewEndDate = new Date("2026-09-01T00:00:00.000Z");
        expectedNewEndDate.setDate(expectedNewEndDate.getDate() + 30);

        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "Active",
            endDate: expectedNewEndDate.toISOString(),
            remainingDays: 30,
          })
        );
        expect(ActivityModel.logActivity).toHaveBeenCalledWith(
          "user-renew-1",
          expect.objectContaining({
            action: "renewed",
          })
        );
        expect(cache.delete).toHaveBeenCalledWith("user_subscription_user-renew-1");
      });
      it("should renew the subscription extending from now if currentEndDate is in the past", async () => {
        mockInvoice.amount_paid = null;
        const mockSubData = {
          userId: "user-renew-2",
          endDate: "2020-01-01T00:00:00.000Z", // Past date
          plan: "Standard",
          subscriptionId: "sub-to-renew-past",
          createdAt: "2026-08-01",
          planDetails: { price: 190 },
        };

        const mockSubDoc = {
          ref: { update: mockUpdate },
          data: () => mockSubData,
        };

        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValue({
          empty: false,
          docs: [mockSubDoc],
          forEach: (cb) => [mockSubDoc].forEach(cb),
        });

        mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ email: "past-user@example.com" }),
        });

        await PaymentController.handleWebhook(req, res);

        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "Active",
            endDate: expect.any(String),
            remainingDays: 30,
          })
        );
      });

      it("should log when no matching GKR subscription matches Stripe ID", async () => {
        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValue({ empty: true });

        await PaymentController.handleWebhook(req, res);

        expect(spyConsoleLog).toHaveBeenCalledWith(
          "No GKR subscription found matching Stripe ID stripe-sub-id-active"
        );
      });

      it("should handle error when sending email and creating notification during subscription renewal webhook processing", async () => {
        mockInvoice.amount_paid = null;
        const mockSubData = {
          userId: "user-renew-1",
          endDate: "2026-09-01T00:00:00.000Z",
          plan: "Standard",
          subscriptionId: "sub-to-renew",
          createdAt: "2026-08-01",
        };

        const mockSubDoc = {
          ref: { update: mockUpdate },
          data: () => mockSubData,
        };

        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValue({
          empty: false,
          docs: [mockSubDoc],
          forEach: (cb) => [mockSubDoc].forEach(cb),
        });

        mockGet.mockResolvedValueOnce({
          exists: false,
        });

        const EmailService = require("../src/services/email.service");
        EmailService.sendPaymentConfirmationEmail.mockRejectedValueOnce(new Error("Renewal email failed"));
        NotificationModel.create.mockRejectedValueOnce(new Error("Renewal notification failed"));

        await PaymentController.handleWebhook(req, res);

        expect(spyConsoleError).toHaveBeenCalledWith(
          "Failed to send subscription renewal payment confirmation email:",
          expect.any(Error)
        );
        expect(spyConsoleError).toHaveBeenCalledWith(
          "Failed to create subscription renewal notification:",
          expect.any(Error)
        );
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });
    });

    describe("customer.subscription.deleted", () => {
      it("should cancel all matching subscriptions in batch", async () => {
        const mockStripeSub = {
          id: "stripe-deleted-sub",
        };

        StripeService.constructEvent.mockReturnValue({
          type: "customer.subscription.deleted",
          data: { object: mockStripeSub },
        });

        const docRef1 = { id: "doc-1" };
        const docRef2 = { id: "doc-2" };

        const mockSubDocs = [
          { ref: docRef1, data: () => ({ userId: "user-del", subscriptionId: "sub-del-1", createdAt: "2026-08-01" }) },
          { ref: docRef2, data: () => ({ userId: "user-del", subscriptionId: "sub-del-2", createdAt: "2026-08-02" }) },
        ];

        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValue({
          empty: false,
          docs: mockSubDocs,
          forEach: (cb) => mockSubDocs.forEach(cb),
        });

        await PaymentController.handleWebhook(req, res);

        expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
        expect(mockBatchUpdate).toHaveBeenCalledWith(docRef1, {
          status: "Cancelled",
          updatedAt: expect.any(String),
        });
        expect(mockBatchUpdate).toHaveBeenCalledWith(docRef2, {
          status: "Cancelled",
          updatedAt: expect.any(String),
        });
        expect(mockBatchCommit).toHaveBeenCalled();
        expect(ActivityModel.logActivity).toHaveBeenCalledWith(
          "user-del",
          expect.objectContaining({
            type: "subscription",
            action: "cancelled",
          })
        );
      });

      it("should skip cancellation if stripeSubscriptionId is missing", async () => {
        StripeService.constructEvent.mockReturnValue({
          type: "customer.subscription.deleted",
          data: { object: {} },
        });

        await PaymentController.handleWebhook(req, res);

        expect(SubscriptionModel.collection.where).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });

      it("should do nothing if no matching subscriptions are found in GKR", async () => {
        StripeService.constructEvent.mockReturnValue({
          type: "customer.subscription.deleted",
          data: { object: { id: "stripe-missing-sub" } },
        });

        SubscriptionModel.collection.where.mockReturnThis();
        SubscriptionModel.collection.get.mockResolvedValue({
          empty: true,
        });

        await PaymentController.handleWebhook(req, res);

        expect(mockBatchCommit).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ received: true });
      });
    });

    it("should return received true and do nothing for unhandled webhook event types", async () => {
      StripeService.constructEvent.mockReturnValue({
        type: "payment_intent.created",
        data: { object: {} },
      });

      await PaymentController.handleWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it("should handle general exceptions in handleWebhook and return 500 error status", async () => {
      StripeService.constructEvent.mockImplementation(() => {
        return { type: "unknown_event" }; // Will throw error when trying to run webhook actions or handleWebhook database processing throws
      });
      // We force database action processing block to fail by throwing in the next line after constructEvent
      StripeService.constructEvent.mockImplementation(() => {
        throw new Error("Simulated general db catch-block error");
      });

      // Signature exists but fails
      req.headers["stripe-signature"] = "sig";

      await PaymentController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400); // constructEvent throws
    });

    it("should handle general exceptions during webhook database action processing and return 500 status", async () => {
      StripeService.constructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              type: "subscription",
            },
          },
        },
      });

      // Force SubscriptionModel.collection query to reject
      SubscriptionModel.collection.where.mockImplementation(() => {
        throw new Error("Firestore down");
      });

      await PaymentController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process webhook events" });
      expect(spyConsoleError).toHaveBeenCalledWith("Error processing webhook database actions:", expect.any(Error));
    });
  });
});
