const ResponseUtil = require("../src/utils/response.util");
const cache = require("../src/utils/cache.util");
const admin = require("../src/config/firebase.config");
const SubscriptionModel = require("../src/models/subscription.model");
const NotificationModel = require("../src/models/notification.model");
const ActivityModel = require("../src/models/activity.model");
const EmailService = require("../src/services/email.service");

// Mock core files
jest.mock("../src/utils/response.util", () => ({
  send: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../src/utils/cache.util", () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}));

jest.mock("../src/models/subscription.model", () => ({
  getAllSubscriptions: jest.fn(),
}));

jest.mock("../src/models/notification.model", () => ({
  create: jest.fn(),
  getByUserId: jest.fn(),
}));

jest.mock("../src/models/activity.model", () => ({
  logActivity: jest.fn(),
  getUserActivities: jest.fn(),
}));

jest.mock("../src/services/email.service", () => ({
  sendPaymentConfirmationEmail: jest.fn(),
}));

// Mock virtual models loaded dynamically
jest.mock("../src/models/customization.model", () => ({
  getBySubscription: jest.fn(),
}), { virtual: true });

jest.mock("../src/models/menu.model", () => ({
  getMenuConfig: jest.fn(),
  updateMenuConfig: jest.fn(),
  getDayMenu: jest.fn(),
}), { virtual: true });

jest.mock("../src/services/scheduler.service", () => ({
  generateDailyOrders: jest.fn(),
}), { virtual: true });

// Mock Cloudinary config
const mockUploadStream = {
  end: jest.fn().mockImplementation(function(buffer) {
    if (this._callback) {
      this._callback(this._error, this._result);
    }
  }),
};
const mockCloudinary = {
  uploader: {
    upload_stream: jest.fn().mockImplementation((options, callback) => {
      mockUploadStream._callback = callback;
      return mockUploadStream;
    }),
  },
};
jest.mock("../src/config/cloudinary.config", () => mockCloudinary, { virtual: true });

// Mock Firestore
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockSet = jest.fn();
const mockDocRef = {
  get: mockGet,
  update: mockUpdate,
  delete: mockDelete,
  set: mockSet,
  id: "doc-id-123",
};
const mockDoc = jest.fn(() => mockDocRef);

const mockQuerySnapshot = {
  size: 0,
  empty: true,
  forEach: jest.fn(),
  docs: [],
};

const mockCollectionRef = {
  doc: mockDoc,
  get: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

const mockCollection = jest.fn();

const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatch = jest.fn(() => ({
  update: mockBatchUpdate,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));

// Setup Firestore Mock exports on config
jest.mock("../src/config/firebase.config", () => {
  return {
    firestore: () => ({
      collection: mockCollection,
      batch: mockBatch,
    }),
  };
});

// Require controller after the mocks are fully defined
const AdminController = require("../src/controllers/admin.controller");

describe("AdminController", () => {
  let req, res;
  let spyConsoleLog;
  let spyConsoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    spyConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
    spyConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    req = {
      params: {},
      body: {},
      query: {},
      user: { uid: "admin-uid" },
    };
    res = {};

    // Reset default firestore behaviors
    mockDocRef.id = "doc-id-123";
    mockCollectionRef.get.mockReset();
    mockCollectionRef.get.mockResolvedValue(mockQuerySnapshot);

    mockCollection.mockReset();
    mockCollection.mockReturnValue(mockCollectionRef);

    mockGet.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
    mockSet.mockReset();

    mockBatchUpdate.mockReset();
    mockBatchDelete.mockReset();
    mockBatchCommit.mockReset();

    mockQuerySnapshot.size = 0;
    mockQuerySnapshot.empty = true;
    mockQuerySnapshot.forEach = jest.fn();
    mockQuerySnapshot.docs = [];

    NotificationModel.create.mockReset();
    NotificationModel.create.mockResolvedValue(true);

    ActivityModel.logActivity.mockReset();
    ActivityModel.logActivity.mockResolvedValue(true);

    EmailService.sendPaymentConfirmationEmail.mockReset();
    EmailService.sendPaymentConfirmationEmail.mockResolvedValue(true);
  });

  afterEach(() => {
    spyConsoleLog.mockRestore();
    spyConsoleError.mockRestore();
  });

  describe("getDashboardStats", () => {
    it("should return cached stats if present", async () => {
      cache.get.mockReturnValue({ totalOrders: 10 });
      await AdminController.getDashboardStats(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Dashboard stats fetched (cached)", { totalOrders: 10 });
    });

    it("should fetch, calculate and return dashboard stats", async () => {
      cache.get.mockReturnValue(null);

      // Orders Mock (6 orders to cover recentOrders.length < 5 false branch, price fallback, and paymentMethod fallback)
      const mockOrders = [
        { id: "o1", data: () => ({ userId: "u1", paymentMethod: "Card", createdAt: "2026-08-01" }) }, // price missing (falls back to 0)
        { id: "o2", data: () => ({ userId: "u2", price: 50, paymentMethod: "Prepaid (Subscription)", subscriptionId: "s1", createdAt: "2026-08-02" }) }, // prepaid sub
        { id: "o3", data: () => ({ userId: "u3", price: 120, createdAt: "2026-08-03" }) }, // paymentMethod missing (falls back to Online)
        { id: "o4", data: () => ({ userId: "u4", price: 80, paymentMethod: "Card", createdAt: "2026-08-04" }) },
        { id: "o5", data: () => ({ userId: "u5", price: 200, paymentMethod: "Card", createdAt: "2026-08-05" }) },
        { id: "o6", data: () => ({ userId: "u6", price: 300, paymentMethod: "Card", createdAt: "2026-08-06" }) },
      ];
      const ordersSnapshot = {
        size: 6,
        forEach: (cb) => mockOrders.forEach(cb),
      };

      // Users Mock
      const mockUsers = [
        { data: () => ({ role: "customer" }) },
        { data: () => ({ role: "admin" }) },
      ];
      const usersSnapshot = {
        forEach: (cb) => mockUsers.forEach(cb),
      };

      // Subscriptions Mock
      const mockSubs = [
        { id: "s1", data: () => ({ paymentStatus: "Paid", planDetails: { price: 190 }, paymentMethod: "upi" }) },
        { id: "s2", data: () => ({ paymentStatus: "Paid", price: 150, paymentMethod: "card" }) },
        { id: "s3", data: () => ({ paymentStatus: "Paid", paymentMethod: "cash" }) },
        { id: "s4", data: () => ({ paymentStatus: "Pending", price: 100, paymentMethod: "upi" }) },
      ];
      const subscriptionsSnapshot = {
        forEach: (cb) => mockSubs.forEach(cb),
      };

      mockCollection.mockImplementation((name) => {
        if (name === "orders") return { get: () => Promise.resolve(ordersSnapshot) };
        if (name === "users") return { get: () => Promise.resolve(usersSnapshot) };
        if (name === "subscriptions") return { get: () => Promise.resolve(subscriptionsSnapshot) };
      });

      await AdminController.getDashboardStats(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Dashboard stats fetched", expect.any(Object));
      expect(cache.set).toHaveBeenCalledWith("admin_dashboard_stats", expect.any(Object), 60);
    });

    it("should fall back rawMethod to userSub/card if sub is missing during stat calculation", async () => {
      cache.get.mockReturnValue(null);
      const mockOrders = [
        { id: "o1", data: () => ({ userId: "u2", price: 50, paymentMethod: "Prepaid (Subscription)", subscriptionId: "missing-sub", createdAt: "2026-08-02" }) },
        { id: "o2", data: () => ({ userId: "u3", price: 50, paymentMethod: "Prepaid (Subscription)", subscriptionId: "missing-sub-2", createdAt: "2026-08-02" }) },
      ];
      const ordersSnapshot = {
        size: 2,
        forEach: (cb) => mockOrders.forEach(cb),
      };

      const mockUsers = [];
      const usersSnapshot = { forEach: (cb) => mockUsers.forEach(cb) };

      // User has another active sub in subMap
      const mockSubs = [
        { id: "s2", data: () => ({ userId: "u2", status: "Active", paymentMethod: "apple_pay" }) },
      ];
      const subscriptionsSnapshot = { forEach: (cb) => mockSubs.forEach(cb) };

      mockCollection.mockImplementation((name) => {
        if (name === "orders") return { get: () => Promise.resolve(ordersSnapshot) };
        if (name === "users") return { get: () => Promise.resolve(usersSnapshot) };
        if (name === "subscriptions") return { get: () => Promise.resolve(subscriptionsSnapshot) };
      });

      await AdminController.getDashboardStats(req, res);
      expect(ResponseUtil.send).toHaveBeenCalled();
    });

    it("should handle error in getDashboardStats", async () => {
      cache.get.mockReturnValue(null);
      mockCollection.mockImplementation(() => {
        throw new Error("Firestore down");
      });

      await AdminController.getDashboardStats(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to fetch stats", expect.any(Error));
    });
  });

  describe("getAllSubscriptions", () => {
    it("should return cached subs if present", async () => {
      cache.get.mockReturnValue([{ id: "s1" }]);
      await AdminController.getAllSubscriptions(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscriptions fetched (cached)", expect.any(Array));
    });

    it("should fetch, enrich and cache all subscriptions", async () => {
      cache.get.mockReturnValue(null);
      SubscriptionModel.getAllSubscriptions.mockResolvedValue([
        { subscriptionId: "s1", userId: "u1" },
        { subscriptionId: "s2", userId: "u2" },
      ]);

      mockGet.mockImplementation(function() {
        // Mock user lookup
        return Promise.resolve({
          exists: true,
          data: () => ({ name: "Customer One", email: "c1@example.com", phone: "123" }),
        });
      });

      await AdminController.getAllSubscriptions(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscriptions fetched", expect.any(Array));
    });

    it("should enrich with email split name if name missing, or handle user lookup errors", async () => {
      cache.get.mockReturnValue(null);
      SubscriptionModel.getAllSubscriptions.mockResolvedValue([
        { subscriptionId: "s1", userId: "u1" },
        { subscriptionId: "s2", userId: "u2" },
        { subscriptionId: "s3", userId: "u3" },
        { subscriptionId: "s4", userId: "u4" },
      ]);

      // doc 1 exists but name missing. doc 2 does not exist. doc 3 exists but all fields missing. doc 4 throws error.
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            exists: true,
            data: () => ({ email: "c1@example.com" }),
          });
        }
        if (callCount === 2) {
          return Promise.resolve({
            exists: false,
          });
        }
        if (callCount === 3) {
          return Promise.resolve({
            exists: true,
            data: () => ({}),
          });
        }
        return Promise.reject(new Error("Firebase query error"));
      });

      await AdminController.getAllSubscriptions(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscriptions fetched", expect.any(Array));
    });

    it("should handle error in getAllSubscriptions", async () => {
      cache.get.mockReturnValue(null);
      SubscriptionModel.getAllSubscriptions.mockRejectedValue(new Error("DB error"));

      await AdminController.getAllSubscriptions(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to fetch subscriptions", expect.any(Error));
    });
  });

  describe("deleteSubscription", () => {
    it("should return 400 if subscriptionId is missing", async () => {
      await AdminController.deleteSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Subscription ID is required");
    });

    it("should delete subscription and customizations", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockDelete.mockResolvedValue({});
      mockBatchCommit.mockResolvedValue({});

      // Mock customization snapshot
      const mockCustomizations = [{ ref: "c-ref" }];
      mockCollectionRef.get.mockResolvedValue({
        empty: false,
        forEach: (cb) => mockCustomizations.forEach(cb),
      });

      await AdminController.deleteSubscription(req, res);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockBatchDelete).toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(cache.delete).toHaveBeenCalledWith("admin_all_subscriptions");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription deleted successfully", expect.any(Object));
    });

    it("should handle error in deleteSubscription", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockDelete.mockRejectedValue(new Error("Delete failed"));

      await AdminController.deleteSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to delete subscription", expect.any(Error));
    });

    it("should delete subscription successfully when customization snapshot is empty", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockDelete.mockResolvedValue({});

      mockCollectionRef.get.mockResolvedValue({
        empty: true,
      });

      await AdminController.deleteSubscription(req, res);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockBatchDelete).not.toHaveBeenCalled();
      expect(cache.delete).toHaveBeenCalledWith("admin_all_subscriptions");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription deleted successfully", expect.any(Object));
    });
  });

  describe("getTodayDeliveries", () => {
    it("should return cached deliveries if present", async () => {
      cache.get.mockReturnValue({ deliveries: [] });
      await AdminController.getTodayDeliveries(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Today's deliveries fetched (cached)", expect.any(Object));
    });

    it("should generate, enrich and cache today's deliveries list", async () => {
      cache.get.mockReturnValue(null);

      // Active subscriptions snapshot
      const mockSubDocs = [
        {
          data: () => ({ subscriptionId: "s1", userId: "u1", plan: "Premium", preferences: { defaultMeal: "Non-Veg" } }),
        },
      ];
      mockCollectionRef.get.mockResolvedValueOnce({
        docs: mockSubDocs,
      });

      // User lookup
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: "Customer", email: "customer@example.com", phone: "12345", address: "68 Albion" }),
      });

      // Customization Mock
      const CustomizationModel = require("../src/models/customization.model");
      CustomizationModel.getBySubscription.mockResolvedValue({
        preferences: {
          sunday: { sideOption: "Salad", side_option: "Salad", extraNote: "" },
        },
      });

      // Menu Mock
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getDayMenu.mockResolvedValue({
        roti: 4,
        raita: true,
        sabziOptions: ["Aloo", "Gobi"],
      });

      // Order scheduler lookup
      mockCollectionRef.get.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "order-123", data: () => ({ status: "Cooking" }) }],
      });

      // Force weekday to Sunday for consistency
      const mockDate = new Date("2026-08-02"); // August 2, 2026 is Sunday
      jest.useFakeTimers().setSystemTime(mockDate);

      await AdminController.getTodayDeliveries(req, res);

      jest.useRealTimers();

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Today's deliveries fetched", expect.any(Object));
    });

    it("should generate today's deliveries list - handle skipped and default fallbacks", async () => {
      cache.get.mockReturnValue(null);

      // Active subscriptions snapshot
      const mockSubDocs = [
        {
          data: () => ({ subscriptionId: "s1", userId: "u1", plan: "Basic", skippedDates: ["2026-08-02"] }), // Skipped
        },
        {
          data: () => ({ subscriptionId: "s2", userId: "u2", plan: "Basic" }),
        },
        {
          data: () => ({ subscriptionId: "s3", userId: "u3", plan: "Standard" }),
        },
        {
          data: () => ({ subscriptionId: "s4", userId: "u4", plan: "PremiumFallback" }), // premium side option fallback
        },
        {
          data: () => ({ subscriptionId: "s5", userId: "u5" }), // plan missing, triggers falsy plan fallback
        },
        {
          data: () => ({ subscriptionId: "s6", userId: "u6", plan: "Premium" }), // premium plan default fallback
        },
        {
          data: () => ({ subscriptionId: "s7", userId: "u7", plan: "PremiumSpecialFallback" }), // Saturday special missing options fallback
        },
        {
          data: () => ({ subscriptionId: "s8", userId: "u8", plan: "Basic", deliveryDays: ["monday"] }), // skipped because today is Sunday
        },
      ];
      mockCollectionRef.get.mockResolvedValueOnce({ docs: mockSubDocs });

      // User lookup for each loop iteration (since s1 is skipped, it makes 6 calls total)
      mockGet.mockResolvedValueOnce({
        exists: false, // For s2: user doc not found (line 242 false branch)
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}), // For s3: user exists but name and email are missing (line 252 falsy fallback)
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: "Customer Four" }), // For s4
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: "Customer Five" }), // For s5
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: "Customer Six" }), // For s6
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: "Customer Seven" }), // For s7
      });

      // Customization Mock
      const CustomizationModel = require("../src/models/customization.model");
      CustomizationModel.getBySubscription.mockResolvedValue(null);

      // Menu Mock (Saturday Special & regular options)
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getDayMenu.mockImplementation((plan, day) => {
        if (plan === "PremiumFallback" && day === "monday") {
          return Promise.resolve({
            isSaturdaySpecial: true,
            specialFoodOptions: ["Biryani"],
            dessertOptions: ["Kheer"],
          });
        }
        if (plan === "PremiumSpecialFallback" && day === "monday") {
          return Promise.resolve({
            isSaturdaySpecial: true, // Special food options and dessert options missing
          });
        }
        if (plan === "Basic" && day === "monday") {
          return Promise.resolve({
            isSaturdaySpecial: false,
            sabziSet1: ["Paneer Tikka"], // line 273 true branch
            sabziSet2: ["Dal Makhani"],  // line 274 true branch
            roti: 4,
            raita: true,
          });
        }
        if (plan === "Standard" && day === "monday") {
          return Promise.resolve({
            isSaturdaySpecial: false,
            sabziOptions: ["Aloo Gobhi"], // length 1 to test line 277 false branch
            roti: 4,
            raitaType: "Boondi Raita",
          });
        }
        return Promise.resolve(null);
      });

      const mockDate = new Date("2026-08-02");
      jest.useFakeTimers().setSystemTime(mockDate);

      await AdminController.getTodayDeliveries(req, res);

      jest.useRealTimers();
      expect(ResponseUtil.send).toHaveBeenCalled();
    });

    it("should generate today's deliveries list - handle default menu plan fallbacks when daily menu is missing", async () => {
      cache.get.mockReturnValue(null);

      // Subscriptions for each plan type
      const mockSubDocs = [
        { data: () => ({ subscriptionId: "s1", userId: "u1", plan: "Basic" }) },
        { data: () => ({ subscriptionId: "s2", userId: "u2", plan: "Standard" }) },
        { data: () => ({ subscriptionId: "s3", userId: "u3", plan: "Premium" }) },
        { data: () => ({ subscriptionId: "s4", userId: "u4", plan: "Custom" }) },
      ];
      mockCollectionRef.get.mockResolvedValueOnce({ docs: mockSubDocs });

      // User lookup
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ email: "customer@example.com" }),
      });

      // Customization missing
      const CustomizationModel = require("../src/models/customization.model");
      CustomizationModel.getBySubscription.mockResolvedValue(null);

      // Menu config missing
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getDayMenu.mockResolvedValue(null);

      const mockDate = new Date("2026-08-02");
      jest.useFakeTimers().setSystemTime(mockDate);

      await AdminController.getTodayDeliveries(req, res);

      jest.useRealTimers();
      expect(ResponseUtil.send).toHaveBeenCalled();
    });

    it("should handle error in getTodayDeliveries", async () => {
      cache.get.mockReturnValue(null);
      mockCollectionRef.get.mockRejectedValue(new Error("Query failed"));

      await AdminController.getTodayDeliveries(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to fetch today's deliveries", expect.any(Error));
    });
  });

  describe("getSubscriptionDetails", () => {
    it("should return 404 if subscription not found", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValueOnce({ exists: false });

      await AdminController.getSubscriptionDetails(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Subscription not found");
    });

    it("should fetch subscription details and customizations", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123" }),
      });

      // User details mock (name missing, triggers email splitting)
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "c1@example.com", phone: "123" }),
      });

      // Customization Mock
      const CustomizationModel = require("../src/models/customization.model");
      CustomizationModel.getBySubscription.mockResolvedValue({ id: "cust-123" });

      await AdminController.getSubscriptionDetails(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription details fetched", expect.any(Object));
    });

    it("should fetch subscription details with fallback fields when user and customization are missing", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123" }),
      });

      // User details mock (not found)
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      // Customization Mock (not found)
      const CustomizationModel = require("../src/models/customization.model");
      CustomizationModel.getBySubscription.mockResolvedValue(null);

      await AdminController.getSubscriptionDetails(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription details fetched", expect.any(Object));
    });

    it("should handle error in getSubscriptionDetails", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockRejectedValue(new Error("Firestore down"));

      await AdminController.getSubscriptionDetails(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to fetch details", expect.any(Error));
    });
  });

  describe("updateDeliveryStatus", () => {
    it("should return 400 if orderId or status missing", async () => {
      await AdminController.updateDeliveryStatus(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "OrderId and status are required");
    });

    it("should update status and clear caches", async () => {
      req.body = { orderId: "order-123", status: "Delivered" };
      mockUpdate.mockResolvedValue({});

      await AdminController.updateDeliveryStatus(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(cache.delete).toHaveBeenCalledWith("admin_dashboard_stats");
      expect(cache.delete).toHaveBeenCalledWith("admin_today_deliveries");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Delivery status updated", expect.any(Object));
    });

    it("should handle error in updateDeliveryStatus", async () => {
      req.body = { orderId: "order-123", status: "Delivered" };
      mockUpdate.mockRejectedValue(new Error("Update failed"));

      await AdminController.updateDeliveryStatus(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to update delivery status", expect.any(Error));
    });
  });

  describe("triggerScheduler", () => {
    it("should run scheduler service", async () => {
      const SchedulerService = require("../src/services/scheduler.service");
      SchedulerService.generateDailyOrders.mockResolvedValue(true);

      await AdminController.triggerScheduler(req, res);

      expect(SchedulerService.generateDailyOrders).toHaveBeenCalled();
      expect(cache.delete).toHaveBeenCalledWith("admin_dashboard_stats");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Daily orders generated successfully");
    });

    it("should handle scheduler error", async () => {
      const SchedulerService = require("../src/services/scheduler.service");
      SchedulerService.generateDailyOrders.mockRejectedValue(new Error("Scheduler failure"));

      await AdminController.triggerScheduler(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to trigger scheduler", expect.any(Error));
    });
  });

  describe("getAllUsers", () => {
    it("should return cached users if present", async () => {
      cache.get.mockReturnValue([]);
      await AdminController.getAllUsers(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Users fetched (cached)", expect.any(Array));
    });

    it("should fetch, build subscription summaries, sort and return all users", async () => {
      cache.get.mockReturnValue(null);

      const mockUsers = [
        { id: "u1", data: () => ({ name: "Z-Customer", email: "z@example.com", role: "customer" }) },
        { id: "u2", data: () => ({ email: "a-customer@example.com", role: "customer" }) }, // name missing
        { id: "u3", data: () => ({ name: "M-Customer", email: "m@example.com", role: "customer" }) },
        { id: "u4", data: () => ({ name: "B-Customer", email: "b@example.com", role: "customer" }) },
        { id: "u5", data: () => ({}) }, // empty user for fallbacks (name, email, role)
      ];
      const usersSnapshot = {
        forEach: (cb) => mockUsers.forEach(cb),
      };

      const mockSubs = [
        { id: "s1", data: () => ({ userId: "u1", subscriptionId: "s1", plan: "Basic", status: "Inactive", createdAt: "2026-08-01" }) },
        { id: "s2", data: () => ({ userId: "u1", subscriptionId: "s2", plan: "Premium", status: "Inactive", createdAt: "2026-08-02" }) }, // newer sub
        { id: "s3", data: () => ({ subscriptionId: "s3", plan: "Basic", status: "Inactive", createdAt: "2026-08-01" }) }, // missing userId
        { id: "s4", data: () => ({ userId: "u3", subscriptionId: "s4", plan: "Basic", status: "Active", createdAt: "2026-08-01" }) },
        { id: "s5", data: () => ({ userId: "u4", subscriptionId: "s5", plan: "Basic", status: "Active", createdAt: "2026-08-01" }) },
        { id: "s6", data: () => ({ userId: "u1", subscriptionId: "s6", plan: "Basic", status: "Inactive", createdAt: "2026-07-30" }) }, // older sub (date comparison false branch)
      ];
      const subscriptionsSnapshot = {
        forEach: (cb) => mockSubs.forEach(cb),
      };

      mockCollection.mockImplementation((name) => {
        if (name === "users") return { get: () => Promise.resolve(usersSnapshot) };
        if (name === "subscriptions") return { get: () => Promise.resolve(subscriptionsSnapshot) };
      });

      await AdminController.getAllUsers(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Users fetched", expect.any(Array));
    });

    it("should handle error in getAllUsers", async () => {
      cache.get.mockReturnValue(null);
      mockCollection.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await AdminController.getAllUsers(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to fetch users", expect.any(Error));
    });
  });

  describe("getUserDetail", () => {
    it("should return 404 if user not found", async () => {
      req.params = { userId: "user-123" };
      mockGet.mockResolvedValueOnce({ exists: false });

      await AdminController.getUserDetail(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "User not found");
    });

    it("should fetch profile, customizations, activity and notifications", async () => {
      req.params = { userId: "user-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "himanshu@example.com" }),
      });

      // Subscriptions query mock (multiple items to trigger sorting)
      const mockSubs = [
        { subscriptionId: "s1", createdAt: "2026-08-01", userId: "user-123" },
        { subscriptionId: "s2", createdAt: "2026-08-02", userId: "user-123" },
      ];
      mockCollectionRef.get.mockResolvedValueOnce({
        empty: false,
        docs: mockSubs.map(s => ({ data: () => s })),
      });

      const CustomizationModel = require("../src/models/customization.model");
      CustomizationModel.getBySubscription.mockResolvedValue({ preferences: {} });
      ActivityModel.getUserActivities.mockResolvedValue([]);
      NotificationModel.getByUserId.mockResolvedValue([]);

      await AdminController.getUserDetail(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "User detail fetched", expect.any(Object));
    });

    it("should fetch profile with name, no subscriptions, and fallback fields", async () => {
      req.params = { userId: "user-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}), // Empty object: no name, no email, etc.
      });

      // Subscriptions query mock (empty)
      mockCollectionRef.get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      ActivityModel.getUserActivities.mockResolvedValue([]);
      NotificationModel.getByUserId.mockResolvedValue([]);

      await AdminController.getUserDetail(req, res);

      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "User detail fetched", expect.any(Object));
    });

    it("should handle error in getUserDetail", async () => {
      req.params = { userId: "user-123" };
      mockGet.mockRejectedValue(new Error("Firestore Error"));

      await AdminController.getUserDetail(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to fetch user detail", expect.any(Error));
    });
  });

  describe("confirmCODPayment", () => {
    it("should return 400 if orderId is missing", async () => {
      await AdminController.confirmCODPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Order ID is required");
    });

    it("should confirm COD payment for subscription when order not found but subscription matches", async () => {
      req.params = { orderId: "sub-123" };
      req.user = { uid: "admin-uid" };

      // Order not found
      mockGet.mockResolvedValueOnce({ exists: false });

      // Subscription found
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", paymentMethod: "Cash", paymentStatus: "Pending", plan: "Standard" }),
      });

      // Update mock
      mockUpdate.mockResolvedValue({});

      // User details mock
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "u@example.com", name: "User One" }),
      });

      EmailService.sendPaymentConfirmationEmail.mockResolvedValue(true);
      ActivityModel.logActivity.mockResolvedValue(true);
      NotificationModel.create.mockResolvedValue(true);

      await AdminController.confirmCODPayment(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(EmailService.sendPaymentConfirmationEmail).toHaveBeenCalled();
      expect(ActivityModel.logActivity).toHaveBeenCalled();
      expect(NotificationModel.create).toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription COD payment confirmed successfully", expect.any(Object));
    });

    it("should confirm COD payment for subscription when req.user, userDoc, and price are missing / default", async () => {
      req.params = { orderId: "sub-123" };
      delete req.user; // req.user is undefined, falls back to "admin"

      mockGet.mockResolvedValueOnce({ exists: false }); // Order
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", paymentMethod: "Cash", paymentStatus: "Pending", plan: "Standard" }), // planDetails and price missing
      }); // Sub

      mockUpdate.mockResolvedValue({});
      mockGet.mockResolvedValueOnce({
        exists: false, // userDoc missing
      });

      EmailService.sendPaymentConfirmationEmail.mockResolvedValue(true);
      ActivityModel.logActivity.mockResolvedValue(true);
      NotificationModel.create.mockResolvedValue(true);

      await AdminController.confirmCODPayment(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription COD payment confirmed successfully", expect.any(Object));
    });

    it("should handle email and notification rejection during sub COD confirmation", async () => {
      req.params = { orderId: "sub-123" };
      req.user = { uid: "admin-uid" };

      mockGet.mockResolvedValueOnce({ exists: false }); // Order
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", paymentMethod: "Cash", paymentStatus: "Pending", plan: "Standard" }),
      }); // Sub

      mockUpdate.mockResolvedValue({});
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "u@example.com" }),
      }); // User

      EmailService.sendPaymentConfirmationEmail.mockRejectedValue(new Error("Email fail"));
      ActivityModel.logActivity.mockResolvedValue(true);
      NotificationModel.create.mockRejectedValue(new Error("Notify fail"));

      await AdminController.confirmCODPayment(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(spyConsoleError).toHaveBeenCalledWith("Failed to send subscription payment confirmation email:", expect.any(Error));
      expect(spyConsoleError).toHaveBeenCalledWith("Failed to create subscription COD payment notification:", expect.any(Error));
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription COD payment confirmed successfully", expect.any(Object));
    });

    it("should fail sub COD confirmation if sub paymentMethod is not Cash", async () => {
      req.params = { orderId: "sub-123" };
      mockGet.mockResolvedValueOnce({ exists: false });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", paymentStatus: "Pending" }), // paymentMethod missing
      });

      await AdminController.confirmCODPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This subscription is not a Cash on Delivery subscription");
    });

    it("should fail sub COD confirmation if sub is already Paid", async () => {
      req.params = { orderId: "sub-123" };
      mockGet.mockResolvedValueOnce({ exists: false });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ paymentMethod: "Cash", paymentStatus: "Paid" }),
      });

      await AdminController.confirmCODPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Payment already confirmed for this subscription");
    });

    it("should return 404 if order and subscription both not found", async () => {
      req.params = { orderId: "sub-123" };
      mockGet.mockResolvedValueOnce({ exists: false });
      mockGet.mockResolvedValueOnce({ exists: false });

      await AdminController.confirmCODPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Order not found");
    });

    it("should confirm COD payment for order when order matches", async () => {
      req.params = { orderId: "ord-123" };

      // Order found
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ orderId: "ord-123", userId: "user-123", paymentMethod: "COD", paymentStatus: "Pending", price: 30, items: [] }),
      });

      // Update mock
      mockUpdate.mockResolvedValue({});

      // User details mock
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "u@example.com" }),
      });

      EmailService.sendPaymentConfirmationEmail.mockRejectedValue(new Error("Email failed"));
      ActivityModel.logActivity.mockResolvedValue(true);
      NotificationModel.create.mockRejectedValue(new Error("Notification failed"));

      await AdminController.confirmCODPayment(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(spyConsoleError).toHaveBeenCalledWith("Failed to send order payment confirmation email:", expect.any(Error));
      expect(spyConsoleError).toHaveBeenCalledWith("Failed to create order COD payment notification:", expect.any(Error));
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "COD payment confirmed successfully", expect.any(Object));
    });

    it("should confirm COD payment for order successfully when req.user, userDoc, and order.price are missing / default", async () => {
      req.params = { orderId: "ord-123" };
      delete req.user; // req.user is undefined, falls back to "admin"

      // Order found, but price is missing
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ orderId: "ord-123", userId: "user-123", paymentMethod: "COD", paymentStatus: "Pending", items: [] }),
      });

      // Update mock
      mockUpdate.mockResolvedValue({});

      // User details mock (not found)
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      EmailService.sendPaymentConfirmationEmail.mockResolvedValue(true);
      ActivityModel.logActivity.mockResolvedValue(true);
      NotificationModel.create.mockResolvedValue(true);

      await AdminController.confirmCODPayment(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "COD payment confirmed successfully", expect.any(Object));
    });

    it("should fail order COD confirmation if paymentMethod is missing", async () => {
      req.params = { orderId: "ord-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ paymentStatus: "Pending" }), // paymentMethod missing
      });

      await AdminController.confirmCODPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This order is not a Cash on Delivery order");
    });

    it("should fail order COD confirmation if paymentMethod is not COD", async () => {
      req.params = { orderId: "ord-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ paymentMethod: "card", paymentStatus: "Pending" }),
      });

      await AdminController.confirmCODPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This order is not a Cash on Delivery order");
    });

    it("should fail order COD confirmation if order is already Paid", async () => {
      req.params = { orderId: "ord-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ paymentMethod: "COD", paymentStatus: "Paid" }),
      });

      await AdminController.confirmCODPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Payment already confirmed for this order");
    });

    it("should handle error during confirmCODPayment", async () => {
      req.params = { orderId: "ord-123" };
      mockGet.mockRejectedValue(new Error("DB error"));

      await AdminController.confirmCODPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to confirm payment", expect.any(Error));
    });
  });

  describe("confirmSubscriptionPayment", () => {
    it("should return 400 if subscriptionId is missing", async () => {
      await AdminController.confirmSubscriptionPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Subscription ID is required");
    });

    it("should return 404 if subscription not found", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValueOnce({ exists: false });

      await AdminController.confirmSubscriptionPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Subscription not found");
    });

    it("should confirm COD subscription payment successfully", async () => {
      req.params = { subscriptionId: "sub-123" };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", paymentMethod: "Cash on Delivery", paymentStatus: "Pending", plan: "Standard" }),
      });

      mockUpdate.mockResolvedValue({});
      mockGet.mockResolvedValueOnce({ exists: false }); // User details missing

      EmailService.sendPaymentConfirmationEmail.mockResolvedValue(true);
      ActivityModel.logActivity.mockResolvedValue(true);
      NotificationModel.create.mockResolvedValue(true);

      await AdminController.confirmSubscriptionPayment(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription COD payment confirmed successfully", expect.any(Object));
    });

    it("should handle email and notification rejection during confirmSubscriptionPayment", async () => {
      req.params = { subscriptionId: "sub-123" };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", paymentMethod: "Cash on Delivery", paymentStatus: "Pending", plan: "Standard" }),
      });

      mockUpdate.mockResolvedValue({});
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "u@example.com" }),
      });

      EmailService.sendPaymentConfirmationEmail.mockRejectedValue(new Error("Email fail"));
      ActivityModel.logActivity.mockResolvedValue(true);
      NotificationModel.create.mockRejectedValue(new Error("Notify fail"));

      await AdminController.confirmSubscriptionPayment(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(spyConsoleError).toHaveBeenCalledWith("Failed to send subscription payment confirmation email:", expect.any(Error));
      expect(spyConsoleError).toHaveBeenCalledWith("Failed to create subscription COD payment notification:", expect.any(Error));
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription COD payment confirmed successfully", expect.any(Object));
    });

    it("should fail confirmSubscriptionPayment if paymentMethod is missing", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ paymentStatus: "Pending" }), // paymentMethod missing
      });

      await AdminController.confirmSubscriptionPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This subscription is not a Cash on Delivery subscription");
    });

    it("should confirm COD subscription payment successfully when req.user is missing", async () => {
      req.params = { subscriptionId: "sub-123" };
      delete req.user; // req.user is undefined, falls back to "admin"

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ subscriptionId: "sub-123", userId: "user-123", paymentMethod: "Cash on Delivery", paymentStatus: "Pending", plan: "Standard" }),
      });

      mockUpdate.mockResolvedValue({});
      mockGet.mockResolvedValueOnce({ exists: false });

      await AdminController.confirmSubscriptionPayment(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription COD payment confirmed successfully", expect.any(Object));
    });

    it("should fail confirmSubscriptionPayment if paymentMethod is not COD", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ paymentMethod: "stripe", paymentStatus: "Pending" }),
      });

      await AdminController.confirmSubscriptionPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "This subscription is not a Cash on Delivery subscription");
    });

    it("should fail confirmSubscriptionPayment if already Paid", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ paymentMethod: "Cash", paymentStatus: "Paid" }),
      });

      await AdminController.confirmSubscriptionPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Payment already confirmed for this subscription");
    });

    it("should handle error in confirmSubscriptionPayment", async () => {
      req.params = { subscriptionId: "sub-123" };
      mockGet.mockRejectedValue(new Error("DB error"));

      await AdminController.confirmSubscriptionPayment(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to confirm payment", expect.any(Error));
    });
  });

  describe("adminCancelSubscription", () => {
    it("should return 400 if subscriptionId or reason missing", async () => {
      req.params = { userId: "user-123" };
      await AdminController.adminCancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "subscriptionId and reason are required");
    });

    it("should return 404 if subscription not found", async () => {
      req.params = { userId: "user-123" };
      req.body = { subscriptionId: "sub-123", reason: "Policy violation" };

      mockGet.mockResolvedValueOnce({ exists: false });

      await AdminController.adminCancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Subscription not found");
    });

    it("should return 400 if subscription does not belong to user", async () => {
      req.params = { userId: "user-123" };
      req.body = { subscriptionId: "sub-123", reason: "Policy violation" };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "other-user" }),
      });

      await AdminController.adminCancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Subscription does not belong to this user");
    });

    it("should return 400 if subscription already cancelled", async () => {
      req.params = { userId: "user-123" };
      req.body = { subscriptionId: "sub-123", reason: "Policy violation" };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-123", status: "Cancelled" }),
      });

      await AdminController.adminCancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Subscription is already cancelled");
    });

    it("should successfully cancel subscription, cancel pending orders, notify, log activity and clear cache", async () => {
      req.params = { userId: "user-123" };
      req.body = { subscriptionId: "sub-123", reason: "Policy violation" };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-123", status: "Active" }),
      });

      mockUpdate.mockResolvedValue({});
      mockBatchCommit.mockResolvedValue({});

      // Mock pending orders
      const mockOrderDocs = [{ ref: "order-ref" }];
      mockCollectionRef.get.mockResolvedValueOnce({
        empty: false,
        forEach: (cb) => mockOrderDocs.forEach(cb),
      });

      await AdminController.adminCancelSubscription(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockBatchUpdate).toHaveBeenCalled();
      expect(NotificationModel.create).toHaveBeenCalled();
      expect(ActivityModel.logActivity).toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription cancelled by admin", expect.any(Object));
    });

    it("should successfully cancel subscription when no pending orders are found", async () => {
      req.params = { userId: "user-123" };
      req.body = { subscriptionId: "sub-123", reason: "Policy violation" };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "user-123", status: "Active" }),
      });

      mockUpdate.mockResolvedValue({});

      // Mock empty pending orders
      mockCollectionRef.get.mockResolvedValueOnce({
        empty: true,
      });

      await AdminController.adminCancelSubscription(req, res);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockBatchUpdate).not.toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Subscription cancelled by admin", expect.any(Object));
    });

    it("should handle error in adminCancelSubscription", async () => {
      req.params = { userId: "user-123" };
      req.body = { subscriptionId: "sub-123", reason: "Policy violation" };
      mockGet.mockRejectedValue(new Error("Firestore error"));

      await AdminController.adminCancelSubscription(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to cancel subscription", expect.any(Error));
    });
  });

  describe("getMenuConfig", () => {
    it("should return menu config from MenuModel", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockResolvedValue({ plans: [] });

      await AdminController.getMenuConfig(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Menu configuration retrieved successfully", { plans: [] });
    });

    it("should handle error in getMenuConfig", async () => {
      const MenuModel = require("../src/models/menu.model");
      MenuModel.getMenuConfig.mockRejectedValue(new Error("Config load failed"));

      await AdminController.getMenuConfig(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to retrieve menu config", expect.any(Error));
    });
  });

  describe("updateMenuConfig", () => {
    it("should return 400 if config body invalid", async () => {
      await AdminController.updateMenuConfig(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Invalid menu configuration data");
    });

    it("should update config and clear delivery cache", async () => {
      req.body = { plans: {}, weeklyMenus: {} };
      const MenuModel = require("../src/models/menu.model");
      MenuModel.updateMenuConfig.mockResolvedValue({});

      await AdminController.updateMenuConfig(req, res);

      expect(MenuModel.updateMenuConfig).toHaveBeenCalledWith(req.body);
      expect(cache.delete).toHaveBeenCalledWith("admin_today_deliveries");
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Menu configuration updated successfully", req.body);
    });

    it("should handle error in updateMenuConfig", async () => {
      req.body = { plans: {}, weeklyMenus: {} };
      const MenuModel = require("../src/models/menu.model");
      MenuModel.updateMenuConfig.mockRejectedValue(new Error("Config save failed"));

      await AdminController.updateMenuConfig(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to update menu config", expect.any(Error));
    });
  });

  describe("uploadMenuImage", () => {
    it("should return 400 if file is missing", async () => {
      await AdminController.uploadMenuImage(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "No file uploaded");
    });

    it("should upload image successfully to Cloudinary", async () => {
      req.file = { buffer: Buffer.from("image-bytes") };
      mockUploadStream._error = null;
      mockUploadStream._result = { secure_url: "https://cloudinary/image.jpg" };

      await AdminController.uploadMenuImage(req, res);

      expect(mockCloudinary.uploader.upload_stream).toHaveBeenCalled();
      expect(mockUploadStream.end).toHaveBeenCalledWith(req.file.buffer);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Image uploaded successfully", { url: "https://cloudinary/image.jpg" });
    });

    it("should handle Cloudinary upload error", async () => {
      req.file = { buffer: Buffer.from("image-bytes") };
      mockUploadStream._error = new Error("Cloudinary quota exceeded");
      mockUploadStream._result = null;

      await AdminController.uploadMenuImage(req, res);

      expect(spyConsoleError).toHaveBeenCalledWith("Cloudinary upload error:", expect.any(Error));
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Cloudinary upload failed", expect.any(Error));
    });

    it("should handle general exceptions in uploadMenuImage", async () => {
      req.file = { buffer: Buffer.from("image-bytes") };
      mockCloudinary.uploader.upload_stream.mockImplementationOnce(() => {
        throw new Error("Stream crash");
      });

      await AdminController.uploadMenuImage(req, res);
      expect(spyConsoleError).toHaveBeenCalledWith("Error in uploadMenuImage:", expect.any(Error));
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Internal server error during upload", expect.any(Error));
    });
  });

  describe("getAllReviews", () => {
    it("should retrieve all reviews from Firestore", async () => {
      const mockReviews = [{ rating: 5, comment: "Awesome!" }];
      mockCollectionRef.get.mockResolvedValueOnce({
        forEach: (cb) => mockReviews.map(r => ({ data: () => r })).forEach(cb),
      });

      await AdminController.getAllReviews(req, res);
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "All reviews retrieved successfully", mockReviews);
    });

    it("should handle error in getAllReviews", async () => {
      mockCollectionRef.get.mockRejectedValue(new Error("Firestore down"));

      await AdminController.getAllReviews(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to retrieve reviews", expect.any(Error));
    });
  });

  describe("deleteReview", () => {
    it("should return 400 if reviewId is missing", async () => {
      await AdminController.deleteReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Review ID is required");
    });

    it("should return 404 if review not found", async () => {
      req.params = { reviewId: "rev-123" };
      mockGet.mockResolvedValueOnce({ exists: false });

      await AdminController.deleteReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Review not found");
    });

    it("should delete review successfully", async () => {
      req.params = { reviewId: "rev-123" };
      mockGet.mockResolvedValueOnce({ exists: true });
      mockDelete.mockResolvedValue({});

      await AdminController.deleteReview(req, res);

      expect(mockDelete).toHaveBeenCalled();
      expect(ResponseUtil.send).toHaveBeenCalledWith(res, 200, "Review deleted successfully", { reviewId: "rev-123" });
    });

    it("should handle error in deleteReview", async () => {
      req.params = { reviewId: "rev-123" };
      mockGet.mockRejectedValue(new Error("Firestore error"));

      await AdminController.deleteReview(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 500, "Failed to delete review", expect.any(Error));
    });
  });
});
