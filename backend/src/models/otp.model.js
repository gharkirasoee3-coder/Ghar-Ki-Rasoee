const admin = require("../config/firebase.config");
const db = admin.firestore();

class OtpModel {
  static collection = db.collection("otps");

  /**
   * Save a newly generated OTP for a user email.
   * Overwrites any existing OTP for this email.
   */
  static async saveOtp(email, otp) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    const otpData = {
      email,
      otp,
      expiresAt: expiresAt.toISOString(),
      verified: false,
      createdAt: new Date().toISOString()
    };
    await this.collection.doc(email).set(otpData);
    return otpData;
  }

  /**
   * Verify if the provided OTP matches the stored one and is not expired.
   * If correct, marks the OTP record as verified.
   */
  static async verifyOtp(email, otp) {
    const doc = await this.collection.doc(email).get();
    if (!doc.exists) {
      return { success: false, message: "No verification code requested for this email." };
    }

    const data = doc.data();
    
    // Check expiration
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);
    if (now > expiresAt) {
      return { success: false, message: "Verification code has expired. Please request a new one." };
    }

    // Check match (case-insensitive for safety, but OTPs are numbers or upper anyway)
    if (data.otp.toString().trim() !== otp.toString().trim()) {
      return { success: false, message: "Incorrect verification code." };
    }

    // Mark as verified
    await this.collection.doc(email).update({
      verified: true,
      verifiedAt: new Date().toISOString()
    });

    return { success: true };
  }

  /**
   * Check if the email was successfully verified by OTP within the last 30 minutes.
   */
  static async isEmailVerified(email) {
    const doc = await this.collection.doc(email).get();
    if (!doc.exists) return false;

    const data = doc.data();
    if (!data.verified || !data.verifiedAt) return false;

    // Check if the verification happened within the last 30 minutes
    const verifiedAt = new Date(data.verifiedAt);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    return verifiedAt > thirtyMinutesAgo;
  }

  /**
   * Delete the OTP record once consumed (e.g. after successful user sync).
   */
  static async consumeOtp(email) {
    await this.collection.doc(email).delete();
  }
}

module.exports = OtpModel;
