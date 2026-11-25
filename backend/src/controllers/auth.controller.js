const authService = require('../services/auth.service');
const { success } = require('../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      return success(res, user, 'Đăng ký tài khoản thành công.', 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return success(res, result, 'Đăng nhập thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return success(res, user, 'Lấy thông tin tài khoản thành công.', 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
