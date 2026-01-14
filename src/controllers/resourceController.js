const { body, query, param } = require('express-validator');
const ResourceService = require('../services/resourceService');
const { success, created } = require('../utils/response');
const { getClientIP, parsePagination, buildPaginationResponse } = require('../utils/helpers');

/**
 * Validation rules
 */
const createResourceValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('description').optional().trim(),
  body('type').trim().notEmpty().withMessage('Type is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('pricePerHour').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
  body('status').optional().isIn(['AVAILABLE', 'BOOKED', 'MAINTENANCE']),
  body('imageUrl').optional().trim().isURL().withMessage('Valid URL required')
];

const updateResourceValidation = [
  body('name').optional().trim().isLength({ max: 100 }),
  body('description').optional().trim(),
  body('type').optional().trim(),
  body('capacity').optional().isInt({ min: 1 }),
  body('pricePerHour').optional().isDecimal({ decimal_digits: '0,2' }),
  body('status').optional().isIn(['AVAILABLE', 'BOOKED', 'MAINTENANCE']),
  body('imageUrl').optional().trim()
];

/**
 * Resource Controller
 */
class ResourceController {
  /**
   * Get all resources
   * GET /api/resources
   */
  static async getAll(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { type, status, search } = req.query;

      const result = await ResourceService.getAllResources({
        page,
        limit,
        type,
        status,
        search
      });

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get resource by ID
   * GET /api/resources/:id
   */
  static async getById(req, res, next) {
    try {
      const resource = await ResourceService.getResourceById(req.params.id);
      return success(res, resource);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get resource types
   * GET /api/resources/types
   */
  static async getTypes(req, res, next) {
    try {
      const types = await ResourceService.getResourceTypes();
      return success(res, types);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available resources for time range
   * GET /api/resources/available
   */
  static async getAvailable(req, res, next) {
    try {
      const { startTime, endTime, type } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'startTime and endTime are required'
        });
      }

      const resources = await ResourceService.getAvailableResources(startTime, endTime, type);
      return success(res, resources);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create resource (admin only)
   * POST /api/resources
   */
  static async create(req, res, next) {
    try {
      const ipAddress = getClientIP(req);
      const resource = await ResourceService.createResource(
        req.body,
        req.user.id,
        ipAddress
      );
      return created(res, resource, 'Resource created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update resource (admin only)
   * PUT /api/resources/:id
   */
  static async update(req, res, next) {
    try {
      const ipAddress = getClientIP(req);
      const resource = await ResourceService.updateResource(
        req.params.id,
        req.body,
        req.user.id,
        ipAddress
      );
      return success(res, resource, 'Resource updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete resource (admin only)
   * DELETE /api/resources/:id
   */
  static async delete(req, res, next) {
    try {
      const ipAddress = getClientIP(req);
      const result = await ResourceService.deleteResource(
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
  ResourceController,
  createResourceValidation,
  updateResourceValidation
};
