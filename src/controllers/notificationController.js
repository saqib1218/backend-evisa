const NotificationService = require("../services/notificationService");
const SSEManager = require("../services/sseManager");
const { v4: uuidv4 } = require("uuid");

const NotificationController = {
  async getAll(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const offset = parseInt(req.query.offset, 10) || 0;
      const notifications = await NotificationService.getAll({ limit, offset });
      res.json(notifications);
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationService.getUnreadCount();
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const notification = await NotificationService.markAsRead(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req, res, next) {
    try {
      await NotificationService.markAllAsRead();
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  // SSE endpoint for real-time notifications
  sseStream(req, res) {
    const clientId = uuidv4();
    SSEManager.addClient(clientId, res);
  },
};

module.exports = NotificationController;
