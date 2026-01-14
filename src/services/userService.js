const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { AuditService, AuditActions } = require('./auditService');
const { sanitizeUser } = require('../utils/helpers');

const prisma = new PrismaClient();

/**
 * User Service
 * Handles user management operations
 */
class UserService {
  /**
   * Get all users with pagination (admin only)
   */
  static async getAllUsers({ page = 1, limit = 10, role, isActive, search }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (role) where.role = role;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
            select: { bookings: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get user by ID (admin only)
   */
  static async getUserById(userId) {
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
            notifications: true
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
   * Update user (admin only)
   */
  static async updateUser(userId, data, adminId, ipAddress) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const updateData = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await AuditService.log({
      userId: adminId,
      action: AuditActions.USER_UPDATE,
      entity: 'User',
      entityId: userId,
      ipAddress,
      details: {
        targetEmail: user.email,
        changes: updateData
      }
    });

    return user;
  }

  /**
   * Deactivate user (admin only)
   */
  static async deactivateUser(userId, adminId, ipAddress) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw { statusCode: 404, message: 'User not found' };
    }

    if (existingUser.id === adminId) {
      throw { statusCode: 400, message: 'Cannot deactivate your own account' };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    await AuditService.log({
      userId: adminId,
      action: AuditActions.USER_DEACTIVATE,
      entity: 'User',
      entityId: userId,
      ipAddress,
      details: { targetEmail: user.email }
    });

    return sanitizeUser(user);
  }

  /**
   * Activate user (admin only)
   */
  static async activateUser(userId, adminId, ipAddress) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });

    await AuditService.log({
      userId: adminId,
      action: AuditActions.USER_ACTIVATE,
      entity: 'User',
      entityId: userId,
      ipAddress,
      details: { targetEmail: user.email }
    });

    return sanitizeUser(user);
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(userId, adminId, ipAddress) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw { statusCode: 404, message: 'User not found' };
    }

    if (existingUser.id === adminId) {
      throw { statusCode: 400, message: 'Cannot delete your own account' };
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    await AuditService.log({
      userId: adminId,
      action: AuditActions.USER_DELETE,
      entity: 'User',
      entityId: userId,
      ipAddress,
      details: { targetEmail: existingUser.email }
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Update profile (for logged-in user)
   */
  static async updateProfile(userId, data, ipAddress) {
    const updateData = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return sanitizeUser(user);
  }

  /**
   * Change password
   */
  static async changePassword(userId, currentPassword, newPassword, ipAddress) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw { statusCode: 400, message: 'Current password is incorrect' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    await AuditService.log({
      userId,
      action: AuditActions.PASSWORD_CHANGE,
      entity: 'User',
      entityId: userId,
      ipAddress,
      details: { email: user.email }
    });

    return { message: 'Password changed successfully' };
  }
}

module.exports = UserService;
