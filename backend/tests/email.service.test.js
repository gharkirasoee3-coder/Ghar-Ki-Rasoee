const nodemailer = require("nodemailer");
const config = require("../src/config/env.config");

// Setup nodemailer mock
jest.mock("nodemailer", () => {
  const sendMailMock = jest.fn().mockImplementation((options, callback) => {
    if (callback) {
      callback(null, { messageId: "mock-id" });
    }
    return Promise.resolve({ messageId: "mock-id" });
  });
  const createTransportMock = jest.fn().mockReturnValue({
    sendMail: sendMailMock,
  });
  return {
    createTransport: createTransportMock,
  };
});

const EmailService = require("../src/services/email.service");

describe("EmailService", () => {
  let spyConsoleLog;
  let spyConsoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    spyConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
    spyConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    spyConsoleLog.mockRestore();
    spyConsoleError.mockRestore();
  });

  describe("sendPaymentConfirmationEmail", () => {
    const subscriptionDetails = {
      plan: "Premium",
      startDate: "2026-08-02T08:26:25.825Z",
      endDate: "2026-09-01T08:26:25.825Z",
      preferences: {
        defaultMeal: "Veg"
      },
      planDetails: {
        custom: true,
        basePlan: "Basic",
        roti: 3,
        sabziChoices: 2,
        raitaOption: "Yes",
        dessertOption: "Yes",
        saturdaySpecial: true
      }
    };

    const orderItems = [
      { name: "Paneer Tikka", quantity: 2, price: 15 },
      { name: "Butter Naan", quantity: 3, price: 3 }
    ];

    it("should send a subscription confirmation email when SMTP credentials are set", async () => {
      config.SMTP.USER = "test@example.com";
      config.SMTP.PASS = "testpassword";

      const result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        userName: "Himanshu",
        amount: 220,
        paymentMethod: "Cash on Delivery",
        paymentType: "subscription",
        details: subscriptionDetails,
        deliveryAddress: "68 Albion Avenue",
        transactionId: "sub-123",
        date: "2026-08-02T08:26:25.825Z"
      });

      expect(result).toBe(true);
      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(spyConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Successfully sent payment confirmation email to customer@example.com")
      );
    });

    it("should send a subscription renewal confirmation email", async () => {
      config.SMTP.USER = "test@example.com";
      config.SMTP.PASS = "testpassword";

      const result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        userName: "Himanshu",
        amount: 220,
        paymentMethod: "Stripe",
        paymentType: "renewal",
        details: subscriptionDetails,
        deliveryAddress: "68 Albion Avenue",
        transactionId: "sub-123"
      });

      expect(result).toBe(true);
    });

    it("should bypass and log to console when SMTP password is not set", async () => {
      config.SMTP.PASS = "";

      const result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        userName: "Himanshu",
        amount: 220,
        paymentMethod: "Cash on Delivery",
        paymentType: "subscription",
        details: subscriptionDetails,
        deliveryAddress: "68 Albion Avenue",
        transactionId: "sub-123"
      });

      expect(result).toBe(true);
      expect(spyConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("[DEV EMAIL BYPASS] Payment Confirmation for customer@example.com")
      );
    });

    it("should send a one-time order email when SMTP credentials are set", async () => {
      config.SMTP.USER = "test@example.com";
      config.SMTP.PASS = "testpassword";

      const result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        userName: "Himanshu",
        amount: 39,
        paymentMethod: "Stripe (Credit/Debit Card)",
        paymentType: "one-time",
        details: orderItems,
        deliveryAddress: "68 Albion Avenue",
        transactionId: "ord-123"
      });

      expect(result).toBe(true);
      expect(spyConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Successfully sent payment confirmation email to customer@example.com")
      );
    });

    it("should render default values for custom plan options", async () => {
      config.SMTP.USER = "test@example.com";
      config.SMTP.PASS = "testpassword";

      const subWithDefaults = {
        plan: "Premium",
        planDetails: {
          custom: true
        }
      };

      const result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        userName: "Himanshu",
        amount: 220,
        paymentMethod: "Stripe",
        paymentType: "subscription",
        details: subWithDefaults,
        deliveryAddress: "68 Albion Avenue",
        transactionId: "sub-123"
      });

      expect(result).toBe(true);
    });

    it("should handle object format for order items and empty items fallback", async () => {
      config.SMTP.USER = "test@example.com";
      config.SMTP.PASS = "testpassword";

      const objectItems = {
        "item1": { name: "Paneer Tikka", quantity: 2, price: 15 },
        "item2": { quantity: 1, price: 5 }
      };

      // Test object format
      let result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        userName: "Himanshu",
        amount: 35,
        paymentMethod: "Stripe",
        paymentType: "one-time",
        details: objectItems,
        deliveryAddress: "68 Albion Avenue",
        transactionId: "ord-123"
      });
      expect(result).toBe(true);

      // Test empty array format
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        userName: "Himanshu",
        amount: 0,
        paymentMethod: "Stripe",
        paymentType: "one-time",
        details: [],
        deliveryAddress: "68 Albion Avenue",
        transactionId: "ord-123"
      });
      expect(result).toBe(true);
    });

    it("should handle error when email is missing", async () => {
      const result = await EmailService.sendPaymentConfirmationEmail({
        userName: "Himanshu",
        amount: 220,
        paymentMethod: "Cash on Delivery",
        paymentType: "subscription",
        details: subscriptionDetails,
        deliveryAddress: "68 Albion Avenue",
        transactionId: "sub-123"
      });

      expect(result).toBe(false);
      expect(spyConsoleError).toHaveBeenCalledWith("Cannot send email, userEmail is missing.");
    });

    it("should handle error when nodemailer fails to send email", async () => {
      config.SMTP.USER = "test@example.com";
      config.SMTP.PASS = "testpassword";

      const mockTransport = {
        sendMail: jest.fn().mockRejectedValue(new Error("SMTP connection failed")),
      };
      nodemailer.createTransport.mockReturnValueOnce(mockTransport);

      const result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        userName: "Himanshu",
        amount: 220,
        paymentMethod: "Cash on Delivery",
        paymentType: "subscription",
        details: subscriptionDetails,
        deliveryAddress: "68 Albion Avenue",
        transactionId: "sub-123"
      });

      expect(result).toBe(false);
      expect(spyConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Error sending payment confirmation email:"),
        expect.any(Error)
      );
    });

    it("should cover all edge-cases and fallback branches", async () => {
      config.SMTP.USER = "test@example.com";
      config.SMTP.PASS = "testpassword";

      // 1. null details/items
      let result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "one-time",
        details: null
      });
      expect(result).toBe(true);

      // 2. empty object items
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "one-time",
        details: {}
      });
      expect(result).toBe(true);

      // 3. no custom plan details
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "subscription",
        details: { plan: "Basic" }
      });
      expect(result).toBe(true);

      // 4. name plan key
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "subscription",
        details: { name: "Basic Plan Name" }
      });
      expect(result).toBe(true);

      // 5. fallback plan name "Custom Plan"
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "subscription",
        details: {}
      });
      expect(result).toBe(true);

      // 6. object items with missing quantity/price
      const objectItemsDefaults = {
        "special_key": { name: "Special Item" }
      };
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "one-time",
        details: objectItemsDefaults
      });
      expect(result).toBe(true);

      // 7. custom plan with saturdaySpecial false
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "subscription",
        details: {
          planDetails: {
            custom: true,
            saturdaySpecial: false
          }
        }
      });
      expect(result).toBe(true);

      // 8. renewal with alternative name keys and fallback name
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "renewal",
        details: { name: "Renewed Plan Name" }
      });
      expect(result).toBe(true);

      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "renewal",
        details: {}
      });
      expect(result).toBe(true);

      // 9. items not being array nor object (implicit else in formatOrderItems)
      result = await EmailService.sendPaymentConfirmationEmail({
        userEmail: "customer@example.com",
        amount: 220,
        paymentType: "one-time",
        details: "invalid-type-string"
      });
      expect(result).toBe(true);
    });
  });
});
