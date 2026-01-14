const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const { sanitizeUser } = require('../utils/helpers');
const { AuditService, AuditActions } = require('./auditService');
const NotificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Auth Service
 * Handles authentication operations
 */
class AuthService {
  /**
   * Register a new user
   */
  static async register({ email, password, firstName, lastName }, ipAddress) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw { statusCode: 409, message: 'User with this email already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'USER',
        isActive: true
      }
    });

    // Generate token
    const token = generateToken(user);

    // Create welcome notification
    await NotificationService.notifyWelcome(user.id, firstName);

    // Audit log
    await AuditService.log({
      userId: user.id,
      action: AuditActions.REGISTER,
      entity: 'User',
      entityId: user.id,
      ipAddress,
      details: { email }
    });

    return {
      user: sanitizeUser(user),
      token
    };
  }

  /**
   * Login user
   */
  static async login({ email, password }, ipAddress) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    // Check if active
    if (!user.isActive) {
      throw { statusCode: 403, message: 'Account is deactivated' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    // Generate token
    const token = generateToken(user);

    // Audit log
    await AuditService.log({
      userId: user.id,
      action: AuditActions.LOGIN,
      entity: 'User',
      entityId: user.id,
      ipAddress,
      details: { email }
    });

    return {
      user: sanitizeUser(user),
      token
    };
  }

  /**
   * Get current user profile
   */
  static async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
            notifications: { where: { isRead: false } }
          }
        }
      }
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    return user;
  }

  /**
   * Logout (audit only - token invalidation handled client-side)
   */
  static async logout(userId, ipAddress) {
    await AuditService.log({
      userId,
      action: AuditActions.LOGOUT,
      entity: 'User',
      entityId: userId,
      ipAddress
    });

    return { message: 'Logged out successfully' };
  }
}

module.exports = AuthService;
