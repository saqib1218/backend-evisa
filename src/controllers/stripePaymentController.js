const { ApplicationService } = require("../services");

const StripePaymentController = {
  async createCheckoutSession(req, res, next) {
    try {
      const { applicants, processingType, confirmInfo, privacyNotice } = req.body;

      const result = await ApplicationService.createPendingApplication({
        applicants,
        processingType,
        confirmInfo,
        privacyNotice,
      });

      res.status(200).json({ url: result.url });
    } catch (err) {
      next(err);
    }
  },

  async getPaymentStatus(req, res, next) {
    try {
      const { sessionId } = req.params;
      const result = await ApplicationService.getPaymentStatus(sessionId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = StripePaymentController;
