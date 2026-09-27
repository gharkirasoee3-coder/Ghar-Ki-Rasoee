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

  /** Convert a CAD amount to integer cents so fee calculations stay deterministic. */
  static toCents(amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return 0;
    return Math.round(numericAmount * 100);
  }

  static fromCents(cents) {
    const numericCents = Number(cents);
    if (!Number.isFinite(numericCents)) return 0;
    return Number((Math.round(numericCents) / 100).toFixed(2));
  }

  static roundCurrency(amount) {
    return this.fromCents(this.toCents(amount));
  }

  /** Platform fee is 2.5% of the discounted subtotal plus CAD $0.30. */
  static calculatePlatformServiceFee(discountedSubtotal) {
    const subtotalInCents = Math.max(0, this.toCents(discountedSubtotal));
    return this.fromCents(Math.round(subtotalInCents * 0.025) + 30);
  }

  /**
   * Build the canonical server-side charge breakdown. Delivery eligibility is
   * intentionally based on the undiscounted subtotal; coupons cannot change it.
   */
  static calculateChargeBreakdown(basePrice, discountAmount = 0, deliverySettings = {}) {
    const basePriceInCents = Math.max(0, this.toCents(basePrice));
    const discountInCents = Math.min(
      basePriceInCents,
      Math.max(0, this.toCents(discountAmount)),
    );
    const discountedSubtotalInCents = basePriceInCents - discountInCents;
    const thresholdInCents = Math.max(
      0,
      this.toCents(deliverySettings.minAmountForFreeDelivery),
    );
    const deliveryFeeInCents = basePriceInCents < thresholdInCents
      ? Math.max(0, this.toCents(deliverySettings.deliveryFee))
      : 0;
    const platformServiceFeeInCents =
      Math.round(discountedSubtotalInCents * 0.025) + 30;
    const totalInCents = discountedSubtotalInCents
      + deliveryFeeInCents
      + platformServiceFeeInCents;

    return {
      basePrice: this.fromCents(basePriceInCents),
      subtotal: this.fromCents(basePriceInCents),
      discountAmount: this.fromCents(discountInCents),
      discountedSubtotal: this.fromCents(discountedSubtotalInCents),
      deliveryFee: this.fromCents(deliveryFeeInCents),
      platformServiceFee: this.fromCents(platformServiceFeeInCents),
      totalAmount: this.fromCents(totalInCents),
    };
  }
}

module.exports = PriceUtil;
