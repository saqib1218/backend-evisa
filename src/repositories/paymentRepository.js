const db = require("../config/database");

const PaymentRepository = {
  async getStats() {
    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(p.grand_total), 0) as total_revenue,
              COUNT(*) as successful_orders
       FROM payments p
       INNER JOIN applications a ON a.id = p.application_id
       WHERE p.payment_status = true AND a.status = 'accepted'`
    );

    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;
    const successfulOrders = parseInt(revenueResult.rows[0].successful_orders, 10);
    const averageOrderValue = successfulOrders > 0
      ? Math.round((totalRevenue / successfulOrders) * 100) / 100
      : 0;

    return {
      totalRevenue,
      successfulOrders,
      averageOrderValue,
    };
  },

  async getTransactions({ search, dateFrom, dateTo, limit = 10, page = 1 } = {}) {
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(`(
        a.reference_number ILIKE $${paramIndex} OR
        ap.applicant_id ILIKE $${paramIndex} OR
        a.applicant_id ILIKE $${paramIndex} OR
        CONCAT(ap.first_name, ' ', ap.last_name) ILIKE $${paramIndex} OR
        ap.email ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (dateFrom) {
      whereClauses.push(`a.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereClauses.push(`a.created_at <= $${paramIndex}`);
      params.push(`${dateTo} 23:59:59.999`);
      paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM applications a
       INNER JOIN payments p ON a.id = p.application_id
       INNER JOIN applicants ap ON a.id = ap.application_id
       ${whereSQL}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const dataResult = await db.query(
      `SELECT a.id, a.reference_number, a.applicant_id as order_applicant_id,
              a.processing_type, a.created_at, a.submit_date,
              ap.id as applicant_pk, ap.applicant_id, ap.first_name, ap.last_name,
              ap.email, ap.status as applicant_status, ap.fee_amount,
              p.grand_total, p.payment_status
       FROM applications a
       INNER JOIN payments p ON a.id = p.application_id
       INNER JOIN applicants ap ON a.id = ap.application_id
       ${whereSQL}
       ORDER BY a.created_at DESC, ap.created_at ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      transactions: dataResult.rows,
      total,
      totalPages,
      currentPage: page,
      limit,
    };
  },
};

module.exports = PaymentRepository;
