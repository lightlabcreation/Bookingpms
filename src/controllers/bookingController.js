const { body, query, param } = require('express-validator');
const BookingService = require('../services/bookingService');
const { success, created } = require('../utils/response');
const { getClientIP, parsePagination } = require('../utils/helpers');

/**
 * Validation rules
 */
const createBookingValidation = [
  body('resourceId').isUUID().withMessage('Valid resource ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('notes').optional().trim().isLength({ max: 500 })
];

/**
 * Booking Controller
 */
class BookingController {
  /**
   * Create booking
   * POST /api/bookings
   */
  static async create(req, res, next) {
    try {
      const { resourceId, startTime, endTime, notes } = req.body;
      const ipAddress = getClientIP(req);

      const booking = await BookingService.createBooking(
        {
          userId: req.user.id,
          resourceId,
          startTime,
          endTime,
          notes
        },
        ipAddress
      );

      return created(res, booking, 'Booking created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's bookings
   * GET /api/bookings
   */
  static async getUserBookings(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { status, upcoming } = req.query;

      const result = await BookingService.getUserBookings(req.user.id, {
        page,
        limit,
        status,
        upcoming: upcoming === 'true'
      });

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get booking by ID
   * GET /api/bookings/:id
   */
  static async getById(req, res, next) {
    try {
      const isAdmin = req.user.role === 'ADMIN';
      const booking = await BookingService.getBookingById(
        req.params.id,
        req.user.id,
        isAdmin
      );
      return success(res, booking);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel booking
   * PUT /api/bookings/:id/cancel
   */
  static async cancel(req, res, next) {
    try {
      const ipAddress = getClientIP(req);
      const isAdmin = req.user.role === 'ADMIN';

      const booking = await BookingService.cancelBooking(
        req.params.id,
        req.user.id,
        isAdmin,
        ipAddress
      );

      return success(res, booking, 'Booking cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get calendar bookings (public)
   * GET /api/bookings/calendar
   */
  static async getCalendarBookings(req, res, next) {
    try {
      const { resourceId, startDate, endDate } = req.query;

      const bookings = await BookingService.getCalendarBookings(
        resourceId,
        startDate,
        endDate
      );

      return success(res, bookings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all bookings (admin only)
   * GET /api/admin/bookings
   */
  static async getAllBookings(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { status, resourceId, userId, startDate, endDate } = req.query;

      const result = await BookingService.getAllBookings({
        page,
        limit,
        status,
        resourceId,
        userId,
        startDate,
        endDate
      });

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  BookingController,
  createBookingValidation
};
