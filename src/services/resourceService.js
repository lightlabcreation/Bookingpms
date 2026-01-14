const { PrismaClient } = require('@prisma/client');
const { AuditService, AuditActions } = require('./auditService');

const prisma = new PrismaClient();

/**
 * Resource Service
 * Handles resource management operations
 */
class ResourceService {
  /**
   * Create a new resource (admin only)
   */
  static async createResource(data, userId, ipAddress) {
    const resource = await prisma.resource.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        capacity: data.capacity,
        pricePerHour: data.pricePerHour,
        status: data.status || 'AVAILABLE',
        imageUrl: data.imageUrl
      }
    });

    await AuditService.log({
      userId,
      action: AuditActions.RESOURCE_CREATE,
      entity: 'Resource',
      entityId: resource.id,
      ipAddress,
      details: {
        name: resource.name,
        type: resource.type,
        pricePerHour: resource.pricePerHour
      }
    });

    return resource;
  }

  /**
   * Update a resource (admin only)
   */
  static async updateResource(resourceId, data, userId, ipAddress) {
    const existingResource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!existingResource) {
      throw { statusCode: 404, message: 'Resource not found' };
    }

    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        capacity: data.capacity,
        pricePerHour: data.pricePerHour,
        status: data.status,
        imageUrl: data.imageUrl
      }
    });

    await AuditService.log({
      userId,
      action: AuditActions.RESOURCE_UPDATE,
      entity: 'Resource',
      entityId: resourceId,
      ipAddress,
      details: {
        before: existingResource,
        after: resource
      }
    });

    return resource;
  }

  /**
   * Delete a resource (admin only)
   */
  static async deleteResource(resourceId, userId, ipAddress) {
    const existingResource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        _count: {
          select: { bookings: { where: { status: { not: 'CANCELLED' } } } }
        }
      }
    });

    if (!existingResource) {
      throw { statusCode: 404, message: 'Resource not found' };
    }

    if (existingResource._count.bookings > 0) {
      throw { statusCode: 400, message: 'Cannot delete resource with active bookings' };
    }

    await prisma.resource.delete({
      where: { id: resourceId }
    });

    await AuditService.log({
      userId,
      action: AuditActions.RESOURCE_DELETE,
      entity: 'Resource',
      entityId: resourceId,
      ipAddress,
      details: {
        name: existingResource.name,
        type: existingResource.type
      }
    });

    return { message: 'Resource deleted successfully' };
  }

  /**
   * Get all resources with pagination
   */
  static async getAllResources({ page = 1, limit = 10, type, status, search }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.resource.count({ where })
    ]);

    return {
      resources,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get resource by ID
   */
  static async getResourceById(resourceId) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      throw { statusCode: 404, message: 'Resource not found' };
    }

    return resource;
  }

  /**
   * Get resource types
   */
  static async getResourceTypes() {
    const types = await prisma.resource.findMany({
      select: { type: true },
      distinct: ['type']
    });

    return types.map(t => t.type);
  }

  /**
   * Get available resources for a time range
   */
  static async getAvailableResources(startTime, endTime, type = null) {
    // Get all resources matching criteria
    const where = { status: 'AVAILABLE' };
    if (type) where.type = type;

    const resources = await prisma.resource.findMany({ where });

    // Filter out resources with overlapping bookings or blocks
    const availableResources = [];

    for (const resource of resources) {
      // Check bookings
      const hasBookingOverlap = await prisma.booking.findFirst({
        where: {
          resourceId: resource.id,
          status: { not: 'CANCELLED' },
          OR: [
            {
              AND: [
                { startTime: { lte: new Date(startTime) } },
                { endTime: { gt: new Date(startTime) } }
              ]
            },
            {
              AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gte: new Date(endTime) } }
              ]
            },
            {
              AND: [
                { startTime: { gte: new Date(startTime) } },
                { endTime: { lte: new Date(endTime) } }
              ]
            }
          ]
        }
      });

      if (hasBookingOverlap) continue;

      // Check blocks
      const hasBlockOverlap = await prisma.resourceBlock.findFirst({
        where: {
          resourceId: resource.id,
          OR: [
            {
              AND: [
                { startTime: { lte: new Date(startTime) } },
                { endTime: { gt: new Date(startTime) } }
              ]
            },
            {
              AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gte: new Date(endTime) } }
              ]
            },
            {
              AND: [
                { startTime: { gte: new Date(startTime) } },
                { endTime: { lte: new Date(endTime) } }
              ]
            }
          ]
        }
      });

      if (!hasBlockOverlap) {
        availableResources.push(resource);
      }
    }

    return availableResources;
  }
}

module.exports = ResourceService;
