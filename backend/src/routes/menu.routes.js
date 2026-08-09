const express = require("express");
const router = express.Router();
const MenuController = require("../controllers/menu.controller");
const CustomizationController = require("../controllers/customization.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

// Public menu routes
router.get("/plans", MenuController.getAllPlans);
router.get("/plans/:planType", MenuController.getPlan);
router.get("/plans/:planType/menu", MenuController.getWeeklyMenu);
router.get("/plans/:planType/menu/:day", MenuController.getDayMenu);
router.get("/saturday-specials", MenuController.getSaturdaySpecials);
router.get("/service-info", MenuController.getServiceInfo);
router.get("/menu-images", MenuController.getMenuImages);

// Protected customization routes
router.post(
  "/customizations",
  verifyToken,
  CustomizationController.savePreferences,
);
router.get(
  "/customizations/user",
  verifyToken,
  CustomizationController.getUserPreferences,
);
router.get(
  "/customizations/:subscriptionId",
  verifyToken,
  CustomizationController.getPreferences,
);
router.put(
  "/customizations/:customizationId/day",
  verifyToken,
  CustomizationController.updateDayPreference,
);
router.put(
  "/customizations/:customizationId",
  verifyToken,
  CustomizationController.updatePreferences,
);

module.exports = router;
