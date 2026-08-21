module.exports = {
  authenticateToken: require("./auth").authenticateToken,
  verifyRefreshToken: require("./auth").verifyRefreshToken,
  requireRole: require("./roles").requireRole,
  upload: require("./upload"),
  documentUpload: require("./upload").documentUpload,
};
