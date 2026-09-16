const db = require("../config/database");

async function up() {
  await db.query(`
    ALTER TABLE applicants
      ADD COLUMN IF NOT EXISTS job VARCHAR(255) DEFAULT NULL;
  `);
  console.log("Migration 014: 'job' column added to applicants table");
}

async function down() {
  await db.query(`
    ALTER TABLE applicants
      DROP COLUMN IF EXISTS job;
  `);
  console.log("Migration 014 reverted: 'job' column removed from applicants");
}

module.exports = { up, down };
