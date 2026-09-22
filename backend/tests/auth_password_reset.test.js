const AuthController = require("../src/controllers/auth.controller");
const OtpModel = require("../src/models/otp.model");
const admin = require("../src/config/firebase.config");
const ResponseUtil = require("../src/utils/response.util");

jest.mock("../src/models/otp.model", () => ({
  saveOtp: jest.fn(),
  verifyOtp: jest.fn(),
  consumeOtp: jest.fn(),
}));

jest.mock("../src/config/firebase.config", () => {
  const mockAuth = {
    getUserByEmail: jest.fn(),
    updateUser: jest.fn(),
  };
  return {
    auth: () => mockAuth,
    firestore: () => ({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false }),
    }),
  };
});

jest.mock("../src/utils/response.util", () => ({
  send: jest.fn(),
  error: jest.fn(),
}));

describe("AuthController - Password Reset with OTP", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      user: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("sendForgotPasswordOtp", () => {
    it("should return 400 if email is missing", async () => {
      req.body = {};
      await AuthController.sendForgotPasswordOtp(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(res, 400, "Email is required");
    });

    it("should return 404 if email does not exist in Firebase Auth", async () => {
      req.body = { email: "nonexistent@test.com" };
      const notFoundErr = new Error("User not found");
      notFoundErr.code = "auth/user-not-found";
      admin.auth().getUserByEmail.mockRejectedValueOnce(notFoundErr);

      await AuthController.sendForgotPasswordOtp(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        404,
        "No account found with this email address. Please check your email or register."
      );
    });

    it("should generate OTP, save it, and return success if user exists", async () => {
      req.body = { email: "validuser@test.com" };
      admin.auth().getUserByEmail.mockResolvedValueOnce({ uid: "user-123", email: "validuser@test.com" });
      OtpModel.saveOtp.mockResolvedValueOnce({ otp: "123456" });

      await AuthController.sendForgotPasswordOtp(req, res);
      expect(OtpModel.saveOtp).toHaveBeenCalledWith("validuser@test.com", expect.any(String));
      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        200,
        expect.stringContaining("code sent")
      );
    });
  });

  describe("resetPasswordWithOtp", () => {
    it("should return 400 if required fields are missing", async () => {
      req.body = { email: "user@test.com" };
      await AuthController.resetPasswordWithOtp(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "Email, verification code, and new password are required."
      );
    });

    it("should return 400 if new password is too short", async () => {
      req.body = { email: "user@test.com", otp: "123456", newPassword: "123" };
      await AuthController.resetPasswordWithOtp(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "New password must be at least 6 characters long."
      );
    });

    it("should return 400 if OTP verification fails", async () => {
      req.body = { email: "user@test.com", otp: "999999", newPassword: "newpassword123" };
      OtpModel.verifyOtp.mockResolvedValueOnce({ success: false, message: "Incorrect verification code." });

      await AuthController.resetPasswordWithOtp(req, res);
      expect(ResponseUtil.error).toHaveBeenCalledWith(
        res,
        400,
        "Incorrect verification code."
      );
    });

    it("should successfully update password and consume OTP if valid", async () => {
      req.body = { email: "user@test.com", otp: "123456", newPassword: "newpassword123" };
      OtpModel.verifyOtp.mockResolvedValueOnce({ success: true });
      admin.auth().getUserByEmail.mockResolvedValueOnce({ uid: "user-123", email: "user@test.com" });
      admin.auth().updateUser.mockResolvedValueOnce({ uid: "user-123" });
      OtpModel.consumeOtp.mockResolvedValueOnce(true);

      await AuthController.resetPasswordWithOtp(req, res);
      expect(admin.auth().updateUser).toHaveBeenCalledWith("user-123", { password: "newpassword123" });
      expect(OtpModel.consumeOtp).toHaveBeenCalledWith("user@test.com");
      expect(ResponseUtil.send).toHaveBeenCalledWith(
        res,
        200,
        expect.stringContaining("Password has been reset successfully")
      );
    });
  });
});
