const CouponModel = require("../models/coupon.model");
const ResponseUtil = require("../utils/response.util");
const cache = require("../utils/cache.util");

class CouponController {
  /**
   * Validate coupon code for checkout
   */
  static async validateCoupon(req, res) {
    try {
      const { code, amount } = req.body;

      if (!code) {
        return ResponseUtil.error(res, 400, "Coupon code is required");
      }

      if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
        return ResponseUtil.error(res, 400, "Valid order amount is required to validate coupon");
      }

      const coupon = await CouponModel.getCoupon(code);
      if (!coupon) {
        return ResponseUtil.error(res, 404, "Invalid coupon code");
      }

      // Check if active
      if (!coupon.isActive) {
        return ResponseUtil.error(res, 400, "This coupon is inactive");
      }

      // Check expiration
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }); // YYYY-MM-DD
      if (coupon.expiresAt && coupon.expiresAt < today) {
        return ResponseUtil.error(res, 400, "This coupon has expired");
      }

      // Check max usage limit
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return ResponseUtil.error(res, 400, "This coupon has reached its usage limit");
      }

      // Check minimum order amount
      if (coupon.minOrderAmount > 0 && amount < coupon.minOrderAmount) {
        return ResponseUtil.error(
          res,
          400,
          `Minimum purchase of $${coupon.minOrderAmount.toFixed(2)} CAD is required for this coupon`
        );
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discountType === "fixed") {
        discountAmount = coupon.discountValue;
      } else if (coupon.discountType === "percentage") {
        discountAmount = amount * (coupon.discountValue / 100);
        if (coupon.maxDiscountAmount !== null && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      }

      // Ensure discount does not exceed the total amount
      discountAmount = Math.min(discountAmount, amount);
      const finalAmount = Math.max(0, amount - discountAmount);

      return ResponseUtil.send(res, 200, "Coupon validated successfully", {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        finalAmount,
        duration: coupon.duration || "once",
        durationInMonths: coupon.durationInMonths || null,
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      return ResponseUtil.error(res, 500, "Failed to validate coupon", error);
    }
  }

  /**
   * Admin: Create a new coupon
   */
  static async createCoupon(req, res) {
    try {
      const { code, discountType, discountValue, minOrderAmount, maxDiscountAmount, expiresAt, maxUses, isActive, duration, durationInMonths } = req.body;

      if (!code || !discountType || discountValue === undefined) {
        return ResponseUtil.error(res, 400, "Code, discount type, and discount value are required");
      }

      if (discountType !== "percentage" && discountType !== "fixed") {
        return ResponseUtil.error(res, 400, "Discount type must be either 'percentage' or 'fixed'");
      }

      const existing = await CouponModel.getCoupon(code);
      if (existing) {
        return ResponseUtil.error(res, 400, "A coupon with this code already exists");
      }

      const coupon = await CouponModel.createCoupon(code, {
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount,
        expiresAt,
        maxUses,
        isActive,
        duration,
        durationInMonths,
      });

      // Clear cache if needed
      cache.delete("admin_all_coupons");

      return ResponseUtil.send(res, 201, "Coupon created successfully", coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
      return ResponseUtil.error(res, 500, "Failed to create coupon", error);
    }
  }

  /**
   * Admin: Get all coupons
   */
  static async getAllCoupons(req, res) {
    try {
      const cachedCoupons = cache.get("admin_all_coupons");
      if (cachedCoupons) {
        return ResponseUtil.send(res, 200, "Coupons fetched (cached)", cachedCoupons);
      }

      const coupons = await CouponModel.getAllCoupons();
      cache.set("admin_all_coupons", coupons, 60); // Cache for 1 min

      return ResponseUtil.send(res, 200, "Coupons fetched successfully", coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      return ResponseUtil.error(res, 500, "Failed to fetch coupons", error);
    }
  }

  /**
   * Admin: Update a coupon
   */
  static async updateCoupon(req, res) {
    try {
      const { couponId } = req.params; // Coupon code is the ID
      const updateData = req.body;

      if (!couponId) {
        return ResponseUtil.error(res, 400, "Coupon code is required");
      }

      const coupon = await CouponModel.getCoupon(couponId);
      if (!coupon) {
        return ResponseUtil.error(res, 404, "Coupon not found");
      }

      const updatedCoupon = await CouponModel.updateCoupon(couponId, updateData);
      
      cache.delete("admin_all_coupons");

      return ResponseUtil.send(res, 200, "Coupon updated successfully", updatedCoupon);
    } catch (error) {
      console.error("Error updating coupon:", error);
      return ResponseUtil.error(res, 500, "Failed to update coupon", error);
    }
  }

  /**
   * Admin: Delete a coupon
   */
  static async deleteCoupon(req, res) {
    try {
      const { couponId } = req.params;

      if (!couponId) {
        return ResponseUtil.error(res, 400, "Coupon code is required");
      }

      const coupon = await CouponModel.getCoupon(couponId);
      if (!coupon) {
        return ResponseUtil.error(res, 404, "Coupon not found");
      }

      await CouponModel.deleteCoupon(couponId);
      
      cache.delete("admin_all_coupons");

      return ResponseUtil.send(res, 200, "Coupon deleted successfully", { code: couponId });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      return ResponseUtil.error(res, 500, "Failed to delete coupon", error);
    }
  }
}

module.exports = CouponController;
