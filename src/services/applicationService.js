const { ApplicationRepository } = require("../repositories");
const { v4: uuidv4 } = require("uuid");

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

    return ApplicationRepository.create({
      userId,
      applicantId,
      referenceNumber,
      processingType: processingType || "standard",
      confirmInfo: confirmInfo || false,
      privacyNotice: privacyNotice || false,
      applicants,
      payment,
    });
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
    return ApplicationRepository.updateOutcome(id, { status, adminId, notes, visaDocumentUrl });
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
