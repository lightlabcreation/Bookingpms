const axios = require('axios');
const config = require('../config');

/**
 * Cloudbeds API Service
 * Handles OAuth 2.0 authentication and API calls to Cloudbeds
 *
 * API Documentation: https://hotels.cloudbeds.com/api/docs/
 *
 * Cloudbeds uses Authorization Code flow:
 * 1. Redirect user to Cloudbeds authorization URL
 * 2. User authorizes the app
 * 3. Cloudbeds redirects back with authorization code
 * 4. Exchange code for access_token + refresh_token
 * 5. Use refresh_token to get new access_token when expired
 */
class CloudbedsService {
  constructor() {
    this.baseUrl = 'https://hotels.cloudbeds.com/api/v1.1';
    this.authUrl = 'https://hotels.cloudbeds.com/api/v1.1/oauth';
    this.tokenUrl = 'https://hotels.cloudbeds.com/api/v1.1/access_token';

    // Token storage (in production, use database)
    this.accessToken = process.env.CLOUDBEDS_ACCESS_TOKEN || null;
    this.refreshToken = process.env.CLOUDBEDS_REFRESH_TOKEN || null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth Authorization URL
   * Redirect user to this URL to start OAuth flow
   */
  getAuthorizationUrl(redirectUri) {
    const params = new URLSearchParams({
      client_id: config.cloudbeds.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read:hotel read:reservation read:room'
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   * Call this after user returns from Cloudbeds authorization
   */
  async exchangeCodeForToken(code, redirectUri) {
    try {
      const response = await axios.post(this.tokenUrl, null, {
        params: {
          grant_type: 'authorization_code',
          client_id: config.cloudbeds.clientId,
          client_secret: config.cloudbeds.clientSecret,
          code: code,
          redirect_uri: redirectUri
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);

        console.log('[Cloudbeds] Tokens obtained successfully');
        return {
          success: true,
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          expiresIn: expiresIn
        };
      }

      throw new Error('No access token in response');
    } catch (error) {
      console.error('[Cloudbeds] Token Exchange Error:', error.response?.data || error.message);
      throw {
        statusCode: 401,
        message: 'Failed to exchange authorization code',
        details: error.response?.data || error.message
      };
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw {
        statusCode: 401,
        message: 'No refresh token available. Please authorize the app first.',
        needsAuth: true
      };
    }

    try {
      const response = await axios.post(this.tokenUrl, null, {
        params: {
          grant_type: 'refresh_token',
          client_id: config.cloudbeds.clientId,
          client_secret: config.cloudbeds.clientSecret,
          refresh_token: this.refreshToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        if (response.data.refresh_token) {
          this.refreshToken = response.data.refresh_token;
        }
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);

        console.log('[Cloudbeds] Token refreshed successfully');
        return this.accessToken;
      }

      throw new Error('No access token in refresh response');
    } catch (error) {
      console.error('[Cloudbeds] Token Refresh Error:', error.response?.data || error.message);
      // Clear tokens on refresh failure
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
      throw {
        statusCode: 401,
        message: 'Failed to refresh token. Please re-authorize the app.',
        needsAuth: true,
        details: error.response?.data || error.message
      };
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken() {
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    // If we have a refresh token, try to refresh
    if (this.refreshToken) {
      return this.refreshAccessToken();
    }

    // No valid tokens
    throw {
      statusCode: 401,
      message: 'Not authenticated with Cloudbeds. Please authorize the app.',
      needsAuth: true
    };
  }

  /**
   * Set tokens manually (e.g., from database or env)
   */
  setTokens(accessToken, refreshToken, expiresIn = 3600) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
  }

  /**
   * Make authenticated API request to Cloudbeds
   */
  async apiRequest(endpoint, method = 'GET', params = {}) {
    const token = await this.getAccessToken();

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        params: method === 'GET' ? { ...params, access_token: token } : { access_token: token },
        data: method !== 'GET' ? params : undefined,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`[Cloudbeds] API Error (${endpoint}):`, error.response?.data || error.message);

      // If token expired, try to refresh and retry once
      if (error.response?.status === 401 && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          return this.apiRequest(endpoint, method, params);
        } catch (refreshError) {
          throw refreshError;
        }
      }

      throw {
        statusCode: error.response?.status || 500,
        message: 'Cloudbeds API request failed',
        details: error.response?.data || error.message
      };
    }
  }

  /**
   * Get hotel/property information
   */
  async getHotelDetails() {
    return this.apiRequest('/getHotelDetails');
  }

  /**
   * Get all room types
   */
  async getRoomTypes() {
    return this.apiRequest('/getRoomTypes');
  }

  /**
   * Get rooms list
   */
  async getRooms() {
    return this.apiRequest('/getRooms');
  }

  /**
   * Get room availability for a date range
   */
  async getAvailability(startDate, endDate, rooms = 1) {
    return this.apiRequest('/getAvailability', 'GET', {
      startDate,
      endDate,
      rooms
    });
  }

  /**
   * Get calendar availability (day-by-day)
   */
  async getCalendarAvailability(startDate, endDate) {
    return this.apiRequest('/getAvailabilityCalendar', 'GET', {
      startDate,
      endDate
    });
  }

  /**
   * Get room rates
   */
  async getRates(startDate, endDate, roomTypeId = null) {
    const params = { startDate, endDate };
    if (roomTypeId) params.roomTypeID = roomTypeId;
    return this.apiRequest('/getRates', 'GET', params);
  }

  /**
   * Get reservations (for sync purposes)
   */
  async getReservations(startDate, endDate, status = null) {
    const params = { checkInFrom: startDate, checkInTo: endDate };
    if (status) params.status = status;
    return this.apiRequest('/getReservations', 'GET', params);
  }

  /**
   * Get available date gaps for booking
   */
  async getAvailableGaps(startDate, endDate, minNights = 1) {
    try {
      const calendar = await this.getCalendarAvailability(startDate, endDate);

      if (!calendar.success || !calendar.data) {
        return { success: false, data: [], message: 'No availability data', totalGaps: 0 };
      }

      const gaps = [];
      let currentGap = null;

      for (const day of calendar.data) {
        const date = day.date;
        const available = day.roomsAvailable > 0;

        if (available) {
          if (!currentGap) {
            currentGap = {
              startDate: date,
              endDate: date,
              nights: 1,
              roomsAvailable: day.roomsAvailable
            };
          } else {
            currentGap.endDate = date;
            currentGap.nights++;
            currentGap.roomsAvailable = Math.min(currentGap.roomsAvailable, day.roomsAvailable);
          }
        } else {
          if (currentGap && currentGap.nights >= minNights) {
            gaps.push({ ...currentGap });
          }
          currentGap = null;
        }
      }

      if (currentGap && currentGap.nights >= minNights) {
        gaps.push(currentGap);
      }

      return {
        success: true,
        data: gaps,
        totalGaps: gaps.length
      };
    } catch (error) {
      console.error('[Cloudbeds] Error getting available gaps:', error);
      throw error;
    }
  }

  /**
   * Generate Cloudbeds booking URL
   */
  getBookingUrl(checkIn, checkOut) {
    const hotelSlug = config.cloudbeds.hotelSlug || 'hotel';
    return `https://${hotelSlug}.cloudbeds.com/reservation?checkin=${checkIn}&checkout=${checkOut}`;
  }

  /**
   * Check API connection status
   */
  async checkConnection() {
    try {
      // Check if we have tokens
      if (!this.accessToken && !this.refreshToken) {
        return {
          connected: false,
          needsAuth: true,
          hotelName: null,
          message: 'Not authenticated. Please authorize with Cloudbeds first.'
        };
      }

      await this.getAccessToken();
      const hotel = await this.getHotelDetails();
      return {
        connected: true,
        needsAuth: false,
        hotelName: hotel.data?.propertyName || 'Unknown',
        message: 'Successfully connected to Cloudbeds API'
      };
    } catch (error) {
      return {
        connected: false,
        needsAuth: error.needsAuth || false,
        hotelName: null,
        message: error.message || 'Failed to connect to Cloudbeds API'
      };
    }
  }

  /**
   * Check if tokens are configured
   */
  hasTokens() {
    return !!(this.accessToken || this.refreshToken);
  }
}

// Export singleton instance
module.exports = new CloudbedsService();
