const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL DEFAULT 'Admin',
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
    CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
  `);

  console.log("admin_users table created");
};

const down = async (db) => {
  await db.query("DROP TABLE IF EXISTS admin_users CASCADE;");
  console.log("admin_users table dropped");
};

module.exports = { up, down };
