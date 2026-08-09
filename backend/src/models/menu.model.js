const admin = require("../config/firebase.config");
const db = admin.firestore();
const fallbackMenuData = require("../data/menuData.json");

class MenuModel {
  static collection = db.collection("metadata");
  static docId = "menuConfig";
  static cache = null;

  /**
   * Get the complete menu configuration from Firestore (or fallback)
   */
  static async getMenuConfig() {
    if (this.cache) {
      return this.cache;
    }

    try {
      const docRef = this.collection.doc(this.docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        // Initialize Firestore with default menu data + customizable plan and pricing config
        const initialData = {
          ...fallbackMenuData,
          menuImages: {
            vancouver: "/For-Vancouver-Burnaby-Richmond-New-Westminster-Langley.jpeg",
            others: "/remaining-city.jpeg"
          },
          plans: {
            ...fallbackMenuData.plans,
            customizable: {
              name: "Build Your Own Plan",
              price: 200,
              roti: 6,
              sabziChoices: 2,
              raitaDays: ["monday", "wednesday", "friday"],
              features: [
                "Build your own custom plan",
                "Adjust Roti & Sabzi count dynamically",
                "Custom Raita & Dessert settings",
                "Price updates dynamically",
                "6 Days delivery"
              ]
            }
          },
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

        await docRef.set(initialData);
        this.cache = initialData;
        return initialData;
      }

      const data = doc.data();
      if (!data.menuImages) {
        data.menuImages = {
          vancouver: "/For-Vancouver-Burnaby-Richmond-New-Westminster-Langley.jpeg",
          others: "/remaining-city.jpeg"
        };
      }
      this.cache = data;
      return this.cache;
    } catch (error) {
      console.error("Error reading menuConfig from Firestore, falling back to JSON:", error);
      return {
        ...fallbackMenuData,
        menuImages: {
          vancouver: "/For-Vancouver-Burnaby-Richmond-New-Westminster-Langley.jpeg",
          others: "/remaining-city.jpeg"
        },
        plans: {
          ...fallbackMenuData.plans,
          customizable: {
            name: "Build Your Own Plan",
            price: 200,
            roti: 6,
            sabziChoices: 2,
            raitaDays: ["monday", "wednesday", "friday"],
            features: [
              "Build your own custom plan",
              "Adjust Roti & Sabzi count dynamically",
              "Custom Raita & Dessert settings",
              "Price updates dynamically",
              "6 Days delivery"
            ]
          }
        },
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
    }
  }

  /**
   * Update the complete menu configuration in Firestore
   */
  static async updateMenuConfig(newConfig) {
    const docRef = this.collection.doc(this.docId);
    await docRef.set(newConfig);
    this.cache = newConfig;
    return newConfig;
  }

  /**
   * Clear the local cache (e.g. when configuration is changed)
   */
  static clearCache() {
    this.cache = null;
  }

  /**
   * Get all subscription plans
   */
  static async getAllPlans() {
    const config = await this.getMenuConfig();
    return config.plans;
  }

  /**
   * Get plan by type (basic, standard, premium, customizable)
   */
  static async getPlan(planType) {
    const config = await this.getMenuConfig();
    return config.plans[planType.toLowerCase()] || null;
  }

  /**
   * Get weekly menu for a specific plan type
   */
  static async getWeeklyMenu(planType) {
    const config = await this.getMenuConfig();
    return config.weeklyMenus[planType.toLowerCase()] || null;
  }

  /**
   * Get menu for a specific day and plan
   */
  static async getDayMenu(planType, day) {
    const config = await this.getMenuConfig();
    const weeklyMenu = config.weeklyMenus[planType.toLowerCase()];
    if (!weeklyMenu) return null;
    return weeklyMenu[day.toLowerCase()] || null;
  }

  /**
   * Get Saturday special options (Premium only)
   */
  static async getSaturdaySpecials() {
    const config = await this.getMenuConfig();
    const premiumSaturday = config.weeklyMenus.premium.saturday;
    return {
      specialFoodOptions: premiumSaturday.specialFoodOptions,
      dessertOptions: premiumSaturday.dessertOptions,
    };
  }

  /**
   * Get service information
   */
  static async getServiceInfo() {
    const config = await this.getMenuConfig();
    return config.serviceInfo;
  }

  /**
   * Calculate price for a customizable plan based on pricing config
   */
  static calculateCustomPrice(customDetails, config) {
    const rules = config.customPricingConfig || {
      basePrice: 100,
      pricePerRoti: 5,
      pricePerSabzi: 20,
      raitaPrice3Days: 10,
      raitaPriceDaily: 20,
      dessertPriceWeekly: 10,
      dessertPriceDaily: 30,
      saturdaySpecialPrice: 15
    };

    const getRaitaPrice = (opt) => {
      if (!opt) return 0;
      const o = opt.toLowerCase();
      if (o.includes("daily")) return rules.raitaPriceDaily;
      if (o.includes("3days") || o.includes("3 days") || o.includes("weekly")) return rules.raitaPrice3Days;
      return 0;
    };

    const getDessertPrice = (opt) => {
      if (!opt) return 0;
      const o = opt.toLowerCase();
      if (o.includes("daily")) return rules.dessertPriceDaily;
      if (o.includes("weekly") || o.includes("wednesday")) return rules.dessertPriceWeekly;
      return 0;
    };

    const basePlan = customDetails.basePlan;
    if (!basePlan || basePlan === "scratch") {
      const basePrice = rules.basePrice;
      const rotiPrice = (Number(customDetails.roti) || 0) * rules.pricePerRoti;
      const sabziPrice = (Number(customDetails.sabziChoices) || 0) * rules.pricePerSabzi;
      const raitaPrice = getRaitaPrice(customDetails.raitaOption);
      const dessertPrice = getDessertPrice(customDetails.dessertOption);
      const satSpecialPrice = customDetails.saturdaySpecial ? rules.saturdaySpecialPrice : 0;
      return basePrice + rotiPrice + sabziPrice + raitaPrice + dessertPrice + satSpecialPrice;
    } else {
      const planKey = basePlan.toLowerCase();
      const planInfo = config.plans[planKey];
      if (!planInfo) {
        throw new Error("Invalid base plan: " + basePlan);
      }

      // Default specs for base plans
      let baseRoti = 8;
      let baseSabzi = 2;
      let baseRaita = "3days";
      let baseDessert = "none";
      let baseSaturday = false;

      if (planKey === "basic") {
        baseRoti = 4;
        baseSabzi = 1;
        baseRaita = "3days";
        baseDessert = "none";
        baseSaturday = false;
      } else if (planKey === "standard") {
        baseRoti = 8;
        baseSabzi = 2;
        baseRaita = "3days";
        baseDessert = "none";
        baseSaturday = false;
      } else if (planKey === "premium") {
        baseRoti = 8;
        baseSabzi = 2;
        baseRaita = "daily";
        baseDessert = "weekly";
        baseSaturday = true;
      }

      const planBasePrice = planInfo.price;
      const rotiDiff = (Number(customDetails.roti) - baseRoti) * rules.pricePerRoti;
      const sabziDiff = (Number(customDetails.sabziChoices) - baseSabzi) * rules.pricePerSabzi;
      const raitaDiff = getRaitaPrice(customDetails.raitaOption) - getRaitaPrice(baseRaita);
      const dessertDiff = getDessertPrice(customDetails.dessertOption) - getDessertPrice(baseDessert);
      const satSpecialDiff = (customDetails.saturdaySpecial ? rules.saturdaySpecialPrice : 0) - (baseSaturday ? rules.saturdaySpecialPrice : 0);

      return planBasePrice + rotiDiff + sabziDiff + raitaDiff + dessertDiff + satSpecialDiff;
    }
  }
}

module.exports = MenuModel;
