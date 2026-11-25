const { pool } = require('../config/database');

class UserRepository {
  /**
   * Finds a user by email address (case-insensitive)
   * @param {string} email
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email, conn = null) {
    const client = conn || pool;
    const sql = `
      SELECT id, email, password_hash, full_name, role, phone, is_active, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `;
    const [rows] = await client.execute(sql, [email.toLowerCase().trim()]);
    return rows[0] || null;
  }

  /**
   * Finds a user by ID
   * @param {number} id
   * @param {Object} [conn] Optional transaction connection
   * @param {boolean} [includePassword=false]
   * @returns {Promise<Object|null>}
   */
  async findById(id, conn = null, includePassword = false) {
    const client = conn || pool;
    const fields = includePassword
      ? 'id, email, password_hash, full_name, role, phone, is_active, created_at, updated_at'
      : 'id, email, full_name, role, phone, is_active, created_at, updated_at';

    const sql = `
      SELECT ${fields}
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await client.execute(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Creates a new user record
   * @param {Object} userData - { email, password_hash, full_name, role, phone, is_active }
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<Object>} Created user record (without password_hash)
   */
  async create(userData, conn = null) {
    const client = conn || pool;
    const sql = `
      INSERT INTO users (email, password_hash, full_name, role, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      userData.email.toLowerCase().trim(),
      userData.password_hash,
      userData.full_name.trim(),
      userData.role,
      userData.phone || null,
      userData.is_active !== undefined ? userData.is_active : 1,
    ];

    const [result] = await client.execute(sql, values);
    return this.findById(result.insertId, client, false);
  }

  /**
   * Retrieves a paginated list of users with optional filtering
   * @param {Object} filters - { page, limit, search, role, is_active }
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<{ users: Array, total: number }>}
   */
  async findAll(filters = {}, conn = null) {
    const client = conn || pool;
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 10));
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const params = [];

    // Filter by role
    if (filters.role) {
      whereClauses.push('role = ?');
      params.push(filters.role);
    }

    // Filter by is_active
    if (filters.is_active !== undefined && filters.is_active !== null) {
      whereClauses.push('is_active = ?');
      params.push(Number(filters.is_active));
    }

    // Search by email or full_name
    if (filters.search) {
      whereClauses.push('(email LIKE ? OR full_name LIKE ?)');
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total rows
    const countSql = `SELECT COUNT(*) AS total FROM users ${whereSql}`;
    const [countRows] = await client.execute(countSql, params);
    const total = Number(countRows[0].total);

    // Fetch paginated data
    // Note: LIMIT and OFFSET must be safe numeric literals or prepared params
    const dataSql = `
      SELECT id, email, full_name, role, phone, is_active, created_at, updated_at
      FROM users
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const [users] = await client.query(dataSql, dataParams);

    return {
      users,
      total,
      page,
      limit,
    };
  }

  /**
   * Updates user active status (is_active)
   * @param {number} id
   * @param {number} isActive - 0 or 1
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<boolean>}
   */
  async updateStatus(id, isActive, conn = null) {
    const client = conn || pool;
    const sql = `UPDATE users SET is_active = ? WHERE id = ?`;
    const [result] = await client.execute(sql, [isActive, id]);
    return result.affectedRows > 0;
  }

  /**
   * Updates user role
   * @param {number} id
   * @param {string} role - 'BORROWER' | 'STAFF' | 'ADMIN'
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<boolean>}
   */
  async updateRole(id, role, conn = null) {
    const client = conn || pool;
    const sql = `UPDATE users SET role = ? WHERE id = ?`;
    const [result] = await client.execute(sql, [role, id]);
    return result.affectedRows > 0;
  }

  /**
   * Retrieves and locks all currently active ADMIN users in consistent ASC order.
   * MUST be executed inside an active transaction connection.
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<Array>}
   */
  async getActiveAdminsForUpdate(conn = null) {
    const client = conn || pool;
    const sql = `
      SELECT id, email, role, is_active
      FROM users
      WHERE role = 'ADMIN' AND is_active = 1
      ORDER BY id ASC
      FOR UPDATE
    `;
    const [rows] = await client.execute(sql);
    return rows;
  }

  /**
   * Counts the number of currently active ADMIN users
   * @param {Object} [conn] Optional transaction connection
   * @returns {Promise<number>}
   */
  async countActiveAdmins(conn = null) {
    const client = conn || pool;
    const sql = `SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND is_active = 1`;
    const [rows] = await client.execute(sql);
    return Number(rows[0].count);
  }
}

module.exports = new UserRepository();
