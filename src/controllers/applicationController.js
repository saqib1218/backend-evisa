const { ApplicationService } = require("../services");

const ApplicationController = {
  async create(req, res, next) {
    try {
      const userId = req.user?.id;
      const { applicants, processingType, confirmInfo, privacyNotice, payment } = req.body;

      if (!applicants || !Array.isArray(applicants) || applicants.length === 0) {
        return res.status(400).json({ error: "applicants array is required and must not be empty" });
      }
      if (!payment) {
        return res.status(400).json({ error: "payment details are required" });
      }

      const application = await ApplicationService.create({
        userId,
        applicants,
        processingType,
        confirmInfo,
        privacyNotice,
        payment,
      });
      res.status(201).json(application);
    } catch (err) {
      next(err);
    }
  },

  async getByReference(req, res, next) {
    try {
      const { referenceNumber } = req.params;
      const application = await ApplicationService.getByReferenceNumber(referenceNumber);
      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  async getByApplicantId(req, res, next) {
    try {
      const { applicantId } = req.params;
      const application = await ApplicationService.getByApplicantId(applicantId);
      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  async track(req, res, next) {
    try {
      const { applicantId, email } = req.body;
      if (!applicantId || !email) {
        return res.status(400).json({ error: "Applicant ID and email are required" });
      }
      const application = await ApplicationService.trackApplication(applicantId, email);
      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  async getDetails(req, res, next) {
    try {
      const { id } = req.params;
      const application = await ApplicationService.getDetails(id);
      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  async getMyApplications(req, res, next) {
    try {
      const applications = await ApplicationService.getByUserId(req.user.id);
      res.json(applications);
    } catch (err) {
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const { search, dateFrom, dateTo, limit, page } = req.query;
      const result = await ApplicationService.getAll({ search, dateFrom, dateTo, limit, page });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const adminId = req.user?.id;
      const application = await ApplicationService.updateStatus(id, { status, adminId, notes });
      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  async updateOutcome(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const adminId = req.user?.id;
      const visaDocumentUrl = req.file ? `/uploads/${req.file.filename}` : null;
      const application = await ApplicationService.updateOutcome(id, {
        status,
        adminId,
        notes,
        visaDocumentUrl,
      });
      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  async updatePayment(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentStatus, transactionId } = req.body;
      const payment = await ApplicationService.updatePaymentStatus(id, { paymentStatus, transactionId });
      res.json(payment);
    } catch (err) {
      next(err);
    }
  },

  async getDashboard(req, res, next) {
    try {
      const stats = await ApplicationService.getDashboardStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      await ApplicationService.deleteApplication(req.params.id);
      res.json({ message: "Application deleted successfully" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ApplicationController;
