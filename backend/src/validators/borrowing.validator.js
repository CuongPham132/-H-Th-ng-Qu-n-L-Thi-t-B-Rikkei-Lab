const { ALL_BORROWING_STATUSES, MAX_BORROWING_DAYS } = require('../constants/borrowing');

/**
 * Validates request body for creating a new borrowing request (UC01)
 */
function validateCreateBorrowing(data = {}) {
  const errors = [];
  const sanitized = {
    purpose: '',
    borrowing_days: 7, // default
    notes: null,
    items: [],
  };

  // 1. Purpose
  if (!data || typeof data.purpose !== 'string' || !data.purpose.trim()) {
    errors.push('Mục đích mượn thiết bị (purpose) là trường bắt buộc.');
  } else {
    const purpose = data.purpose.trim();
    if (purpose.length < 5 || purpose.length > 255) {
      errors.push('Mục đích mượn thiết bị phải có độ dài từ 5 đến 255 ký tự.');
    } else {
      sanitized.purpose = purpose;
    }
  }

  // 2. Borrowing days (optional, 1 to 14)
  if (data && data.borrowing_days !== undefined && data.borrowing_days !== null && data.borrowing_days !== '') {
    const days = Number(data.borrowing_days);
    if (!Number.isInteger(days) || days < 1 || days > MAX_BORROWING_DAYS) {
      errors.push(`Số ngày mượn (borrowing_days) phải là số nguyên từ 1 đến ${MAX_BORROWING_DAYS} ngày.`);
    } else {
      sanitized.borrowing_days = days;
    }
  }

  // 3. Notes (optional)
  if (data && data.notes !== undefined && data.notes !== null) {
    sanitized.notes = String(data.notes).trim();
  }

  // 4. Items array
  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Danh sách thiết bị mượn (items) là bắt buộc và phải có ít nhất 1 thiết bị.');
  } else {
    const seenEquipmentIds = new Set();
    const sanitizedItems = [];

    data.items.forEach((item, index) => {
      const itemNum = index + 1;
      if (!item || typeof item !== 'object') {
        errors.push(`Mục thiết bị #${itemNum} không đúng định dạng.`);
        return;
      }

      const eqId = Number(item.equipment_id);
      if (!Number.isInteger(eqId) || eqId <= 0) {
        errors.push(`Mục thiết bị #${itemNum}: equipment_id phải là số nguyên dương.`);
      }

      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        errors.push(`Mục thiết bị #${itemNum}: số lượng mượn (quantity) phải là số nguyên dương (> 0).`);
      }

      if (eqId > 0) {
        if (seenEquipmentIds.has(eqId)) {
          errors.push(`Không được gửi trùng lặp thiết bị (ID: ${eqId}) trong cùng một yêu cầu mượn.`);
        } else {
          seenEquipmentIds.add(eqId);
        }
      }

      const itemNotes = item.item_notes !== undefined && item.item_notes !== null
        ? String(item.item_notes).trim()
        : null;

      sanitizedItems.push({
        equipment_id: eqId,
        quantity: qty,
        item_notes: itemNotes,
      });
    });

    sanitized.items = sanitizedItems;
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates query parameters for listing borrowings (UC02)
 */
function validateBorrowingQuery(query = {}) {
  const errors = [];
  const sanitized = {
    page: 1,
    limit: 10,
    status: null,
    search: null,
  };

  // Page
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const p = Number(query.page);
    if (!Number.isInteger(p) || p <= 0) {
      errors.push('Tham số page phải là số nguyên dương >= 1.');
    } else {
      sanitized.page = p;
    }
  }

  // Limit
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const l = Number(query.limit);
    if (!Number.isInteger(l) || l <= 0 || l > 100) {
      errors.push('Tham số limit phải là số nguyên dương từ 1 đến 100.');
    } else {
      sanitized.limit = l;
    }
  }

  // Status filter
  if (query.status) {
    if (!ALL_BORROWING_STATUSES.includes(query.status)) {
      errors.push(`Trạng thái không hợp lệ. Phải là một trong: ${ALL_BORROWING_STATUSES.join(', ')}.`);
    } else {
      sanitized.status = query.status;
    }
  }

  // Search
  if (query.search && typeof query.search === 'string') {
    sanitized.search = query.search.trim();
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates rejection request body (UC05)
 */
function validateRejectBorrowing(data = {}) {
  const errors = [];
  const sanitized = {};

  if (!data || typeof data.rejection_reason !== 'string' || !data.rejection_reason.trim()) {
    errors.push('Lý do từ chối (rejection_reason) là trường bắt buộc.');
  } else {
    const reason = data.rejection_reason.trim();
    if (reason.length < 2 || reason.length > 255) {
      errors.push('Lý do từ chối phải có độ dài từ 2 đến 255 ký tự.');
    } else {
      sanitized.rejection_reason = reason;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates handover request body (UC06)
 */
function validateHandoverBorrowing(data = {}) {
  const errors = [];
  const sanitized = {
    borrowing_days: 14, // default max 14 days
  };

  if (data && data.borrowing_days !== undefined && data.borrowing_days !== null && data.borrowing_days !== '') {
    const days = Number(data.borrowing_days);
    if (!Number.isInteger(days) || days < 1 || days > MAX_BORROWING_DAYS) {
      errors.push(`Thời hạn mượn (borrowing_days) phải là số nguyên từ 1 đến ${MAX_BORROWING_DAYS} ngày.`);
    } else {
      sanitized.borrowing_days = days;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates return equipment request body (UC07)
 */
function validateReturnBorrowing(data = {}) {
  const errors = [];
  const sanitized = {
    items: null, // null means return ALL remaining items
  };

  if (data && data.items !== undefined && data.items !== null) {
    if (!Array.isArray(data.items)) {
      errors.push('Danh sách thiết bị trả (items) phải là một mảng.');
    } else if (data.items.length > 0) {
      const seen = new Set();
      const sanitizedItems = [];

      data.items.forEach((item, index) => {
        const itemNum = index + 1;
        if (!item || typeof item !== 'object') {
          errors.push(`Mục thiết bị trả #${itemNum} không đúng định dạng.`);
          return;
        }

        const eqId = Number(item.equipment_id);
        if (!Number.isInteger(eqId) || eqId <= 0) {
          errors.push(`Mục thiết bị trả #${itemNum}: equipment_id phải là số nguyên dương.`);
        }

        const returnQty = Number(item.return_quantity);
        if (!Number.isInteger(returnQty) || returnQty <= 0) {
          errors.push(`Mục thiết bị trả #${itemNum}: return_quantity phải là số nguyên dương (> 0).`);
        }

        if (eqId > 0) {
          if (seen.has(eqId)) {
            errors.push(`Không được gửi trùng lặp thiết bị (ID: ${eqId}) trong danh sách trả.`);
          } else {
            seen.add(eqId);
          }
        }

        sanitizedItems.push({
          equipment_id: eqId,
          return_quantity: returnQty,
        });
      });

      sanitized.items = sanitizedItems;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

module.exports = {
  validateCreateBorrowing,
  validateBorrowingQuery,
  validateRejectBorrowing,
  validateHandoverBorrowing,
  validateReturnBorrowing,
};
