const MenuModel = require("../models/menu.model");
const ResponseUtil = require("../utils/response.util");

class MenuController {
  /**
   * Get all subscription plans
   */
  static async getAllPlans(req, res) {
    try {
      const config = await MenuModel.getMenuConfig();
      const city = req.query.city;
      const categoryKey = MenuModel.getCityCategory(city, config);
      const categoryConfig = config.cityCategories?.[categoryKey];

      // Deep copy to prevent modifying cache
      const plans = JSON.parse(JSON.stringify(config.plans));
      const customPricingConfig = { ...config.customPricingConfig };
      const deliveryFeeSettings = categoryConfig?.deliveryFeeSettings || config.deliveryFeeSettings || { minAmountForFreeDelivery: 150, deliveryFee: 15 };

      if (categoryConfig && categoryConfig.planPrices) {
        if (plans.basic && categoryConfig.planPrices.basic !== undefined) {
          plans.basic.price = categoryConfig.planPrices.basic;
        }
        if (plans.standard && categoryConfig.planPrices.standard !== undefined) {
          plans.standard.price = categoryConfig.planPrices.standard;
        }
        if (plans.premium && categoryConfig.planPrices.premium !== undefined) {
          plans.premium.price = categoryConfig.planPrices.premium;
        }
        if (plans.customizable && categoryConfig.planPrices.customizableBase !== undefined) {
          plans.customizable.price = categoryConfig.planPrices.customizableBase;
        }
        if (categoryConfig.planPrices.customizableBase !== undefined) {
          customPricingConfig.basePrice = categoryConfig.planPrices.customizableBase;
        }
      }

      ResponseUtil.send(res, 200, "Plans retrieved successfully", {
        plans,
        customPricingConfig,
        deliveryFeeSettings
      });
    } catch (error) {
      console.error("Error getting plans:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve plans", error);
    }
  }

  /**
   * Get specific plan details
   */
  static async getPlan(req, res) {
    try {
      const { planType } = req.params;
      const plan = await MenuModel.getPlan(planType);

      if (!plan) {
        return ResponseUtil.error(res, 404, "Plan not found");
      }

      ResponseUtil.send(res, 200, "Plan retrieved successfully", { plan });
    } catch (error) {
      console.error("Error getting plan:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve plan", error);
    }
  }

  /**
   * Get weekly menu for a plan
   */
  static async getWeeklyMenu(req, res) {
    try {
      const { planType } = req.params;
      const weeklyMenu = await MenuModel.getWeeklyMenu(planType);

      if (!weeklyMenu) {
        return ResponseUtil.error(res, 404, "Menu not found for this plan");
      }

      ResponseUtil.send(res, 200, "Weekly menu retrieved successfully", {
        planType,
        weeklyMenu,
      });
    } catch (error) {
      console.error("Error getting weekly menu:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve weekly menu", error);
    }
  }

  /**
   * Get menu for specific day
   */
  static async getDayMenu(req, res) {
    try {
      const { planType, day } = req.params;
      const dayMenu = await MenuModel.getDayMenu(planType, day);

      if (!dayMenu) {
        return ResponseUtil.error(res, 404, "Menu not found for this day/plan");
      }

      ResponseUtil.send(res, 200, "Day menu retrieved successfully", {
        planType,
        day,
        menu: dayMenu,
      });
    } catch (error) {
      console.error("Error getting day menu:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve day menu", error);
    }
  }

  /**
   * Get Saturday special options (Premium only)
   */
  static async getSaturdaySpecials(req, res) {
    try {
      const specials = await MenuModel.getSaturdaySpecials();
      ResponseUtil.send(res, 200, "Saturday specials retrieved successfully", {
        specials,
      });
    } catch (error) {
      console.error("Error getting Saturday specials:", error);
      ResponseUtil.error(
        res,
        500,
        "Failed to retrieve Saturday specials",
        error,
      );
    }
  }

  /**
   * Get service information
   */
  static async getServiceInfo(req, res) {
    try {
      const serviceInfo = await MenuModel.getServiceInfo();
      ResponseUtil.send(res, 200, "Service info retrieved successfully", {
        serviceInfo,
      });
    } catch (error) {
      console.error("Error getting service info:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve service info", error);
    }
  }

  /**
   * Get menu images (sheets)
   */
  static async getMenuImages(req, res) {
    try {
      const config = await MenuModel.getMenuConfig();
      ResponseUtil.send(res, 200, "Menu images retrieved successfully", {
        menuImages: config.menuImages || {
          vancouver: "/For-Vancouver-Burnaby-Richmond-New-Westminster-Langley.jpeg",
          others: "/remaining-city.jpeg"
        }
      });
    } catch (error) {
      console.error("Error getting menu images:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve menu images", error);
    }
  }
}

module.exports = MenuController;
