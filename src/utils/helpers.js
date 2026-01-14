const { v4: uuidv4 } = require('uuid');

/**
 * Generate UUID
 */
const generateUUID = () => uuidv4();

/**
 * Calculate price based on duration and hourly rate
 */
const calculateBookingPrice = (startTime, endTime, pricePerHour) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationHours = (end - start) / (1000 * 60 * 60);
  return parseFloat((durationHours * parseFloat(pricePerHour)).toFixed(2));
};

/**
 * Check if two time ranges overlap
 */
const timeRangesOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();

  return s1 < e2 && s2 < e1;
};

/**
 * Validate time range
 */
const isValidTimeRange = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return start < end && start >= new Date();
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Get client IP address from request
 */
const getClientIP = (req) => {
  return req.ip ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.connection?.remoteAddress ||
         'unknown';
};

/**
 * Parse pagination parameters
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build pagination response
 */
const buildPaginationResponse = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

/**
 * Sanitize user object (remove sensitive fields)
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...sanitized } = user;
  return sanitized;
};

module.exports = {
  generateUUID,
  calculateBookingPrice,
  timeRangesOverlap,
  isValidTimeRange,
  formatDate,
  getClientIP,
  parsePagination,
  buildPaginationResponse,
  sanitizeUser
};
