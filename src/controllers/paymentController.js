const { PaymentService } = require("../services");

const PaymentController = {
  async getStats(req, res, next) {
    try {
      const stats = await PaymentService.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  async getTransactions(req, res, next) {
    try {
      const { search, dateFrom, dateTo, limit, page } = req.query;
      const result = await PaymentService.getTransactions({
        search,
        dateFrom,
        dateTo,
        limit,
        page,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = PaymentController;
