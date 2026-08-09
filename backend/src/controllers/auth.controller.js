const UserModel = require("../models/user.model");
const OtpModel = require("../models/otp.model");
const admin = require("../config/firebase.config");
const ResponseUtil = require("../utils/response.util");
const axios = require("axios");

class AuthController {
  static async sendOtp(req, res) {
    try {
      const { email } = req.body;
      console.log(`[sendOtp] Start process for: ${email}`);

      if (!email) {
        console.log(`[sendOtp] Error: Email is missing`);
        return ResponseUtil.error(res, 400, "Email is required");
      }

      // Check if email already exists in Firebase Auth
      try {
        console.log(`[sendOtp] Checking if email ${email} exists in Firebase Auth...`);
        await admin.auth().getUserByEmail(email);
        console.log(`[sendOtp] User exists in Firebase Auth`);
        return ResponseUtil.error(res, 400, "This email is already registered. Please login instead.");
      } catch (err) {
        console.log(`[sendOtp] Firebase auth check result: ${err.code || err.message}`);
        if (err.code !== 'auth/user-not-found') {
          console.error("Firebase auth check error:", err);
        }
      }

      // Generate random 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`[sendOtp] Generated OTP: ${otp} (Obfuscated in production if needed, logging for debug)`);

      // Save OTP to Firestore
      console.log(`[sendOtp] Saving OTP to Firestore...`);
      await OtpModel.saveOtp(email, otp);
      console.log(`[sendOtp] OTP saved successfully to Firestore`);

      // Read SMTP & Resend credentials directly from process.env at runtime
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.FROM_EMAIL || "Ghar Ki Rasoee <noreply@gharkirasoee.ca>";

      console.log(`[sendOtp] Credentials check: SMTP_USER=${!!smtpUser}, SMTP_PASS=${!!smtpPass}, RESEND_API_KEY=${!!resendApiKey}`);

      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #CB202D; text-align: center; font-size: 24px; margin-bottom: 5px;">Ghar Ki Rasoee</h2>
          <p style="text-align: center; color: #696969; font-size: 14px; margin-top: 0;">Fresh Homemade Meals</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #1c1c1c; font-size: 15px;">Hello,</p>
          <p style="color: #1c1c1c; font-size: 15px; line-height: 1.5;">Thank you for choosing <strong>Ghar Ki Rasoee</strong>. Please use the verification code below to verify your email address and complete your signup:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #CB202D; background-color: #f9fafb; padding: 12px 24px; border-radius: 8px; border: 1px solid #e5e7eb; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 13px; color: #696969; line-height: 1.4;">This code is valid for <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 11px; color: #a1a1a1; text-align: center; margin: 0;">© 2026 Ghar Ki Rasoee. All rights reserved.</p>
        </div>
      `;

      // 1. Try sending via Resend API (HTTP-based, works on Render Free Tier)
      if (resendApiKey && process.env.NODE_ENV !== "test") {
        console.log(`[sendOtp] Attempting to send via Resend API (to: ${email})...`);
        try {
          await axios.post("https://api.resend.com/emails", {
            from: fromEmail,
            to: [email],
            subject: `${otp} is your Ghar Ki Rasoee Verification Code`,
            html: htmlContent,
          }, {
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000, // 10 seconds timeout
          });
          console.log(`[sendOtp] Successfully sent OTP via Resend to ${email}`);
          return ResponseUtil.send(res, 200, "Verification code sent to your email.");
        } catch (resendError) {
          const apiError = resendError.response?.data || resendError.message;
          console.error("[sendOtp] Error sending OTP via Resend API:", apiError);
        }
      }

      // 2. Fallback to Gmail SMTP
      if (!smtpPass) {
        console.log("\n-----------------------------------------");
        console.log(`[DEV OTP BYPASS] Verification Code for ${email}: ${otp}`);
        console.log("-----------------------------------------\n");
        return ResponseUtil.send(res, 200, "Verification code sent (logged to console in development).");
      }

      console.log(`[sendOtp] Falling back to Gmail SMTP on Port 587 (family: 4)...`);
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 5000, // 5 seconds timeout to prevent hanging forever
        greetingTimeout: 5000,
        socketTimeout: 5000,
        family: 4, // Force IPv4 to prevent IPv6 ENETUNREACH timeouts on Render
      });

      const mailOptions = {
        from: `"Ghar Ki Rasoee" <${smtpUser}>`,
        to: email,
        subject: `${otp} is your Ghar Ki Rasoee Verification Code`,
        html: htmlContent,
      };

      console.log(`[sendOtp] Sending email via transporter.sendMail...`);
      await transporter.sendMail(mailOptions);
      console.log(`[sendOtp] Successfully sent OTP via SMTP to ${email}`);
      return ResponseUtil.send(res, 200, "Verification code sent to your email.");
    } catch (error) {
      console.error("[sendOtp] Critical error caught in sendOtp:", error);
      return ResponseUtil.error(res, 500, "Failed to send verification code.", error.message);
    }
  }

  static async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return ResponseUtil.error(res, 400, "Email and verification code are required.");
      }

      const result = await OtpModel.verifyOtp(email, otp);
      if (!result.success) {
        return ResponseUtil.error(res, 400, result.message);
      }

      return ResponseUtil.send(res, 200, "Email verified successfully!");
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return ResponseUtil.error(res, 500, "Failed to verify code.", error);
    }
  }

  static async syncUser(req, res) {
    try {
      const { uid, email, name, picture } = req.user; // From auth middleware
      const { phone, address, area } = req.body; // Additional details

      if (!phone) {
        return ResponseUtil.error(res, 400, "Phone number is required");
      }

      // Check if user already exists
      const existingUser = await UserModel.getUser(uid);
      const isNewUser = !existingUser;

      // Enforce OTP verification only for brand new registrations
      if (isNewUser) {
        const isVerified = await OtpModel.isEmailVerified(email);
        if (!isVerified) {
          return ResponseUtil.error(
            res, 
            400, 
            "Email address has not been verified by OTP. Please complete verification first."
          );
        }
      }

      const userData = {
        name,
        email,
        picture,
        phone,
        ...(address && { address }),
        ...(area && { area }),
        role: (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).includes(email) ? "admin" : "customer",
        lastLoginAt: new Date().toISOString(),
      };

      const user = await UserModel.createOrUpdateUser(uid, userData);

      // Consume (clean up) the OTP once registration is complete
      if (isNewUser) {
        await OtpModel.consumeOtp(email);
      }

      ResponseUtil.send(res, 200, "User synced successfully", user);
    } catch (error) {
      console.error("Error syncing user:", error);
      ResponseUtil.error(res, 500, "Failed to sync user", error);
    }
  }

  static async getProfile(req, res) {
    try {
      const { uid } = req.user;
      const user = await UserModel.getUser(uid);

      if (!user) {
        return ResponseUtil.error(res, 404, "User not found");
      }

      // Fetch active subscription
      const SubscriptionModel = require("../models/subscription.model");
      const subscription = await SubscriptionModel.getUserSubscription(uid);

      ResponseUtil.send(res, 200, "User profile fetched", {
        ...user,
        subscription,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      ResponseUtil.error(res, 500, "Failed to fetch profile", error);
    }
  }

  static async saveAddress(req, res) {
    try {
      const { uid } = req.user;
      const { address } = req.body;

      if (!address) {
        return ResponseUtil.error(res, 400, "Address is required");
      }

      const user = await UserModel.addSavedAddress(uid, address);
      ResponseUtil.send(res, 200, "Address saved successfully", user);
    } catch (error) {
      console.error("Error saving address:", error);
      ResponseUtil.error(res, 500, "Failed to save address", error);
    }
  }
}

module.exports = AuthController;
