const db = require("../config/database");

const ApplicationRepository = {
  async create({ userId, applicantId, referenceNumber, processingType, confirmInfo, privacyNotice, applicants, payment, stripePayment }) {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      const isPaid = Boolean(stripePayment);

      // 1. Insert application
      const appResult = await client.query(
        `INSERT INTO applications (user_id, applicant_id, reference_number, status, payment_status, processing_type, confirm_info, privacy_notice, submit_date)
         VALUES ($1, $2, $3, 'inprogress', $4, $5, $6, $7, NOW())
         RETURNING *`,
        [userId || null, applicantId, referenceNumber, isPaid, processingType, confirmInfo, privacyNotice]
      );
      const application = appResult.rows[0];

      // 2. Insert applicants (travellers) — each gets an equal share of the
      // grand total (fee_amount) AND their own unique applicant_id, so both
      // the fee and the tracking ID are tracked separately per person.
      const feeShare = payment?.grandTotal
        ? Math.round((payment.grandTotal / applicants.length) * 100) / 100
        : null;
      for (const a of applicants) {
        await client.query(
          `INSERT INTO applicants
            (application_id, applicant_id, first_name, last_name, email, phone, date_of_birth, gender, country_of_birth,
             nationality, passport_number, passport_issue_date, passport_expiry_date,
             dual_citizenship, previously_applied_uk, passport_image_url, personal_photo_url,
             image_consent, photo_consent, fee_amount, status, job)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'inprogress', $21)`,
          [
            application.id, a.applicantId,
            a.firstName, a.lastName, a.email, a.phone, a.dateOfBirth, a.gender, a.countryOfBirth,
            a.nationality, a.passportNumber, a.passportIssueDate, a.passportExpiryDate,
            a.dualCitizenship, a.previouslyAppliedUk, a.passportImageUrl, a.personalPhotoUrl,
            a.imageConsent, a.photoConsent, feeShare, a.job || null,
          ]
        );
      }

      // 3. Insert payment
      await client.query(
        `INSERT INTO payments
          (application_id, applicant_count, processing_type, fee_per_applicant,
           processing_fee_per_applicant, fee_total, processing_total, grand_total, payment_status,
           stripe_checkout_session_id, stripe_payment_intent_id, currency, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          application.id,
          payment.applicantCount, payment.processingType, payment.feePerApplicant,
          payment.processingFeePerApplicant, payment.feeTotal, payment.processingTotal,
          payment.grandTotal, isPaid,
          stripePayment?.checkoutSessionId || null,
          stripePayment?.paymentIntentId || null,
          stripePayment?.currency || null,
          isPaid ? new Date() : null,
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

  /**
   * Resolves an applicant_id to its parent application. Checks the
   * order-level ID first (applications.applicant_id — the ID scheme used
   * before per-applicant IDs existed, and still valid for anyone who
   * already received it by email), then falls back to the newer
   * per-applicant ID (applicants.applicant_id).
   */
  async findByApplicantId(applicantId) {
    const orderResult = await db.query("SELECT * FROM applications WHERE applicant_id = $1", [applicantId]);
    if (orderResult.rows[0]) return orderResult.rows[0];

    const personResult = await db.query("SELECT application_id FROM applicants WHERE applicant_id = $1", [applicantId]);
    if (!personResult.rows[0]) return null;

    const appResult = await db.query("SELECT * FROM applications WHERE id = $1", [personResult.rows[0].application_id]);
    return appResult.rows[0];
  },

  async findApplicantByApplicantId(applicantId) {
    const result = await db.query("SELECT * FROM applicants WHERE applicant_id = $1", [applicantId]);
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
       JOIN applicants ap ON a.id = ap.application_id
       LEFT JOIN payments p ON a.id = p.application_id
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
              p.grand_total, p.payment_status,
              (SELECT COUNT(*) FROM applicants ap3 WHERE ap3.application_id = a.id) as applicant_count
       FROM applications a
       JOIN applicants ap ON a.id = ap.application_id
       LEFT JOIN payments p ON a.id = p.application_id
       ${whereSQL}
       ORDER BY a.created_at DESC, ap.created_at ASC
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

  async findApplicantById(applicantId) {
    const result = await db.query("SELECT * FROM applicants WHERE id = $1", [applicantId]);
    return result.rows[0];
  },

  async updateApplicantOutcome(applicantId, { status, notes, visaDocumentUrl }) {
    const result = await db.query(
      `UPDATE applicants
       SET status = $1,
           admin_notes = COALESCE($2, admin_notes),
           visa_document_url = COALESCE($3, visa_document_url),
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, notes || null, visaDocumentUrl || null, applicantId]
    );
    return result.rows[0];
  },

  async markApplicantEmailSent(applicantId) {
    const result = await db.query(
      `UPDATE applicants SET email_sent = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [applicantId]
    );
    return result.rows[0];
  },

  /**
   * Derives the overall application status from the individual applicant
   * statuses so the order-level status reflects mixed outcomes:
   *  - all applicants share the same status -> application takes that status
   *  - otherwise -> "inprogress" (mixed / partially decided)
   */
  async syncApplicationStatusFromApplicants(applicationId) {
    const result = await db.query(
      "SELECT DISTINCT status FROM applicants WHERE application_id = $1",
      [applicationId]
    );
    const distinctStatuses = result.rows.map((r) => r.status);
    const derivedStatus = distinctStatuses.length === 1 ? distinctStatuses[0] : "inprogress";

    const updateResult = await db.query(
      `UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [derivedStatus, applicationId]
    );
    return updateResult.rows[0];
  },

  async updatePaymentStatus(applicationId, { paymentStatus, transactionId }) {
    const result = await db.query(
      `UPDATE payments SET payment_status = $1, transaction_id = COALESCE($2, transaction_id), paid_at = CASE WHEN $1 = true THEN NOW() ELSE paid_at END, updated_at = NOW() WHERE application_id = $3 RETURNING *`,
      [paymentStatus, transactionId || null, applicationId]
    );
    return result.rows[0];
  },

  async trackApplication(applicantId, email) {
    const application = await this.findByApplicantId(applicantId);
    if (!application) return null;

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

  async markConfirmationEmailSent(applicationId) {
    const result = await db.query(
      `UPDATE payments SET confirmation_email_sent = true, updated_at = NOW() WHERE application_id = $1 RETURNING *`,
      [applicationId]
    );
    return result.rows[0];
  },

  async findPaymentByApplicationId(applicationId) {
    const result = await db.query(`SELECT * FROM payments WHERE application_id = $1`, [applicationId]);
    return result.rows[0];
  },

  async deleteById(id) {
    const result = await db.query("DELETE FROM applications WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  },
};

module.exports = ApplicationRepository;
