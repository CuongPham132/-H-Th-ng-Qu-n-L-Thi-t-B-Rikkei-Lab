const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates registration request body
 * @param {Object} data - { email, password, full_name, phone }
 */
function validateRegister(data) {
  const errors = [];
  const sanitized = {};

  // 1. Email validation
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

  // 2. Password validation (Min 8 characters)
  if (!data || typeof data.password !== 'string' || data.password.length < 8) {
    errors.push('Mật khẩu bắt buộc và phải có ít nhất 8 ký tự.');
  } else {
    sanitized.password = data.password;
  }

  // 3. Full name validation
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

  // 4. Phone validation (optional)
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
 * Validates login request body
 * @param {Object} data - { email, password }
 */
function validateLogin(data) {
  const errors = [];
  const sanitized = {};

  if (!data || typeof data.email !== 'string' || !data.email.trim()) {
    errors.push('Email là trường bắt buộc.');
  } else {
    const email = data.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      errors.push('Email không đúng định dạng.');
    } else {
      sanitized.email = email;
    }
  }

  if (!data || typeof data.password !== 'string' || !data.password) {
    errors.push('Mật khẩu là trường bắt buộc.');
  } else {
    sanitized.password = data.password;
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: sanitized,
  };
}

module.exports = {
  validateRegister,
  validateLogin,
};
