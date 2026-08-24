const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL DEFAULT 'application_submitted',
      title VARCHAR(255) NOT NULL,
      message TEXT,
      application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
      applicant_id VARCHAR(50),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  `);

  console.log("007 migration: notifications table created");
};

const down = async (db) => {
  await db.query(`DROP TABLE IF EXISTS notifications;`);
  console.log("007 migration: rolled back (notifications table removed)");
};

module.exports = { up, down };
