const { PrismaClient } = require('@prisma/client');
const { calculateBookingPrice, timeRangesOverlap } = require('../utils/helpers');
const NotificationService = require('./notificationService');
const MessageService = require('./messageService');
const { AuditService, AuditActions } = require('./auditService');

const prisma = new PrismaClient();

/**
 * Booking Service
 * Handles all booking operations with overlap prevention
 */
class BookingService {
  /**
   * Check for booking overlaps
   */
  static async checkBookingOverlap(resourceId, startTime, endTime, excludeBookingId = null) {
    const where = {
      resourceId,
      status: { not: 'CANCELLED' },
      OR: [
        {
          AND: [
            { startTime: { lte: new Date(startTime) } },
            { endTime: { gt: new Date(startTime) } }
          ]
        },
        {
          AND: [
            { startTime: { lt: new Date(endTime) } },
            { endTime: { gte: new Date(endTime) } }
          ]
        },
        {
          AND: [
            { startTime: { gte: new Date(startTime) } },
            { endTime: { lte: new Date(endTime) } }
          ]
        }
      ]
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    const overlapping = await prisma.booking.findFirst({ where });
    return overlapping !== null;
  }

  /**
   * Check for resource block overlaps
   */
  static async checkBlockOverlap(resourceId, startTime, endTime) {
    const overlapping = await prisma.resourceBlock.findFirst({
      where: {
        resourceId,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gt: new Date(startTime) } }
            ]
          },
          {
            AND: [
              { startTime: { lt: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } }
            ]
          },
          {
            AND: [
              { startTime: { gte: new Date(startTime) } },
              { endTime: { lte: new Date(endTime) } }
            ]
          }
        ]
      }
    });
    return overlapping !== null;
  }

  /**
   * Create a new booking with all validations
   */
  static async createBooking({ userId, resourceId, startTime, endTime, notes }, ipAddress) {
    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw { statusCode: 400, message: 'End time must be after start time' };
    }

    if (start < new Date()) {
      throw { statusCode: 400, message: 'Cannot book in the past' };
    }

    // Get resource
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      throw { statusCode: 404, message: 'Resource not found' };
    }

    if (resource.status !== 'AVAILABLE') {
      throw { statusCode: 400, message: 'Resource is not available for booking' };
    }

    // Check for block overlaps
    const hasBlockOverlap = await this.checkBlockOverlap(resourceId, startTime, endTime);
    if (hasBlockOverlap) {
      throw { statusCode: 409, message: 'This time slot is blocked' };
    }

    // Check for booking overlaps
    const hasBookingOverlap = await this.checkBookingOverlap(resourceId, startTime, endTime);
    if (hasBookingOverlap) {
      throw { statusCode: 409, message: 'This time slot is already booked' };
    }

    // Calculate price
    const totalPrice = calculateBookingPrice(startTime, endTime, resource.pricePerHour);

    // Create booking in transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Double-check overlap within transaction for race condition prevention
      const existingBooking = await tx.booking.findFirst({
        where: {
          resourceId,
          status: { not: 'CANCELLED' },
          OR: [
            {
              AND: [
                { startTime: { lte: start } },
                { endTime: { gt: start } }
              ]
            },
            {
              AND: [
                { startTime: { lt: end } },
                { endTime: { gte: end } }
              ]
            },
            {
              AND: [
                { startTime: { gte: start } },
                { endTime: { lte: end } }
              ]
            }
          ]
        }
      });

      if (existingBooking) {
        throw { statusCode: 409, message: 'This time slot was just booked by another user' };
      }

      return tx.booking.create({
        data: {
          userId,
          resourceId,
          startTime: start,
          endTime: end,
          totalPrice,
          status: 'CONFIRMED',
          notes
        },
        include: {
          resource: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        }
      });
    });

    // Create notification (don't fail booking if notification fails)
    try {
      await NotificationService.notifyBookingCreated(userId, booking, resource);
    } catch (err) {
      console.error('Failed to create booking notification:', err.message);
    }

    // Log email (don't fail booking if email logging fails)
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await MessageService.sendBookingConfirmation(user, booking, resource);
      }
    } catch (err) {
      console.error('Failed to send booking confirmation:', err.message);
    }

    // Audit log (don't fail booking if audit fails)
    try {
      await AuditService.log({
        userId,
        action: AuditActions.BOOKING_CREATE,
        entity: 'Booking',
        entityId: booking.id,
        ipAddress,
        details: {
          resourceId,
          resourceName: resource.name,
          startTime,
          endTime,
          totalPrice
        }
      });
    } catch (err) {
      console.error('Failed to create audit log:', err.message);
    }

    return booking;
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId, userId, isAdmin = false, ipAddress) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { resource: true }
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Booking not found' };
    }

    // Check ownership unless admin
    if (!isAdmin && booking.userId !== userId) {
      throw { statusCode: 403, message: 'Not authorized to cancel this booking' };
    }

    if (booking.status === 'CANCELLED') {
      throw { statusCode: 400, message: 'Booking is already cancelled' };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: { resource: true }
    });

    // Create notification (don't fail cancellation if notification fails)
    try {
      await NotificationService.notifyBookingCancelled(booking.userId, booking, booking.resource);
    } catch (err) {
      console.error('Failed to create cancellation notification:', err.message);
    }

    // Log email (don't fail cancellation if email fails)
    try {
      const user = await prisma.user.findUnique({ where: { id: booking.userId } });
      if (user) {
        await MessageService.sendBookingCancellation(user, booking, booking.resource);
      }
    } catch (err) {
      console.error('Failed to send cancellation email:', err.message);
    }

    // Audit log (don't fail cancellation if audit fails)
    try {
      await AuditService.log({
        userId,
        action: AuditActions.BOOKING_CANCEL,
        entity: 'Booking',
        entityId: bookingId,
        ipAddress,
        details: {
          resourceId: booking.resourceId,
          resourceName: booking.resource.name,
          originalStatus: booking.status,
          cancelledBy: isAdmin ? 'admin' : 'user'
        }
      });
    } catch (err) {
      console.error('Failed to create audit log:', err.message);
    }

    return updatedBooking;
  }

  /**
   * Get user's bookings with pagination
   */
  static async getUserBookings(userId, { page = 1, limit = 10, status, upcoming = false }) {
    const skip = (page - 1) * limit;
    const where = { userId };

    if (status) {
      where.status = status;
    }

    if (upcoming) {
      where.startTime = { gte: new Date() };
      where.status = { not: 'CANCELLED' };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          resource: {
            select: { id: true, name: true, type: true, imageUrl: true }
          }
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: limit
      }),
      prisma.booking.count({ where })
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get booking by ID
   */
  static async getBookingById(bookingId, userId = null, isAdmin = false) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        resource: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });

    if (!booking) {
      throw { statusCode: 404, message: 'Booking not found' };
    }

    // Check ownership unless admin
    if (!isAdmin && userId && booking.userId !== userId) {
      throw { statusCode: 403, message: 'Not authorized to view this booking' };
    }

    return booking;
  }

  /**
   * Get all bookings (admin)
   */
  static async getAllBookings({ page = 1, limit = 10, status, resourceId, userId, startDate, endDate }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (resourceId) where.resourceId = resourceId;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          resource: {
            select: { id: true, name: true, type: true }
          },
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.booking.count({ where })
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get bookings for calendar display
   */
  static async getCalendarBookings(resourceId, startDate, endDate) {
    const where = {
      status: { not: 'CANCELLED' }
    };

    if (resourceId) {
      where.resourceId = resourceId;
    }

    if (startDate || endDate) {
      where.OR = [
        {
          AND: [
            { startTime: { gte: new Date(startDate) } },
            { startTime: { lte: new Date(endDate) } }
          ]
        },
        {
          AND: [
            { endTime: { gte: new Date(startDate) } },
            { endTime: { lte: new Date(endDate) } }
          ]
        }
      ];
    }

    return prisma.booking.findMany({
      where,
      include: {
        resource: {
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });
  }
}

module.exports = BookingService;
