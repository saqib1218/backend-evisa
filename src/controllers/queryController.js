const { QueryService } = require("../services");

const QueryController = {
  async create(req, res, next) {
    try {
      const { fullName, email, phone, city, message } = req.body;
      const query = await QueryService.create({ fullName, email, phone, city, message });
      res.status(201).json(query);
    } catch (err) {
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const { search, limit, page } = req.query;
      const result = await QueryService.getAll({ search, limit, page });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const query = await QueryService.getById(id);
      res.json(query);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = QueryController;
