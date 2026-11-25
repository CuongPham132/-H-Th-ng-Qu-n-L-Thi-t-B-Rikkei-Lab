const { ALL_EQUIPMENT_STATUSES } = require('../constants/equipment');

/**
 * Validates and sanitizes equipment list query parameters
 */
function validateEquipmentQuery(query = {}) {
  const errors = [];
  const sanitized = {
    page: 1,
    limit: 10,
    search: null,
    category: null,
    status: null,
    is_active: null,
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

  // Category filter
  if (query.category && typeof query.category === 'string') {
    const cat = query.category.trim();
    if (cat.length > 50) {
      errors.push('Bộ lọc category không được vượt quá 50 ký tự.');
    } else {
      sanitized.category = cat;
    }
  }

  // Status filter (Whitelist against ALL_EQUIPMENT_STATUSES)
  if (query.status) {
    if (!ALL_EQUIPMENT_STATUSES.includes(query.status)) {
      errors.push(`Trạng thái không hợp lệ. Phải là một trong: ${ALL_EQUIPMENT_STATUSES.join(', ')}.`);
    } else {
      sanitized.status = query.status;
    }
  }

  // is_active filter (0 or 1)
  if (query.is_active !== undefined && query.is_active !== null && query.is_active !== '') {
    const a = Number(query.is_active);
    if (a !== 0 && a !== 1) {
      errors.push('Bộ lọc is_active phải là 0 hoặc 1.');
    } else {
      sanitized.is_active = a;
    }
  }

  // Search by code or name
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
 * Validates request body for creating a new equipment
 */
function validateCreateEquipment(data = {}) {
  const errors = [];
  const sanitized = {};

  // Code
  if (!data || typeof data.code !== 'string' || !data.code.trim()) {
    errors.push('Mã thiết bị (code) là trường bắt buộc.');
  } else {
    const code = data.code.trim();
    if (code.length < 2 || code.length > 50) {
      errors.push('Mã thiết bị phải có độ dài từ 2 đến 50 ký tự.');
    } else {
      sanitized.code = code;
    }
  }

  // Name
  if (!data || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Tên thiết bị (name) là trường bắt buộc.');
  } else {
    const name = data.name.trim();
    if (name.length < 2 || name.length > 150) {
      errors.push('Tên thiết bị phải có độ dài từ 2 đến 150 ký tự.');
    } else {
      sanitized.name = name;
    }
  }

  // Category
  if (!data || typeof data.category !== 'string' || !data.category.trim()) {
    errors.push('Danh mục thiết bị (category) là trường bắt buộc.');
  } else {
    const category = data.category.trim();
    if (category.length < 2 || category.length > 50) {
      errors.push('Danh mục thiết bị phải có độ dài từ 2 đến 50 ký tự.');
    } else {
      sanitized.category = category;
    }
  }

  // Description (optional)
  if (data && data.description !== undefined && data.description !== null) {
    sanitized.description = String(data.description).trim();
  } else {
    sanitized.description = null;
  }

  // Total Quantity
  if (data === null || data.total_quantity === undefined || data.total_quantity === null || data.total_quantity === '') {
    errors.push('Tổng số lượng (total_quantity) là trường bắt buộc.');
  } else {
    const qty = Number(data.total_quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      errors.push('Tổng số lượng (total_quantity) phải là số nguyên không âm (>= 0).');
    } else {
      sanitized.total_quantity = qty;
    }
  }

  // Business protection: Do NOT accept client-supplied inventory counters
  // reserved_quantity, borrowed_quantity, available_quantity are ignored completely

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates request body for updating equipment information
 */
function validateUpdateEquipment(data = {}) {
  const errors = [];
  const sanitized = {};
  let fieldCount = 0;

  // Name (optional)
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Tên thiết bị không được để trống.');
    } else {
      const name = data.name.trim();
      if (name.length < 2 || name.length > 150) {
        errors.push('Tên thiết bị phải có độ dài từ 2 đến 150 ký tự.');
      } else {
        sanitized.name = name;
        fieldCount++;
      }
    }
  }

  // Category (optional)
  if (data.category !== undefined) {
    if (typeof data.category !== 'string' || !data.category.trim()) {
      errors.push('Danh mục thiết bị không được để trống.');
    } else {
      const category = data.category.trim();
      if (category.length < 2 || category.length > 50) {
        errors.push('Danh mục thiết bị phải có độ dài từ 2 đến 50 ký tự.');
      } else {
        sanitized.category = category;
        fieldCount++;
      }
    }
  }

  // Description (optional)
  if (data.description !== undefined) {
    sanitized.description = data.description !== null ? String(data.description).trim() : null;
    fieldCount++;
  }

  // Total Quantity (optional)
  if (data.total_quantity !== undefined) {
    const qty = Number(data.total_quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      errors.push('Tổng số lượng (total_quantity) phải là số nguyên không âm (>= 0).');
    } else {
      sanitized.total_quantity = qty;
      fieldCount++;
    }
  }

  if (fieldCount === 0 && errors.length === 0) {
    errors.push('Cần cung cấp ít nhất một trường thông tin để cập nhật (name, category, description, total_quantity).');
  }

  // Business protection: Do NOT allow modifying code, reserved_quantity, borrowed_quantity, available_quantity

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates request body for updating equipment status
 */
function validateUpdateEquipmentStatus(data = {}) {
  const errors = [];
  const sanitized = {};

  // Status (required)
  if (!data || !data.status) {
    errors.push('Trường status là bắt buộc.');
  } else if (!ALL_EQUIPMENT_STATUSES.includes(data.status)) {
    errors.push(`Trạng thái không hợp lệ. Phải là một trong: ${ALL_EQUIPMENT_STATUSES.join(', ')}.`);
  } else {
    sanitized.status = data.status;
  }

  // is_active (optional)
  if (data && data.is_active !== undefined && data.is_active !== null && data.is_active !== '') {
    const a = Number(data.is_active);
    if (a !== 0 && a !== 1) {
      errors.push('Trường is_active chỉ được nhận giá trị 0 hoặc 1.');
    } else {
      sanitized.is_active = a;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

module.exports = {
  validateEquipmentQuery,
  validateCreateEquipment,
  validateUpdateEquipment,
  validateUpdateEquipmentStatus,
};
