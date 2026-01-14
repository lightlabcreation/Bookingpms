const express = require('express');
const { BookingController, createBookingValidation } = require('../controllers/bookingController');
const { authenticate, requireUser } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Public route for calendar display
router.get('/calendar', BookingController.getCalendarBookings);

// Protected routes (logged-in users)
router.post('/', authenticate, requireUser, createBookingValidation, validate, BookingController.create);
router.get('/', authenticate, requireUser, BookingController.getUserBookings);
router.get('/:id', authenticate, requireUser, BookingController.getById);
router.put('/:id/cancel', authenticate, requireUser, BookingController.cancel);

module.exports = router;
