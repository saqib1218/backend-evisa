const db = require("../config/database");

const migrations = [
  require("./001_create_users"),
  require("./002_create_applications"),
  require("./003_create_admin_users"),
  require("./004_create_applicants_payments"),
  require("./005_add_phone_to_applicants"),
  require("./006_add_visa_document_url"),
];

const run = async () => {
  const isRollback = process.argv.includes("--rollback");

  try {
    console.log(`Running ${isRollback ? "rollback" : "migrations"}...`);

    if (isRollback) {
      for (let i = migrations.length - 1; i >= 0; i--) {
        await migrations[i].down(db);
      }
    } else {
      for (const migration of migrations) {
        await migration.up(db);
      }
    }

    console.log("All migrations completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

run();
