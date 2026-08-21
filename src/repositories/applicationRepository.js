const db = require("../config/database");

const ApplicationRepository = {
  async create({ userId, applicantId, referenceNumber, processingType, confirmInfo, privacyNotice, applicants, payment }) {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Insert application
      const appResult = await client.query(
        `INSERT INTO applications (user_id, applicant_id, reference_number, status, processing_type, confirm_info, privacy_notice, submit_date)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6, NOW())
         RETURNING *`,
        [userId || null, applicantId, referenceNumber, processingType, confirmInfo, privacyNotice]
      );
      const application = appResult.rows[0];

      // 2. Insert applicants (travellers)
      for (const a of applicants) {
        await client.query(
          `INSERT INTO applicants
            (application_id, first_name, last_name, email, phone, date_of_birth, gender, country_of_birth,
             nationality, passport_number, passport_issue_date, passport_expiry_date,
             dual_citizenship, previously_applied_uk, passport_image_url, personal_photo_url,
             image_consent, photo_consent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            application.id,
            a.firstName, a.lastName, a.email, a.phone, a.dateOfBirth, a.gender, a.countryOfBirth,
            a.nationality, a.passportNumber, a.passportIssueDate, a.passportExpiryDate,
            a.dualCitizenship, a.previouslyAppliedUk, a.passportImageUrl, a.personalPhotoUrl,
            a.imageConsent, a.photoConsent,
          ]
        );
      }

      // 3. Insert payment
      await client.query(
        `INSERT INTO payments
          (application_id, applicant_count, processing_type, fee_per_applicant,
           processing_fee_per_applicant, fee_total, processing_total, grand_total, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
        [
          application.id,
          payment.applicantCount, payment.processingType, payment.feePerApplicant,
          payment.processingFeePerApplicant, payment.feeTotal, payment.processingTotal,
          payment.grandTotal,
        ]
      );

      await client.query("COMMIT");
      return application;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async findByReferenceNumber(referenceNumber) {
    const result = await db.query("SELECT * FROM applications WHERE reference_number = $1", [referenceNumber]);
    return result.rows[0];
  },

  async findByApplicantId(applicantId) {
    const result = await db.query("SELECT * FROM applications WHERE applicant_id = $1", [applicantId]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query("SELECT * FROM applications WHERE id = $1", [id]);
    return result.rows[0];
  },

  async findByIdWithDetails(id) {
    const appResult = await db.query("SELECT * FROM applications WHERE id = $1", [id]);
    if (!appResult.rows[0]) return null;
    const application = appResult.rows[0];

    const applicantsResult = await db.query("SELECT * FROM applicants WHERE application_id = $1 ORDER BY created_at", [id]);
    const paymentResult = await db.query("SELECT * FROM payments WHERE application_id = $1", [id]);
    const logsResult = await db.query(
      `SELECT sl.*, au.email as admin_email, au.name as admin_name
       FROM application_status_logs sl
       LEFT JOIN admin_users au ON sl.admin_id = au.id
       WHERE sl.application_id = $1 ORDER BY sl.created_at DESC`,
      [id]
    );

    return {
      ...application,
      applicants: applicantsResult.rows,
      payment: paymentResult.rows[0] || null,
      statusLogs: logsResult.rows,
    };
  },

  async findByUserId(userId) {
    const result = await db.query("SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return result.rows;
  },

  async findAll({ search, dateFrom, dateTo, limit = 10, page = 1 } = {}) {
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(`(
        a.reference_number ILIKE $${paramIndex} OR
        a.applicant_id ILIKE $${paramIndex} OR
        (SELECT CONCAT(ap2.first_name, ' ', ap2.last_name) FROM applicants ap2 WHERE ap2.application_id = a.id ORDER BY ap2.created_at LIMIT 1) ILIKE $${paramIndex} OR
        (SELECT ap2.email FROM applicants ap2 WHERE ap2.application_id = a.id ORDER BY ap2.created_at LIMIT 1) ILIKE $${paramIndex}
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
      `SELECT COUNT(DISTINCT a.id) as total
       FROM applications a
       LEFT JOIN applicants ap ON a.id = ap.application_id
       LEFT JOIN payments p ON a.id = p.application_id
       ${whereSQL}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const dataResult = await db.query(
      `SELECT a.*, 
              COUNT(ap.id) as applicant_count,
              p.grand_total, p.payment_status,
              (SELECT CONCAT(ap2.first_name, ' ', ap2.last_name) FROM applicants ap2 WHERE ap2.application_id = a.id ORDER BY ap2.created_at LIMIT 1) as customer_name
       FROM applications a
       LEFT JOIN applicants ap ON a.id = ap.application_id
       LEFT JOIN payments p ON a.id = p.application_id
       ${whereSQL}
       GROUP BY a.id, p.grand_total, p.payment_status
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      applications: dataResult.rows,
      total,
      totalPages,
      currentPage: page,
      limit,
    };
  },

  async updateStatus(id, { status, adminId, notes }) {
    const oldApp = await this.findById(id);
    if (!oldApp) return null;

    const result = await db.query(
      `UPDATE applications SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, notes || null, id]
    );

    // Log the status change
    await db.query(
      `INSERT INTO application_status_logs (application_id, admin_id, old_status, new_status, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, adminId || null, oldApp.status, status, notes || null]
    );

    return result.rows[0];
  },

  async updateOutcome(id, { status, adminId, notes, visaDocumentUrl }) {
    const oldApp = await this.findById(id);
    if (!oldApp) return null;

    const result = await db.query(
      `UPDATE applications
       SET status = $1,
           admin_notes = COALESCE($2, admin_notes),
           visa_document_url = COALESCE($3, visa_document_url),
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, notes || null, visaDocumentUrl, id]
    );

    // Log the status change
    await db.query(
      `INSERT INTO application_status_logs (application_id, admin_id, old_status, new_status, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, adminId || null, oldApp.status, status, notes || null]
    );

    return result.rows[0];
  },

  async updatePaymentStatus(applicationId, { paymentStatus, transactionId }) {
    const result = await db.query(
      `UPDATE payments SET payment_status = $1, transaction_id = COALESCE($2, transaction_id), paid_at = CASE WHEN $1 = true THEN NOW() ELSE paid_at END, updated_at = NOW() WHERE application_id = $3 RETURNING *`,
      [paymentStatus, transactionId || null, applicationId]
    );
    return result.rows[0];
  },

  async trackApplication(applicantId, email) {
    const appResult = await db.query("SELECT * FROM applications WHERE applicant_id = $1", [applicantId]);
    if (!appResult.rows[0]) return null;

    const application = appResult.rows[0];

    const emailCheck = await db.query(
      "SELECT 1 FROM applicants WHERE application_id = $1 AND email = $2",
      [application.id, email]
    );
    if (emailCheck.rows.length === 0) return null;

    const paymentResult = await db.query("SELECT * FROM payments WHERE application_id = $1", [application.id]);

    return {
      ...application,
      payment: paymentResult.rows[0] || null,
    };
  },

  async count() {
    const result = await db.query("SELECT COUNT(*) as total FROM applications");
    return parseInt(result.rows[0].total, 10);
  },

  async getDashboardStats() {
    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(p.grand_total), 0) as total_revenue
       FROM payments p
       WHERE p.payment_status = true`
    );

    const activeResult = await db.query(
      `SELECT COUNT(*) as active_count
       FROM applications
       WHERE status IN ('pending', 'inprogress')`
    );

    const totalResult = await db.query(
      `SELECT COUNT(*) as total_count FROM applications`
    );

    const acceptedResult = await db.query(
      `SELECT COUNT(*) as accepted_count
       FROM applications
       WHERE status = 'accepted'`
    );

    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;
    const activeApplications = parseInt(activeResult.rows[0].active_count, 10);
    const totalSubmissions = parseInt(totalResult.rows[0].total_count, 10);
    const acceptedCount = parseInt(acceptedResult.rows[0].accepted_count, 10);
    const acceptedPercentage = totalSubmissions > 0
      ? Math.round((acceptedCount / totalSubmissions) * 100)
      : 0;

    return {
      totalRevenue,
      activeApplications,
      totalSubmissions,
      acceptedCount,
      acceptedPercentage,
    };
  },

  async deleteById(id) {
    const result = await db.query("DELETE FROM applications WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  },
};

module.exports = ApplicationRepository;
