const AnalyticsService = require('../services/analyticsService');
const { AuditService } = require('../services/auditService');
const { success } = require('../utils/response');
const { parsePagination } = require('../utils/helpers');

/**
 * Admin Controller
 */
class AdminController {
  // =====================
  // Dashboard & Analytics
  // =====================

  /**
   * Get dashboard statistics
   * GET /api/admin/dashboard
   */
  static async getDashboard(req, res, next) {
    try {
      const stats = await AnalyticsService.getDashboardStats();
      return success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get monthly booking statistics
   * GET /api/admin/analytics/bookings/monthly
   */
  static async getMonthlyBookings(req, res, next) {
    try {
      const months = parseInt(req.query.months) || 12;
      const stats = await AnalyticsService.getMonthlyBookingStats(months);
      return success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bookings by resource type
   * GET /api/admin/analytics/bookings/by-type
   */
  static async getBookingsByType(req, res, next) {
    try {
      const stats = await AnalyticsService.getBookingsByResourceType();
      return success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top resources
   * GET /api/admin/analytics/resources/top
   */
  static async getTopResources(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const resources = await AnalyticsService.getTopResources(limit);
      return success(res, resources);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get revenue by resource type
   * GET /api/admin/analytics/revenue/by-type
   */
  static async getRevenueByType(req, res, next) {
    try {
      const stats = await AnalyticsService.getRevenueByResourceType();
      return success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent activity
   * GET /api/admin/analytics/recent-activity
   */
  static async getRecentActivity(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const activity = await AnalyticsService.getRecentActivity(limit);
      return success(res, activity);
    } catch (error) {
      next(error);
    }
  }

  // =====================
  // Audit Logs
  // =====================

  /**
   * Get audit logs
   * GET /api/admin/audit-logs
   */
  static async getAuditLogs(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { entity, action, userId, startDate, endDate } = req.query;

      const result = await AuditService.getLogs({
        page,
        limit,
        entity,
        action,
        userId,
        startDate,
        endDate
      });

      return success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent audit logs
   * GET /api/admin/audit-logs/recent
   */
  static async getRecentAuditLogs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const logs = await AuditService.getRecentLogs(limit);
      return success(res, logs);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit logs for entity
   * GET /api/admin/audit-logs/entity/:entity/:entityId
   */
  static async getEntityAuditLogs(req, res, next) {
    try {
      const { entity, entityId } = req.params;
      const logs = await AuditService.getEntityLogs(entity, entityId);
      return success(res, logs);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { AdminController };
