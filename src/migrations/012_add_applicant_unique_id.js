/**
 * Adds a unique, per-applicant identifier (applicants.applicant_id) so that
 * every traveller on an application — not just the whole order — has their
 * own trackable ID. Existing rows (already live in production) are
 * backfilled with freshly generated unique IDs so no data is lost and
 * nothing has to be resubmitted.
 *
 * Backward compatibility: the existing order-level `applications.applicant_id`
 * is left untouched. Any ID already emailed to a customer before this
 * migration continues to resolve correctly via the order-level lookup path
 * in ApplicationRepository.findByApplicantId.
 */
const up = async (db) => {
  await db.query(`
    ALTER TABLE applicants
      ADD COLUMN IF NOT EXISTS applicant_id VARCHAR(20);
  `);

  // Backfill existing applicant rows (already stored in production) with a
  // freshly generated, unique per-applicant ID.
  const { rows } = await db.query(`SELECT id FROM applicants WHERE applicant_id IS NULL`);
  for (const row of rows) {
    let candidate;
    let exists = true;
    while (exists) {
      const num = Math.floor(10000 + Math.random() * 90000);
      candidate = `ALGS-${num}`;
      const check = await db.query(
        `SELECT 1 FROM applicants WHERE applicant_id = $1
         UNION ALL
         SELECT 1 FROM applications WHERE applicant_id = $1
         LIMIT 1`,
        [candidate]
      );
      exists = check.rows.length > 0;
    }
    await db.query(`UPDATE applicants SET applicant_id = $1 WHERE id = $2`, [candidate, row.id]);
  }

  // Now that every row has a value, enforce uniqueness + NOT NULL going forward.
  await db.query(`
    ALTER TABLE applicants
      ALTER COLUMN applicant_id SET NOT NULL;
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_applicant_id_unique ON applicants(applicant_id);
  `);

  console.log("012 migration: applicants.applicant_id added, backfilled with unique IDs for existing rows, and enforced unique/NOT NULL");
};

const down = async (db) => {
  await db.query(`DROP INDEX IF EXISTS idx_applicants_applicant_id_unique;`);
  await db.query(`ALTER TABLE applicants DROP COLUMN IF EXISTS applicant_id;`);
  console.log("012 migration: rolled back (applicants.applicant_id removed)");
};

module.exports = { up, down };
