import api from './api.js';

/**
 * Equipment Service for Frontend
 * Integrates with Backend Phase 3 /api/equipments
 */
export const equipmentService = {
  /**
   * Fetches paginated equipment list
   * @param {Object} [params] - { page, limit, search, category, status, is_active }
   * @returns {Promise<{ equipments: Array, pagination: Object }>}
   */
  async getEquipments(params = {}) {
    const response = await api.get('/equipments', { params });
    return {
      equipments: response.data.data || [],
      pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  },

  /**
   * Fetches single equipment detail by ID
   * @param {number|string} id
   * @returns {Promise<Object>} Equipment details
   */
  async getEquipmentById(id) {
    const response = await api.get(`/equipments/${id}`);
    return response.data.data;
  },

  /**
   * Adds a new equipment (ADMIN & STAFF)
   * @param {Object} data - { code, name, category, description, total_quantity }
   * @returns {Promise<Object>} Created equipment
   */
  async createEquipment(data) {
    const response = await api.post('/equipments', data);
    return response.data.data;
  },

  /**
   * Updates equipment basic info (ADMIN & STAFF)
   * Note: Client cannot edit code or calculated inventory fields
   * @param {number|string} id
   * @param {Object} data - { name, category, description, total_quantity }
   * @returns {Promise<Object>} Updated equipment
   */
  async updateEquipment(id, data) {
    const response = await api.put(`/equipments/${id}`, data);
    return response.data.data;
  },

  /**
   * Updates equipment status and active flag (ADMIN & STAFF)
   * @param {number|string} id
   * @param {Object} statusData - { status, is_active }
   * @returns {Promise<Object>} Updated equipment
   */
  async updateEquipmentStatus(id, statusData) {
    const response = await api.patch(`/equipments/${id}/status`, statusData);
    return response.data.data;
  },
};

export default equipmentService;
