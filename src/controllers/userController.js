const { body, param, query } = require('express-validator');
const UserService = require('../services/userService');
const { success } = require('../utils/response');
const { getClientIP, parsePagination } = require('../utils/helpers');

/**
 * Validation rules
 */
const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 }),
  body('avatarUrl').optional().trim()
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
];

const updateUserValidation = [
  body('firstName').optional().trim().isLength({ max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 }),
  body('role').optional().isIn(['ADMIN', 'USER']),
  body('isActive').optional().isBoolean(),
  body('avatarUrl').optional().trim()
];

/**
 * User Controller
 */
class UserController {
  /**
   * Update own profile
   * PUT /api/users/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const ipAddress = getClientIP(req);
      const user = await UserService.updateProfile(req.user.id, req.body, ipAddress);
      return success(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * PUT /api/users/password
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const ipAddress = getClientIP(req);

      const result = await UserService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
        ipAddress
      );

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // =====================
  // Admin User Management
  // =====================

  /**
   * Get all users (admin only)
   * GET /api/admin/users
   */
  static async getAllUsers(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { role, isActive, search } = req.query;

      const result = await UserService.getAllUsers({
        page,
        limit,
        role,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search
      });

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID (admin only)
   * GET /api/admin/users/:id
   */
  static async getUserById(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.id);
      return success(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user (admin only)
   * PUT /api/admin/users/:id
   */
  static async updateUser(req, res, next) {
    try {
      const ipAddress = getClientIP(req);

      const user = await UserService.updateUser(
        req.params.id,
        req.body,
        req.user.id,
        ipAddress
      );

      return success(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate user (admin only)
   * PUT /api/admin/users/:id/deactivate
   */
  static async deactivateUser(req, res, next) {
    try {
      const ipAddress = getClientIP(req);

      const user = await UserService.deactivateUser(
        req.params.id,
        req.user.id,
        ipAddress
      );

      return success(res, user, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate user (admin only)
   * PUT /api/admin/users/:id/activate
   */
  static async activateUser(req, res, next) {
    try {
      const ipAddress = getClientIP(req);

      const user = await UserService.activateUser(
        req.params.id,
        req.user.id,
        ipAddress
      );

      return success(res, user, 'User activated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (admin only)
   * DELETE /api/admin/users/:id
   */
  static async deleteUser(req, res, next) {
    try {
      const ipAddress = getClientIP(req);

      const result = await UserService.deleteUser(
        req.params.id,
        req.user.id,
        ipAddress
      );

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  UserController,
  updateProfileValidation,
  changePasswordValidation,
  updateUserValidation
};
