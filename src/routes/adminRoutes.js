const express = require('express');
const { AdminController } = require('../controllers/adminController');
const { UserController, updateUserValidation } = require('../controllers/userController');
const { BookingController } = require('../controllers/bookingController');
const { BlockController, createBlockValidation } = require('../controllers/blockController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// =====================
// Dashboard & Analytics
// =====================
router.get('/dashboard', AdminController.getDashboard);
router.get('/analytics/bookings/monthly', AdminController.getMonthlyBookings);
router.get('/analytics/bookings/by-type', AdminController.getBookingsByType);
router.get('/analytics/resources/top', AdminController.getTopResources);
router.get('/analytics/revenue/by-type', AdminController.getRevenueByType);
router.get('/analytics/recent-activity', AdminController.getRecentActivity);

// =====================
// User Management
// =====================
router.get('/users', UserController.getAllUsers);
router.get('/users/:id', UserController.getUserById);
router.put('/users/:id', updateUserValidation, validate, UserController.updateUser);
router.put('/users/:id/deactivate', UserController.deactivateUser);
router.put('/users/:id/activate', UserController.activateUser);
router.delete('/users/:id', UserController.deleteUser);

// =====================
// Booking Management
// =====================
router.get('/bookings', BookingController.getAllBookings);

// =====================
// Resource Blocks
// =====================
router.get('/blocks', BlockController.getAll);
router.get('/blocks/resource/:resourceId', BlockController.getByResource);
router.post('/blocks', createBlockValidation, validate, BlockController.create);
router.delete('/blocks/:id', BlockController.delete);

// =====================
// Audit Logs
// =====================
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/audit-logs/recent', AdminController.getRecentAuditLogs);
router.get('/audit-logs/entity/:entity/:entityId', AdminController.getEntityAuditLogs);

module.exports = router;
