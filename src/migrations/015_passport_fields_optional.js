// Passport, Passport image, and Your photo steps are temporarily disabled on the frontend
// application form, so nationality, passport number, and passport dates are no longer always
// collected. Relax these columns so new applications without this data can still be saved.
const up = async (db) => {
  await db.query(`
    ALTER TABLE applicants
      ALTER COLUMN nationality DROP NOT NULL,
      ALTER COLUMN passport_number DROP NOT NULL,
      ALTER COLUMN passport_issue_date DROP NOT NULL,
      ALTER COLUMN passport_expiry_date DROP NOT NULL;
  `);

  console.log("015 migration: nationality/passport_number/passport_issue_date/passport_expiry_date made nullable on applicants table");
};

const down = async (db) => {
  await db.query(`
    ALTER TABLE applicants
      ALTER COLUMN nationality SET NOT NULL,
      ALTER COLUMN passport_number SET NOT NULL,
      ALTER COLUMN passport_issue_date SET NOT NULL,
      ALTER COLUMN passport_expiry_date SET NOT NULL;
  `);

  console.log("015 migration: rolled back (nationality/passport_number/passport_issue_date/passport_expiry_date reverted to NOT NULL)");
};

module.exports = { up, down };
