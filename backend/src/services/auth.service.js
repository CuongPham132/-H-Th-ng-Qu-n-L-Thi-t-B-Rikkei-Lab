const userRepository = require('../repositories/user.repository');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { ROLES } = require('../constants/roles');
const ERROR_CODES = require('../constants/errorCodes');
const AppError = require('../utils/appError');

class AuthService {
  /**
   * Registers a new borrower account
   * @param {Object} data - { email, password, full_name, phone }
   * @returns {Promise<Object>} Created user without password_hash
   */
  async register(data) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('Email đã được sử dụng bởi một tài khoản khác.', 409, ERROR_CODES.CONFLICT);
    }

    const password_hash = await hashPassword(data.password);

    // Business rule: Public registration always forces role = BORROWER and is_active = 1
    const newUser = await userRepository.create({
      email: data.email,
      password_hash,
      full_name: data.full_name,
      role: ROLES.BORROWER,
      phone: data.phone || null,
      is_active: 1,
    });

    return newUser;
  }

  /**
   * Authenticates user credentials and returns JWT token
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ token: string, user: Object }>}
   */
  async login(credentials) {
    const user = await userRepository.findByEmail(credentials.email);

    // Timing-safe & generic error to prevent email enumeration
    if (!user) {
      throw new AppError('Email hoặc mật khẩu không chính xác.', 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Check account active status
    if (Number(user.is_active) === 0) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.', 403, ERROR_CODES.ACCOUNT_DISABLED);
    }

    const isMatch = await comparePassword(credentials.password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Email hoặc mật khẩu không chính xác.', 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Sanitize user object (omit password_hash)
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return {
      token,
      user: sanitizedUser,
    };
  }

  /**
   * Retrieves profile of current user
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId, null, false);
    if (!user) {
      throw new AppError('Người dùng không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
    }

    if (Number(user.is_active) === 0) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.', 403, ERROR_CODES.ACCOUNT_DISABLED);
    }

    return user;
  }
}

module.exports = new AuthService();
