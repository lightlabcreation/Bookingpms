const { body } = require('express-validator');
const AuthService = require('../services/authService');
const { success, created } = require('../utils/response');
const { getClientIP } = require('../utils/helpers');

/**
 * Validation rules
 */
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName').optional().trim().isLength({ max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

/**
 * Auth Controller
 */
class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const { email, password, firstName, lastName } = req.body;
      const ipAddress = getClientIP(req);

      const result = await AuthService.register(
        { email, password, firstName, lastName },
        ipAddress
      );

      return created(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = getClientIP(req);

      const result = await AuthService.login({ email, password }, ipAddress);

      return success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  static async getProfile(req, res, next) {
    try {
      const user = await AuthService.getProfile(req.user.id);
      return success(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req, res, next) {
    try {
      const ipAddress = getClientIP(req);
      const result = await AuthService.logout(req.user.id, ipAddress);
      return success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  AuthController,
  registerValidation,
  loginValidation
};
