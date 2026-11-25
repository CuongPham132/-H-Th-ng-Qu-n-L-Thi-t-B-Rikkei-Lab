const { error } = require('../utils/apiResponse');

/**
 * Role-Based Access Control (RBAC) Middleware generator
 * @param  {...string} allowedRoles - List of roles permitted to access route
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Yêu cầu xác thực.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(res, 'Bạn không có quyền thực hiện thao tác này (Forbidden).', 403);
    }

    next();
  };
}

module.exports = {
  requireRoles,
};
