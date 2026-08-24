const { NotificationRepository } = require("../repositories");
const SSEManager = require("./sseManager");

const NotificationService = {
  async create({ type, title, message, applicationId, applicantId }) {
    const notification = await NotificationRepository.create({
      type,
      title,
      message,
      applicationId,
      applicantId,
    });

    // Broadcast to all connected SSE clients
    SSEManager.broadcast(notification);

    return notification;
  },

  async getAll({ limit, offset } = {}) {
    return NotificationRepository.findAll({ limit, offset });
  },

  async getUnreadCount() {
    return NotificationRepository.getUnreadCount();
  },

  async markAsRead(id) {
    return NotificationRepository.markAsRead(id);
  },

  async markAllAsRead() {
    return NotificationRepository.markAllAsRead();
  },
};

module.exports = NotificationService;
