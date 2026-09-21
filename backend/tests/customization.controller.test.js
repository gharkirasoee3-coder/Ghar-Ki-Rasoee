const CustomizationController = require("../src/controllers/customization.controller");
const CustomizationModel = require("../src/models/customization.model");
const SubscriptionModel = require("../src/models/subscription.model");
const ResponseUtil = require("../src/utils/response.util");

jest.mock("../src/models/customization.model", () => ({
  savePreferences: jest.fn(),
  getBySubscription: jest.fn(),
  updateDayPreference: jest.fn(),
  updatePreferences: jest.fn(),
  collection: {
    doc: jest.fn(),
  },
}));

jest.mock("../src/models/subscription.model", () => ({
  collection: {
    doc: jest.fn(),
  },
}));

jest.mock("../src/models/activity.model", () => ({
  logActivity: jest.fn().mockResolvedValue(true),
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

describe("CustomizationController - Delivery Days Enforcement", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { uid: "user-123" },
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("savePreferences", () => {
    it("should return 400 if subscriptionId or preferences are missing", async () => {
      req.body = { subscriptionId: "sub-1" };
      await CustomizationController.savePreferences(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "subscriptionId and preferences are required"
      );
    });

    it("should return 404 if subscription does not exist", async () => {
      req.body = {
        subscriptionId: "sub-1",
        preferences: { monday: { sabzi1: "Paneer" } },
      };
      SubscriptionModel.collection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      await CustomizationController.savePreferences(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 404, "Subscription not found");
    });

    it("should return 403 if subscription belongs to another user", async () => {
      req.body = {
        subscriptionId: "sub-1",
        preferences: { monday: { sabzi1: "Paneer" } },
      };
      SubscriptionModel.collection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ userId: "other-user", deliveryDays: ["Monday"] }),
        }),
      });

      await CustomizationController.savePreferences(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        403,
        "Unauthorized access to subscription customizations"
      );
    });

    it("should strictly filter out days not included in subscribed deliveryDays", async () => {
      req.body = {
        subscriptionId: "sub-1",
        preferences: {
          monday: { sabzi1: "Paneer" },
          tuesday: { sabzi1: "Aloo Gobi" }, // NOT subscribed
          wednesday: { sabzi1: "Dal Makhani" },
          thursday: { sabzi1: "Bhindi" }, // NOT subscribed
          friday: { sabzi1: "Chole" },
          saturday: { specialFood: "Biryani" }, // NOT subscribed
        },
      };

      SubscriptionModel.collection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            userId: "user-123",
            deliveryDays: ["Monday", "Wednesday", "Friday"],
          }),
        }),
      });

      CustomizationModel.savePreferences.mockResolvedValue({
        customizationId: "cust-1",
        subscriptionId: "sub-1",
      });

      await CustomizationController.savePreferences(req, res);

      // Verify savePreferences was called ONLY with monday, wednesday, friday
      expect(CustomizationModel.savePreferences).toHaveBeenCalledWith(
        "user-123",
        "sub-1",
        {
          monday: { sabzi1: "Paneer" },
          wednesday: { sabzi1: "Dal Makhani" },
          friday: { sabzi1: "Chole" },
        }
      );

      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        201,
        "Preferences saved successfully",
        expect.objectContaining({ customization: expect.anything() })
      );
    });
  });

  describe("updateDayPreference", () => {
    it("should reject updating preference for a non-subscribed delivery day", async () => {
      req.params = { customizationId: "cust-1" };
      req.body = {
        day: "tuesday",
        preferences: { sabzi1: "Aloo Matar" },
      };

      CustomizationModel.collection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            userId: "user-123",
            subscriptionId: "sub-1",
          }),
        }),
      });

      SubscriptionModel.collection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            userId: "user-123",
            deliveryDays: ["Monday", "Wednesday", "Friday"],
          }),
        }),
      });

      await CustomizationController.updateDayPreference(req, res);

      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "Cannot customize meals for tuesday. This day is not included in your active subscription schedule."
      );
      expect(CustomizationModel.updateDayPreference).not.toHaveBeenCalled();
    });

    it("should allow updating preference for a valid subscribed delivery day", async () => {
      req.params = { customizationId: "cust-1" };
      req.body = {
        day: "wednesday",
        preferences: { sabzi1: "Dal Makhani" },
      };

      CustomizationModel.collection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            userId: "user-123",
            subscriptionId: "sub-1",
          }),
        }),
      });

      SubscriptionModel.collection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            userId: "user-123",
            deliveryDays: ["Monday", "Wednesday", "Friday"],
          }),
        }),
      });

      CustomizationModel.updateDayPreference.mockResolvedValue({
        customizationId: "cust-1",
        subscriptionId: "sub-1",
        userId: "user-123",
      });

      await CustomizationController.updateDayPreference(req, res);

      expect(CustomizationModel.updateDayPreference).toHaveBeenCalledWith(
        "cust-1",
        "wednesday",
        { sabzi1: "Dal Makhani" }
      );
      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        200,
        "Day preference updated successfully",
        expect.anything()
      );
    });
  });
});
