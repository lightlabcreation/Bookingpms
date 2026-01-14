const express = require('express');
const {
  ResourceController,
  createResourceValidation,
  updateResourceValidation
} = require('../controllers/resourceController');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Public routes (anyone can view resources)
router.get('/types', ResourceController.getTypes);
router.get('/available', ResourceController.getAvailable);
router.get('/', ResourceController.getAll);
router.get('/:id', ResourceController.getById);

// Admin routes
router.post('/', authenticate, requireAdmin, createResourceValidation, validate, ResourceController.create);
router.put('/:id', authenticate, requireAdmin, updateResourceValidation, validate, ResourceController.update);
router.delete('/:id', authenticate, requireAdmin, ResourceController.delete);

module.exports = router;
