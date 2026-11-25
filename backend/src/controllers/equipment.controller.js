const equipmentService = require('../services/equipment.service');
const { success, paginate, error } = require('../utils/apiResponse');

class EquipmentController {
  async getEquipments(req, res, next) {
    try {
      const result = await equipmentService.getEquipments(req.query, req.user.role);
      return paginate(res, result.equipments, result.pagination, 'Lấy danh sách thiết bị thành công.');
    } catch (err) {
      next(err);
    }
  }

  async getEquipmentById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID thiết bị không hợp lệ.', 400);
      }
      const equipment = await equipmentService.getEquipmentById(id, req.user.role);
      return success(res, equipment, 'Lấy thông tin thiết bị thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async createEquipment(req, res, next) {
    try {
      const created = await equipmentService.createEquipment(req.body);
      return success(res, created, 'Thêm thiết bị mới thành công.', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateEquipment(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID thiết bị không hợp lệ.', 400);
      }
      const updated = await equipmentService.updateEquipment(id, req.body);
      return success(res, updated, 'Cập nhật thông tin thiết bị thành công.', 200);
    } catch (err) {
      next(err);
    }
  }

  async updateEquipmentStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return error(res, 'ID thiết bị không hợp lệ.', 400);
      }
      const updated = await equipmentService.updateEquipmentStatus(id, req.body);
      return success(res, updated, 'Cập nhật trạng thái thiết bị thành công.', 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EquipmentController();
