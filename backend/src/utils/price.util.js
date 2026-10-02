class PriceUtil {
  static SUBSCRIPTION_DELIVERY_DAYS = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

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
   * Normalize a subscription schedule. Missing schedules are legacy six-day
   * subscriptions, while an explicitly supplied empty/invalid schedule is an
   * invalid quote rather than a way to avoid the delivery fee.
   */
  static normalizeSubscriptionDeliveryDays(deliveryDays) {
    if (deliveryDays === undefined || deliveryDays === null) {
      return [...this.SUBSCRIPTION_DELIVERY_DAYS];
    }
    if (!Array.isArray(deliveryDays)) {
      throw new Error("deliveryDays must be an array");
    }

    const allowedDays = new Set(this.SUBSCRIPTION_DELIVERY_DAYS);
    const uniqueDays = [...new Set(
      deliveryDays.map((day) => String(day).toLowerCase()),
    )];
    if (!uniqueDays.length || uniqueDays.some((day) => !allowedDays.has(day))) {
      throw new Error("deliveryDays contains an invalid day");
    }
    return uniqueDays;
  }

  static getSubscriptionDeliveryFeeRate(deliverySettings = {}) {
    const explicitPerDayRate = Number(deliverySettings.deliveryFeePerSelectedDay);
    if (Number.isFinite(explicitPerDayRate) && explicitPerDayRate >= 0) {
      return this.roundCurrency(explicitPerDayRate);
    }
    const legacySixDayFeeInCents = Math.max(
      0,
      this.toCents(deliverySettings.deliveryFee),
    );
    return Number((
      legacySixDayFeeInCents
      / 100
      / this.SUBSCRIPTION_DELIVERY_DAYS.length
    ).toFixed(6));
  }

  /**
   * Calculate a subscription delivery charge in cents. New configurations use
   * deliveryFeePerSelectedDay. A legacy deliveryFee remains the six-day total so that
   * rollout does not silently multiply existing customer charges by six.
   */
  static calculateSubscriptionDeliveryFee(basePrice, deliverySettings = {}, deliveryDays) {
    const normalizedDays = this.normalizeSubscriptionDeliveryDays(deliveryDays);
    const basePriceInCents = Math.max(0, this.toCents(basePrice));
    const thresholdInCents = Math.max(
      0,
      this.toCents(deliverySettings.minAmountForFreeDelivery),
    );
    if (basePriceInCents >= thresholdInCents) return 0;

    const explicitPerDayRate = Number(deliverySettings.deliveryFeePerSelectedDay);
    let feeInCents;
    if (Number.isFinite(explicitPerDayRate) && explicitPerDayRate >= 0) {
      feeInCents = Math.max(0, this.toCents(explicitPerDayRate)) * normalizedDays.length;
    } else {
      const legacySixDayFeeInCents = Math.max(
        0,
        this.toCents(deliverySettings.deliveryFee),
      );
      feeInCents = Math.round(
        legacySixDayFeeInCents * normalizedDays.length
        / this.SUBSCRIPTION_DELIVERY_DAYS.length,
      );
    }
    return this.fromCents(feeInCents);
  }

  /**
   * Build the canonical server-side charge breakdown. Delivery eligibility is
   * intentionally based on the undiscounted subtotal; coupons cannot change it.
   */
  static calculateChargeBreakdown(
    basePrice,
    discountAmount = 0,
    deliverySettings = {},
    options = {},
  ) {
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
    const deliveryFeeInCents = options.subscriptionDeliveryFee
      ? this.toCents(this.calculateSubscriptionDeliveryFee(
        this.fromCents(basePriceInCents),
        deliverySettings,
        options.deliveryDays,
      ))
      : (basePriceInCents < thresholdInCents
        ? Math.max(0, this.toCents(deliverySettings.deliveryFee))
        : 0);
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
