const express = require('express');
const CloudbedsController = require('../controllers/cloudbedsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Cloudbeds API Routes
 *
 * Base path: /api/cloudbeds
 */

// ==========================================
// Public Endpoints (no auth required)
// ==========================================

// Connection status (useful for debugging)
router.get('/status', CloudbedsController.getStatus);

// Environment check endpoint (for Railway debugging)
router.get('/env-check', CloudbedsController.getEnvCheck);

// Booking URL generator (public - guests need this)
router.get('/booking-url', CloudbedsController.getBookingUrl);

// ==========================================
// OAuth Endpoints
// ==========================================

// Get OAuth authorization URL (admin only in production)
router.get('/auth/url', CloudbedsController.getAuthUrl);

// Handle OAuth callback
router.post('/auth/callback', CloudbedsController.handleCallback);

// Set tokens manually (admin only)
router.post('/auth/tokens', authenticate, requireAdmin, CloudbedsController.setTokens);

// ==========================================
// Data Endpoints (require Cloudbeds auth)
// ==========================================

// Hotel information
router.get('/hotel', CloudbedsController.getHotelDetails);

// Room types and rooms
router.get('/room-types', CloudbedsController.getRoomTypes);
router.get('/rooms', CloudbedsController.getRooms);

// Availability endpoints
router.get('/availability', CloudbedsController.getAvailability);
router.get('/calendar', CloudbedsController.getCalendarAvailability);
router.get('/gaps', CloudbedsController.getAvailableGaps);

// Rates
router.get('/rates', CloudbedsController.getRates);

module.exports = router;
