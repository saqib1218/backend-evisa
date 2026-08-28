const db = require("../config/database");

const PackageRepository = {
  async getAll({ activeOnly = false } = {}) {
    const where = activeOnly ? "WHERE is_active = TRUE" : "";
    const result = await db.query(
      `SELECT * FROM packages ${where} ORDER BY sort_order ASC, id ASC`
    );
    return result.rows;
  },

  async getByKey(key) {
    const result = await db.query(`SELECT * FROM packages WHERE key = $1`, [key]);
    return result.rows[0] || null;
  },

  async getById(id) {
    const result = await db.query(`SELECT * FROM packages WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  async create({ key, label, fee, processingFee, processingTime, badge, sortOrder }) {
    const result = await db.query(
      `INSERT INTO packages (key, label, fee, processing_fee, processing_time, badge, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [key, label, fee, processingFee, processingTime, badge || null, sortOrder || 0]
    );
    return result.rows[0];
  },

  async update(id, { key, label, fee, processingFee, processingTime, badge, sortOrder, isActive }) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db.query(
      `UPDATE packages SET
        key = COALESCE($1, key),
        label = COALESCE($2, label),
        fee = COALESCE($3, fee),
        processing_fee = COALESCE($4, processing_fee),
        processing_time = COALESCE($5, processing_time),
        badge = $6,
        sort_order = COALESCE($7, sort_order),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        key || null,
        label || null,
        fee !== undefined ? fee : null,
        processingFee !== undefined ? processingFee : null,
        processingTime || null,
        badge !== undefined ? badge : null,
        sortOrder !== undefined ? sortOrder : null,
        isActive !== undefined ? isActive : null,
        id,
      ]
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await db.query(`DELETE FROM packages WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0] || null;
  },
};

module.exports = PackageRepository;
