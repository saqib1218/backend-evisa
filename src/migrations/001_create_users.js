const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const config = require("../config");

const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  console.log("users table created");
};

const down = async (db) => {
  await db.query("DROP TABLE IF EXISTS users CASCADE;");
  console.log("users table dropped");
};

module.exports = { up, down };
