const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const ResponseUtil = require("./utils/response.util");
const env = require("./config/env.config");

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Stripe webhook route needs raw body for signature verification.
// It must be defined before express.json() middleware.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // Forward directly to controller's handleWebhook
    const PaymentController = require("./controllers/payment.controller");
    PaymentController.handleWebhook(req, res, next);
  }
);

app.use(express.json());

// Routes
const authRoutes = require("./routes/auth.routes");
const menuRoutes = require("./routes/menu.routes");
const orderRoutes = require("./routes/order.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const adminRoutes = require("./routes/admin.routes");
const activityRoutes = require("./routes/activity.routes");
const paymentRoutes = require("./routes/payment.routes");
const testimonialRoutes = require("./routes/testimonial.routes");
const holidayRoutes = require("./routes/holiday.routes");

// Helper function or mounting...
// Since app is already declared above line 5.
// We just need to mount routes.
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/holidays", holidayRoutes);

// Basic Health Check Route
app.get("/", (req, res) => {
  ResponseUtil.send(res, 200, "GHAR KI RASOEE Backend is running smoothly!");
});

// 404 Handler
app.use((req, res) => {
  ResponseUtil.error(res, 404, "Route not found");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  ResponseUtil.error(res, 500, "Internal Server Error", err);
});

module.exports = app;
