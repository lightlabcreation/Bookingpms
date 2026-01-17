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
    // Cloudbeds API v1.1 endpoints
    this.baseUrl = 'https://hotels.cloudbeds.com/api/v1.1';
    this.authUrl = 'https://hotels.cloudbeds.com/api/v1.1/oauth';
    this.tokenUrl = 'https://hotels.cloudbeds.com/api/v1.1/access_token';
    
    // Load API key from environment - check multiple sources
    this.apiKey = process.env.CLOUDBEDS_API_KEY || config.cloudbeds.apiKey || null;
    
    // Detailed logging for Railway debugging
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[Cloudbeds Service] Initializing...');
    console.log('[Cloudbeds] Environment:', process.env.NODE_ENV || 'not set');
    console.log('[Cloudbeds] API Key Status:', this.apiKey ? `✓ LOADED (${this.apiKey.substring(0, 10)}...)` : '✗ NOT FOUND');
    console.log('[Cloudbeds] Environment Variables Check:');
    console.log('  - CLOUDBEDS_API_KEY:', process.env.CLOUDBEDS_API_KEY ? `✓ Set (${process.env.CLOUDBEDS_API_KEY.substring(0, 10)}...)` : '✗ NOT SET');
    console.log('  - CLOUDBEDS_CLIENT_ID:', process.env.CLOUDBEDS_CLIENT_ID ? '✓ Set' : '✗ NOT SET');
    console.log('  - CLOUDBEDS_CLIENT_SECRET:', process.env.CLOUDBEDS_CLIENT_SECRET ? '✓ Set' : '✗ NOT SET');
    console.log('  - Config API Key:', config.cloudbeds.apiKey ? `✓ Found` : '✗ NOT FOUND');
    console.log('═══════════════════════════════════════════════════════════');

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
   * If API key is available, use it directly
   */
  async getAccessToken() {
    // If API key is available, use it directly (for API key authentication)
    if (this.apiKey) {
      return this.apiKey;
    }

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
      message: 'Not authenticated with Cloudbeds. Please authorize the app or set API key.',
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
    // Check if we have authentication before making request
    if (!this.apiKey && !this.accessToken && !this.refreshToken) {
      console.error('[Cloudbeds] ❌ No authentication method available!');
      console.error('[Cloudbeds] API Key:', this.apiKey ? 'Present' : 'Missing');
      console.error('[Cloudbeds] Access Token:', this.accessToken ? 'Present' : 'Missing');
      console.error('[Cloudbeds] Refresh Token:', this.refreshToken ? 'Present' : 'Missing');
      console.error('[Cloudbeds] Environment check:', {
        'process.env.CLOUDBEDS_API_KEY': !!process.env.CLOUDBEDS_API_KEY,
        'config.cloudbeds.apiKey': !!config.cloudbeds.apiKey
      });
      
      throw {
        statusCode: 401,
        message: 'Cloudbeds API authentication required. Please set CLOUDBEDS_API_KEY in Railway environment variables.',
        needsAuth: true,
        railwayFix: 'Set CLOUDBEDS_API_KEY in Railway Dashboard → Settings → Variables'
      };
    }

    const token = await this.getAccessToken();

    try {
      // Cloudbeds API requires Authorization header
      // Try multiple authentication methods
      const headers = {
        'Content-Type': 'application/json'
      };

      // Method 1: Try Bearer token in Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Method 2: Also try x-api-key header (for API key authentication)
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      // For GET requests, also try access_token in query params (v1.1 fallback)
      const requestParams = method === 'GET' 
        ? { ...params, access_token: token }
        : {};

      // For POST/PUT requests, include access_token in body if needed
      const requestData = method !== 'GET' 
        ? { ...params, access_token: token }
        : undefined;

      console.log(`[Cloudbeds] API Request: ${method} ${endpoint}`, {
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 15) + '...' : 'none',
        authHeader: headers['Authorization'] ? 'Bearer token' : 'none',
        apiKeyHeader: headers['x-api-key'] ? 'x-api-key' : 'none',
        platform: process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local'
      });

      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        params: requestParams,
        data: requestData,
        headers: headers,
        timeout: 30000 // 30 second timeout
      });

      return response.data;
    } catch (error) {
      console.error(`[Cloudbeds] ❌ API Error (${endpoint}):`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        platform: process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local'
      });

      // If token expired, try to refresh and retry once
      if (error.response?.status === 401 && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          return this.apiRequest(endpoint, method, params);
        } catch (refreshError) {
          throw refreshError;
        }
      }

      // Better error message for Railway
      const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
      const errorMessage = error.response?.status === 401 
        ? (isRailway 
          ? 'Cloudbeds API authentication failed. Check CLOUDBEDS_API_KEY in Railway Dashboard.'
          : 'Cloudbeds API authentication failed. Check CLOUDBEDS_API_KEY in .env file.')
        : 'Cloudbeds API request failed';

      throw {
        statusCode: error.response?.status || 500,
        message: errorMessage,
        details: error.response?.data || error.message,
        railwayFix: isRailway ? 'Set CLOUDBEDS_API_KEY in Railway Dashboard → Settings → Variables' : null
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
   * Direct data fetch - no filtering, no processing
   */
  async getCalendarAvailability(startDate, endDate) {
    try {
      console.log('[Cloudbeds] Fetching calendar availability (direct, no filters):', { startDate, endDate });
      
      // Direct API call - no filters, no processing
      const result = await this.apiRequest('/getAvailability', 'GET', {
        startDate,
        endDate,
        rooms: 1
      });
      
      console.log('[Cloudbeds] Raw availability response (first 500 chars):', JSON.stringify(result).substring(0, 500));
      
      // Return direct data - no filtering, no transformation
      // Just extract data if wrapped, otherwise return as-is
      let availabilityData = result;
      
      // If response has data property, extract it
      if (result && typeof result === 'object' && result.data !== undefined) {
        availabilityData = result.data;
      }
      
      // Ensure it's an array for consistency
      if (!Array.isArray(availabilityData)) {
        // If it's an object with date/availability info, wrap it in array
        if (availabilityData && typeof availabilityData === 'object') {
          availabilityData = [availabilityData];
        } else {
          availabilityData = [];
        }
      }
      
      console.log('[Cloudbeds] Returning direct data:', {
        type: Array.isArray(availabilityData) ? 'array' : typeof availabilityData,
        length: Array.isArray(availabilityData) ? availabilityData.length : 'N/A'
      });
      
      // Return direct data - no filtering
      return {
        success: true,
        data: availabilityData
      };
    } catch (error) {
      console.error('[Cloudbeds] Calendar availability error:', error);
      console.error('[Cloudbeds] Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        response: error.response?.data
      });
      
      // Return empty array instead of throwing error
      return {
        success: true,
        data: [],
        error: error.message
      };
    }
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

      // Handle different response formats
      const calendarData = calendar.data || calendar || [];
      const days = Array.isArray(calendarData) ? calendarData : [];

      if (days.length === 0) {
        return { success: true, data: [], message: 'No availability data', totalGaps: 0 };
      }

      const gaps = [];
      let currentGap = null;

      for (const day of days) {
        // Handle different date field names
        const date = day.date || day.Date || day.checkInDate;
        const roomsAvailable = day.roomsAvailable || day.rooms_available || day.availableRooms || 0;
        const available = roomsAvailable > 0;

        if (!date) continue; // Skip if no date field

        if (available) {
          if (!currentGap) {
            currentGap = {
              startDate: date,
              endDate: date,
              nights: 1,
              roomsAvailable: roomsAvailable
            };
          } else {
            currentGap.endDate = date;
            currentGap.nights++;
            currentGap.roomsAvailable = Math.min(currentGap.roomsAvailable, roomsAvailable);
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
      // Detailed check with logging
      console.log('[Cloudbeds] Connection check started...');
      console.log('[Cloudbeds] Current state:', {
        hasApiKey: !!this.apiKey,
        apiKeyValue: this.apiKey ? this.apiKey.substring(0, 15) + '...' : 'null',
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        envApiKey: process.env.CLOUDBEDS_API_KEY ? process.env.CLOUDBEDS_API_KEY.substring(0, 15) + '...' : 'not in env'
      });

      // Check if we have tokens or API key
      if (!this.accessToken && !this.refreshToken && !this.apiKey) {
        console.error('[Cloudbeds] ❌ No authentication method found!');
        console.error('[Cloudbeds] Environment check:', {
          'process.env.CLOUDBEDS_API_KEY': !!process.env.CLOUDBEDS_API_KEY,
          'process.env.CLOUDBEDS_CLIENT_ID': !!process.env.CLOUDBEDS_CLIENT_ID,
          'process.env.CLOUDBEDS_CLIENT_SECRET': !!process.env.CLOUDBEDS_CLIENT_SECRET,
          'config.cloudbeds.apiKey': !!config.cloudbeds.apiKey
        });
        
        return {
          connected: false,
          needsAuth: true,
          hotelName: null,
          message: 'Not authenticated. Please set CLOUDBEDS_API_KEY in Railway environment variables.',
          debug: {
            hasApiKey: !!this.apiKey,
            hasAccessToken: !!this.accessToken,
            hasRefreshToken: !!this.refreshToken,
            envCheck: {
              'process.env.CLOUDBEDS_API_KEY': !!process.env.CLOUDBEDS_API_KEY,
              'process.env.CLOUDBEDS_CLIENT_ID': !!process.env.CLOUDBEDS_CLIENT_ID,
              'config.cloudbeds.apiKey': !!config.cloudbeds.apiKey
            }
          },
          railwayFix: 'Set CLOUDBEDS_API_KEY in Railway Dashboard → Settings → Variables'
        };
      }

      const token = await this.getAccessToken();
      console.log('[Cloudbeds] ✓ Token obtained:', token ? `Yes (${token.substring(0, 15)}...)` : 'No');
      console.log('[Cloudbeds] Testing connection with Cloudbeds API...');
      
      const hotel = await this.getHotelDetails();
      console.log('[Cloudbeds] ✓ Hotel details received:', hotel?.data?.propertyName || hotel?.propertyName || 'Success');
      
      return {
        connected: true,
        needsAuth: false,
        hotelName: hotel.data?.propertyName || hotel.propertyName || hotel.property_name || 'Unknown',
        message: 'Successfully connected to Cloudbeds API',
        authMethod: this.apiKey ? 'API Key' : 'OAuth Token',
        hotelData: hotel
      };
    } catch (error) {
      console.error('[Cloudbeds] ❌ Connection check failed!');
      console.error('[Cloudbeds] Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        response: error.response?.data
      });
      
      return {
        connected: false,
        needsAuth: error.needsAuth || false,
        hotelName: null,
        message: error.message || 'Failed to connect to Cloudbeds API',
        details: error.details || error.response?.data || null,
        error: error.toString(),
        debug: {
          hasApiKey: !!this.apiKey,
          apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'not set',
          envApiKey: process.env.CLOUDBEDS_API_KEY ? 'set' : 'not set'
        }
      };
    }
  }

  /**
   * Check if tokens or API key are configured
   */
  hasTokens() {
    return !!(this.accessToken || this.refreshToken || this.apiKey);
  }
}

// Export singleton instance
module.exports = new CloudbedsService();
