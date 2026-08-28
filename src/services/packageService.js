const { PackageRepository } = require("../repositories");
const pricing = require("../config/pricing");

function validatePackageInput({ key, label, fee, processingFee, processingTime }) {
  if (!key || typeof key !== "string" || !key.trim()) {
    throw { status: 400, message: "Package key is required" };
  }
  if (!/^[a-z0-9_]+$/.test(key.trim())) {
    throw { status: 400, message: "Package key must be lowercase letters, numbers and underscores only" };
  }
  if (!label || typeof label !== "string" || !label.trim()) {
    throw { status: 400, message: "Label is required" };
  }
  if (fee === undefined || fee === null || isNaN(parseFloat(fee)) || parseFloat(fee) < 0) {
    throw { status: 400, message: "Valid fee is required" };
  }
  if (processingFee === undefined || processingFee === null || isNaN(parseFloat(processingFee)) || parseFloat(processingFee) < 0) {
    throw { status: 400, message: "Valid processing fee is required" };
  }
  if (!processingTime || typeof processingTime !== "string" || !processingTime.trim()) {
    throw { status: 400, message: "Processing time is required" };
  }
}

const PackageService = {
  async getAll({ activeOnly = false } = {}) {
    return PackageRepository.getAll({ activeOnly });
  },

  async create(data) {
    validatePackageInput(data);

    const existing = await PackageRepository.getByKey(data.key.trim());
    if (existing) {
      throw { status: 409, message: "A package with this key already exists" };
    }

    const pkg = await PackageRepository.create({
      key: data.key.trim(),
      label: data.label.trim(),
      fee: parseFloat(data.fee),
      processingFee: parseFloat(data.processingFee),
      processingTime: data.processingTime.trim(),
      badge: data.badge || null,
      sortOrder: data.sortOrder || 0,
    });

    pricing.invalidateCache();
    return pkg;
  },

  async update(id, data) {
    if (data.key) {
      const existing = await PackageRepository.getByKey(data.key.trim());
      if (existing && existing.id !== parseInt(id, 10)) {
        throw { status: 409, message: "A package with this key already exists" };
      }
    }

    const updated = await PackageRepository.update(id, {
      key: data.key,
      label: data.label,
      fee: data.fee !== undefined ? parseFloat(data.fee) : undefined,
      processingFee: data.processingFee !== undefined ? parseFloat(data.processingFee) : undefined,
      processingTime: data.processingTime,
      badge: data.badge,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    });

    if (!updated) {
      throw { status: 404, message: "Package not found" };
    }

    pricing.invalidateCache();
    return updated;
  },

  async delete(id) {
    const deleted = await PackageRepository.delete(id);
    if (!deleted) {
      throw { status: 404, message: "Package not found" };
    }
    pricing.invalidateCache();
    return deleted;
  },
};

module.exports = PackageService;
