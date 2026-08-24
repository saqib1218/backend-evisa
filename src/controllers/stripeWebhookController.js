const StripeService = require("../services/stripeService");
const { ApplicationService } = require("../services");
const { StripeWebhookEventRepository } = require("../repositories");

const StripeWebhookController = {
  async handleWebhook(req, res) {
    const signature = req.headers["stripe-signature"];

    let event;
    try {
      // req.body must be the raw, unparsed request body (Buffer) for
      // signature verification to succeed.
      event = StripeService.constructWebhookEvent(req.body, signature);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Idempotency: if this event has already been fully processed,
    // acknowledge and do nothing further.
    try {
      const alreadyProcessed = await StripeWebhookEventRepository.isEventProcessed(event.id);
      if (alreadyProcessed) {
        return res.status(200).json({ received: true, duplicate: true });
      }
    } catch (err) {
      console.error("Stripe webhook: failed to check event idempotency:", err.message);
      return res.status(500).json({ error: "Internal error" });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          await ApplicationService.confirmStripePayment(session);
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object;
          await ApplicationService.expirePendingApplication(session);
          break;
        }
        default:
          // Unhandled event types are acknowledged but ignored
          break;
      }

      // Only record as processed after successful handling, so a transient
      // failure never permanently blocks a legitimate retry from Stripe.
      await StripeWebhookEventRepository.recordEvent(event.id, event.type);

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error(`Stripe webhook: error processing event ${event.type}:`, err.message);
      // Return 500 so Stripe retries; the application-creation and
      // email-sent guards prevent duplicate side effects on retry.
      return res.status(500).json({ error: "Failed to process event" });
    }
  },
};

module.exports = StripeWebhookController;
