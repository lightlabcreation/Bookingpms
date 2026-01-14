const express = require('express');
const {
  UserController,
  updateProfileValidation,
  changePasswordValidation
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.put('/profile', updateProfileValidation, validate, UserController.updateProfile);
router.put('/password', changePasswordValidation, validate, UserController.changePassword);

module.exports = router;
