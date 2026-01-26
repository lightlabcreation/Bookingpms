const axios = require('axios');
const config = require('../config');
const qs = require('querystring');

/**
 * Cloudbeds API Service - Stable version using verified endpoints
 */
class CloudbedsService {
  constructor() {
    this.baseUrl = 'https://api.cloudbeds.com/api/v1.1';
    this.apiKey = (process.env.CLOUDBEDS_API_KEY || '').trim();
    this.propertyID = (process.env.CLOUDBEDS_PROPERTY_ID || '148933527322816').trim();

    console.log('[Cloudbeds] Service initialized for Property:', this.propertyID);
  }

  async getAccessToken() {
    return this.apiKey;
  }

  async apiRequest(endpoint, method = 'GET', data = {}) {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    try {
      const options = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 20000
      };

      if (method === 'GET') {
        options.params = data;
      } else {
        options.data = qs.stringify(data);
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const response = await axios(options);
      return response.data;
    } catch (error) {
      console.error(`[Cloudbeds] API Error (${endpoint}):`, error.response?.status, error.message);
      throw error;
    }
  }

  async getHotelDetails() { return this.apiRequest('/getHotelDetails'); }
  async getRoomTypes() { return this.apiRequest('/getRoomTypes'); }

  /**
   * getAvailability - Fetches available room types for a date range.
   * Uses getAvailableRoomTypes which is the most reliable v1.1 endpoint.
   */
  async getAvailability(startDate, endDate) {
    const payload = { propertyID: this.propertyID, startDate, endDate };
    try {
      console.log(`[Cloudbeds] Fetching availability from ${startDate} to ${endDate}`);
      const res = await this.apiRequest('/getAvailableRoomTypes', 'GET', payload);
      if (res && res.success !== false) return res;
      throw new Error(res.message || 'Unknown API error');
    } catch (e) {
      // Fallback to getAvailability POST if GET fails
      try {
        console.log('[Cloudbeds] getAvailableRoomTypes failed, trying fallback getAvailability POST...');
        const res = await this.apiRequest('/getAvailability', 'POST', payload);
        if (res && res.success !== false) return res;
      } catch (e2) {
        throw {
          statusCode: e2.response?.status || 500,
          message: 'Cloudbeds availability check failed',
          details: e2.response?.data || e2.message
        };
      }
    }
  }

  /**
   * getAvailabilityGrid - Optimized for Frontend Grid/Calendar
   */
  async getAvailabilityGrid(startDate, endDate) {
    try {
      const availRes = await this.getAvailability(startDate, endDate);
      const rtRes = await this.getRoomTypes().catch(() => ({ data: [] }));

      const availabilityMap = {};
      const dates = [];
      let curr = new Date(startDate);
      const end = new Date(endDate);
      while (curr <= end) {
        dates.push(curr.toISOString().slice(0, 10));
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      const data = availRes.data || availRes.availability || availRes;

      const processItem = (item) => {
        if (!item) return;
        if (Array.isArray(item)) {
          item.forEach(processItem);
        } else if (typeof item === 'object') {
          const rooms = item.propertyRooms || item.rooms || (item.roomTypeID ? [item] : []);
          const itemDate = item.date || item.Date || item.checkInDate;

          rooms.forEach(r => {
            const id = r.roomTypeID || r.roomTypeId;
            const av = r.roomsAvailable ?? r.available ?? r.availableRooms ?? 0;
            const rd = r.date || r.Date || itemDate;

            if (id && rd) {
              // Map specifically to the date provided
              availabilityMap[`${id}_${rd}`] = Number(av);
            } else if (id && !rd) {
              // If no specific date, it's a summary for the ENTIRE searched range
              // This means these rooms are available for EVERY night in the searched period.
              dates.forEach(d => {
                availabilityMap[`${id}_${d}`] = Number(av);
              });
            }
          });
        }
      };

      processItem(data);

      let roomTypes = rtRes.data || rtRes || [];
      if (roomTypes.length === 0) {
        const ids = [...new Set(Object.keys(availabilityMap).map(k => k.split('_')[0]))];
        roomTypes = ids.map(id => ({ roomTypeID: id, roomTypeName: `Room ${id}` }));
      }

      return { roomTypes, dates, availabilityMap };
    } catch (error) {
      console.error('[Cloudbeds Service] Grid Error:', error);
      throw error;
    }
  }

  /**
   * getCalendarAvailability - Optimized for FullCalendar
   */
  async getCalendarAvailability(startDate, endDate) {
    try {
      const grid = await this.getAvailabilityGrid(startDate, endDate);

      // Transform availabilityMap into daily summaries for the calendar
      const dailySummaries = grid.dates.map(date => {
        let totalRooms = 0;
        let availableRooms = 0;

        grid.roomTypes.forEach(rt => {
          const count = grid.availabilityMap[`${rt.roomTypeID}_${date}`] || 0;
          availableRooms += count;
        });

        return {
          date,
          roomsAvailable: availableRooms,
          isAvailable: availableRooms > 0
        };
      });

      return { success: true, data: dailySummaries };
    } catch (e) {
      return { success: false, error: e.message, data: [] };
    }
  }

  /**
   * getAvailableGaps - Find gaps of minimum nights
   */
  async getAvailableGaps(startDate, endDate, minNights = 1) {
    try {
      const cal = await this.getCalendarAvailability(startDate, endDate);
      const days = cal.data || [];
      const gaps = [];
      let currentGap = null;

      for (const day of days) {
        if (day.roomsAvailable > 0) {
          if (!currentGap) {
            currentGap = {
              startDate: day.date,
              endDate: day.date,
              nights: 1,
              roomsAvailable: day.roomsAvailable
            };
          } else {
            currentGap.endDate = day.date;
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
      return { success: true, data: gaps, totalGaps: gaps.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  getBookingUrl(checkIn, checkOut, roomTypeId = null) {
    // Amplitude Coliving uses the 'us2' cluster
    const propertyCode = '67942i';
    let url = `https://us2.cloudbeds.com/en/reservation/${propertyCode}?checkin=${checkIn}&checkout=${checkOut}&currency=usd`;
    if (roomTypeId) {
      url += `&room_type_id=${roomTypeId}`;
    }
    return url;
  }

  async checkConnection() {
    try {
      const hotel = await this.getHotelDetails();
      return {
        connected: true,
        hotelName: hotel.data?.propertyName || hotel.propertyName || 'Unknown'
      };
    } catch (e) {
      return { connected: false, message: e.message };
    }
  }
}

module.exports = new CloudbedsService();
