const { PackageService } = require("../services");

const PackageController = {
  async getAll(req, res, next) {
    try {
      const activeOnly = req.query.activeOnly === "true";
      const packages = await PackageService.getAll({ activeOnly });
      res.json({ packages });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const pkg = await PackageService.create(req.body);
      res.status(201).json(pkg);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const pkg = await PackageService.update(id, req.body);
      res.json(pkg);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await PackageService.delete(id);
      res.json({ message: "Package deleted successfully", id: deleted.id });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = PackageController;
