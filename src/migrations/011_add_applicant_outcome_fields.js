const up = async (db) => {
  // Add per-applicant outcome + fee-share fields
  await db.query(`
    ALTER TABLE applicants
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS admin_notes TEXT,
      ADD COLUMN IF NOT EXISTS visa_document_url TEXT,
      ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
  `);

  // Backfill fee_amount for existing rows using an equal split of the
  // application's grand_total across its applicants (best-effort; safe to
  // re-run since it only fills rows that are still NULL).
  await db.query(`
    UPDATE applicants ap
    SET fee_amount = sub.share
    FROM (
      SELECT a.id AS application_id,
             ROUND(p.grand_total / GREATEST(COUNT(a2.id), 1), 2) AS share
      FROM applications a
      JOIN payments p ON p.application_id = a.id
      JOIN applicants a2 ON a2.application_id = a.id
      GROUP BY a.id, p.grand_total
    ) sub
    WHERE ap.application_id = sub.application_id
      AND ap.fee_amount IS NULL;
  `);

  console.log("011 migration: applicants table extended with status, admin_notes, visa_document_url, fee_amount, email_sent");
};

const down = async (db) => {
  await db.query(`
    ALTER TABLE applicants
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS admin_notes,
      DROP COLUMN IF EXISTS visa_document_url,
      DROP COLUMN IF EXISTS fee_amount,
      DROP COLUMN IF EXISTS email_sent;
  `);

  console.log("011 migration: rolled back (applicants outcome fields removed)");
};

module.exports = { up, down };
