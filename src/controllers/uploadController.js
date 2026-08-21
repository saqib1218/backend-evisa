const UploadController = {
  async uploadImages(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const files = req.files.map((file) => ({
        fieldname: file.fieldname,
        originalName: file.originalname,
        filename: file.filename,
        path: `/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      }));

      res.status(201).json({ files });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = UploadController;
