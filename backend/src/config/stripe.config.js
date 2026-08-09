const Stripe = require("stripe");
const env = require("./env.config");

const stripe = new Stripe(env.STRIPE.SECRET_KEY, {
  apiVersion: "2023-10-16", // Use the latest API version or the one you are comfortable with
});

module.exports = stripe;
