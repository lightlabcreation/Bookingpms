const express = require('express');
const CloudbedsController = require('../controllers/cloudbedsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Cloudbeds API Routes — Base path: /api/cloudbeds
 * availability-grid: pehle /hotel se propertyID, phir api.cloudbeds.com getAvailability
 */

// --- availability-grid SABSE PEHLE (jo tumne di ye API)
// GET /api/cloudbeds/availability-grid?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/availability-grid', CloudbedsController.getAvailabilityGrid);

// ==========================================
// Public Endpoints
// ==========================================
router.get('/status', CloudbedsController.getStatus);
router.get('/env-check', CloudbedsController.getEnvCheck);
router.get('/booking-url', CloudbedsController.getBookingUrl);

// ==========================================
// OAuth Endpoints
// ==========================================
router.get('/auth/url', CloudbedsController.getAuthUrl);
router.post('/auth/callback', CloudbedsController.handleCallback);
router.post('/auth/tokens', authenticate, requireAdmin, CloudbedsController.setTokens);

// ==========================================
// Data Endpoints
// ==========================================
// Hotel — isse propertyID milta hai (data.propertyID), pehle yahi hit
router.get('/hotel', CloudbedsController.getHotelDetails);

router.get('/availability', CloudbedsController.getAvailability);

// Room types and rooms
router.get('/room-types', CloudbedsController.getRoomTypes);
router.get('/rooms', CloudbedsController.getRooms);

// Other availability
router.get('/calendar', CloudbedsController.getCalendarAvailability);
router.get('/gaps', CloudbedsController.getAvailableGaps);

// Rates
router.get('/rates', CloudbedsController.getRates);

console.log('[Cloudbeds] /api/cloudbeds/availability-grid registered (pehle /hotel, phir api.cloudbeds.com/getAvailability)');

module.exports = router;
