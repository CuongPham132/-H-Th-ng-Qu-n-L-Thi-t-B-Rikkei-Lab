const { ALL_ROLES } = require('../constants/roles');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates admin user creation body
 */
function validateCreateUser(data) {
  const errors = [];
  const sanitized = {};

  // Email
  if (!data || typeof data.email !== 'string' || !data.email.trim()) {
    errors.push('Email là trường bắt buộc.');
  } else {
    const email = data.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email) || email.length > 191) {
      errors.push('Email không đúng định dạng hoặc vượt quá 191 ký tự.');
    } else {
      sanitized.email = email;
    }
  }

  // Password
  if (!data || typeof data.password !== 'string' || data.password.length < 8) {
    errors.push('Mật khẩu bắt buộc và phải có ít nhất 8 ký tự.');
  } else {
    sanitized.password = data.password;
  }

  // Full Name
  if (!data || typeof data.full_name !== 'string' || !data.full_name.trim()) {
    errors.push('Họ và tên là trường bắt buộc.');
  } else {
    const fullName = data.full_name.trim();
    if (fullName.length < 2 || fullName.length > 100) {
      errors.push('Họ và tên phải có độ dài từ 2 đến 100 ký tự.');
    } else {
      sanitized.full_name = fullName;
    }
  }

  // Role (ADMIN can create STAFF, BORROWER, or ADMIN)
  if (!data || !data.role) {
    errors.push('Vai trò (role) là trường bắt buộc.');
  } else if (!ALL_ROLES.includes(data.role)) {
    errors.push(`Vai trò không hợp lệ. Phải là một trong: ${ALL_ROLES.join(', ')}.`);
  } else {
    sanitized.role = data.role;
  }

  // Phone
  if (data && data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.push('Số điện thoại phải là chuỗi ký tự.');
    } else {
      const phone = data.phone.trim();
      if (phone.length > 20) {
        errors.push('Số điện thoại không được vượt quá 20 ký tự.');
      } else {
        sanitized.phone = phone;
      }
    }
  } else {
    sanitized.phone = null;
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates status update body
 */
function validateUpdateStatus(data) {
  const errors = [];
  const sanitized = {};

  if (!data || data.is_active === undefined || data.is_active === null) {
    errors.push('Trường is_active là bắt buộc (0: Vô hiệu hóa, 1: Kích hoạt).');
  } else {
    const val = Number(data.is_active);
    if (val !== 0 && val !== 1) {
      errors.push('Trường is_active chỉ được nhận giá trị 0 hoặc 1.');
    } else {
      sanitized.is_active = val;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates role update body
 */
function validateUpdateRole(data) {
  const errors = [];
  const sanitized = {};

  if (!data || !data.role) {
    errors.push('Trường role là bắt buộc.');
  } else if (!ALL_ROLES.includes(data.role)) {
    errors.push(`Vai trò không hợp lệ. Phải là một trong: ${ALL_ROLES.join(', ')}.`);
  } else {
    sanitized.role = data.role;
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

/**
 * Validates and sanitizes user query parameters for listing
 */
function validateUserQuery(query = {}) {
  const errors = [];
  const sanitized = {
    page: 1,
    limit: 10,
    search: null,
    role: null,
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

  // Role filter
  if (query.role) {
    if (!ALL_ROLES.includes(query.role)) {
      errors.push(`Bộ lọc role không hợp lệ. Phải là một trong: ${ALL_ROLES.join(', ')}.`);
    } else {
      sanitized.role = query.role;
    }
  }

  // is_active filter
  if (query.is_active !== undefined && query.is_active !== null && query.is_active !== '') {
    const a = Number(query.is_active);
    if (a !== 0 && a !== 1) {
      errors.push('Bộ lọc is_active phải là 0 hoặc 1.');
    } else {
      sanitized.is_active = a;
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

module.exports = {
  validateCreateUser,
  validateUpdateStatus,
  validateUpdateRole,
  validateUserQuery,
};
