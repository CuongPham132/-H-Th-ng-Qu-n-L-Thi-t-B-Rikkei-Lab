const borrowingService = require('../services/borrowing.service');
const { success, paginate, error } = require('../utils/apiResponse');

class BorrowingController {
  async createBorrowing(req, res, next) {
    try {
      const result = await borrowingService.createBorrowing(req.body, req.user);
      return success(res, result, 'Tạo yêu cầu mượn thiết bị thành công.', 201);
    } catch (err) {
      next(err);
    }
  }

  async getBorrowings(req, res, next) {
    try {
      const result = await borrowingService.getBorrowings(req.query, req.user);
      return paginate(res, result.borrowings, result.pagination, 'Lấy danh sách phiếu mượn thành công.');
    } catch (err) {
      next(err);
    }
  }

  async getBorrowingById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID phiếu mượn không hợp lệ.', 400);
      }
      const result = await borrowingService.getBorrowingById(id, req.user);
      return success(res, result, 'Lấy chi tiết phiếu mượn thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async cancelBorrowing(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID phiếu mượn không hợp lệ.', 400);
      }
      const result = await borrowingService.cancelBorrowing(id, req.body, req.user);
      return success(res, result, 'Hủy yêu cầu mượn thiết bị thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async approveBorrowing(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID phiếu mượn không hợp lệ.', 400);
      }
      const result = await borrowingService.approveBorrowing(id, req.user);
      return success(res, result, 'Duyệt yêu cầu mượn thiết bị thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async rejectBorrowing(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID phiếu mượn không hợp lệ.', 400);
      }
      const result = await borrowingService.rejectBorrowing(id, req.body, req.user);
      return success(res, result, 'Từ chối yêu cầu mượn thiết bị thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async handoverBorrowing(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID phiếu mượn không hợp lệ.', 400);
      }
      const result = await borrowingService.handoverBorrowing(id, req.body, req.user);
      return success(res, result, 'Bàn giao thiết bị thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async returnBorrowing(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID phiếu mượn không hợp lệ.', 400);
      }
      const result = await borrowingService.returnBorrowing(id, req.body, req.user);
      return success(res, result, 'Tiếp nhận hoàn trả thiết bị thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async processExpired(req, res, next) {
    try {
      const result = await borrowingService.processExpiredBorrowings();
      return success(res, result, 'Xử lý hết hạn phiếu mượn quá hạn thành công.', 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BorrowingController();
