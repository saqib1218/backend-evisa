const Stripe = require("stripe");
const config = require("../config");

let stripe = null;
if (config.stripe.secretKey) {
  stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: "2024-06-20",
  });
} else {
  console.warn("STRIPE_SECRET_KEY not configured. Stripe payments will not work.");
}

function ensureStripeConfigured() {
  if (!stripe) {
    throw { status: 500, message: "Payment provider is not configured" };
  }
}

const StripeService = {
  /**
   * Creates a Stripe Checkout Session for the given pending application.
   * Only non-sensitive identifiers are placed into metadata.
   */
  async createCheckoutSession({ pendingApplicationId, amountInSmallestUnit, currency, description, customerEmail }) {
    ensureStripeConfigured();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      payment_method_options: {
        card: {
          setup_future_usage: undefined,
        },
      },
      submit_type: "pay",
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountInSmallestUnit,
            product_data: {
              name: "eVisa ETA Application Fee",
              description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        pendingApplicationId,
      },
      success_url: `${config.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/payment/cancel`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    return session;
  },

  /**
   * Verifies the raw webhook payload against the Stripe-Signature header.
   * Throws if the signature is invalid.
   */
  constructWebhookEvent(rawBody, signature) {
    ensureStripeConfigured();
    if (!config.stripe.webhookSecret) {
      throw { status: 500, message: "Webhook secret is not configured" };
    }
    return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  },

  async retrieveSession(sessionId) {
    ensureStripeConfigured();
    return stripe.checkout.sessions.retrieve(sessionId);
  },

  async retrievePaymentIntent(paymentIntentId) {
    ensureStripeConfigured();
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },
};

module.exports = StripeService;
