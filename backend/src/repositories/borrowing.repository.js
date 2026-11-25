const { pool } = require('../config/database');
const { ROLES } = require('../constants/roles');

class BorrowingRepository {
  /**
   * Generates a unique borrowing code: BRW-YYYYMM-XXXX
   * @param {Object} [conn] Optional connection
   * @returns {Promise<string>}
   */
  async generateBorrowingCode(conn = null) {
    const client = conn || pool;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Find the latest borrowing code for the current month
    const sql = `
      SELECT borrowing_code 
      FROM borrowings 
      WHERE borrowing_code LIKE ? 
      ORDER BY id DESC 
      LIMIT 1
    `;
    const pattern = `BRW-${yearMonth}-%`;
    const [rows] = await client.execute(sql, [pattern]);

    let seq = 1;
    if (rows.length > 0) {
      const lastCode = rows[0].borrowing_code;
      const parts = lastCode.split('-');
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          seq = lastNum + 1;
        }
      }
    }

    const code = `BRW-${yearMonth}-${String(seq).padStart(4, '0')}`;
    return code;
  }

  /**
   * Retrieves a paginated list of borrowings with filtering
   * @param {Object} filters - { page, limit, status, search }
   * @param {Object} user - { id, role }
   * @param {Object} [conn] Optional connection
   * @returns {Promise<{ borrowings: Array, total: number, page: number, limit: number }>}
   */
  async findAll(filters = {}, user, conn = null) {
    const client = conn || pool;
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 10));
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const params = [];

    // Borrower role visibility restriction: Borrower ONLY sees their own requests
    if (user.role === ROLES.BORROWER) {
      whereClauses.push('b.borrower_id = ?');
      params.push(user.id);
    }

    // Filter by status
    if (filters.status) {
      whereClauses.push('b.status = ?');
      params.push(filters.status);
    }

    // Search by code, purpose, borrower name or email
    if (filters.search) {
      whereClauses.push('(b.borrowing_code LIKE ? OR b.purpose LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)');
      const p = `%${filters.search}%`;
      params.push(p, p, p, p);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM borrowings b
      JOIN users u ON b.borrower_id = u.id
      ${whereSql}
    `;
    const [countRows] = await client.execute(countSql, params);
    const total = Number(countRows[0].total);

    // Data query
    const dataSql = `
      SELECT 
        b.id, b.borrowing_code, b.borrower_id, b.status, b.purpose,
        b.approved_by, b.approved_at, b.pickup_deadline,
        b.borrowed_at, b.due_date, b.returned_at,
        b.rejected_by, b.rejected_at, b.rejection_reason,
        b.notes, b.created_at, b.updated_at,
        u.full_name AS borrower_name, u.email AS borrower_email, u.phone AS borrower_phone,
        a.full_name AS approved_by_name,
        r.full_name AS rejected_by_name,
        (SELECT COUNT(*) FROM borrowing_items bi WHERE bi.borrowing_id = b.id) AS total_items,
        (SELECT IFNULL(SUM(bi.quantity), 0) FROM borrowing_items bi WHERE bi.borrowing_id = b.id) AS total_quantity,
        (SELECT IFNULL(SUM(bi.returned_quantity), 0) FROM borrowing_items bi WHERE bi.borrowing_id = b.id) AS total_returned_quantity
      FROM borrowings b
      JOIN users u ON b.borrower_id = u.id
      LEFT JOIN users a ON b.approved_by = a.id
      LEFT JOIN users r ON b.rejected_by = r.id
      ${whereSql}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const [borrowings] = await client.query(dataSql, dataParams);

    return {
      borrowings,
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves single borrowing by ID with all joins
   * @param {number} id
   * @param {Object} [conn] Optional connection
   * @returns {Promise<Object|null>}
   */
  async findById(id, conn = null) {
    const client = conn || pool;
    const sql = `
      SELECT 
        b.id, b.borrowing_code, b.borrower_id, b.status, b.purpose,
        b.approved_by, b.approved_at, b.pickup_deadline,
        b.borrowed_at, b.due_date, b.returned_at,
        b.rejected_by, b.rejected_at, b.rejection_reason,
        b.notes, b.created_at, b.updated_at,
        u.id AS borrower_user_id, u.full_name AS borrower_name, u.email AS borrower_email, u.phone AS borrower_phone,
        a.id AS approver_user_id, a.full_name AS approved_by_name, a.email AS approved_by_email,
        r.id AS rejecter_user_id, r.full_name AS rejected_by_name, r.email AS rejected_by_email
      FROM borrowings b
      JOIN users u ON b.borrower_id = u.id
      LEFT JOIN users a ON b.approved_by = a.id
      LEFT JOIN users r ON b.rejected_by = r.id
      WHERE b.id = ?
      LIMIT 1
    `;
    const [rows] = await client.execute(sql, [id]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      borrowing_code: row.borrowing_code,
      borrower_id: row.borrower_id,
      status: row.status,
      purpose: row.purpose,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      pickup_deadline: row.pickup_deadline,
      borrowed_at: row.borrowed_at,
      due_date: row.due_date,
      returned_at: row.returned_at,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      borrower: {
        id: row.borrower_user_id,
        full_name: row.borrower_name,
        email: row.borrower_email,
        phone: row.borrower_phone,
      },
      approver: row.approved_by ? {
        id: row.approver_user_id,
        full_name: row.approved_by_name,
        email: row.approved_by_email,
      } : null,
      rejecter: row.rejected_by ? {
        id: row.rejecter_user_id,
        full_name: row.rejected_by_name,
        email: row.rejected_by_email,
      } : null,
    };
  }

  /**
   * Locks and retrieves borrowing record by ID with SELECT ... FOR UPDATE
   * @param {number} id
   * @param {Object} conn - Active transaction connection
   * @returns {Promise<Object|null>}
   */
  async findByIdForUpdate(id, conn) {
    const sql = `
      SELECT id, borrowing_code, borrower_id, status, purpose,
             approved_by, approved_at, pickup_deadline,
             borrowed_at, due_date, returned_at,
             rejected_by, rejected_at, rejection_reason,
             notes, created_at, updated_at
      FROM borrowings
      WHERE id = ?
      FOR UPDATE
    `;
    const [rows] = await conn.execute(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Retrieves all items belonging to a borrowing along with equipment details
   * @param {number} borrowingId
   * @param {Object} [conn] Optional connection
   * @returns {Promise<Array>}
   */
  async findItemsByBorrowingId(borrowingId, conn = null) {
    const client = conn || pool;
    const sql = `
      SELECT 
        bi.id, bi.borrowing_id, bi.equipment_id, bi.quantity, bi.returned_quantity, bi.item_notes,
        e.code AS equipment_code, e.name AS equipment_name, e.category AS equipment_category,
        e.available_quantity, e.total_quantity, e.reserved_quantity, e.borrowed_quantity,
        e.status AS equipment_status, e.is_active AS equipment_is_active
      FROM borrowing_items bi
      JOIN equipments e ON bi.equipment_id = e.id
      WHERE bi.borrowing_id = ?
      ORDER BY bi.equipment_id ASC
    `;
    const [rows] = await client.execute(sql, [borrowingId]);
    return rows;
  }

  /**
   * Locks and retrieves borrowing items with SELECT ... FOR UPDATE
   * @param {number} borrowingId
   * @param {Array<number>|null} [equipmentIds=null]
   * @param {Object} conn - Active transaction connection
   * @returns {Promise<Array>}
   */
  async findItemsForUpdate(borrowingId, equipmentIds = null, conn) {
    if (Array.isArray(equipmentIds) && equipmentIds.length > 0) {
      const placeholders = equipmentIds.map(() => '?').join(', ');
      const sql = `
        SELECT id, borrowing_id, equipment_id, quantity, returned_quantity, item_notes
        FROM borrowing_items
        WHERE borrowing_id = ? AND equipment_id IN (${placeholders})
        ORDER BY equipment_id ASC
        FOR UPDATE
      `;
      const [rows] = await conn.execute(sql, [borrowingId, ...equipmentIds]);
      return rows;
    }

    const sql = `
      SELECT id, borrowing_id, equipment_id, quantity, returned_quantity, item_notes
      FROM borrowing_items
      WHERE borrowing_id = ?
      ORDER BY equipment_id ASC
      FOR UPDATE
    `;
    const [rows] = await conn.execute(sql, [borrowingId]);
    return rows;
  }

  /**
   * Inserts a new borrowing header record in transaction
   * @param {Object} data - { borrowing_code, borrower_id, purpose, notes }
   * @param {Object} conn - Active transaction connection
   * @returns {Promise<number>} Inserted borrowing ID
   */
  async create(data, conn) {
    const sql = `
      INSERT INTO borrowings (borrowing_code, borrower_id, status, purpose, notes)
      VALUES (?, ?, 'PENDING', ?, ?)
    `;
    const values = [
      data.borrowing_code,
      data.borrower_id,
      data.purpose,
      data.notes || null,
    ];
    const [result] = await conn.execute(sql, values);
    return result.insertId;
  }

  /**
   * Inserts items for a borrowing in transaction
   * @param {number} borrowingId
   * @param {Array<Object>} items - [{ equipment_id, quantity, item_notes }]
   * @param {Object} conn - Active transaction connection
   */
  async createItems(borrowingId, items, conn) {
    const valuesClause = items.map(() => '(?, ?, ?, 0, ?)').join(', ');
    const params = [];
    items.forEach((item) => {
      params.push(borrowingId, item.equipment_id, item.quantity, item.item_notes || null);
    });

    const sql = `
      INSERT INTO borrowing_items (borrowing_id, equipment_id, quantity, returned_quantity, item_notes)
      VALUES ${valuesClause}
    `;
    await conn.execute(sql, params);
  }

  /**
   * Updates borrowing record with specified dynamic fields in transaction
   * @param {number} id
   * @param {Object} fields - key-value pairs to update
   * @param {Object} conn - Active transaction connection
   */
  async update(id, fields, conn) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;

    const setClauses = keys.map((k) => `${k} = ?`);
    const values = keys.map((k) => fields[k]);
    values.push(id);

    const sql = `UPDATE borrowings SET ${setClauses.join(', ')} WHERE id = ?`;
    await conn.execute(sql, values);
  }

  /**
   * Updates returned_quantity for a borrowing item
   * @param {number} borrowingId
   * @param {number} equipmentId
   * @param {number} returnQty
   * @param {Object} conn - Active transaction connection
   */
  async incrementItemReturnedQuantity(borrowingId, equipmentId, returnQty, conn) {
    const sql = `
      UPDATE borrowing_items 
      SET returned_quantity = returned_quantity + ?
      WHERE borrowing_id = ? AND equipment_id = ?
    `;
    await conn.execute(sql, [returnQty, borrowingId, equipmentId]);
  }

  /**
   * Counts how many items in a borrowing have NOT been fully returned
   * @param {number} borrowingId
   * @param {Object} conn - Active transaction connection
   * @returns {Promise<number>}
   */
  async countRemainingUnreturnedItems(borrowingId, conn) {
    const sql = `
      SELECT COUNT(*) AS remaining
      FROM borrowing_items
      WHERE borrowing_id = ? AND returned_quantity < quantity
    `;
    const [rows] = await conn.execute(sql, [borrowingId]);
    return Number(rows[0].remaining);
  }

  /**
   * Finds IDs of all APPROVED borrowings that have passed pickup_deadline
   * @param {Object} [conn] Optional connection
   * @returns {Promise<Array<{ id: number, borrowing_code: string }>>}
   */
  async findExpiredApprovedBorrowings(conn = null) {
    const client = conn || pool;
    const sql = `
      SELECT id, borrowing_code, pickup_deadline
      FROM borrowings
      WHERE status = 'APPROVED' AND pickup_deadline < NOW()
      ORDER BY id ASC
    `;
    const [rows] = await client.execute(sql);
    return rows;
  }

  /**
   * Locks equipments in ASCENDING order to prevent deadlock
   * @param {Array<number>} equipmentIds
   * @param {Object} conn - Active transaction connection
   * @returns {Promise<Array>} Locked equipment rows
   */
  async lockEquipmentsAsc(equipmentIds, conn) {
    if (!equipmentIds || equipmentIds.length === 0) return [];
    
    // Deduplicate and sort IDs ASC
    const sortedIds = Array.from(new Set(equipmentIds)).sort((a, b) => a - b);
    const placeholders = sortedIds.map(() => '?').join(', ');
    
    const sql = `
      SELECT id, code, name, category, total_quantity, reserved_quantity, borrowed_quantity, available_quantity, status, is_active
      FROM equipments
      WHERE id IN (${placeholders})
      ORDER BY id ASC
      FOR UPDATE
    `;
    const [rows] = await conn.execute(sql, sortedIds);
    return rows;
  }

  /**
   * Adjusts inventory counts for equipment:
   * deltaReserved: positive to reserve, negative to release
   * deltaBorrowed: positive to borrow, negative to return
   * @param {number} equipmentId
   * @param {number} deltaReserved
   * @param {number} deltaBorrowed
   * @param {Object} conn - Active transaction connection
   */
  async adjustEquipmentInventory(equipmentId, deltaReserved, deltaBorrowed, conn) {
    const setClauses = [];
    const params = [];

    if (deltaReserved !== 0) {
      if (deltaReserved > 0) {
        setClauses.push('reserved_quantity = reserved_quantity + ?');
        params.push(deltaReserved);
      } else {
        setClauses.push('reserved_quantity = reserved_quantity - ?');
        params.push(Math.abs(deltaReserved));
      }
    }

    if (deltaBorrowed !== 0) {
      if (deltaBorrowed > 0) {
        setClauses.push('borrowed_quantity = borrowed_quantity + ?');
        params.push(deltaBorrowed);
      } else {
        setClauses.push('borrowed_quantity = borrowed_quantity - ?');
        params.push(Math.abs(deltaBorrowed));
      }
    }

    if (setClauses.length === 0) return;

    params.push(equipmentId);
    const sql = `UPDATE equipments SET ${setClauses.join(', ')} WHERE id = ?`;
    await conn.execute(sql, params);
  }
}

module.exports = new BorrowingRepository();
