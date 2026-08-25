const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS queries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      city VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
  `);

  console.log("009 migration: queries table created");
};

const down = async (db) => {
  await db.query(`DROP TABLE IF EXISTS queries;`);
  console.log("009 migration: rolled back (queries table removed)");
};

module.exports = { up, down };
