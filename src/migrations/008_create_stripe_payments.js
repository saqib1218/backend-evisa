const up = async (db) => {
  // pending_applications: temporary holding area for form data submitted
  // before payment is confirmed. The real `applications` row is only
  // created once the Stripe webhook confirms successful payment.
  await db.query(`
    CREATE TABLE IF NOT EXISTS pending_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stripe_checkout_session_id VARCHAR(255) UNIQUE,
      form_data JSONB NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'gbp',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pending_applications_session ON pending_applications(stripe_checkout_session_id);
    CREATE INDEX IF NOT EXISTS idx_pending_applications_status ON pending_applications(status);
  `);

  // stripe_webhook_events: idempotency ledger so a retried Stripe webhook
  // can never be processed more than once.
  await db.query(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
      event_type VARCHAR(100),
      processed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Add Stripe identifiers to the existing payments table
  await db.query(`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'gbp',
      ADD COLUMN IF NOT EXISTS confirmation_email_sent BOOLEAN DEFAULT false;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_session ON payments(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
  `);

  console.log("008 migration: pending_applications, stripe_webhook_events created + payments altered with Stripe fields");
};

const down = async (db) => {
  await db.query(`
    ALTER TABLE payments
      DROP COLUMN IF EXISTS stripe_checkout_session_id,
      DROP COLUMN IF EXISTS stripe_payment_intent_id,
      DROP COLUMN IF EXISTS currency,
      DROP COLUMN IF EXISTS confirmation_email_sent;
  `);
  await db.query("DROP TABLE IF EXISTS stripe_webhook_events CASCADE;");
  await db.query("DROP TABLE IF EXISTS pending_applications CASCADE;");

  console.log("008 migration: rolled back");
};

module.exports = { up, down };
