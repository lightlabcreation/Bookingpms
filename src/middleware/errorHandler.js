const { error } = require('../utils/response');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Prisma errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        return error(res, 'A record with this value already exists', 409);
      case 'P2025':
        return error(res, 'Record not found', 404);
      case 'P2003':
        return error(res, 'Foreign key constraint failed', 400);
      default:
        break;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token expired', 401);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return error(res, err.message, 400);
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return error(res, message, statusCode);
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
  return error(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
