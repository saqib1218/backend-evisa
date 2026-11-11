const up = async (db) => {
  await db.query(`
    ALTER TABLE pending_applications
      ADD COLUMN IF NOT EXISTS revolut_order_id VARCHAR(255);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_applications_revolut_order
      ON pending_applications(revolut_order_id) WHERE revolut_order_id IS NOT NULL;
  `);

  await db.query(`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS revolut_order_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_revolut_order
      ON payments(revolut_order_id) WHERE revolut_order_id IS NOT NULL;

    UPDATE payments SET payment_provider = 'stripe'
      WHERE payment_provider IS NULL AND stripe_checkout_session_id IS NOT NULL;
  `);

  console.log("016 migration: Revolut order columns added to pending_applications and payments");
};

const down = async (db) => {
  await db.query(`
    DROP INDEX IF EXISTS idx_payments_revolut_order;
    ALTER TABLE payments
      DROP COLUMN IF EXISTS revolut_order_id,
      DROP COLUMN IF EXISTS payment_provider;

    DROP INDEX IF EXISTS idx_pending_applications_revolut_order;
    ALTER TABLE pending_applications
      DROP COLUMN IF EXISTS revolut_order_id;
  `);

  console.log("016 migration: rolled back (Revolut columns removed)");
};

module.exports = { up, down };
