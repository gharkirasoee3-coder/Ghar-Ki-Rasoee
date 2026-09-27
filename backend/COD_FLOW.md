# COD subscription approval and payment

COD subscriptions use independent service and payment states:

| Event | Subscription status | Approval | Payment status | Invoice email |
| --- | --- | --- | --- | --- |
| Customer checks out | Pending | Pending | Pending | None |
| Admin selects ACCEPT | Active | Accepted | Pending | None |
| Admin selects COD confirmed | Unchanged | Accepted | Paid | Send payment invoice |

The subscription period starts on acceptance, not checkout. Pending records have null start/end dates. Customer lists include pending requests, while delivery generation continues to select Active subscriptions only. Accepted unpaid subscriptions can receive deliveries. Payment can be collected after an accepted subscription expires or is cancelled.

COD totals are frozen when the request or order is created. The backend verifies the menu subtotal and calculates the full amount in integer cents:

```text
discounted subtotal = verified subtotal - coupon discount
platform service fee = 2.5% of discounted subtotal + CAD $0.30
total = discounted subtotal + configured delivery fee + platform service fee
```

Free-delivery eligibility uses the verified subtotal before coupons. The platform percentage excludes the delivery fee. COD subscriptions and one-time COD orders persist `subtotal`, `discountAmount`, `discountedSubtotal`, `deliveryFee`, `platformServiceFee`, and `totalAmount`; `planDetails.price` remains the subscription total for compatibility. Client-supplied item prices, fee fields, totals, and cheaper claimed delivery zones are never authoritative. Subscription delivery zones are derived from the delivery address, and supported one-time COD meals are priced from server-managed customization rules. Existing records without a reliable fee breakdown retain their stored total and do not display or reconstruct fee components from current configuration.

`POST /subscriptions` creates COD requests. Online subscriptions continue through verified Stripe checkout. Client-supplied payment status cannot mark a COD request paid. Existing active COD subscriptions remain collectible without a migration.

Admin routes require authentication and the admin role:

- `PATCH /admin/subscriptions/:subscriptionId/accept` accepts a pending COD request.
- `PATCH /admin/subscriptions/:subscriptionId/confirm-payment` records payment and attempts the invoice email.

Acceptance and payment transitions use Firestore transactions. Duplicate acceptance cannot restart dates, and concurrent payment confirmations do not each trigger an invoice. Subscription activation cannot be performed through order delivery-status updates. A pending replacement preserves the current plan until acceptance; stale replacement references require a new checkout request.

External email and Stripe operations occur after the database transaction. `invoiceEmailStatus` records Sent/Failed, and confirmation returns `invoiceEmailSent`; an email failure does not reverse a collected payment. Admin must follow up on a failed invoice manually; repeating confirmation is rejected to avoid duplicate collection/email. If cancellation of replaced Stripe billing fails, `billingCancellationPending` and `replacedStripeSubscriptionId` remain on the new subscription for manual billing follow-up, and the admin receives a warning. There is no automatic retry worker for either external operation.

Regression checks: run `npm test -- --runInBand` in backend and `npm run build` in frontend. The lifecycle tests use isolated Firestore doubles; production credentials and live email/payment services are not exercised.
