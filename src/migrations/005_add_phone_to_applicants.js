const up = async (db) => {
  await db.query(`
    ALTER TABLE applicants
      ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NOT NULL DEFAULT '';
  `);

  console.log("005 migration: phone column added to applicants table");
};

const down = async (db) => {
  await db.query(`
    ALTER TABLE applicants
      DROP COLUMN IF EXISTS phone;
  `);

  console.log("005 migration: rolled back (phone column removed from applicants)");
};

module.exports = { up, down };
