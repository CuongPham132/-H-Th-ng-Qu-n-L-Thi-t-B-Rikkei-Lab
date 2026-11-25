const userService = require('../services/user.service');
const { success, paginate, error } = require('../utils/apiResponse');

class UserController {
  async getUsers(req, res, next) {
    try {
      const result = await userService.getAllUsers(req.query);
      return paginate(res, result.users, result.pagination, 'Lấy danh sách người dùng thành công.');
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID người dùng không hợp lệ.', 400);
      }
      const user = await userService.getUserById(id);
      return success(res, user, 'Lấy thông tin người dùng thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(req.body, req.user.id);
      return success(res, user, 'Tạo tài khoản người dùng thành công.', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID người dùng không hợp lệ.', 400);
      }
      const user = await userService.updateUserStatus(id, req.body.is_active, req.user.id);
      return success(res, user, 'Cập nhật trạng thái người dùng thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID người dùng không hợp lệ.', 400);
      }
      const user = await userService.updateUserRole(id, req.body.role, req.user.id);
      return success(res, user, 'Cập nhật vai trò người dùng thành công.', 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
