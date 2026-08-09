class PriceUtil {
  static PRICES = {
    PLAN_ONE_TIME: 13,
    PLAN_WEEKLY: 60,
    PLAN_MONTHLY_BASIC: 150,
    PLAN_MONTHLY_STANDARD: 190,
    PLAN_MONTHLY_PREMIUM: 220,
    EXTRA_ROTI: 0.6,
    EXTRA_SWEET: 3.0,
    EXTRA_RAITA: 2.0,
  };

  static calculateTotal(orderType, planPrice, itemsOrExtras = []) {
    let total = 0;

    // Check if it's an array of items (Cart flow)
    if (Array.isArray(itemsOrExtras) && itemsOrExtras.length > 0) {
      itemsOrExtras.forEach((item) => {
        total += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      });
      return parseFloat(total.toFixed(2));
    }

    // Default Plan Logic (Legacy/Tiffin Flow)
    const extras = itemsOrExtras; // Alias for clarity if it's an object

    // Base Plan Price
    if (orderType === "one-time") total += this.PRICES.PLAN_ONE_TIME;
    else if (orderType === "weekly") total += this.PRICES.PLAN_WEEKLY;
    else if (orderType === "monthly") {
      // Trusting the plan price passed, or we could validate strictly against known prices
      total += parseFloat(planPrice) || 0;
    }

    // Extras (Object format)
    if (!Array.isArray(extras)) {
      if (extras.extraRoti) total += extras.extraRoti * this.PRICES.EXTRA_ROTI;
      if (extras.extraSweet)
        total += extras.extraSweet * this.PRICES.EXTRA_SWEET;
      if (extras.extraRaita)
        total += extras.extraRaita * this.PRICES.EXTRA_RAITA;
    }

    return parseFloat(total.toFixed(2));
  }
}

module.exports = PriceUtil;
