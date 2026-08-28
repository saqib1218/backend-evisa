async function up(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      key VARCHAR(50) UNIQUE NOT NULL,
      label VARCHAR(255) NOT NULL,
      fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
      processing_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
      processing_time VARCHAR(100) NOT NULL DEFAULT '',
      badge VARCHAR(50) DEFAULT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Seed default packages
    INSERT INTO packages (key, label, fee, processing_fee, processing_time, badge, sort_order)
    VALUES
      ('standard', '2-5 Days processing', 59.00, 30.90, '2-5 Days', NULL, 1),
      ('express', '6-24h processing', 89.00, 30.90, '6-24h', 'Popular', 2),
      ('fastest', '1h processing', 109.00, 30.90, '1h', 'Fastest', 3)
    ON CONFLICT (key) DO NOTHING;

    CREATE INDEX IF NOT EXISTS idx_packages_sort_order ON packages (sort_order);
  `);
}

async function down(db) {
  await db.query(`DROP TABLE IF EXISTS packages`);
}

module.exports = { up, down };
