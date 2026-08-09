const admin = require("../config/firebase.config");
const ResponseUtil = require("../utils/response.util");

const UserModel = require("../models/user.model");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split("Bearer ")[1];

  if (!token) return ResponseUtil.error(res, 401, "No token provided");

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    return ResponseUtil.error(res, 403, "Unauthorized: Invalid token", error);
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const user = await UserModel.getUser(uid);

    if (!user || user.role !== "admin") {
      return ResponseUtil.error(res, 403, "Forbidden: Admin access required");
    }

    next();
  } catch (error) {
    console.error("Error verifying admin:", error);
    return ResponseUtil.error(res, 500, "Internal Server Error", error);
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
};
