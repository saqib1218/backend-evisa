const db = require("../config/database");

const NotificationRepository = {
  async create({ type, title, message, applicationId, applicantId }) {
    const result = await db.query(
      `INSERT INTO notifications (type, title, message, application_id, applicant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type || "application_submitted", title, message || null, applicationId || null, applicantId || null]
    );
    return result.rows[0];
  },

  async findAll({ limit = 50, offset = 0 } = {}) {
    const result = await db.query(
      `SELECT * FROM notifications
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  async findUnread() {
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE is_read = false
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async getUnreadCount() {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE is_read = false`
    );
    return result.rows[0].count;
  },

  async markAsRead(id) {
    const result = await db.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async markAllAsRead() {
    await db.query(
      `UPDATE notifications SET is_read = true WHERE is_read = false`
    );
    return true;
  },
};

module.exports = NotificationRepository;
