const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Message Service
 * Handles email/SMS logging (actual sending would require provider integration)
 */
class MessageService {
  /**
   * Log an email message
   */
  static async logEmail({ to, content, status = 'QUEUED', provider = null, userId = null }) {
    return prisma.messageLog.create({
      data: {
        type: 'EMAIL',
        to,
        content,
        status,
        provider,
        userId
      }
    });
  }

  /**
   * Log an SMS message
   */
  static async logSMS({ to, content, status = 'QUEUED', provider = null, userId = null }) {
    return prisma.messageLog.create({
      data: {
        type: 'SMS',
        to,
        content,
        status,
        provider,
        userId
      }
    });
  }

  /**
   * Update message status
   */
  static async updateStatus(messageId, status) {
    return prisma.messageLog.update({
      where: { id: messageId },
      data: { status }
    });
  }

  /**
   * Get message logs with pagination
   */
  static async getLogs({ page = 1, limit = 20, type, status, userId }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.messageLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.messageLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Send booking confirmation email (mock - logs only)
   */
  static async sendBookingConfirmation(user, booking, resource) {
    const content = `
Dear ${user.firstName || 'Customer'},

Your booking has been confirmed!

Resource: ${resource.name}
Date: ${new Date(booking.startTime).toLocaleDateString()}
Time: ${new Date(booking.startTime).toLocaleTimeString()} - ${new Date(booking.endTime).toLocaleTimeString()}
Total: $${booking.totalPrice}

Thank you for your booking!

Best regards,
BookingPMS Team
    `.trim();

    return this.logEmail({
      to: user.email,
      content,
      status: 'QUEUED',
      userId: user.id
    });
  }

  /**
   * Send booking cancellation email (mock - logs only)
   */
  static async sendBookingCancellation(user, booking, resource) {
    const content = `
Dear ${user.firstName || 'Customer'},

Your booking has been cancelled.

Resource: ${resource.name}
Date: ${new Date(booking.startTime).toLocaleDateString()}
Time: ${new Date(booking.startTime).toLocaleTimeString()} - ${new Date(booking.endTime).toLocaleTimeString()}

If you did not request this cancellation, please contact us immediately.

Best regards,
BookingPMS Team
    `.trim();

    return this.logEmail({
      to: user.email,
      content,
      status: 'QUEUED',
      userId: user.id
    });
  }
}

module.exports = MessageService;
