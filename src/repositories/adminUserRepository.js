const db = require("../config/database");

const AdminUserRepository = {
  async create({ email, passwordHash, name, role }) {
    const result = await db.query(
      `INSERT INTO admin_users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, passwordHash, name || "Admin", role || "admin"]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await db.query("SELECT * FROM admin_users WHERE email = $1", [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      "SELECT id, email, name, role, is_active, created_at FROM admin_users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  },
};

module.exports = AdminUserRepository;
