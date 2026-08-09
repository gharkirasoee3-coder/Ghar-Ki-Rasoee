# Backend Production Checklist

Your backend is now hardened with security best practices, but there are a few critical steps you must take before deploying to production to avoid errors.

## 🚨 Critical Actions (Must Do)

### 1. Update Environment Variables

The following variables in `backend/.env` (or your production environment secrets) **MUST** be set to real values:

- **`STRIPE_SECRET_KEY`**: Currently set to `your-stripe-secret-key`.
  _Risk:_ Payments will fail immediately.
- **`STRIPE_WEBHOOK_SECRET`**: Currently set to `your-stripe-webhook-secret`.
  _Risk:_ You won't receive payment confirmations (subscriptions won't activate).
- **`CLIENT_URL`**: This is the URL where your **Frontend** will reside.
  _Example:_ `https://your-app-name.vercel.app` or `https://www.yourdomain.com`
  _Why:_ The backend uses this to allow requests (CORS). If this doesn't match your actual frontend URL, the browser will block all API calls.

### 2. Update Frontend Environment

You must also configure your **Frontend** to know where the backend is.
Create/Update `.env` in the `frontend` folder (or set in your deployment platform):

- **`VITE_API_URL`**: This is the URL where your **Backend** is deployed.
  _Example:_ `https://gkr-backend.onrender.com` or `https://api.yourdomain.com`
  _Note:_ Ensure it does **not** have a trailing slash if your code appends `/api`.

### 3. Verify Firebase Key

Ensure `FIREBASE_PRIVATE_KEY` in your production environment is correctly formatted (newlines are often an issue in some hosting providers).

## ✅ What We Have Done

We have verified and improved:

- [x] **Verified Startup**: The backend starts without crashing.
- [x] **Security Headers**: Installed `helmet` to set secure HTTP headers.
- [x] **Rate Limiting**: Installed `express-rate-limit` to prevent abuse (100 req/15min per IP).
- [x] **CORS Policy**: Restricted Cross-Origin Resource Sharing to your trusted `CLIENT_URL`.

## 🚀 Deployment Recommendations

- **Use a Process Manager**: Use `PM2` (`npm install -g pm2`) to keep your server alive.
  ```bash
  pm2 start src/server.js --name "gkr-backend"
  ```
- **Monitoring**: Consider integrating Sentry or LogRocket for real-time error tracking.
