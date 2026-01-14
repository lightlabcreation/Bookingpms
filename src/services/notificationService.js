const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Notification Service
 * Handles in-app notifications
 */
class NotificationService {
  /**
   * Create a notification
   */
  static async create({ userId, type = 'SYSTEM', title, message, metadata = null }) {
    return prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata
      }
    });
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulk(notifications) {
    return prisma.notification.createMany({
      data: notifications
    });
  }

  /**
   * Get user's notifications with pagination
   */
  static async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
    const skip = (page - 1) * limit;
    const where = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId) {
    return prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  /**
   * Delete a notification
   */
  static async delete(notificationId, userId) {
    return prisma.notification.deleteMany({
      where: { id: notificationId, userId }
    });
  }

  /**
   * Delete all read notifications for a user
   */
  static async deleteRead(userId) {
    return prisma.notification.deleteMany({
      where: { userId, isRead: true }
    });
  }

  // =====================
  // Notification Templates
  // =====================

  static async notifyBookingCreated(userId, booking, resource) {
    return this.create({
      userId,
      type: 'BOOKING_CREATED',
      title: 'Booking Confirmed',
      message: `Your booking for "${resource.name}" from ${new Date(booking.startTime).toLocaleString()} to ${new Date(booking.endTime).toLocaleString()} has been confirmed. Total: $${booking.totalPrice}`,
      metadata: { bookingId: booking.id, resourceId: resource.id }
    });
  }

  static async notifyBookingCancelled(userId, booking, resource) {
    return this.create({
      userId,
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: `Your booking for "${resource.name}" on ${new Date(booking.startTime).toLocaleString()} has been cancelled.`,
      metadata: { bookingId: booking.id, resourceId: resource.id }
    });
  }

  static async notifyBookingUpdated(userId, booking, resource) {
    return this.create({
      userId,
      type: 'BOOKING_REMINDER',
      title: 'Booking Updated',
      message: `Your booking for "${resource.name}" has been updated. New time: ${new Date(booking.startTime).toLocaleString()} to ${new Date(booking.endTime).toLocaleString()}`,
      metadata: { bookingId: booking.id, resourceId: resource.id }
    });
  }

  static async notifyWelcome(userId, firstName) {
    return this.create({
      userId,
      type: 'WELCOME',
      title: 'Welcome!',
      message: `Welcome to BookingPMS, ${firstName || 'there'}! Start exploring our resources and make your first booking.`
    });
  }
}

module.exports = NotificationService;
