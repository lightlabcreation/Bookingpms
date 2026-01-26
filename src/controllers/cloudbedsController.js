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
      
      // Detailed environment check for Railway debugging
      const envCheck = {
        nodeEnv: process.env.NODE_ENV || 'not set',
        hasApiKey: !!process.env.CLOUDBEDS_API_KEY,
        hasClientId: !!process.env.CLOUDBEDS_CLIENT_ID,
        hasClientSecret: !!process.env.CLOUDBEDS_CLIENT_SECRET,
        apiKeyLength: process.env.CLOUDBEDS_API_KEY ? process.env.CLOUDBEDS_API_KEY.length : 0,
        apiKeyPrefix: process.env.CLOUDBEDS_API_KEY ? process.env.CLOUDBEDS_API_KEY.substring(0, 10) + '...' : 'NOT SET',
        clientIdPrefix: process.env.CLOUDBEDS_CLIENT_ID ? process.env.CLOUDBEDS_CLIENT_ID.substring(0, 10) + '...' : 'NOT SET',
        // Service instance check
        serviceHasApiKey: !!cloudbedsService.apiKey,
        serviceApiKeyPrefix: cloudbedsService.apiKey ? cloudbedsService.apiKey.substring(0, 10) + '...' : 'NOT SET',
        // All environment variables (for debugging)
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('CLOUDBEDS')).map(key => ({
          key: key,
          set: !!process.env[key],
          length: process.env[key] ? process.env[key].length : 0
        }))
      };
      
      status.envCheck = envCheck;
      status.railwayDebug = {
        message: 'If running on Railway, check environment variables in Railway Dashboard',
        requiredVars: ['CLOUDBEDS_API_KEY', 'CLOUDBEDS_CLIENT_ID', 'CLOUDBEDS_CLIENT_SECRET'],
        missingVars: ['CLOUDBEDS_API_KEY', 'CLOUDBEDS_CLIENT_ID', 'CLOUDBEDS_CLIENT_SECRET'].filter(
          key => !process.env[key]
        )
      };
      
      return response.success(res, status, 'Cloudbeds connection status');
    } catch (err) {
      console.error('[Cloudbeds Controller] Status error:', err);
      return response.error(res, err.message, err.statusCode || 500);
    }
  }

  /**
   * Environment check endpoint (for Railway debugging)
   * GET /api/cloudbeds/env-check
   */
  static async getEnvCheck(req, res) {
    try {
      const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
      
      const envInfo = {
        platform: isRailway ? 'Railway' : 'Local',
        nodeEnv: process.env.NODE_ENV || 'not set',
        requiredVars: {
          CLOUDBEDS_API_KEY: {
            set: !!process.env.CLOUDBEDS_API_KEY,
            length: process.env.CLOUDBEDS_API_KEY ? process.env.CLOUDBEDS_API_KEY.length : 0,
            prefix: process.env.CLOUDBEDS_API_KEY ? process.env.CLOUDBEDS_API_KEY.substring(0, 10) + '...' : 'NOT SET'
          },
          CLOUDBEDS_CLIENT_ID: {
            set: !!process.env.CLOUDBEDS_CLIENT_ID,
            length: process.env.CLOUDBEDS_CLIENT_ID ? process.env.CLOUDBEDS_CLIENT_ID.length : 0,
            prefix: process.env.CLOUDBEDS_CLIENT_ID ? process.env.CLOUDBEDS_CLIENT_ID.substring(0, 10) + '...' : 'NOT SET'
          },
          CLOUDBEDS_CLIENT_SECRET: {
            set: !!process.env.CLOUDBEDS_CLIENT_SECRET,
            length: process.env.CLOUDBEDS_CLIENT_SECRET ? process.env.CLOUDBEDS_CLIENT_SECRET.length : 0,
            prefix: process.env.CLOUDBEDS_CLIENT_SECRET ? 'Set (hidden)' : 'NOT SET'
          }
        },
        serviceStatus: {
          hasApiKey: !!cloudbedsService.apiKey,
          apiKeyPrefix: cloudbedsService.apiKey ? cloudbedsService.apiKey.substring(0, 10) + '...' : 'NOT LOADED'
        },
        allCloudbedsEnvVars: Object.keys(process.env)
          .filter(key => key.includes('CLOUDBEDS'))
          .map(key => ({
            key: key,
            set: true,
            length: process.env[key].length
          })),
        fixInstructions: isRailway ? {
          step1: 'Go to Railway Dashboard → Your Project → Settings → Variables',
          step2: 'Add these variables: CLOUDBEDS_API_KEY, CLOUDBEDS_CLIENT_ID, CLOUDBEDS_CLIENT_SECRET',
          step3: 'After adding variables, redeploy the service',
          step4: 'Check logs to verify variables are loaded'
        } : {
          step1: 'Create .env file in backend directory',
          step2: 'Add: CLOUDBEDS_API_KEY=your_key',
          step3: 'Restart the server'
        }
      };
      
      return response.success(res, envInfo, 'Environment check completed');
    } catch (err) {
      console.error('[Cloudbeds Controller] Env check error:', err);
      return response.error(res, err.message, 500);
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
      const details = err.details != null ? { cloudbeds: err.details, url: err._url } : undefined;
      return response.error(res, err.message, err.statusCode || 500, details);
    }
  }

  /**
   * Get availability grid for calendar: room types (rows) x dates (columns).
   * GET /api/cloudbeds/availability-grid?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   * Default: next 30 days from today. Used by read-only guest availability calendar.
   */
  static async getAvailabilityGrid(req, res) {
    try {
      let { startDate, endDate } = req.query;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (!startDate || !dateRegex.test(startDate)) {
        const t = new Date();
        startDate = t.toISOString().slice(0, 10);
      }
      if (!endDate || !dateRegex.test(endDate)) {
        const e = new Date(startDate);
        e.setUTCDate(e.getUTCDate() + 30);
        endDate = e.toISOString().slice(0, 10);
      }

      const grid = await cloudbedsService.getAvailabilityGrid(startDate, endDate);
      return response.success(res, grid, 'Availability grid retrieved');
    } catch (err) {
      const details = err.details != null ? { cloudbeds: err.details, url: err._url } : undefined;
      return response.error(res, err.message, err.statusCode || 500, details);
    }
  }

  /**
   * Get calendar availability (day-by-day)
   * GET /api/cloudbeds/calendar - Direct data, no filters
   * GET /api/cloudbeds/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - Optional date filter
   */
  static async getCalendarAvailability(req, res) {
    try {
      let { startDate, endDate } = req.query;

      // If dates not provided, use default range (today to 3 months ahead)
      if (!startDate || !endDate) {
        const today = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(today.getMonth() + 3);
        
        startDate = startDate || today.toISOString().split('T')[0];
        endDate = endDate || threeMonthsLater.toISOString().split('T')[0];
        
        console.log('[Cloudbeds Controller] Using default date range:', { startDate, endDate });
      }

      // Validate date format if provided
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (startDate && !dateRegex.test(startDate)) {
        return response.badRequest(res, 'startDate must be in YYYY-MM-DD format');
      }
      if (endDate && !dateRegex.test(endDate)) {
        return response.badRequest(res, 'endDate must be in YYYY-MM-DD format');
      }

      console.log('[Cloudbeds Controller] Calendar request - DIRECT DATA (no filters):', { startDate, endDate });
      
      // Get direct data - no filtering, no processing
      const calendar = await cloudbedsService.getCalendarAvailability(startDate, endDate);
      
      // Return direct data as-is - no filtering, no transformation
      const calendarData = calendar.data || calendar || [];
      
      console.log('[Cloudbeds Controller] Calendar response - DIRECT DATA:', {
        success: calendar.success,
        dataLength: Array.isArray(calendarData) ? calendarData.length : 'not array',
        dataType: Array.isArray(calendarData) ? 'array' : typeof calendarData,
        hasError: !!calendar.error,
        firstItem: Array.isArray(calendarData) && calendarData.length > 0 ? Object.keys(calendarData[0]) : 'empty'
      });
      
      // Return raw data directly - no filtering
      return response.success(res, calendarData, 'Calendar availability retrieved (direct data)');
    } catch (err) {
      console.error('[Cloudbeds Controller] Calendar error:', err);
      // Return empty array instead of error - don't crash
      return response.success(res, [], 'Calendar availability retrieved (empty)');
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
      
      // Handle different response formats
      const gapsData = gaps.data || gaps.gaps || [];
      const totalGaps = gaps.totalGaps || gaps.length || 0;
      
      return response.success(res, gapsData, `Found ${totalGaps} available gaps`);
    } catch (err) {
      console.error('[Cloudbeds Controller] Gaps error:', err);
      return response.error(res, err.message || 'Failed to retrieve available gaps', err.statusCode || 500);
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
