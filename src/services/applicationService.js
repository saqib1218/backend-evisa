const { ApplicationRepository } = require("../repositories");
const { v4: uuidv4 } = require("uuid");
const EmailService = require("./emailService");
const { applicationReceived, applicationStatusUpdate } = require("./emailTemplates");
const config = require("../config");

function generateApplicantId() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `ALGS-${num}`;
}

function generateReferenceNumber() {
  return `EVA-${uuidv4().toString().slice(0, 8).toUpperCase()}`;
}

const VALID_STATUSES = ["inprogress", "pending", "accepted", "rejected"];

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
};

module.exports = ApplicationService;
