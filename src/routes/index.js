const express = require("express");
const { AuthController, ApplicationController, UploadController, PaymentController, NotificationController, StripePaymentController, QueryController } = require("../controllers");
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

// Stripe payment routes (public — no application row exists until payment is confirmed)
router.post("/payments/create-checkout-session", StripePaymentController.createCheckoutSession);
router.get("/payments/status/:sessionId", StripePaymentController.getPaymentStatus);

// Application routes (public)
// NOTE: direct application creation is intentionally NOT exposed here.
// Applications are only created after a verified Stripe payment via the
// /payments/create-checkout-session + webhook flow above.
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

// Query (Contact Us) routes
router.post("/queries", QueryController.create);
router.get("/queries", authenticateToken, requireRole("admin", "support"), QueryController.getAll);
router.get("/queries/:id", authenticateToken, requireRole("admin", "support"), QueryController.getById);

// Notification routes (admin only - authenticated)
router.get("/notifications/stream", authenticateToken, requireRole("admin"), NotificationController.sseStream);
router.get("/notifications", authenticateToken, requireRole("admin"), NotificationController.getAll);
router.get("/notifications/unread-count", authenticateToken, requireRole("admin"), NotificationController.getUnreadCount);
router.patch("/notifications/:id/read", authenticateToken, requireRole("admin"), NotificationController.markAsRead);
router.patch("/notifications/read-all", authenticateToken, requireRole("admin"), NotificationController.markAllAsRead);

module.exports = router;
