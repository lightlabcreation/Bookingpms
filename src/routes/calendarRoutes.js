const express = require('express');
const { BookingController } = require('../controllers/bookingController');
const { BlockController } = require('../controllers/blockController');

const router = express.Router();

// Public calendar routes
router.get('/bookings', BookingController.getCalendarBookings);
router.get('/blocks', BlockController.getCalendarBlocks);

module.exports = router;
