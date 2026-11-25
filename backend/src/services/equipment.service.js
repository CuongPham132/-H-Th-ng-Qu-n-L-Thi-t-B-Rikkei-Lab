const equipmentRepository = require('../repositories/equipment.repository');
const { ROLES } = require('../constants/roles');
const { EQUIPMENT_STATUS } = require('../constants/equipment');
const ERROR_CODES = require('../constants/errorCodes');
const AppError = require('../utils/appError');
const { executeWithTransaction } = require('../utils/transactionRunner');

class EquipmentService {
  /**
   * Retrieves paginated list of equipments with role-based filtering
   * @param {Object} filters
   * @param {string} userRole
   * @returns {Promise<Object>}
   */
  async getEquipments(filters, userRole) {
    const result = await equipmentRepository.findAll(filters, userRole);
    const totalPages = Math.ceil(result.total / result.limit) || 1;

    return {
      equipments: result.equipments,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves single equipment details by ID with role-based visibility check
   * @param {number} id
   * @param {string} userRole
   * @returns {Promise<Object>}
   */
  async getEquipmentById(id, userRole) {
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) {
      throw new AppError('Thiết bị không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
    }

    // Role-based visibility rule:
    // Borrower can only view active devices that are AVAILABLE
    if (userRole === ROLES.BORROWER) {
      if (Number(equipment.is_active) === 0 || equipment.status !== EQUIPMENT_STATUS.AVAILABLE) {
        throw new AppError('Thiết bị không tồn tại hoặc hiện không khả dụng để mượn.', 404, ERROR_CODES.NOT_FOUND);
      }
    }

    return equipment;
  }

  /**
   * Adds a new equipment record (ADMIN and STAFF only)
   * @param {Object} data - { code, name, category, description, total_quantity }
   * @returns {Promise<Object>} Created equipment
   */
  async createEquipment(data) {
    const existing = await equipmentRepository.findByCode(data.code);
    if (existing) {
      throw new AppError('Mã thiết bị (code) đã tồn tại trong hệ thống.', 409, ERROR_CODES.CONFLICT);
    }

    const created = await equipmentRepository.create(data);
    return created;
  }

  /**
   * Updates equipment info with transaction & row-level locking (ADMIN and STAFF only)
   * Ensures total_quantity >= reserved_quantity + borrowed_quantity invariant
   * @param {number} id
   * @param {Object} updateData - { name, category, description, total_quantity }
   * @returns {Promise<Object>} Updated equipment
   */
  async updateEquipment(id, updateData) {
    return executeWithTransaction(async (conn) => {
      // 1. Lock the equipment record with SELECT ... FOR UPDATE
      const equipment = await equipmentRepository.findByIdForUpdate(id, conn);
      if (!equipment) {
        throw new AppError('Thiết bị không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      // 2. Invariant verification: total_quantity >= reserved + borrowed
      if (updateData.total_quantity !== undefined) {
        const committedQty = Number(equipment.reserved_quantity) + Number(equipment.borrowed_quantity);
        if (updateData.total_quantity < committedQty) {
          throw new AppError(
            `Không thể cập nhật tổng số lượng (${updateData.total_quantity}) thấp hơn số lượng đang giữ chỗ và đang mượn (${committedQty}).`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      // 3. Perform update within transaction
      await equipmentRepository.update(id, updateData, conn);

      // 4. Return updated equipment state
      return equipmentRepository.findById(id, conn);
    });
  }

  /**
   * Updates equipment status and active flag with transaction & row-level locking
   * @param {number} id
   * @param {Object} statusData - { status, is_active }
   * @returns {Promise<Object>} Updated equipment
   */
  async updateEquipmentStatus(id, statusData) {
    return executeWithTransaction(async (conn) => {
      // Lock row
      const equipment = await equipmentRepository.findByIdForUpdate(id, conn);
      if (!equipment) {
        throw new AppError('Thiết bị không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      await equipmentRepository.updateStatus(id, statusData.status, statusData.is_active, conn);
      return equipmentRepository.findById(id, conn);
    });
  }
}

module.exports = new EquipmentService();
