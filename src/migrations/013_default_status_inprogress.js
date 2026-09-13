const db = require("../config/database");

async function up() {
  // Change column defaults so new rows get 'inprogress' automatically
  await db.query(`
    ALTER TABLE applications
      ALTER COLUMN status SET DEFAULT 'inprogress';
  `);
  await db.query(`
    ALTER TABLE applicants
      ALTER COLUMN status SET DEFAULT 'inprogress';
  `);

  // Backfill existing rows that are still 'pending' to 'inprogress'
  await db.query(`
    UPDATE applications SET status = 'inprogress' WHERE status = 'pending';
  `);
  await db.query(`
    UPDATE applicants SET status = 'inprogress' WHERE status = 'pending';
  `);

  console.log("Migration 013: Default status changed to 'inprogress' for applications and applicants");
}

async function down() {
  await db.query(`
    ALTER TABLE applications
      ALTER COLUMN status SET DEFAULT 'pending';
  `);
  await db.query(`
    ALTER TABLE applicants
      ALTER COLUMN status SET DEFAULT 'pending';
  `);
  console.log("Migration 013 reverted: Default status changed back to 'pending'");
}

module.exports = { up, down };
