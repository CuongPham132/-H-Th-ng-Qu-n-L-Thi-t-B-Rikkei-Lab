const { pool } = require('../config/database');
const { ROLES } = require('../constants/roles');
const { EQUIPMENT_STATUS } = require('../constants/equipment');

class EquipmentRepository {
  /**
   * Retrieves a paginated list of equipments based on user role and filters
   * @param {Object} filters - { page, limit, search, category, status, is_active }
   * @param {string} userRole - User's role (BORROWER, STAFF, ADMIN)
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<{ equipments: Array, total: number, page: number, limit: number }>}
   */
  async findAll(filters = {}, userRole = ROLES.BORROWER, conn = null) {
    const client = conn || pool;
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 10));
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const params = [];

    // Role-based visibility rule:
    // Borrower can ONLY view active equipments that are currently available for borrowing
    if (userRole === ROLES.BORROWER) {
      whereClauses.push('is_active = 1');
      whereClauses.push('status = ?');
      params.push(EQUIPMENT_STATUS.AVAILABLE);
    } else {
      // Staff / Admin can view all equipment with optional filters
      if (filters.status) {
        whereClauses.push('status = ?');
        params.push(filters.status);
      }
      if (filters.is_active !== undefined && filters.is_active !== null) {
        whereClauses.push('is_active = ?');
        params.push(Number(filters.is_active));
      }
    }

    // Category filter
    if (filters.category) {
      whereClauses.push('category = ?');
      params.push(filters.category);
    }

    // Search by code or name
    if (filters.search) {
      whereClauses.push('(code LIKE ? OR name LIKE ?)');
      const pattern = `%${filters.search}%`;
      params.push(pattern, pattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total rows
    const countSql = `SELECT COUNT(*) AS total FROM equipments ${whereSql}`;
    const [countRows] = await client.execute(countSql, params);
    const total = Number(countRows[0].total);

    // Fetch paginated data
    const dataSql = `
      SELECT id, code, name, category, description, total_quantity,
             reserved_quantity, borrowed_quantity, available_quantity,
             status, is_active, created_at, updated_at
      FROM equipments
      ${whereSql}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const [equipments] = await client.query(dataSql, dataParams);

    return {
      equipments,
      total,
      page,
      limit,
    };
  }

  /**
   * Finds equipment by ID
   * @param {number} id
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<Object|null>}
   */
  async findById(id, conn = null) {
    const client = conn || pool;
    const sql = `
      SELECT id, code, name, category, description, total_quantity,
             reserved_quantity, borrowed_quantity, available_quantity,
             status, is_active, created_at, updated_at
      FROM equipments
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await client.execute(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Finds and locks equipment by ID with SELECT ... FOR UPDATE
   * Must be called within an active transaction connection.
   * @param {number} id
   * @param {Object} conn - Active transaction connection
   * @returns {Promise<Object|null>}
   */
  async findByIdForUpdate(id, conn) {
    const sql = `
      SELECT id, code, name, category, description, total_quantity,
             reserved_quantity, borrowed_quantity, available_quantity,
             status, is_active, created_at, updated_at
      FROM equipments
      WHERE id = ?
      FOR UPDATE
    `;
    const [rows] = await conn.execute(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Finds equipment by unique code
   * @param {string} code
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<Object|null>}
   */
  async findByCode(code, conn = null) {
    const client = conn || pool;
    const sql = `
      SELECT id, code, name, category, description, total_quantity,
             reserved_quantity, borrowed_quantity, available_quantity,
             status, is_active, created_at, updated_at
      FROM equipments
      WHERE code = ?
      LIMIT 1
    `;
    const [rows] = await client.execute(sql, [code.trim()]);
    return rows[0] || null;
  }

  /**
   * Inserts a new equipment record
   * Notice: reserved_quantity and borrowed_quantity are strictly initialized to 0.
   * available_quantity is computed automatically by MySQL Generated Stored Column.
   * @param {Object} data - { code, name, category, description, total_quantity }
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<Object>} Created equipment
   */
  async create(data, conn = null) {
    const client = conn || pool;
    const sql = `
      INSERT INTO equipments (
        code, name, category, description, total_quantity,
        reserved_quantity, borrowed_quantity, status, is_active
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 'AVAILABLE', 1)
    `;
    const values = [
      data.code.trim(),
      data.name.trim(),
      data.category.trim(),
      data.description || null,
      data.total_quantity,
    ];

    const [result] = await client.execute(sql, values);
    return this.findById(result.insertId, client);
  }

  /**
   * Updates equipment info (name, category, description, total_quantity)
   * @param {number} id
   * @param {Object} updateData - sanitized update fields
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<boolean>}
   */
  async update(id, updateData, conn = null) {
    const client = conn || pool;
    const fields = [];
    const values = [];

    if (updateData.name !== undefined) {
      fields.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.category !== undefined) {
      fields.push('category = ?');
      values.push(updateData.category);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.total_quantity !== undefined) {
      fields.push('total_quantity = ?');
      values.push(updateData.total_quantity);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE equipments SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await client.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Updates equipment status and optionally active flag
   * @param {number} id
   * @param {string} status - 'AVAILABLE' | 'MAINTENANCE' | 'DISCONTINUED'
   * @param {number|null} [isActive=null] - 0 or 1
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<boolean>}
   */
  async updateStatus(id, status, isActive = null, conn = null) {
    const client = conn || pool;
    if (isActive !== null && isActive !== undefined) {
      const sql = `UPDATE equipments SET status = ?, is_active = ? WHERE id = ?`;
      const [result] = await client.execute(sql, [status, isActive, id]);
      return result.affectedRows > 0;
    }

    const sql = `UPDATE equipments SET status = ? WHERE id = ?`;
    const [result] = await client.execute(sql, [status, id]);
    return result.affectedRows > 0;
  }
}

module.exports = new EquipmentRepository();
