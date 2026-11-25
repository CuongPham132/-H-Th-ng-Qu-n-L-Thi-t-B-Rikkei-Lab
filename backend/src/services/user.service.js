const userRepository = require('../repositories/user.repository');
const { hashPassword } = require('../utils/password');
const { ROLES } = require('../constants/roles');
const ERROR_CODES = require('../constants/errorCodes');
const AppError = require('../utils/appError');
const { executeWithTransaction } = require('../utils/transactionRunner');

class UserService {
  /**
   * Retrieves a paginated list of users
   * @param {Object} filters - { page, limit, search, role, is_active }
   * @returns {Promise<{ users: Array, pagination: Object }>}
   */
  async getAllUsers(filters) {
    const result = await userRepository.findAll(filters);
    const totalPages = Math.ceil(result.total / result.limit) || 1;

    return {
      users: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a single user by ID
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async getUserById(id) {
    const user = await userRepository.findById(id, null, false);
    if (!user) {
      throw new AppError('Người dùng không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
    }
    return user;
  }

  /**
   * Admin creates a user account (STAFF, BORROWER, or ADMIN)
   * @param {Object} data - { email, password, full_name, role, phone }
   * @param {number} currentAdminId
   * @returns {Promise<Object>}
   */
  async createUser(data, currentAdminId) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('Email đã được sử dụng bởi một tài khoản khác.', 409, ERROR_CODES.CONFLICT);
    }

    const password_hash = await hashPassword(data.password);

    const newUser = await userRepository.create({
      email: data.email,
      password_hash,
      full_name: data.full_name,
      role: data.role,
      phone: data.phone || null,
      is_active: 1,
    });

    return newUser;
  }

  /**
   * Admin updates a user's active status (is_active)
   * Protected with transaction and row-level locking to prevent concurrent deactivation of last admin.
   * @param {number} targetUserId
   * @param {number} isActive - 0 or 1
   * @param {number} currentAdminId
   * @returns {Promise<Object>} Updated user
   */
  async updateUserStatus(targetUserId, isActive, currentAdminId) {
    // Protection 1: Admin cannot deactivate themselves (fail-fast without DB locks)
    if (targetUserId === currentAdminId) {
      throw new AppError('Không thể tự vô hiệu hóa tài khoản của chính mình.', 400, ERROR_CODES.SELF_ACTION_FORBIDDEN);
    }

    return executeWithTransaction(async (conn) => {
      const targetUser = await userRepository.findById(targetUserId, conn, false);
      if (!targetUser) {
        throw new AppError('Người dùng không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      // Protection 2: Cannot deactivate the last active ADMIN in the system
      if (isActive === 0 && targetUser.role === ROLES.ADMIN && Number(targetUser.is_active) === 1) {
        const activeAdmins = await userRepository.getActiveAdminsForUpdate(conn);
        if (activeAdmins.length <= 1) {
          throw new AppError('Không thể vô hiệu hóa quản trị viên duy nhất còn lại trong hệ thống.', 400, ERROR_CODES.LAST_ADMIN_PROTECTED);
        }
      }

      await userRepository.updateStatus(targetUserId, isActive, conn);
      return userRepository.findById(targetUserId, conn, false);
    });
  }

  /**
   * Admin updates a user's role
   * Protected with transaction and row-level locking to prevent concurrent demotion of last admin.
   * @param {number} targetUserId
   * @param {string} newRole - ADMIN, STAFF, or BORROWER
   * @param {number} currentAdminId
   * @returns {Promise<Object>} Updated user
   */
  async updateUserRole(targetUserId, newRole, currentAdminId) {
    // Protection 1: Admin cannot modify their own role (fail-fast without DB locks)
    if (targetUserId === currentAdminId) {
      throw new AppError('Không thể tự thay đổi vai trò của chính mình.', 400, ERROR_CODES.SELF_ACTION_FORBIDDEN);
    }

    return executeWithTransaction(async (conn) => {
      const targetUser = await userRepository.findById(targetUserId, conn, false);
      if (!targetUser) {
        throw new AppError('Người dùng không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
      }

      // Protection 2: Cannot demote the last active ADMIN in the system
      if (targetUser.role === ROLES.ADMIN && newRole !== ROLES.ADMIN && Number(targetUser.is_active) === 1) {
        const activeAdmins = await userRepository.getActiveAdminsForUpdate(conn);
        if (activeAdmins.length <= 1) {
          throw new AppError('Không thể giáng cấp quản trị viên duy nhất còn lại trong hệ thống.', 400, ERROR_CODES.LAST_ADMIN_PROTECTED);
        }
      }

      await userRepository.updateRole(targetUserId, newRole, conn);
      return userRepository.findById(targetUserId, conn, false);
    });
  }
}

module.exports = new UserService();
