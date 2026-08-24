const db = require("../config/database");

const StripeWebhookEventRepository = {
  /**
   * Checks whether this Stripe event has already been fully processed.
   * Events are only recorded AFTER successful processing (see
   * `recordEvent`), so a transient failure never permanently blocks a
   * legitimate retry from Stripe.
   */
  async isEventProcessed(stripeEventId) {
    const result = await db.query(
      `SELECT 1 FROM stripe_webhook_events WHERE stripe_event_id = $1`,
      [stripeEventId]
    );
    return result.rows.length > 0;
  },

  /**
   * Records a Stripe event as successfully processed. Safe to call
   * concurrently — relies on the UNIQUE constraint on stripe_event_id.
   */
  async recordEvent(stripeEventId, eventType) {
    await db.query(
      `INSERT INTO stripe_webhook_events (stripe_event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (stripe_event_id) DO NOTHING`,
      [stripeEventId, eventType]
    );
  },
};

module.exports = StripeWebhookEventRepository;
