const db = require("../config/database");

const QueryRepository = {
  async create({ fullName, email, phone, city, message }) {
    const result = await db.query(
      `INSERT INTO queries (full_name, email, phone, city, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fullName, email, phone, city, message]
    );
    return result.rows[0];
  },

  async getAll({ search, limit = 10, page = 1 } = {}) {
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(`(
        full_name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        phone ILIKE $${paramIndex} OR
        city ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM queries ${whereSQL}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const dataResult = await db.query(
      `SELECT * FROM queries
       ${whereSQL}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      queries: dataResult.rows,
      total,
      totalPages,
      currentPage: page,
      limit,
    };
  },

  async getById(id) {
    const result = await db.query(`SELECT * FROM queries WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },
};

module.exports = QueryRepository;
