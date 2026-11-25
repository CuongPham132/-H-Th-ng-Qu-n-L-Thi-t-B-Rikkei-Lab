import api from './api.js';

/**
 * Auth Service
 * Maps directly to Backend Phase 2 API endpoints
 */
export const authService = {
  /**
   * Logs in a user
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ token: string, user: Object }>}
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    // Backend format: { success: true, message: '...', data: { token, user } }
    return response.data.data;
  },

  /**
   * Registers a new borrower account
   * Note: Role is forced to BORROWER on backend. Client does NOT submit role.
   * @param {Object} data - { email, password, full_name, phone }
   * @returns {Promise<Object>} Created user
   */
  async register(data) {
    const response = await api.post('/auth/register', data);
    // Backend format: { success: true, message: '...', data: user }
    return response.data.data;
  },

  /**
   * Fetches current authenticated user profile
   * @returns {Promise<Object>} Current user profile
   */
  async getProfile() {
    const response = await api.get('/auth/me');
    // Backend format: { success: true, message: '...', data: user }
    return response.data.data;
  },
};

export default authService;
