/**
 * Standardized API Response Helpers
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {any} data - Response payload
 * @param {string} [message='Success'] - Descriptive message
 * @param {number} [statusCode=200] - HTTP status code
 */
function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} [message='Internal Server Error'] - Error message
 * @param {number} [statusCode=500] - HTTP status code
 * @param {any} [errors=null] - Additional validation or error details
 */
function error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message,
  };
  if (errors !== null) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
}

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items for current page
 * @param {Object} pagination - { page, limit, total, totalPages }
 * @param {string} [message='Success'] - Descriptive message
 */
function paginate(res, data, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: Number(pagination.page),
      limit: Number(pagination.limit),
      total: Number(pagination.total),
      totalPages: Math.ceil(Number(pagination.total) / Number(pagination.limit)) || 1,
    },
  });
}

module.exports = {
  success,
  error,
  paginate,
};
