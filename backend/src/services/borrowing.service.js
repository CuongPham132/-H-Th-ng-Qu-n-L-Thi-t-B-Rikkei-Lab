const borrowingRepository = require('../repositories/borrowing.repository');
const equipmentRepository = require('../repositories/equipment.repository');
const { ROLES } = require('../constants/roles');
const { BORROWING_STATUS, MAX_BORROWING_DAYS } = require('../constants/borrowing');
const ERROR_CODES = require('../constants/errorCodes');
const AppError = require('../utils/appError');
const { executeWithTransaction } = require('../utils/transactionRunner');

class BorrowingService {
  /**
   * UC01 – Borrower creates a new borrowing request
   * @param {Object} data - { purpose, borrowing_days, notes, items }
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>} Created borrowing with items
   */
  async createBorrowing(data, user) {
    if (user.role !== ROLES.BORROWER) {
      throw new AppError('Chỉ người mượn (BORROWER) mới có quyền tạo yêu cầu mượn thiết bị.', 403, ERROR_CODES.FORBIDDEN);
    }

    return executeWithTransaction(async (conn) => {
      // 1. Pre-check equipment availability and active status
      const equipmentIds = data.items.map((i) => i.equipment_id);
      
      // Query equipments without locking (pending requests do NOT hold inventory)
      const equipments = await Promise.all(
        equipmentIds.map((id) => equipmentRepository.findById(id, conn))
      );
      const eqMap = new Map(equipments.filter(Boolean).map((e) => [e.id, e]));

      for (const item of data.items) {
        const eq = eqMap.get(item.equipment_id);
        if (!eq) {
          throw new AppError(`Thiết bị có ID ${item.equipment_id} không tồn tại trong hệ thống.`, 404, ERROR_CODES.NOT_FOUND);
        }
        if (Number(eq.is_active) === 0) {
          throw new AppError(`Thiết bị ${eq.code} (${eq.name}) hiện đã ngừng hoạt động.`, 400, ERROR_CODES.VALIDATION_ERROR);
        }
        if (eq.status !== 'AVAILABLE') {
          throw new AppError(`Thiết bị ${eq.code} (${eq.name}) đang ở trạng thái ${eq.status}, không thể mượn.`, 400, ERROR_CODES.VALIDATION_ERROR);
        }
        if (eq.available_quantity < item.quantity) {
          throw new AppError(
            `Thiết bị ${eq.code} (${eq.name}) không đủ số lượng khả dụng tại thời điểm tạo đơn (khả dụng: ${eq.available_quantity}, yêu cầu: ${item.quantity}).`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      // 2. Generate unique borrowing code
      const borrowingCode = await borrowingRepository.generateBorrowingCode(conn);

      // 3. Insert borrowing header (status: PENDING)
      const borrowingId = await borrowingRepository.create(
        {
          borrowing_code: borrowingCode,
          borrower_id: user.id,
          purpose: data.purpose,
          notes: data.notes || null,
        },
        conn
      );

      // 4. Insert items
      await borrowingRepository.createItems(borrowingId, data.items, conn);

      // 5. Fetch newly created borrowing with items
      const createdBorrowing = await borrowingRepository.findById(borrowingId, conn);
      const items = await borrowingRepository.findItemsByBorrowingId(borrowingId, conn);
      return {
        ...createdBorrowing,
        items,
      };
    });
  }

  /**
   * UC02 – List borrowings with role-based filtering
   * @param {Object} filters
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async getBorrowings(filters, user) {
    const result = await borrowingRepository.findAll(filters, user);
    const totalPages = Math.ceil(result.total / result.limit) || 1;

    return {
      borrowings: result.borrowings,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
      },
    };
  }

  /**
   * UC02 – Get single borrowing details with items
   * @param {number} id
   * @param {Object} user
   * @param {Object} [conn] Optional connection
   * @returns {Promise<Object>}
   */
  async getBorrowingById(id, user, conn = null) {
    const borrowing = await borrowingRepository.findById(id, conn);
    if (!borrowing) {
      throw new AppError('Phiếu mượn không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
    }

    // Role check: Borrower can only view their own requests
    if (user && user.role === ROLES.BORROWER && borrowing.borrower_id !== user.id) {
      throw new AppError('Bạn không có quyền xem phiếu mượn của người khác.', 403, ERROR_CODES.FORBIDDEN);
    }

    const items = await borrowingRepository.findItemsByBorrowingId(id, conn);
    return {
      ...borrowing,
      items,
    };
  }

  /**
   * UC03 – Borrower cancels a borrowing request (or Admin cancels)
   * @param {number} id
   * @param {Object} data - { reason }
   * @param {Object} user
   * @returns {Promise<Object>} Updated borrowing
   */
  async cancelBorrowing(id, data = {}, user) {
    return executeWithTransaction(async (conn) => {
      // 1. Lock borrowing record
      const borrowing = await borrowingRepository.findByIdForUpdate(id, conn);
      if (!borrowing) {
        throw new AppError('Phiếu mượn không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      // 2. Ownership check
      if (user.role === ROLES.BORROWER && borrowing.borrower_id !== user.id) {
        throw new AppError('Bạn không có quyền hủy phiếu mượn của người khác.', 403, ERROR_CODES.FORBIDDEN);
      }

      // 3. Status check: Only PENDING or APPROVED can be cancelled
      if (borrowing.status === BORROWING_STATUS.BORROWED) {
        throw new AppError('Thiết bị đã được bàn giao thực tế, không thể hủy đơn. Vui lòng thực hiện hoàn trả thiết bị.', 400, ERROR_CODES.VALIDATION_ERROR);
      }
      if (borrowing.status !== BORROWING_STATUS.PENDING && borrowing.status !== BORROWING_STATUS.APPROVED) {
        throw new AppError(`Không thể hủy phiếu mượn ở trạng thái ${borrowing.status}.`, 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // 4. If APPROVED: must release reserved inventory
      if (borrowing.status === BORROWING_STATUS.APPROVED) {
        const items = await borrowingRepository.findItemsForUpdate(id, null, conn);
        const eqIds = items.map((i) => i.equipment_id);
        
        // Lock equipments ASC to prevent deadlock
        await borrowingRepository.lockEquipmentsAsc(eqIds, conn);

        for (const item of items) {
          await borrowingRepository.adjustEquipmentInventory(item.equipment_id, -item.quantity, 0, conn);
        }
      }

      // 5. Update borrowing status to CANCELLED
      const cancelNote = data.reason ? ` | Người mượn hủy: ${data.reason}` : ' | Người mượn đã hủy yêu cầu';
      const updatedNotes = (borrowing.notes || '') + cancelNote;
      await borrowingRepository.update(
        id,
        {
          status: BORROWING_STATUS.CANCELLED,
          notes: updatedNotes,
        },
        conn
      );

      return this.getBorrowingById(id, user, conn);
    });
  }

  /**
   * UC04 – Staff/Admin approves borrowing request & reserves inventory
   * @param {number} id
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async approveBorrowing(id, user) {
    return executeWithTransaction(async (conn) => {
      // 1. Lock borrowing record
      const borrowing = await borrowingRepository.findByIdForUpdate(id, conn);
      if (!borrowing) {
        throw new AppError('Phiếu mượn không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      // 2. Status check: Only PENDING can be approved
      if (borrowing.status !== BORROWING_STATUS.PENDING) {
        throw new AppError(`Không thể duyệt phiếu mượn ở trạng thái ${borrowing.status}. Chỉ đơn PENDING mới được duyệt.`, 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // 3. Fetch items in this borrowing
      const items = await borrowingRepository.findItemsForUpdate(id, null, conn);
      if (items.length === 0) {
        throw new AppError('Phiếu mượn không có thiết bị nào để duyệt.', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // 4. Lock equipments in ASC order to prevent deadlock
      const eqIds = items.map((i) => i.equipment_id);
      const lockedEquipments = await borrowingRepository.lockEquipmentsAsc(eqIds, conn);
      const eqMap = new Map(lockedEquipments.map((e) => [e.id, e]));

      // 5. Validate equipment status and inventory sufficiency
      for (const item of items) {
        const eq = eqMap.get(item.equipment_id);
        if (!eq) {
          throw new AppError(`Thiết bị ID ${item.equipment_id} không tồn tại trong hệ thống.`, 404, ERROR_CODES.NOT_FOUND);
        }
        if (Number(eq.is_active) === 0) {
          throw new AppError(`Thiết bị ${eq.code} (${eq.name}) hiện đã ngừng hoạt động.`, 400, ERROR_CODES.VALIDATION_ERROR);
        }
        if (eq.status !== 'AVAILABLE') {
          throw new AppError(`Thiết bị ${eq.code} (${eq.name}) đang ở trạng thái ${eq.status}, không thể duyệt.`, 400, ERROR_CODES.VALIDATION_ERROR);
        }
        if (eq.available_quantity < item.quantity) {
          throw new AppError(
            `Thiết bị ${eq.code} (${eq.name}) không đủ số lượng khả dụng để duyệt (khả dụng: ${eq.available_quantity}, cần: ${item.quantity}).`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      // 6. Increase reserved_quantity for all items
      for (const item of items) {
        await borrowingRepository.adjustEquipmentInventory(item.equipment_id, item.quantity, 0, conn);
      }

      // 7. Update borrowing record (APPROVED, pickup_deadline = NOW() + 48h)
      const pickupDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const noteAppend = ` | Duyệt bởi: ${user.full_name} (${user.role})`;
      await borrowingRepository.update(
        id,
        {
          status: BORROWING_STATUS.APPROVED,
          approved_by: user.id,
          approved_at: new Date(),
          pickup_deadline: pickupDeadline,
          notes: (borrowing.notes || '') + noteAppend,
        },
        conn
      );

      return this.getBorrowingById(id, user, conn);
    });
  }

  /**
   * UC05 – Staff/Admin rejects borrowing request
   * @param {number} id
   * @param {Object} data - { rejection_reason }
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async rejectBorrowing(id, data, user) {
    return executeWithTransaction(async (conn) => {
      // 1. Lock borrowing record
      const borrowing = await borrowingRepository.findByIdForUpdate(id, conn);
      if (!borrowing) {
        throw new AppError('Phiếu mượn không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      // 2. Status check: Only PENDING or APPROVED can be rejected
      if (borrowing.status !== BORROWING_STATUS.PENDING && borrowing.status !== BORROWING_STATUS.APPROVED) {
        throw new AppError(`Không thể từ chối phiếu mượn ở trạng thái ${borrowing.status}.`, 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // 3. If APPROVED: release reserved inventory
      if (borrowing.status === BORROWING_STATUS.APPROVED) {
        const items = await borrowingRepository.findItemsForUpdate(id, null, conn);
        const eqIds = items.map((i) => i.equipment_id);
        
        await borrowingRepository.lockEquipmentsAsc(eqIds, conn);

        for (const item of items) {
          await borrowingRepository.adjustEquipmentInventory(item.equipment_id, -item.quantity, 0, conn);
        }
      }

      // 4. Update status to REJECTED with rejection info
      await borrowingRepository.update(
        id,
        {
          status: BORROWING_STATUS.REJECTED,
          rejected_by: user.id,
          rejected_at: new Date(),
          rejection_reason: data.rejection_reason,
        },
        conn
      );

      return this.getBorrowingById(id, user, conn);
    });
  }

  /**
   * UC06 – Staff/Admin hands over equipment (APPROVED -> BORROWED)
   * @param {number} id
   * @param {Object} data - { borrowing_days }
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async handoverBorrowing(id, data = {}, user) {
    return executeWithTransaction(async (conn) => {
      // 1. Lock borrowing record
      const borrowing = await borrowingRepository.findByIdForUpdate(id, conn);
      if (!borrowing) {
        throw new AppError('Phiếu mượn không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      // 2. Status check: Must be APPROVED
      if (borrowing.status !== BORROWING_STATUS.APPROVED) {
        throw new AppError(`Không thể bàn giao thiết bị cho phiếu mượn ở trạng thái ${borrowing.status}. Đơn phải ở trạng thái APPROVED.`, 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // 3. Deadline check
      if (new Date() > new Date(borrowing.pickup_deadline)) {
        throw new AppError('Phiếu mượn đã quá hạn nhận thiết bị (pickup_deadline). Vui lòng xử lý hết hạn đơn.', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // 4. Validate and determine due_date
      let days = Number(data.borrowing_days) || 14;
      if (days > MAX_BORROWING_DAYS) days = MAX_BORROWING_DAYS;

      const items = await borrowingRepository.findItemsForUpdate(id, null, conn);
      const eqIds = items.map((i) => i.equipment_id);

      // Lock equipments ASC
      await borrowingRepository.lockEquipmentsAsc(eqIds, conn);

      // 5. Shift inventory from reserved to borrowed
      for (const item of items) {
        await borrowingRepository.adjustEquipmentInventory(item.equipment_id, -item.quantity, item.quantity, conn);
      }

      // 6. Update borrowing record
      const borrowedAt = new Date();
      const dueDate = new Date(borrowedAt.getTime() + days * 24 * 60 * 60 * 1000);
      const handoverNote = ` | Bàn giao thiết bị bởi: ${user.full_name}`;

      await borrowingRepository.update(
        id,
        {
          status: BORROWING_STATUS.BORROWED,
          borrowed_at: borrowedAt,
          due_date: dueDate,
          notes: (borrowing.notes || '') + handoverNote,
        },
        conn
      );

      return this.getBorrowingById(id, user, conn);
    });
  }

  /**
   * UC07 – Staff/Admin receives returned equipment (Partial or Full)
   * @param {number} id
   * @param {Object} data - { items: [{ equipment_id, return_quantity }] }
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async returnBorrowing(id, data = {}, user) {
    return executeWithTransaction(async (conn) => {
      // 1. Lock borrowing record
      const borrowing = await borrowingRepository.findByIdForUpdate(id, conn);
      if (!borrowing) {
        throw new AppError('Phiếu mượn không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      // 2. Status check: Must be BORROWED
      if (borrowing.status !== BORROWING_STATUS.BORROWED) {
        throw new AppError(`Không thể trả thiết bị cho phiếu mượn ở trạng thái ${borrowing.status}. Đơn phải ở trạng thái BORROWED.`, 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // 3. Fetch current items in this borrowing
      const currentItems = await borrowingRepository.findItemsForUpdate(id, null, conn);
      const itemMap = new Map(currentItems.map((i) => [i.equipment_id, i]));

      let returnList = [];

      if (Array.isArray(data.items) && data.items.length > 0) {
        // Specific/Partial return
        for (const reqItem of data.items) {
          const cur = itemMap.get(reqItem.equipment_id);
          if (!cur) {
            throw new AppError(`Thiết bị ID ${reqItem.equipment_id} không thuộc phiếu mượn này.`, 400, ERROR_CODES.VALIDATION_ERROR);
          }
          const unreturned = cur.quantity - cur.returned_quantity;
          if (reqItem.return_quantity > unreturned) {
            throw new AppError(
              `Số lượng hoàn trả thiết bị (${reqItem.return_quantity}) vượt quá số lượng chưa trả (${unreturned}).`,
              400,
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          returnList.push({
            equipment_id: reqItem.equipment_id,
            return_quantity: reqItem.return_quantity,
          });
        }
      } else {
        // Default: Full return of all unreturned items
        for (const cur of currentItems) {
          const unreturned = cur.quantity - cur.returned_quantity;
          if (unreturned > 0) {
            returnList.push({
              equipment_id: cur.equipment_id,
              return_quantity: unreturned,
            });
          }
        }
      }

      if (returnList.length === 0) {
        throw new AppError('Tất cả thiết bị trong phiếu mượn này đã được hoàn trả trước đó.', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // 4. Lock equipments in ASC order
      const eqIds = returnList.map((i) => i.equipment_id);
      await borrowingRepository.lockEquipmentsAsc(eqIds, conn);

      // 5. Update returned_quantity in borrowing_items and reduce borrowed_quantity in equipments
      for (const item of returnList) {
        await borrowingRepository.incrementItemReturnedQuantity(id, item.equipment_id, item.return_quantity, conn);
        await borrowingRepository.adjustEquipmentInventory(item.equipment_id, 0, -item.return_quantity, conn);
      }

      // 6. Check if all items in the borrowing have been completely returned
      const remainingUnreturned = await borrowingRepository.countRemainingUnreturnedItems(id, conn);

      if (remainingUnreturned === 0) {
        // Full return completed -> update status to RETURNED
        const note = ` | Đã hoàn tất trả đủ thiết bị vào lúc ${new Date().toISOString()}`;
        await borrowingRepository.update(
          id,
          {
            status: BORROWING_STATUS.RETURNED,
            returned_at: new Date(),
            notes: (borrowing.notes || '') + note,
          },
          conn
        );
      } else {
        // Partial return -> keep BORROWED, add note
        const note = ` | Đã hoàn trả một phần thiết bị vào lúc ${new Date().toISOString()}`;
        await borrowingRepository.update(
          id,
          {
            notes: (borrowing.notes || '') + note,
          },
          conn
        );
      }

      return this.getBorrowingById(id, user, conn);
    });
  }

  /**
   * UC08 – System / Admin background worker to expire unclaimed approved borrowings
   * @returns {Promise<{ processedCount: number, expiredIds: Array<number> }>}
   */
  async processExpiredBorrowings() {
    const expiredBorrowings = await borrowingRepository.findExpiredApprovedBorrowings();
    const expiredIds = [];

    for (const b of expiredBorrowings) {
      try {
        await executeWithTransaction(async (conn) => {
          const lockedB = await borrowingRepository.findByIdForUpdate(b.id, conn);
          if (!lockedB || lockedB.status !== BORROWING_STATUS.APPROVED) return;

          // Check deadline again under lock
          if (new Date() <= new Date(lockedB.pickup_deadline)) return;

          // Fetch items and release reserved inventory
          const items = await borrowingRepository.findItemsForUpdate(b.id, null, conn);
          const eqIds = items.map((i) => i.equipment_id);

          await borrowingRepository.lockEquipmentsAsc(eqIds, conn);

          for (const item of items) {
            await borrowingRepository.adjustEquipmentInventory(item.equipment_id, -item.quantity, 0, conn);
          }

          // Update status to EXPIRED
          const note = ` | Tự động hủy do quá hạn nhận lúc ${new Date().toISOString()}`;
          await borrowingRepository.update(
            b.id,
            {
              status: BORROWING_STATUS.EXPIRED,
              notes: (lockedB.notes || '') + note,
            },
            conn
          );

          expiredIds.push(b.id);
        });
      } catch (err) {
        console.error(`[ExpiredBorrowings] Error processing borrowing ID ${b.id}:`, err.message);
      }
    }

    return {
      processedCount: expiredIds.length,
      expiredIds,
    };
  }
}

module.exports = new BorrowingService();
