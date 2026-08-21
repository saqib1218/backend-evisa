const { PaymentRepository } = require("../repositories");

const PaymentService = {
  async getStats() {
    return PaymentRepository.getStats();
  },

  async getTransactions({ search, dateFrom, dateTo, limit, page } = {}) {
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    return PaymentRepository.getTransactions({
      search: search || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      limit: parsedLimit,
      page: parsedPage,
    });
  },
};

module.exports = PaymentService;
