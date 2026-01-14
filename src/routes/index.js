const express = require('express');
const authRoutes = require('./authRoutes');
const resourceRoutes = require('./resourceRoutes');
const bookingRoutes = require('./bookingRoutes');
const notificationRoutes = require('./notificationRoutes');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');
const calendarRoutes = require('./calendarRoutes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'BookingPMS API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/resources', resourceRoutes);
router.use('/bookings', bookingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/calendar', calendarRoutes);

module.exports = router;
