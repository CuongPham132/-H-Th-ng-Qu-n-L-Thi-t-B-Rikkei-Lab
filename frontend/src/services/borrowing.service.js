import api from './api.js';

/**
 * Borrowing Service for Frontend
 * Integrates with Backend Phase 4 /api/borrowings
 */
export const borrowingService = {
  /**
   * Fetches list of borrowings with filters
   * (Borrowers only see their own requests automatically enforced by backend; Staff/Admin see all)
   * @param {Object} [params] - { page, limit, status, search }
   * @returns {Promise<{ borrowings: Array, pagination: Object }>}
   */
  async getBorrowings(params = {}) {
    const response = await api.get('/borrowings', { params });
    return {
      borrowings: response.data.data || [],
      pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  },

  /**
   * Fetches single borrowing detail with item list
   * @param {number|string} id
   * @returns {Promise<Object>} Borrowing details with items array
   */
  async getBorrowingById(id) {
    const response = await api.get(`/borrowings/${id}`);
    return response.data.data;
  },

  /**
   * Creates a new borrowing request (UC01 - Borrower only)
   * @param {Object} data - { purpose, borrowing_days, notes, items: [{ equipment_id, quantity, item_notes }] }
   * @returns {Promise<Object>} Newly created borrowing in PENDING status
   */
  async createBorrowing(data) {
    const response = await api.post('/borrowings', data);
    return response.data.data;
  },

  /**
   * Cancels a borrowing request (UC03 - Borrower owner or Admin)
   * Allowed only for PENDING or APPROVED status
   * @param {number|string} id
   * @param {string} [reason]
   * @returns {Promise<Object>} Updated borrowing in CANCELLED status
   */
  async cancelBorrowing(id, reason = '') {
    const response = await api.patch(`/borrowings/${id}/cancel`, { reason });
    return response.data.data;
  },

  /**
   * Approves a PENDING borrowing request (UC10 - Staff/Admin)
   * Backend handles inventory reservation in MySQL transaction
   * @param {number|string} id
   * @returns {Promise<Object>} Updated borrowing in APPROVED status
   */
  async approveBorrowing(id) {
    const response = await api.patch(`/borrowings/${id}/approve`);
    return response.data.data;
  },

  /**
   * Rejects a PENDING or APPROVED borrowing request (UC10 - Staff/Admin)
   * @param {number|string} id
   * @param {string} rejectionReason - Reason for rejection (2-255 chars)
   * @returns {Promise<Object>} Updated borrowing in REJECTED status
   */
  async rejectBorrowing(id, rejectionReason) {
    const response = await api.patch(`/borrowings/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data.data;
  },

  /**
   * Hands over equipment to borrower (UC11 - Staff/Admin)
   * Shifts inventory from reserved to borrowed
   * @param {number|string} id
   * @param {number} [borrowingDays=14] - Duration in days (1-14)
   * @returns {Promise<Object>} Updated borrowing in BORROWED status
   */
  async handoverBorrowing(id, borrowingDays = 14) {
    const response = await api.patch(`/borrowings/${id}/handover`, {
      borrowing_days: borrowingDays,
    });
    return response.data.data;
  },

  /**
   * Receives returned equipment from borrower (UC12 - Staff/Admin)
   * Supports full return or partial return by item
   * @param {number|string} id
   * @param {Array<{ equipment_id: number, return_quantity: number }>|null} [items=null]
   * @returns {Promise<Object>} Updated borrowing in RETURNED or partial BORROWED status
   */
  async returnBorrowing(id, items = null) {
    const payload = items && items.length > 0 ? { items } : {};
    const response = await api.patch(`/borrowings/${id}/return`, payload);
    return response.data.data;
  },

  /**
   * Triggers background processor for expired approved borrowings (Staff/Admin)
   * @returns {Promise<{ processedCount: number, expiredIds: Array<number> }>}
   */
  async processExpired() {
    const response = await api.post('/borrowings/process-expired');
    return response.data.data;
  },
};

export default borrowingService;
