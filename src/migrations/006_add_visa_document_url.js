const up = async (db) => {
  await db.query(`
    ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS visa_document_url TEXT;
  `);

  console.log("006 migration: visa_document_url column added to applications");
};

const down = async (db) => {
  await db.query(`
    ALTER TABLE applications
      DROP COLUMN IF EXISTS visa_document_url;
  `);

  console.log("006 migration: rolled back (visa_document_url column removed)");
};

module.exports = { up, down };
