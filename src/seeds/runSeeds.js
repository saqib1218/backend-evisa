const db = require("../config/database");

const seeds = [
  require("./adminUsersSeed"),
];

const run = async () => {
  try {
    console.log("Running seeds...");

    for (const seed of seeds) {
      await seed();
    }

    console.log("All seeds completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

run();
