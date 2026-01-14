const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Audit Log Service
 * Records all critical actions for security and analytics
 */
class AuditService {
  /**
   * Create an audit log entry
   */
  static async log({ userId, action, entity, entityId, ipAddress, details }) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          ipAddress,
          details
        }
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Get audit logs with pagination and filters
   */
  static async getLogs({ page = 1, limit = 20, entity, action, userId, startDate, endDate }) {
    const skip = (page - 1) * limit;

    const where = {};
    if (entity) where.entity = entity;
    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get recent audit logs
   */
  static async getRecentLogs(limit = 10) {
    return prisma.auditLog.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityLogs(entity, entityId) {
    return prisma.auditLog.findMany({
      where: { entity, entityId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// Audit action types
const AuditActions = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',

  // User
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  USER_ACTIVATE: 'USER_ACTIVATE',

  // Resource
  RESOURCE_CREATE: 'RESOURCE_CREATE',
  RESOURCE_UPDATE: 'RESOURCE_UPDATE',
  RESOURCE_DELETE: 'RESOURCE_DELETE',

  // Booking
  BOOKING_CREATE: 'BOOKING_CREATE',
  BOOKING_UPDATE: 'BOOKING_UPDATE',
  BOOKING_CANCEL: 'BOOKING_CANCEL',
  BOOKING_CONFIRM: 'BOOKING_CONFIRM',

  // Block
  BLOCK_CREATE: 'BLOCK_CREATE',
  BLOCK_DELETE: 'BLOCK_DELETE',

  // Settings
  SETTINGS_UPDATE: 'SETTINGS_UPDATE'
};

module.exports = {
  AuditService,
  AuditActions
};
