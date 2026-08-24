const { ApplicationRepository, PendingApplicationRepository } = require("../repositories");
const { v4: uuidv4 } = require("uuid");
const EmailService = require("./emailService");
const { applicationReceived, applicationStatusUpdate } = require("./emailTemplates");
const config = require("../config");
const pricing = require("../config/pricing");
const NotificationService = require("./notificationService");
const StripeService = require("./stripeService");

function generateApplicantId() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `ALGS-${num}`;
}

function generateReferenceNumber() {
  return `EVA-${uuidv4().toString().slice(0, 8).toUpperCase()}`;
}

const VALID_STATUSES = ["inprogress", "pending", "accepted", "rejected"];

const REQUIRED_APPLICANT_FIELDS = [
  "firstName", "lastName", "email", "phone", "dateOfBirth", "gender",
  "countryOfBirth", "nationality", "passportNumber", "passportIssueDate", "passportExpiryDate",
];

function validateApplicationInput({ applicants, processingType, confirmInfo, privacyNotice }) {
  if (!applicants || !Array.isArray(applicants) || applicants.length === 0) {
    throw { status: 400, message: "applicants array is required and must not be empty" };
  }
  if (applicants.length > 20) {
    throw { status: 400, message: "Too many applicants" };
  }
  for (const [index, applicant] of applicants.entries()) {
    for (const field of REQUIRED_APPLICANT_FIELDS) {
      if (!applicant || typeof applicant[field] !== "string" || !applicant[field].trim()) {
        throw { status: 400, message: `Applicant ${index + 1}: ${field} is required` };
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(applicant.email)) {
      throw { status: 400, message: `Applicant ${index + 1}: invalid email address` };
    }
  }
  if (!confirmInfo || !privacyNotice) {
    throw { status: 400, message: "You must confirm the information and accept the privacy notice" };
  }
  // Will throw if processingType is invalid
  pricing.getPackage(processingType);
}

const ApplicationService = {
  async create({ userId, applicants, processingType, confirmInfo, privacyNotice, payment }) {
    // Generate unique applicant_id (retry on collision)
    let applicantId = generateApplicantId();
    let existing = await ApplicationRepository.findByApplicantId(applicantId);
    let attempts = 0;
    while (existing && attempts < 5) {
      applicantId = generateApplicantId();
      existing = await ApplicationRepository.findByApplicantId(applicantId);
      attempts++;
    }

    const referenceNumber = generateReferenceNumber();

    const application = await ApplicationRepository.create({
      userId,
      applicantId,
      referenceNumber,
      processingType: processingType || "standard",
      confirmInfo: confirmInfo || false,
      privacyNotice: privacyNotice || false,
      applicants,
      payment,
    });

    // Send confirmation email (best-effort, must not fail the request)
    try {
      const primaryApplicant = applicants[0];
      if (primaryApplicant?.email) {
        const fullName = `${primaryApplicant.firstName || ""} ${primaryApplicant.lastName || ""}`.trim() || "Applicant";
        const html = applicationReceived({
          fullName,
          applicantId: application.applicant_id,
        });
        await EmailService.sendEmail({
          to: primaryApplicant.email,
          subject: "eVisa ETA - Application Received",
          html,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send application confirmation email:", emailErr.message);
    }

    // Create notification for admin (best-effort)
    try {
      const primaryApplicant = applicants[0];
      const fullName = `${primaryApplicant?.firstName || ""} ${primaryApplicant?.lastName || ""}`.trim() || "Applicant";
      await NotificationService.create({
        type: "application_submitted",
        title: "New Application Received",
        message: `${fullName} submitted application ${application.applicant_id}`,
        applicationId: application.id,
        applicantId: application.applicant_id,
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr.message);
    }

    return application;
  },

  async getByReferenceNumber(referenceNumber) {
    const application = await ApplicationRepository.findByReferenceNumber(referenceNumber);
    if (!application) {
      throw { status: 404, message: "Application not found" };
    }
    return application;
  },

  async getByApplicantId(applicantId) {
    const application = await ApplicationRepository.findByApplicantId(applicantId);
    if (!application) {
      throw { status: 404, message: "Application not found" };
    }
    return application;
  },

  async trackApplication(applicantId, email) {
    const application = await ApplicationRepository.trackApplication(applicantId, email);
    if (!application) {
      throw { status: 404, message: "Application does not exist" };
    }
    return application;
  },

  async getDetails(id) {
    const application = await ApplicationRepository.findByIdWithDetails(id);
    if (!application) {
      throw { status: 404, message: "Application not found" };
    }
    return application;
  },

  async getByUserId(userId) {
    return ApplicationRepository.findByUserId(userId);
  },

  async getAll({ search, dateFrom, dateTo, limit, page } = {}) {
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    return ApplicationRepository.findAll({
      search: search || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      limit: parsedLimit,
      page: parsedPage,
    });
  },

  async updateStatus(id, { status, adminId, notes }) {
    const application = await ApplicationRepository.findById(id);
    if (!application) {
      throw { status: 404, message: "Application not found" };
    }
    if (!VALID_STATUSES.includes(status)) {
      throw { status: 400, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` };
    }
    return ApplicationRepository.updateStatus(id, { status, adminId, notes });
  },

  async updateOutcome(id, { status, adminId, notes, visaDocumentUrl }) {
    const application = await ApplicationRepository.findById(id);
    if (!application) {
      throw { status: 404, message: "Application not found" };
    }
    if (!VALID_STATUSES.includes(status)) {
      throw { status: 400, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` };
    }
    const updatedApplication = await ApplicationRepository.updateOutcome(id, { status, adminId, notes, visaDocumentUrl });

    // Send status update email (best-effort, must not fail the request)
    try {
      const details = await ApplicationRepository.findByIdWithDetails(id);
      const primaryApplicant = details?.applicants?.[0];
      if (primaryApplicant?.email) {
        const fullName = `${primaryApplicant.first_name || ""} ${primaryApplicant.last_name || ""}`.trim() || "Applicant";
        const imageUrl = updatedApplication.visa_document_url
          ? `${config.appUrl}${updatedApplication.visa_document_url}`
          : null;
        const html = applicationStatusUpdate({
          fullName,
          applicantId: updatedApplication.applicant_id,
          status,
          notes: notes || null,
          imageUrl,
        });
        await EmailService.sendEmail({
          to: primaryApplicant.email,
          subject: `eVisa ETA - Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          html,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send application status update email:", emailErr.message);
    }

    return updatedApplication;
  },

  async updatePaymentStatus(applicationId, { paymentStatus, transactionId }) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      throw { status: 404, message: "Application not found" };
    }
    const isPaid = Boolean(paymentStatus);
    return ApplicationRepository.updatePaymentStatus(applicationId, { paymentStatus: isPaid, transactionId });
  },

  async getDashboardStats() {
    return ApplicationRepository.getDashboardStats();
  },

  async deleteApplication(id) {
    const deleted = await ApplicationRepository.deleteById(id);
    if (!deleted) {
      throw { status: 404, message: "Application not found" };
    }
    return true;
  },

  /**
   * Step 1 of the secure payment flow: validate the application data,
   * calculate the authoritative amount on the backend (never trust the
   * frontend), store the form data as a pending record, and create a
   * Stripe Checkout Session. No `applications` row is created yet.
   */
  async createPendingApplication({ applicants, processingType, confirmInfo, privacyNotice }) {
    validateApplicationInput({ applicants, processingType, confirmInfo, privacyNotice });

    const amountDetails = pricing.calculateAmount(processingType, applicants.length);
    const currency = config.stripe.currency;

    const pending = await PendingApplicationRepository.create({
      formData: { applicants, processingType, confirmInfo, privacyNotice },
      amount: amountDetails.grandTotal,
      currency,
    });

    const primaryApplicant = applicants[0];

    let session;
    try {
      session = await StripeService.createCheckoutSession({
        pendingApplicationId: pending.id,
        amountInSmallestUnit: amountDetails.amountInSmallestUnit,
        currency,
        description: `${processingType} processing - ${applicants.length} applicant(s)`,
        customerEmail: primaryApplicant?.email,
      });
    } catch (err) {
      console.error("Failed to create Stripe checkout session:", err.message);
      throw { status: 502, message: "Unable to start payment. Please try again." };
    }

    await PendingApplicationRepository.attachSessionId(pending.id, session.id);

    return { url: session.url, sessionId: session.id };
  },

  /**
   * Used by the frontend success page. Never marks anything as paid itself —
   * only reports the state that the webhook has already established.
   */
  async getPaymentStatus(sessionId) {
    if (!sessionId) {
      throw { status: 400, message: "sessionId is required" };
    }
    const pending = await PendingApplicationRepository.findBySessionId(sessionId);
    if (!pending) {
      throw { status: 404, message: "Payment session not found" };
    }

    if (pending.status === "completed" && pending.application_id) {
      const application = await ApplicationRepository.findById(pending.application_id);
      return {
        status: "paid",
        applicantId: application?.applicant_id,
        referenceNumber: application?.reference_number,
      };
    }

    if (pending.status === "expired" || pending.status === "failed") {
      return { status: "failed" };
    }

    return { status: "pending" };
  },

  /**
   * Core webhook handler logic — the single source of truth for marking a
   * payment as PAID. Called only after the Stripe signature has been
   * verified and event-level idempotency has been established by the
   * caller (StripeWebhookEventRepository).
   */
  async confirmStripePayment(session) {
    const pendingApplicationId = session.metadata?.pendingApplicationId;
    if (!pendingApplicationId) {
      console.error("Stripe webhook: session missing pendingApplicationId metadata", session.id);
      return null;
    }

    const pending = await PendingApplicationRepository.findById(pendingApplicationId);
    if (!pending) {
      console.error("Stripe webhook: no pending application found for id", pendingApplicationId);
      return null;
    }

    // Already processed — idempotent no-op
    if (pending.status === "completed") {
      return ApplicationRepository.findById(pending.application_id);
    }

    // Verify payment actually succeeded
    if (session.payment_status !== "paid") {
      console.warn("Stripe webhook: session not paid, status =", session.payment_status);
      return null;
    }

    // Verify amount + currency match what we recorded when the session was created
    const expectedAmountInSmallestUnit = Math.round(parseFloat(pending.amount) * 100);
    if (session.amount_total !== expectedAmountInSmallestUnit) {
      console.error("Stripe webhook: amount mismatch", { expected: expectedAmountInSmallestUnit, received: session.amount_total });
      return null;
    }
    if ((session.currency || "").toLowerCase() !== pending.currency.toLowerCase()) {
      console.error("Stripe webhook: currency mismatch", { expected: pending.currency, received: session.currency });
      return null;
    }

    // Atomically claim this pending record so a concurrent/duplicate delivery
    // cannot process it twice
    const claimed = await PendingApplicationRepository.claimForProcessing(pending.id);
    if (!claimed) {
      // Someone else already claimed/completed it
      const refreshed = await PendingApplicationRepository.findById(pending.id);
      return refreshed?.application_id ? ApplicationRepository.findById(refreshed.application_id) : null;
    }

    const formData = pending.form_data;
    const { applicants, processingType, confirmInfo, privacyNotice } = formData;
    const amountDetails = pricing.calculateAmount(processingType, applicants.length);

    // Generate unique applicant_id (retry on collision)
    let applicantId = generateApplicantId();
    let existing = await ApplicationRepository.findByApplicantId(applicantId);
    let attempts = 0;
    while (existing && attempts < 5) {
      applicantId = generateApplicantId();
      existing = await ApplicationRepository.findByApplicantId(applicantId);
      attempts++;
    }
    const referenceNumber = generateReferenceNumber();

    let application;
    try {
      application = await ApplicationRepository.create({
        applicantId,
        referenceNumber,
        processingType,
        confirmInfo,
        privacyNotice,
        applicants,
        payment: {
          applicantCount: applicants.length,
          processingType,
          feePerApplicant: amountDetails.feePerApplicant,
          processingFeePerApplicant: amountDetails.processingFeePerApplicant,
          feeTotal: amountDetails.feeTotal,
          processingTotal: amountDetails.processingTotal,
          grandTotal: amountDetails.grandTotal,
        },
        stripePayment: {
          checkoutSessionId: session.id,
          paymentIntentId: session.payment_intent || null,
          currency: pending.currency,
        },
      });
    } catch (err) {
      // Roll the pending record back so it can be retried/investigated
      await PendingApplicationRepository.markStatus(pending.id, "failed");
      console.error("Stripe webhook: failed to create application after payment", err.message);
      throw err;
    }

    await PendingApplicationRepository.markCompleted(pending.id, application.id);

    // Send confirmation email (idempotency guarded via confirmation_email_sent)
    try {
      const primaryApplicant = applicants[0];
      if (primaryApplicant?.email) {
        const fullName = `${primaryApplicant.firstName || ""} ${primaryApplicant.lastName || ""}`.trim() || "Applicant";
        const html = applicationReceived({
          fullName,
          applicantId: application.applicant_id,
          referenceNumber: application.reference_number,
          amountPaid: amountDetails.grandTotal,
          currency: pending.currency,
        });
        const result = await EmailService.sendEmail({
          to: primaryApplicant.email,
          subject: "eVisa ETA - Application Received & Payment Confirmed",
          html,
        });
        if (result.success) {
          await ApplicationRepository.markConfirmationEmailSent(application.id);
        }
      }
    } catch (emailErr) {
      console.error("Failed to send application confirmation email:", emailErr.message);
    }

    // Create notification for admin (best-effort)
    try {
      const primaryApplicant = applicants[0];
      const fullName = `${primaryApplicant?.firstName || ""} ${primaryApplicant?.lastName || ""}`.trim() || "Applicant";
      await NotificationService.create({
        type: "application_submitted",
        title: "New Application Received",
        message: `${fullName} submitted application ${application.applicant_id}`,
        applicationId: application.id,
        applicantId: application.applicant_id,
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr.message);
    }

    return application;
  },

  async expirePendingApplication(session) {
    const pendingApplicationId = session.metadata?.pendingApplicationId;
    if (!pendingApplicationId) return;
    const pending = await PendingApplicationRepository.findById(pendingApplicationId);
    if (!pending || pending.status !== "pending") return;
    await PendingApplicationRepository.markStatus(pending.id, "expired");
  },
};

module.exports = ApplicationService;
