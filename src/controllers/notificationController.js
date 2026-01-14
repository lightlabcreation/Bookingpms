const NotificationService = require('../services/notificationService');
const { success } = require('../utils/response');
const { parsePagination } = require('../utils/helpers');

/**
 * Notification Controller
 */
class NotificationController {
  /**
   * Get user's notifications
   * GET /api/notifications
   */
  static async getAll(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await NotificationService.getUserNotifications(req.user.id, {
        page,
        limit,
        unreadOnly
      });

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread count
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationService.getUnreadCount(req.user.id);
      return success(res, { count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  static async markAsRead(req, res, next) {
    try {
      await NotificationService.markAsRead(req.params.id, req.user.id);
      return success(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  static async markAllAsRead(req, res, next) {
    try {
      await NotificationService.markAllAsRead(req.user.id);
      return success(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  static async delete(req, res, next) {
    try {
      await NotificationService.delete(req.params.id, req.user.id);
      return success(res, null, 'Notification deleted');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all read notifications
   * DELETE /api/notifications/read
   */
  static async deleteRead(req, res, next) {
    try {
      await NotificationService.deleteRead(req.user.id);
      return success(res, null, 'Read notifications deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { NotificationController };
