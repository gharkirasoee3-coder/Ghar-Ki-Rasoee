const SubscriptionController = require("../src/controllers/subscription.controller");
const SubscriptionModel = require("../src/models/subscription.model");
const ResponseUtil = require("../src/utils/response.util");
const cache = require("../src/utils/cache.util");
const admin = require("../src/config/firebase.config");
const ActivityModel = require("../src/models/activity.model");

// Mock Models & Services
jest.mock("../src/models/subscription.model", () => ({
  getUserSubscription: jest.fn(),
  getActiveUserSubscriptions: jest.fn(),
  createSubscription: jest.fn(),
  skipDate: jest.fn(),
  collection: {
    doc: jest.fn(),
  },
}));

jest.mock("../src/models/activity.model", () => ({
  logActivity: jest.fn(),
}));

jest.mock("../src/utils/response.util", () => ({
  send: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../src/utils/cache.util", () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}));

// Mock Firebase Admin
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

// Mock other models required inline
jest.mock("../src/models/menu.model", () => ({
  getMenuConfig: jest.fn(),
  calculateCustomPrice: jest.fn(),
}), { virtual: true });

jest.mock("../src/models/coupon.model", () => ({
  getCoupon: jest.fn(),
  incrementUsage: jest.fn(),
}), { virtual: true });

jest.mock("../src/models/user.model", () => ({
  collection: {
    doc: mockDoc,
  },
}), { virtual: true });

jest.mock("../src/services/stripe.service", () => ({
  cancelSubscription: jest.fn(),
}), { virtual: true });

describe("SubscriptionController", () => {
  let req, res;
  let spyConsoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    spyConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    req = {
      user: { uid: "user-123", email: "user@example.com", name: "User" },
      body: {},
      query: {},
      params: {},
    };

    res = {};

    // Restore default implementation for firestore mocks
    mockDoc.mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      set: mockSet,
      id: "mock-id",
    });
    SubscriptionModel.collection.doc.mockReturnValue({
      get: mockGet,
      update: mockUpdate,
    });
  });

  afterEach(() => {
    spyConsoleError.mockRestore();
  });

  describe("createSubscription", () => {
    it("should fail if plan is missing", async () => {
      req.body = {};
      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Plan is required");
    });

    it("should fail if custom plan has no custom details", async () => {
      req.body = { plan: "Custom" };
      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Custom details are required for custom plan");
    });

    it("should validate custom price and fail if incorrect", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({});
      MenuModel.calculateCustomPrice.mockReturnValue(150);

      req.body = {
        plan: "Custom",
        planDetails: 100,
        customDetails: { roti: 3 },
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        expect.stringContaining("Pricing validation failed")
      );
    });

    it("should handle custom price validation error", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({});
      MenuModel.calculateCustomPrice.mockImplementation(() => {
        throw new Error("Invalid custom options");
      });

      req.body = {
        plan: "Custom",
        planDetails: 150,
        customDetails: { roti: -5 },
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Invalid custom options");
    });

    it("should successfully validate custom price and create subscription", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({});
      MenuModel.calculateCustomPrice.mockReturnValue(150);

      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub-1" });
      mockUpdate.mockResolvedValue({});

      req.body = {
        plan: { name: "Custom" },
        planDetails: 150,
        customDetails: { roti: 3 },
        durationMonths: 2,
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
    });

    it("should fallback planName when plan.name is falsy", async () => {
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub-1" });
      mockUpdate.mockResolvedValue({});

      req.body = {
        plan: { name: "" }, // plan.name is falsy, will fall back to plan object
        planDetails: 190,
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
    });

    it("should handle user address update failure gracefully during subscription", async () => {
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub-1" });
      mockUpdate.mockRejectedValue(new Error("Address update failed"));

      req.body = {
        plan: "Standard",
        planDetails: 190,
      };

      await SubscriptionController.createSubscription(req, res);
      expect(spyConsoleError).toHaveBeenCalledWith("Error updating user address during sub:", expect.any(Error));
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
    });

    it("should handle coupon code verification - invalid coupon", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue(null);

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "INVALID",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Invalid coupon code");
    });

    it("should handle coupon code verification - inactive coupon", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({ isActive: false });

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "INACTIVE",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This coupon is inactive");
    });

    it("should handle coupon code verification - expired coupon", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({ isActive: true, expiresAt: "2020-01-01" });

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "EXPIRED",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This coupon has expired");
    });

    it("should handle coupon code verification - max uses reached", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({ isActive: true, maxUses: 10, usedCount: 10 });

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "LIMIT",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This coupon has reached its usage limit");
    });

    it("should handle coupon code verification - min order amount mismatch", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({ isActive: true, minOrderAmount: 200 });

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "MIN_ORDER",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        expect.stringContaining("Minimum purchase of $200.00 CAD is required")
      );
    });

    it("should apply percentage discount coupon correctly with max cap", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "percentage",
        discountValue: 10,
        maxDiscountAmount: 15,
        minOrderAmount: 0,
      });
      CouponModel.incrementUsage.mockResolvedValue(true);

      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub-1" });
      mockUpdate.mockResolvedValue({});

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "PERCENT_CAP",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
      expect(CouponModel.incrementUsage).toHaveBeenCalledWith("PERCENT_CAP");
    });

    it("should apply percentage discount coupon with no max cap", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "percentage",
        discountValue: 10,
        maxDiscountAmount: null,
        minOrderAmount: 0,
      });
      CouponModel.incrementUsage.mockResolvedValue(true);

      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub-1" });
      mockUpdate.mockResolvedValue({});

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "PERCENT_NO_CAP",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
    });

    it("should handle unknown coupon discountType gracefully", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "invalid-type",
        discountValue: 10,
        minOrderAmount: 0,
      });
      CouponModel.incrementUsage.mockResolvedValue(true);

      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub-1" });
      mockUpdate.mockResolvedValue({});

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "UNKNOWN_TYPE",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
    });

    it("should apply fixed discount coupon correctly", async () => {
      const CouponModel = require("../src/models/coupon.model");
      CouponModel.getCoupon.mockResolvedValue({
        isActive: true,
        discountType: "fixed",
        discountValue: 50,
        minOrderAmount: 0,
      });
      CouponModel.incrementUsage.mockRejectedValue(new Error("Firebase increment usage failed"));

      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "sub-1" });
      mockUpdate.mockResolvedValue({});

      req.body = {
        plan: "Standard",
        planDetails: 190,
        couponCode: "FIXED",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
      expect(spyConsoleError).toHaveBeenCalledWith("Failed to increment coupon usage count:", expect.any(Error));
    });

    it("should replace existing subscription and cancel old Stripe billing", async () => {
      SubscriptionModel.getUserSubscription.mockResolvedValue({
        subscriptionId: "old-sub-1",
        stripeSubscriptionId: "stripe-sub-123",
      });

      const StripeService = require("../src/services/stripe.service");
      StripeService.cancelSubscription.mockResolvedValue(true);

      mockUpdate.mockResolvedValue({});
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "new-sub-1" });

      req.body = {
        plan: "Standard",
        planDetails: 190,
        replacePlan: "true",
      };

      await SubscriptionController.createSubscription(req, res);

      expect(StripeService.cancelSubscription).toHaveBeenCalledWith("stripe-sub-123");
      expect(mockUpdate).toHaveBeenCalled();
      expect(cache.delete).toHaveBeenCalledWith("user_subscription_user-123");
      expect(cache.delete).toHaveBeenCalledWith("user_subscriptions_user-123");
    });

    it("should replace existing subscription but skip Stripe cancel if no stripeSubscriptionId", async () => {
      SubscriptionModel.getUserSubscription.mockResolvedValue({
        subscriptionId: "old-sub-1",
      });

      mockUpdate.mockResolvedValue({});
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "new-sub-1" });

      req.body = {
        plan: "Standard",
        planDetails: 190,
        replacePlan: "true",
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
    });

    it("should skip replacing existing subscription when replacePlan is false or 'false'", async () => {
      mockUpdate.mockResolvedValue({});
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "new-sub-1" });

      req.body = {
        plan: "Standard",
        planDetails: 190,
        replacePlan: false,
      };

      await SubscriptionController.createSubscription(req, res);
      expect(SubscriptionModel.getUserSubscription).not.toHaveBeenCalled();

      req.body.replacePlan = "false";
      await SubscriptionController.createSubscription(req, res);
      expect(SubscriptionModel.getUserSubscription).not.toHaveBeenCalled();
    });

    it("should handle error when canceling Stripe subscription fails", async () => {
      SubscriptionModel.getUserSubscription.mockResolvedValue({
        subscriptionId: "old-sub-1",
        stripeSubscriptionId: "stripe-sub-123",
      });

      const StripeService = require("../src/services/stripe.service");
      StripeService.cancelSubscription.mockRejectedValue(new Error("Stripe cancel failed"));

      mockUpdate.mockResolvedValue({});
      SubscriptionModel.createSubscription.mockResolvedValue({ subscriptionId: "new-sub-1" });

      req.body = {
        plan: "Standard",
        planDetails: 190,
        replacePlan: "true",
      };

      await SubscriptionController.createSubscription(req, res);

      expect(spyConsoleError).toHaveBeenCalledWith("Failed to cancel old Stripe subscription billing:", expect.any(Error));
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Subscription created", expect.any(Object));
    });

    it("should handle general subscription creation error", async () => {
      SubscriptionModel.createSubscription.mockRejectedValue(new Error("Database crash"));

      req.body = {
        plan: "Standard",
        planDetails: 190,
      };

      await SubscriptionController.createSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to create subscription", expect.any(Error));
    });
  });

  describe("getSubscription", () => {
    it("should fetch subscription by ID - success", async () => {
      req.query = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ userId: "user-123", plan: "Standard" }),
      });

      await SubscriptionController.getSubscription(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription fetched", expect.any(Object));
    });

    it("should return 404 if subscription ID not found", async () => {
      req.query = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({ exists: false });

      await SubscriptionController.getSubscription(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Subscription not found");
    });

    it("should return 403 if subscription belongs to another user", async () => {
      req.query = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ userId: "other-user", plan: "Standard" }),
      });

      await SubscriptionController.getSubscription(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 403, "Unauthorized access to subscription");
    });

    it("should fetch active subscriptions from cache - hit", async () => {
      cache.get.mockReturnValue([{ subscriptionId: "sub-cached" }]);

      await SubscriptionController.getSubscription(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        200,
        "Active subscriptions fetched (cached)",
        expect.any(Array)
      );
    });

    it("should fetch active subscriptions from DB and cache them - miss", async () => {
      cache.get.mockReturnValue(null);
      SubscriptionModel.getActiveUserSubscriptions.mockResolvedValue([{ subscriptionId: "sub-db" }]);

      await SubscriptionController.getSubscription(req, res);

      expect(SubscriptionModel.getActiveUserSubscriptions).toHaveBeenCalledWith("user-123");
      expect(cache.set).toHaveBeenCalledWith("user_subscriptions_user-123", expect.any(Array), 300);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Active subscriptions fetched", expect.any(Array));
    });

    it("should handle subscription fetch errors", async () => {
      req.query = { subscriptionId: "sub-123" };
      mockGet.mockRejectedValue(new Error("Firestore offline"));

      await SubscriptionController.getSubscription(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to fetch subscription", expect.any(Error));
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel sub by ID - success", async () => {
      req.body = { subscriptionId: "sub-123", reason: "Too expensive" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", status: "Active", stripeSubscriptionId: "stripe-123" }),
      });

      const StripeService = require("../src/services/stripe.service");
      StripeService.cancelSubscription.mockResolvedValue(true);

      mockUpdate.mockResolvedValue({});
      mockBatchCommit.mockResolvedValue({});

      // Mock query snapshot of orders
      const mockOrderDocs = [
        {
          data: () => ({ subscriptionId: "sub-123", deliveryDate: "2030-01-01", status: "Cooking" }),
          ref: "order-doc-ref-1",
        },
        {
          data: () => ({ subscriptionId: "other-sub", deliveryDate: "2030-01-01", status: "Cooking" }),
          ref: "order-doc-ref-2",
        },
        {
          data: () => ({ subscriptionId: "sub-123", deliveryDate: "2020-01-01", status: "Cooking" }),
          ref: "order-doc-ref-3",
        },
        {
          data: () => ({ subscriptionId: "sub-123", deliveryDate: "2030-01-01", status: "Delivered" }),
          ref: "order-doc-ref-4",
        },
      ];
      mockCollection.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          forEach: (callback) => mockOrderDocs.forEach(callback),
        }),
      });

      await SubscriptionController.cancelSubscription(req, res);

      expect(StripeService.cancelSubscription).toHaveBeenCalledWith("stripe-123");
      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(ActivityModel.logActivity).toHaveBeenCalledWith("user-123", expect.objectContaining({ type: "cancel" }));
      expect(cache.delete).toHaveBeenCalledWith("user_subscriptions_user-123");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription cancelled", expect.any(Object));
    });

    it("should return 404 if sub by ID not found", async () => {
      req.body = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({ exists: false });

      await SubscriptionController.cancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Subscription not found");
    });

    it("should return 403 if sub belongs to another user", async () => {
      req.body = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "other-user", status: "Active" }),
      });

      await SubscriptionController.cancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 403, "Unauthorized access to subscription");
    });

    it("should cancel active user subscription if ID not passed in body", async () => {
      SubscriptionModel.getUserSubscription.mockResolvedValue({
        subscriptionId: "sub-user-active",
        userId: "user-123",
        status: "Active",
      });

      mockUpdate.mockResolvedValue({});

      mockCollection.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          forEach: () => {},
        }),
      });

      await SubscriptionController.cancelSubscription(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription cancelled", expect.any(Object));
    });

    it("should return 404 if no active subscription found to cancel", async () => {
      SubscriptionModel.getUserSubscription.mockResolvedValue(null);

      await SubscriptionController.cancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "No active subscription to cancel");
    });

    it("should handle Stripe cancellation failure during subscription cancellation", async () => {
      req.body = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", status: "Active", stripeSubscriptionId: "stripe-123" }),
      });

      const StripeService = require("../src/services/stripe.service");
      StripeService.cancelSubscription.mockRejectedValue(new Error("Stripe network error"));

      mockUpdate.mockResolvedValue({});
      mockCollection.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          forEach: () => {},
        }),
      });

      await SubscriptionController.cancelSubscription(req, res);

      expect(spyConsoleError).toHaveBeenCalledWith("Failed to cancel Stripe subscription billing:", expect.any(Error));
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription cancelled", expect.any(Object));
    });

    it("should handle error during cancellation process", async () => {
      req.body = { subscriptionId: "sub-123" };
      mockGet.mockRejectedValue(new Error("Firestore write error"));

      await SubscriptionController.cancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to cancel subscription", expect.any(Error));
    });
  });

  describe("skipDate", () => {
    it("should fail if date is missing", async () => {
      await SubscriptionController.skipDate(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Date is required");
    });

    it("should skip date by subscription ID - success", async () => {
      req.body = { date: "2030-01-01", subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", status: "Active", skippedDates: ["2029-12-31"], endDate: "2030-02-01" }),
      });

      SubscriptionModel.skipDate.mockResolvedValue({ newEndDate: "2030-02-02" });

      await SubscriptionController.skipDate(req, res);

      expect(SubscriptionModel.skipDate).toHaveBeenCalledWith("sub-123", "2030-01-01", "2030-02-01");
      expect(ActivityModel.logActivity).toHaveBeenCalledWith("user-123", expect.objectContaining({ type: "skip" }));
      expect(cache.delete).toHaveBeenCalledWith("user_subscriptions_user-123");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Date skipped successfully", expect.any(Object));
    });

    it("should skip date successfully when skippedDates is null/undefined initially", async () => {
      req.body = { date: "2030-01-01", subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", status: "Active", endDate: "2030-02-01" }),
      });

      SubscriptionModel.skipDate.mockResolvedValue({ newEndDate: "2030-02-02" });

      await SubscriptionController.skipDate(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        200,
        "Date skipped successfully",
        expect.objectContaining({ totalSkippedDates: 1 })
      );
    });

    it("should return 404 if subscription ID not found", async () => {
      req.body = { date: "2030-01-01", subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({ exists: false });

      await SubscriptionController.skipDate(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Subscription not found");
    });

    it("should return 403 if sub belongs to another user", async () => {
      req.body = { date: "2030-01-01", subscriptionId: "sub-123" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "other-user" }),
      });

      await SubscriptionController.skipDate(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 403, "Unauthorized access to subscription");
    });

    it("should return 404 if no subscription ID passed and user has no active subscription", async () => {
      req.body = { date: "2030-01-01" };
      SubscriptionModel.getUserSubscription.mockResolvedValue(null);

      await SubscriptionController.skipDate(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "No active subscription found");
    });

    it("should return 400 if subscription is not active", async () => {
      req.body = { date: "2030-01-01" };
      SubscriptionModel.getUserSubscription.mockResolvedValue({
        subscriptionId: "sub-123",
        userId: "user-123",
        status: "Pending",
      });

      await SubscriptionController.skipDate(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Can only skip dates for active subscriptions");
    });

    it("should return 400 if date is already skipped", async () => {
      req.body = { date: "2030-01-01" };
      SubscriptionModel.getUserSubscription.mockResolvedValue({
        subscriptionId: "sub-123",
        userId: "user-123",
        status: "Active",
        skippedDates: ["2030-01-01"],
      });

      await SubscriptionController.skipDate(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This date is already skipped");
    });

    it("should handle error during skipDate process", async () => {
      req.body = { date: "2030-01-01" };
      SubscriptionModel.getUserSubscription.mockRejectedValue(new Error("Skip failed"));

      await SubscriptionController.skipDate(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to skip date", expect.any(Error));
    });
  });

  describe("createReview", () => {
    it("should fail if subscriptionId is missing", async () => {
      await SubscriptionController.createReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Subscription ID is required");
    });

    it("should fail if rating is invalid", async () => {
      req.body = { subscriptionId: "sub-123", rating: 6 };
      await SubscriptionController.createReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Rating must be an integer between 1 and 5");
    });

    it("should fail if title or comment is missing", async () => {
      req.body = { subscriptionId: "sub-123", rating: 5 };
      await SubscriptionController.createReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Title and comment are required");
    });

    it("should return 404 if subscription not found", async () => {
      req.body = { subscriptionId: "sub-123", rating: 5, title: "Great", comment: "Tasty" };
      mockGet.mockResolvedValue({ exists: false });

      await SubscriptionController.createReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Subscription not found");
    });

    it("should return 403 if subscription belongs to another user", async () => {
      req.body = { subscriptionId: "sub-123", rating: 5, title: "Great", comment: "Tasty" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ userId: "other-user" }),
      });

      await SubscriptionController.createReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 403, "Unauthorized to review this subscription");
    });

    it("should successfully create review and log activity", async () => {
      req.body = { subscriptionId: "sub-123", rating: 5, title: "Great", comment: "Tasty" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ userId: "user-123", plan: "Premium" }),
      });

      mockSet.mockResolvedValue({});

      await SubscriptionController.createReview(req, res);

      expect(mockSet).toHaveBeenCalled();
      expect(ActivityModel.logActivity).toHaveBeenCalledWith("user-123", expect.objectContaining({ type: "review" }));
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 201, "Review submitted successfully", expect.any(Object));
    });

    it("should handle missing user name/email gracefully in createReview", async () => {
      req.user = { uid: "user-123" }; // no name or email
      req.body = { subscriptionId: "sub-123", rating: 5, title: "Great", comment: "Tasty" };
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ userId: "user-123" }), // no plan name
      });

      mockSet.mockResolvedValue({});

      await SubscriptionController.createReview(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        201,
        "Review submitted successfully",
        expect.objectContaining({ userName: "Anonymous", userEmail: "", plan: "Unknown Plan" })
      );
    });

    it("should handle error during review creation", async () => {
      req.body = { subscriptionId: "sub-123", rating: 5, title: "Great", comment: "Tasty" };
      mockGet.mockRejectedValue(new Error("Firestore write error"));

      await SubscriptionController.createReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to submit review", expect.any(Error));
    });
  });
});
