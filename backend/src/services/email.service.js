const nodemailer = require("nodemailer");
const config = require("../config/env.config");

class EmailService {
  /**
   * Helper to format custom plan configuration details into HTML
   */
  static _formatCustomDetails(planDetails) {
    if (!planDetails || !planDetails.custom) return "";
    return `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #111827; font-size: 14px; font-weight: 700;">Custom Plan Options:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4b5563; line-height: 1.6;">
          <li><strong>Base Plan:</strong> ${planDetails.basePlan || 'Basic'}</li>
          <li><strong>Roti:</strong> ${planDetails.roti || 0} per day</li>
          <li><strong>Sabzi Choices:</strong> ${planDetails.sabziChoices || 0} per day</li>
          <li><strong>Raita:</strong> ${planDetails.raitaOption || 'None'}</li>
          <li><strong>Dessert:</strong> ${planDetails.dessertOption || 'None'}</li>
          <li><strong>Saturday Special:</strong> ${planDetails.saturdaySpecial ? 'Included' : 'Not Included'}</li>
        </ul>
      </div>
    `;
  }

  /**
   * Helper to format order items into HTML
   */
  static _formatOrderItems(items) {
    if (!items || (Array.isArray(items) && items.length === 0) || (typeof items === 'object' && Object.keys(items).length === 0)) {
      return "<p style='color: #6b7280; font-size: 13px;'>No items specified.</p>";
    }
    
    let itemsArray = [];
    if (Array.isArray(items)) {
      itemsArray = items;
    } else if (typeof items === 'object') {
      itemsArray = Object.keys(items).map(key => ({
        name: items[key].name || key,
        quantity: items[key].quantity || 1,
        price: items[key].price || 0
      }));
    }

    const rows = itemsArray.map(item => `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 12px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${item.name}</td>
        <td style="padding: 12px 0; text-align: center; color: #4b5563; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">$${(item.price * item.quantity).toFixed(2)} CAD</td>
      </tr>
    `).join("");

    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
            <th style="padding-bottom: 8px; color: #374151; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
            <th style="padding-bottom: 8px; text-align: center; color: #374151; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
            <th style="padding-bottom: 8px; text-align: right; color: #374151; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  /**
   * Main function to send the payment confirmation email
   */
  static async sendPaymentConfirmationEmail({
    userEmail,
    userName,
    amount,
    paymentMethod,
    paymentType, // 'subscription' | 'one-time' | 'renewal'
    details, // subscription details (plan, planDetails) or order items
    deliveryAddress,
    transactionId,
    date
  }) {
    try {
      if (!userEmail) {
        console.error("Cannot send email, userEmail is missing.");
        return false;
      }

      const formattedAmount = Number(amount).toFixed(2);
      const displayDate = date
        ? new Date(date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

      let detailHtml = "";
      let typeLabel = "Subscription Plan";

      if (paymentType === 'subscription') {
        typeLabel = "Subscription Purchase";
        const planName = details?.plan || details?.name || "Custom Plan";
        detailHtml = `
          <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Plan:</strong> ${planName}</p>
          ${this._formatCustomDetails(details?.planDetails || details)}
        `;
      } else if (paymentType === 'renewal') {
        typeLabel = "Subscription Renewal";
        const planName = details?.plan || details?.name || "Custom Plan";
        detailHtml = `
          <p style="margin: 0; font-size: 14px; color: #4b5563;">Your subscription to <strong>${planName}</strong> has been successfully renewed.</p>
          ${this._formatCustomDetails(details?.planDetails || details)}
        `;
      } else {
        typeLabel = "One-Time Order";
        detailHtml = this._formatOrderItems(details);
      }

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Confirmed - Ghar Ki Rasoee</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
    <!-- Branded Header -->
    <div style="background-color: #CB202D; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Ghar Ki Rasoee</h1>
      <p style="color: #fecaca; margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">Fresh Homemade Meals Delivered</p>
    </div>
    
    <!-- Body Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #111827; margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">Hello ${userName || 'Customer'},</h2>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin: 0 0 30px 0;">
        Thank you for your payment! We are pleased to confirm that your payment has been successfully processed. Here is a summary of your transaction:
      </p>
      
      <!-- Receipt Summary Card -->
      <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fef2f2 100%); border: 1px solid #fee2e2; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
        <span style="display: inline-block; background-color: #def7ec; color: #03543f; font-size: 12px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; letter-spacing: 0.5px;">
          Payment Confirmed
        </span>
        <div style="font-size: 36px; font-weight: 800; color: #CB202D; margin-bottom: 5px;">
          $${formattedAmount} <span style="font-size: 18px; font-weight: 600; color: #4b5563;">CAD</span>
        </div>
        <p style="color: #6b7280; font-size: 13px; margin: 0;">Transaction/Order ID: ${transactionId || 'N/A'}</p>
      </div>

      <!-- Transaction Details Table -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 15px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Transaction Details
        </h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 40%;">Payment Date</td>
            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${displayDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Payment Method</td>
            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Payment Type</td>
            <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${typeLabel}</td>
          </tr>
        </table>
        
        ${detailHtml}
      </div>

      <!-- Delivery Address Section -->
      ${deliveryAddress ? `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #111827; font-size: 14px; font-weight: 700; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
          Delivery Address
        </h3>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">
          ${deliveryAddress}
        </p>
      </div>
      ` : ''}

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 10px 0;">
        If you have any questions or need to make changes to your delivery details/preferences, please access your profile dashboard or reply to this email to contact support.
      </p>
      <p style="color: #111827; font-size: 15px; font-weight: 700; margin: 25px 0 0 0;">
        Warm regards,<br>
        <span style="color: #CB202D; font-weight: 800;">Ghar Ki Rasoee Team</span>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        This is an automatically generated transaction receipt. Please do not reply directly to this message.
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 5px 0 0 0;">
        &copy; 2026 Ghar Ki Rasoee. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `;

      // Read SMTP credentials directly from process.env at runtime
      const smtpUser = config.SMTP.USER;
      const smtpPass = config.SMTP.PASS;

      // Fallback if SMTP password is not set
      if (!smtpPass) {
        console.log("\n=======================================================");
        console.log(`[DEV EMAIL BYPASS] Payment Confirmation for ${userEmail}`);
        console.log(`Subject: Payment Confirmed - $${formattedAmount} CAD`);
        console.log(`Payment Method: ${paymentMethod} (${paymentType})`);
        console.log(`Transaction/Order ID: ${transactionId}`);
        console.log(`Delivery Address: ${deliveryAddress}`);
        console.log("-------------------------------------------------------");
        console.log(htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, 500) + "...");
        console.log("=======================================================\n");
        return true;
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"Ghar Ki Rasoee" <${smtpUser}>`,
        to: userEmail,
        subject: `Payment Confirmed - $${formattedAmount} CAD - Ghar Ki Rasoee`,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Successfully sent payment confirmation email to ${userEmail}`);
      return true;
    } catch (error) {
      console.error("Error sending payment confirmation email:", error);
      return false;
    }
  }
}

module.exports = EmailService;
