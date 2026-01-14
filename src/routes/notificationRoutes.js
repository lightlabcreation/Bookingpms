const express = require('express');
const { NotificationController } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', NotificationController.getAll);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/read-all', NotificationController.markAllAsRead);
router.put('/:id/read', NotificationController.markAsRead);
router.delete('/read', NotificationController.deleteRead);
router.delete('/:id', NotificationController.delete);

module.exports = router;
