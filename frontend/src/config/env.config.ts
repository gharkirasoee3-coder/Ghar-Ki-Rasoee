export const ENV = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
};
