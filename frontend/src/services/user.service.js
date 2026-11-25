import api from './api.js';

/**
 * User Service for Frontend
 * Integrates with Backend Phase 2 /api/users (ADMIN only)
 */
export const userService = {
  /**
   * Retrieves paginated list of users
   * @param {Object} [params] - { page, limit, search, role, is_active }
   * @returns {Promise<{ users: Array, pagination: Object }>}
   */
  async getUsers(params = {}) {
    const response = await api.get('/users', { params });
    return {
      users: response.data.data || [],
      pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  },

  /**
   * Retrieves a single user by ID
   * @param {number|string} id
   * @returns {Promise<Object>} User details
   */
  async getUserById(id) {
    const response = await api.get(`/users/${id}`);
    return response.data.data;
  },

  /**
   * Creates a new user account (STAFF, BORROWER, or ADMIN)
   * @param {Object} data - { email, password, full_name, role, phone }
   * @returns {Promise<Object>} Newly created user
   */
  async createUser(data) {
    const response = await api.post('/users', data);
    return response.data.data;
  },

  /**
   * Updates user status (active / disabled)
   * @param {number|string} id
   * @param {number} isActive - 1 (Active) or 0 (Disabled)
   * @returns {Promise<Object>} Updated user
   */
  async updateUserStatus(id, isActive) {
    const response = await api.patch(`/users/${id}/status`, { is_active: isActive });
    return response.data.data;
  },

  /**
   * Updates user role
   * @param {number|string} id
   * @param {string} role - 'ADMIN' | 'STAFF' | 'BORROWER'
   * @returns {Promise<Object>} Updated user
   */
  async updateUserRole(id, role) {
    const response = await api.patch(`/users/${id}/role`, { role });
    return response.data.data;
  },
};

export default userService;
