const stripe = require("../config/stripe.config");
const env = require("../config/env.config");

class StripeService {
  /**
   * Create or retrieve a customer in Stripe
   */
  static async createCustomer(email, name) {
    try {
      // Find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer if not exists
      const customer = await stripe.customers.create({ email, name });
      return customer;
    } catch (error) {
      console.error("Stripe createCustomer error:", error);
      throw error;
    }
  }

  /**
   * Create a hosted Checkout Session for Card payments in CAD
   */
  static async createCheckoutSession({
    userId,
    userEmail,
    userName,
    type,
    amount,
    planName,
    deliveryAddress,
    deliveryDate,
    items,
    successUrl,
    cancelUrl,
    couponCode,
    isRecurring,
    customDetails,
    replacePlan,
  }) {
    try {
      const customer = await this.createCustomer(userEmail, userName);

      // Amount must be in cents (e.g. $150.00 -> 15000 cents)
      const amountInCents = Math.round(amount * 100);
      const isSubscriptionMode = type === "subscription" && isRecurring;

      const sessionData = {
        mode: isSubscriptionMode ? "subscription" : "payment",
        payment_method_types: ["card"],
        customer: customer.id,
        line_items: [
          {
            price_data: {
              currency: "cad",
              product_data: {
                name: type === "subscription" ? `${planName} Subscription` : "One-Time Meal Order",
                description: type === "subscription"
                  ? (isSubscriptionMode ? `Monthly auto-renewing subscription plan: ${planName}` : `One-time monthly plan: ${planName}`)
                  : `One-time Indian meal delivery`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          type, // 'subscription' or 'one-time'
          planName: planName || "",
          deliveryAddress,
          deliveryDate: deliveryDate || "",
          items: items ? JSON.stringify(items) : "",
          couponCode: couponCode || "",
          isRecurring: isSubscriptionMode ? "true" : "false",
          customDetails: customDetails ? JSON.stringify(customDetails) : "",
          replacePlan: replacePlan !== false ? "true" : "false",
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      };

      if (isSubscriptionMode) {
        sessionData.line_items[0].price_data.recurring = {
          interval: "month",
        };

        // Apply coupon to Stripe recurring subscription if provided
        if (couponCode) {
          try {
            const CouponModel = require("../models/coupon.model");
            const couponData = await CouponModel.getCoupon(couponCode);
            if (couponData && couponData.isActive) {
              await this.getOrCreateStripeCoupon(couponData);
              sessionData.discounts = [{ coupon: couponCode.toUpperCase().trim() }];
            }
          } catch (couponErr) {
            console.error("Failed to sync/apply stripe coupon to session:", couponErr);
          }
        }
      }

      const session = await stripe.checkout.sessions.create(sessionData);

      return session;
    } catch (error) {
      console.error("Stripe createCheckoutSession error:", error);
      throw error;
    }
  }

  /**
   * Sync/Create Stripe Coupon programmatically based on our database coupon settings
   */
  static async getOrCreateStripeCoupon(couponData) {
    const couponId = couponData.code.toUpperCase().trim();
    try {
      return await stripe.coupons.retrieve(couponId);
    } catch (err) {
      // Create Stripe coupon if it doesn't exist
      const params = {
        id: couponId,
        duration: couponData.duration || "once",
      };
      
      if (couponData.duration === "repeating") {
        params.duration_in_months = couponData.durationInMonths || 1;
      }
      
      if (couponData.discountType === "percentage") {
        params.percent_off = Math.round(couponData.discountValue);
      } else {
        params.amount_off = Math.round(couponData.discountValue * 100);
        params.currency = "cad";
      }
      
      return await stripe.coupons.create(params);
    }
  }

  /**
   * Retrieve a Checkout Session from Stripe
   */
  static async retrieveSession(sessionId) {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error("Stripe retrieveSession error:", error);
      throw error;
    }
  }

  /**
   * Construct webhook event and verify signature
   */
  static constructEvent(payload, signature) {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE.WEBHOOK_SECRET,
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      throw error;
    }
  }

  /**
   * Cancel a subscription in Stripe
   */
  static async cancelSubscription(stripeSubscriptionId) {
    try {
      if (!stripeSubscriptionId) return null;
      return await stripe.subscriptions.cancel(stripeSubscriptionId);
    } catch (error) {
      console.error("Stripe cancelSubscription error:", error);
      throw error;
    }
  }
}

module.exports = StripeService;
