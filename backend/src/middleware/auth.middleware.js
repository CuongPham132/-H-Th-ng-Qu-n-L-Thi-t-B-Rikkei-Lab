const { verifyToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const { error } = require('../utils/apiResponse');

/**
 * Authentication Middleware
 * Validates JWT from Authorization header and verifies user existence and active status in DB
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Yêu cầu xác thực. Vui lòng cung cấp token hợp lệ.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return error(res, 'Yêu cầu xác thực. Vui lòng cung cấp token hợp lệ.', 401);
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return error(res, 'Token đã hết hạn. Vui lòng đăng nhập lại.', 401);
      }
      return error(res, 'Token không hợp lệ.', 401);
    }

    // Fetch user from DB to guarantee real-time status (account deactivation, role change)
    const user = await userRepository.findById(decoded.id, null, false);
    if (!user) {
      return error(res, 'Người dùng không tồn tại hoặc đã bị xóa.', 401);
    }

    if (Number(user.is_active) === 0) {
      return error(res, 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.', 403);
    }

    // Attach verified user to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
