const express = require("express");
const { AuthController, ApplicationController, UploadController, PaymentController } = require("../controllers");
const { authenticateToken, requireRole, upload, documentUpload } = require("../middleware");

const router = express.Router();

// Auth routes
router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);
router.post("/auth/admin/login", AuthController.adminLogin);
router.post("/auth/refresh", AuthController.refreshToken);
router.post("/auth/logout", AuthController.logout);

// Upload routes (authenticated users)
router.post("/upload/images", authenticateToken, upload.array("images", 10), UploadController.uploadImages);

// Application routes (public)
router.post("/applications", ApplicationController.create);
router.post("/applications/track", ApplicationController.track);
router.get("/applications/track/:referenceNumber", ApplicationController.getByReference);
router.get("/applications/applicant/:applicantId", ApplicationController.getByApplicantId);

// Application routes (admin + support - authenticated with role access)
router.get("/applications", authenticateToken, requireRole("admin", "support"), ApplicationController.getAll);
router.get("/applications/:id/details", authenticateToken, requireRole("admin", "support"), ApplicationController.getDetails);
router.patch("/applications/:id/status", authenticateToken, requireRole("admin"), ApplicationController.updateStatus);
router.patch("/applications/:id/outcome", authenticateToken, requireRole("admin"), documentUpload.single("visaDocument"), ApplicationController.updateOutcome);
router.patch("/applications/:id/payment", authenticateToken, requireRole("admin"), ApplicationController.updatePayment);
router.delete("/applications/:id", authenticateToken, requireRole("admin"), ApplicationController.delete);

// Dashboard route (admin only - authenticated)
router.get("/dashboard", authenticateToken, requireRole("admin"), ApplicationController.getDashboard);

// Payment routes (admin only - authenticated)
router.get("/payments/stats", authenticateToken, requireRole("admin"), PaymentController.getStats);
router.get("/payments/transactions", authenticateToken, requireRole("admin"), PaymentController.getTransactions);

module.exports = router;
