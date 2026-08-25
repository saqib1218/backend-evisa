const { QueryRepository } = require("../repositories");

function validateQueryInput({ fullName, email, phone, city, message }) {
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    throw { status: 400, message: "Full name is required" };
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    throw { status: 400, message: "Email is required" };
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw { status: 400, message: "Invalid email address" };
  }
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    throw { status: 400, message: "Phone number is required" };
  }
  if (!city || typeof city !== "string" || !city.trim()) {
    throw { status: 400, message: "City is required" };
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    throw { status: 400, message: "Message is required" };
  }
}

const QueryService = {
  async create({ fullName, email, phone, city, message }) {
    validateQueryInput({ fullName, email, phone, city, message });

    const query = await QueryRepository.create({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
      message: message.trim(),
    });

    return query;
  },

  async getAll({ search, limit, page } = {}) {
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;
    return QueryRepository.getAll({ search, limit: parsedLimit, page: parsedPage });
  },

  async getById(id) {
    const query = await QueryRepository.getById(id);
    if (!query) {
      throw { status: 404, message: "Query not found" };
    }
    return query;
  },
};

module.exports = QueryService;
