const db = require("../config/database");

const PendingApplicationRepository = {
  async create({ formData, amount, currency }) {
    const result = await db.query(
      `INSERT INTO pending_applications (form_data, amount, currency, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [JSON.stringify(formData), amount, currency]
    );
    return result.rows[0];
  },

  async attachSessionId(id, stripeCheckoutSessionId) {
    const result = await db.query(
      `UPDATE pending_applications SET stripe_checkout_session_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [stripeCheckoutSessionId, id]
    );
    return result.rows[0];
  },

  async findBySessionId(stripeCheckoutSessionId) {
    const result = await db.query(
      `SELECT * FROM pending_applications WHERE stripe_checkout_session_id = $1`,
      [stripeCheckoutSessionId]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(`SELECT * FROM pending_applications WHERE id = $1`, [id]);
    return result.rows[0];
  },

  /**
   * Atomically claims a pending row for processing by transitioning it from
   * 'pending' to 'processing'. Uses a conditional UPDATE (status = 'pending')
   * so concurrent/duplicate webhook deliveries can never both proceed to
   * create an application for the same pending record.
   * Returns the row if successfully claimed, or null if it was already
   * claimed/completed/expired by another call.
   */
  async claimForProcessing(id) {
    const result = await db.query(
      `UPDATE pending_applications
       SET status = 'processing', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  async markCompleted(id, applicationId) {
    const result = await db.query(
      `UPDATE pending_applications
       SET status = 'completed', application_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [applicationId, id]
    );
    return result.rows[0] || null;
  },

  async markStatus(id, status) {
    const result = await db.query(
      `UPDATE pending_applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  },
};

module.exports = PendingApplicationRepository;
