const { body, query, param } = require('express-validator');
const BlockService = require('../services/blockService');
const { success, created } = require('../utils/response');
const { getClientIP, parsePagination } = require('../utils/helpers');

/**
 * Validation rules
 */
const createBlockValidation = [
  body('resourceId').isUUID().withMessage('Valid resource ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('reason').optional().trim().isLength({ max: 200 })
];

/**
 * Block Controller (Admin only)
 */
class BlockController {
  /**
   * Create resource block
   * POST /api/admin/blocks
   */
  static async create(req, res, next) {
    try {
      const { resourceId, startTime, endTime, reason } = req.body;
      const ipAddress = getClientIP(req);

      const block = await BlockService.createBlock(
        { resourceId, startTime, endTime, reason },
        req.user.id,
        ipAddress
      );

      return created(res, block, 'Block created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete resource block
   * DELETE /api/admin/blocks/:id
   */
  static async delete(req, res, next) {
    try {
      const ipAddress = getClientIP(req);

      const result = await BlockService.deleteBlock(
        req.params.id,
        req.user.id,
        ipAddress
      );

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all blocks
   * GET /api/admin/blocks
   */
  static async getAll(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { resourceId, startDate, endDate } = req.query;

      const result = await BlockService.getAllBlocks({
        page,
        limit,
        resourceId,
        startDate,
        endDate
      });

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get blocks for a resource
   * GET /api/admin/blocks/resource/:resourceId
   */
  static async getByResource(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const blocks = await BlockService.getResourceBlocks(
        req.params.resourceId,
        startDate,
        endDate
      );

      return success(res, blocks);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get calendar blocks (public for display)
   * GET /api/calendar/blocks
   */
  static async getCalendarBlocks(req, res, next) {
    try {
      const { resourceId, startDate, endDate } = req.query;

      const blocks = await BlockService.getCalendarBlocks(
        resourceId,
        startDate,
        endDate
      );

      return success(res, blocks);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  BlockController,
  createBlockValidation
};
