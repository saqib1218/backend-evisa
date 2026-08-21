const db = require("../config/database");

const UserRepository = {
  async create({ email, passwordHash, firstName, lastName, phone }) {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, phone, is_active, created_at`,
      [email, passwordHash, firstName || null, lastName || null, phone || null]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      "SELECT id, email, first_name, last_name, phone, is_active, created_at FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  },

  async update(id, fields) {
    const allowed = ["first_name", "last_name", "phone", "is_active"];
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING id, email, first_name, last_name, phone, is_active, created_at`,
      values
    );
    return result.rows[0];
  },
};

module.exports = UserRepository;
