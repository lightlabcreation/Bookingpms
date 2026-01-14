const { PrismaClient } = require('@prisma/client');
const { AuditService, AuditActions } = require('./auditService');

const prisma = new PrismaClient();

/**
 * Resource Block Service
 * Handles admin calendar blocking operations
 */
class BlockService {
  /**
   * Create a resource block (admin only)
   */
  static async createBlock({ resourceId, startTime, endTime, reason }, userId, ipAddress) {
    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw { statusCode: 400, message: 'End time must be after start time' };
    }

    // Check if resource exists
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      throw { statusCode: 404, message: 'Resource not found' };
    }

    // Check for existing bookings in this time range
    const existingBooking = await prisma.booking.findFirst({
      where: {
        resourceId,
        status: { not: 'CANCELLED' },
        OR: [
          {
            AND: [
              { startTime: { lte: start } },
              { endTime: { gt: start } }
            ]
          },
          {
            AND: [
              { startTime: { lt: end } },
              { endTime: { gte: end } }
            ]
          },
          {
            AND: [
              { startTime: { gte: start } },
              { endTime: { lte: end } }
            ]
          }
        ]
      }
    });

    if (existingBooking) {
      throw { statusCode: 409, message: 'Cannot block time slot with existing bookings' };
    }

    // Check for overlapping blocks
    const existingBlock = await prisma.resourceBlock.findFirst({
      where: {
        resourceId,
        OR: [
          {
            AND: [
              { startTime: { lte: start } },
              { endTime: { gt: start } }
            ]
          },
          {
            AND: [
              { startTime: { lt: end } },
              { endTime: { gte: end } }
            ]
          },
          {
            AND: [
              { startTime: { gte: start } },
              { endTime: { lte: end } }
            ]
          }
        ]
      }
    });

    if (existingBlock) {
      throw { statusCode: 409, message: 'Block overlaps with existing block' };
    }

    const block = await prisma.resourceBlock.create({
      data: {
        resourceId,
        startTime: start,
        endTime: end,
        reason
      },
      include: {
        resource: {
          select: { id: true, name: true }
        }
      }
    });

    await AuditService.log({
      userId,
      action: AuditActions.BLOCK_CREATE,
      entity: 'ResourceBlock',
      entityId: block.id,
      ipAddress,
      details: {
        resourceId,
        resourceName: resource.name,
        startTime,
        endTime,
        reason
      }
    });

    return block;
  }

  /**
   * Delete a resource block (admin only)
   */
  static async deleteBlock(blockId, userId, ipAddress) {
    const block = await prisma.resourceBlock.findUnique({
      where: { id: blockId },
      include: {
        resource: {
          select: { id: true, name: true }
        }
      }
    });

    if (!block) {
      throw { statusCode: 404, message: 'Block not found' };
    }

    await prisma.resourceBlock.delete({
      where: { id: blockId }
    });

    await AuditService.log({
      userId,
      action: AuditActions.BLOCK_DELETE,
      entity: 'ResourceBlock',
      entityId: blockId,
      ipAddress,
      details: {
        resourceId: block.resourceId,
        resourceName: block.resource.name,
        startTime: block.startTime,
        endTime: block.endTime
      }
    });

    return { message: 'Block deleted successfully' };
  }

  /**
   * Get blocks for a resource
   */
  static async getResourceBlocks(resourceId, startDate, endDate) {
    const where = { resourceId };

    if (startDate || endDate) {
      where.OR = [
        {
          AND: [
            { startTime: { gte: new Date(startDate) } },
            { startTime: { lte: new Date(endDate) } }
          ]
        },
        {
          AND: [
            { endTime: { gte: new Date(startDate) } },
            { endTime: { lte: new Date(endDate) } }
          ]
        }
      ];
    }

    return prisma.resourceBlock.findMany({
      where,
      include: {
        resource: {
          select: { id: true, name: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  /**
   * Get all blocks with pagination
   */
  static async getAllBlocks({ page = 1, limit = 20, resourceId, startDate, endDate }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (resourceId) where.resourceId = resourceId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const [blocks, total] = await Promise.all([
      prisma.resourceBlock.findMany({
        where,
        include: {
          resource: {
            select: { id: true, name: true, type: true }
          }
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit
      }),
      prisma.resourceBlock.count({ where })
    ]);

    return {
      blocks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get calendar blocks (for display)
   */
  static async getCalendarBlocks(resourceId, startDate, endDate) {
    const where = {};

    if (resourceId) {
      where.resourceId = resourceId;
    }

    if (startDate || endDate) {
      where.OR = [
        {
          AND: [
            { startTime: { gte: new Date(startDate) } },
            { startTime: { lte: new Date(endDate) } }
          ]
        },
        {
          AND: [
            { endTime: { gte: new Date(startDate) } },
            { endTime: { lte: new Date(endDate) } }
          ]
        }
      ];
    }

    return prisma.resourceBlock.findMany({
      where,
      include: {
        resource: {
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });
  }
}

module.exports = BlockService;
