const cloudbedsService = require('../services/cloudbedsService');
const response = require('../utils/response');
const config = require('../config');

/**
 * Cloudbeds Controller
 * Handles API endpoints for Cloudbeds integration
 */
class CloudbedsController {
  /**
   * Check Cloudbeds API connection status
   * GET /api/cloudbeds/status
   */
  static async getStatus(req, res) {
    try {
      const status = await cloudbedsService.checkConnection();
      return response.success(res, status, 'Cloudbeds connection status');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get OAuth authorization URL
   * GET /api/cloudbeds/auth/url
   */
  static async getAuthUrl(req, res) {
    try {
      const redirectUri = req.query.redirect_uri || `${config.cors.origin}/cloudbeds/callback`;
      const authUrl = cloudbedsService.getAuthorizationUrl(redirectUri);
      return response.success(res, { authUrl, redirectUri }, 'Authorization URL generated');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   * POST /api/cloudbeds/auth/callback
   */
  static async handleCallback(req, res) {
    try {
      const { code, redirect_uri } = req.body;

      if (!code) {
        return response.badRequest(res, 'Authorization code is required');
      }

      const redirectUri = redirect_uri || `${config.cors.origin}/cloudbeds/callback`;
      const tokens = await cloudbedsService.exchangeCodeForToken(code, redirectUri);

      return response.success(res, {
        message: 'Successfully authenticated with Cloudbeds',
        // In production, don't expose tokens in response - save to database instead
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }, 'Authentication successful');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Set tokens manually (for admin use)
   * POST /api/cloudbeds/auth/tokens
   */
  static async setTokens(req, res) {
    try {
      const { accessToken, refreshToken, expiresIn } = req.body;

      if (!accessToken && !refreshToken) {
        return response.badRequest(res, 'At least one token is required');
      }

      cloudbedsService.setTokens(accessToken, refreshToken, expiresIn || 3600);
      return response.success(res, { message: 'Tokens set successfully' }, 'Tokens configured');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get hotel details from Cloudbeds
   * GET /api/cloudbeds/hotel
   */
  static async getHotelDetails(req, res) {
    try {
      const hotel = await cloudbedsService.getHotelDetails();
      return response.success(res, hotel.data, 'Hotel details retrieved');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get all room types
   * GET /api/cloudbeds/room-types
   */
  static async getRoomTypes(req, res) {
    try {
      const roomTypes = await cloudbedsService.getRoomTypes();
      return response.success(res, roomTypes.data, 'Room types retrieved');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get rooms list
   * GET /api/cloudbeds/rooms
   */
  static async getRooms(req, res) {
    try {
      const rooms = await cloudbedsService.getRooms();
      return response.success(res, rooms.data, 'Rooms retrieved');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get availability for date range
   * GET /api/cloudbeds/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&rooms=1
   */
  static async getAvailability(req, res) {
    try {
      const { startDate, endDate, rooms = 1 } = req.query;

      if (!startDate || !endDate) {
        return response.badRequest(res, 'startDate and endDate are required');
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return response.badRequest(res, 'Dates must be in YYYY-MM-DD format');
      }

      const availability = await cloudbedsService.getAvailability(startDate, endDate, parseInt(rooms));
      return response.success(res, availability.data, 'Availability retrieved');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get calendar availability (day-by-day)
   * GET /api/cloudbeds/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  static async getCalendarAvailability(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return response.badRequest(res, 'startDate and endDate are required');
      }

      const calendar = await cloudbedsService.getCalendarAvailability(startDate, endDate);
      return response.success(res, calendar.data, 'Calendar availability retrieved');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get available date gaps (for booking calendar)
   * GET /api/cloudbeds/gaps?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&minNights=1
   */
  static async getAvailableGaps(req, res) {
    try {
      const { startDate, endDate, minNights = 1 } = req.query;

      if (!startDate || !endDate) {
        return response.badRequest(res, 'startDate and endDate are required');
      }

      const gaps = await cloudbedsService.getAvailableGaps(startDate, endDate, parseInt(minNights));
      return response.success(res, gaps.data, `Found ${gaps.totalGaps} available gaps`);
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get room rates
   * GET /api/cloudbeds/rates?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&roomTypeId=123
   */
  static async getRates(req, res) {
    try {
      const { startDate, endDate, roomTypeId } = req.query;

      if (!startDate || !endDate) {
        return response.badRequest(res, 'startDate and endDate are required');
      }

      const rates = await cloudbedsService.getRates(startDate, endDate, roomTypeId);
      return response.success(res, rates.data, 'Rates retrieved');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Get booking URL for Cloudbeds booking engine
   * GET /api/cloudbeds/booking-url?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
   */
  static async getBookingUrl(req, res) {
    try {
      const { checkIn, checkOut } = req.query;

      if (!checkIn || !checkOut) {
        return response.badRequest(res, 'checkIn and checkOut are required');
      }

      const url = cloudbedsService.getBookingUrl(checkIn, checkOut);
      return response.success(res, { bookingUrl: url }, 'Booking URL generated');
    } catch (err) {
      return response.error(res, err.message, err.statusCode || 500);
    }
  }
}

module.exports = CloudbedsController;
