const admin = require("../config/firebase.config");
const db = admin.firestore();

class CouponModel {
  static collection = db.collection("coupons");

  /**
   * Create a new coupon
   */
  static async createCoupon(code, couponData) {
    const uppercaseCode = code.toUpperCase().trim();
    const data = {
      code: uppercaseCode,
      discountType: couponData.discountType, // 'percentage' or 'fixed'
      discountValue: Number(couponData.discountValue),
      minOrderAmount: couponData.minOrderAmount ? Number(couponData.minOrderAmount) : 0,
      maxDiscountAmount: couponData.maxDiscountAmount ? Number(couponData.maxDiscountAmount) : null,
      expiresAt: couponData.expiresAt, // ISO Date string (YYYY-MM-DD)
      maxUses: couponData.maxUses ? Number(couponData.maxUses) : null,
      usedCount: 0,
      isActive: couponData.isActive !== false, // default to true
      duration: couponData.duration || "once", // 'once' | 'repeating' | 'forever'
      durationInMonths: couponData.durationInMonths ? Number(couponData.durationInMonths) : null,
      createdAt: new Date().toISOString(),
    };
    await this.collection.doc(uppercaseCode).set(data);
    return data;
  }

  /**
   * Retrieve coupon details by code
   */
  static async getCoupon(code) {
    if (!code) return null;
    const uppercaseCode = code.toUpperCase().trim();
    const doc = await this.collection.doc(uppercaseCode).get();
    if (!doc.exists) return null;
    return doc.data();
  }

  /**
   * Retrieve all coupons
   */
  static async getAllCoupons() {
    const snapshot = await this.collection.orderBy("createdAt", "desc").get();
    const coupons = [];
    snapshot.forEach((doc) => {
      coupons.push(doc.data());
    });
    return coupons;
  }

  /**
   * Update coupon properties
   */
  static async updateCoupon(code, updateData) {
    const uppercaseCode = code.toUpperCase().trim();
    const cleanData = {};
    
    if (updateData.discountType !== undefined) cleanData.discountType = updateData.discountType;
    if (updateData.discountValue !== undefined) cleanData.discountValue = Number(updateData.discountValue);
    if (updateData.minOrderAmount !== undefined) cleanData.minOrderAmount = Number(updateData.minOrderAmount);
    if (updateData.maxDiscountAmount !== undefined) cleanData.maxDiscountAmount = updateData.maxDiscountAmount ? Number(updateData.maxDiscountAmount) : null;
    if (updateData.expiresAt !== undefined) cleanData.expiresAt = updateData.expiresAt;
    if (updateData.maxUses !== undefined) cleanData.maxUses = updateData.maxUses ? Number(updateData.maxUses) : null;
    if (updateData.isActive !== undefined) cleanData.isActive = updateData.isActive === true;
    if (updateData.duration !== undefined) cleanData.duration = updateData.duration;
    if (updateData.durationInMonths !== undefined) cleanData.durationInMonths = updateData.durationInMonths ? Number(updateData.durationInMonths) : null;
    
    cleanData.updatedAt = new Date().toISOString();

    await this.collection.doc(uppercaseCode).update(cleanData);
    return this.getCoupon(uppercaseCode);
  }

  /**
   * Delete a coupon
   */
  static async deleteCoupon(code) {
    const uppercaseCode = code.toUpperCase().trim();
    await this.collection.doc(uppercaseCode).delete();
    return uppercaseCode;
  }

  /**
   * Increment the usage counter of a coupon atomically
   */
  static async incrementUsage(code) {
    const uppercaseCode = code.toUpperCase().trim();
    await this.collection.doc(uppercaseCode).update({
      usedCount: admin.firestore.FieldValue.increment(1),
    });
  }
}

module.exports = CouponModel;
