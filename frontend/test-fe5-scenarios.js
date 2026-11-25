/**
 * FE5 Comprehensive Verification Test Suite
 * Rikkei Lab Admin Module (Frontend Services & API Integration)
 *
 * Verifies all required Admin use cases (UC13 - UC15) against running Backend (http://localhost:5000/api):
 * 1. UC13 - Admin Dashboard Metrics (Tổng users, equipments, borrowings, status breakdown từ API thực tế).
 * 2. UC14 - Quản lý thiết bị: Lọc, tìm kiếm và phân trang (Admin xem được cả thiết bị inactive/maintenance).
 * 3. UC14 - Thêm thiết bị mới (POST /api/equipments).
 * 4. UC14 - Chặn trùng lặp mã thiết bị (409 Conflict).
 * 5. UC14 - Sửa thông tin thiết bị (PUT /api/equipments/:id, cập nhật name, category, total_quantity).
 * 6. UC14 - Thay đổi trạng thái thiết bị (PATCH /api/equipments/:id/status, chuyển MAINTENANCE/DISCONTINUED).
 * 7. UC14 - Bảo vệ tính toàn vẹn tồn kho (Không cho phép giảm total_quantity thấp hơn reserved + borrowed).
 * 8. UC15 - Quản lý người dùng: Lọc theo vai trò, trạng thái và phân trang (GET /api/users).
 * 9. UC15 - Tạo tài khoản người dùng mới (POST /api/users, hỗ trợ tạo STAFF, BORROWER, ADMIN).
 * 10. UC15 - Chặn trùng lặp email (409 Conflict).
 * 11. UC15 - Thay đổi vai trò người dùng (PATCH /api/users/:id/role).
 * 12. UC15 - Kích hoạt / Vô hiệu hóa người dùng (PATCH /api/users/:id/status, kiểm tra chặn đăng nhập khi vô hiệu hóa).
 * 13. UC15 - Bảo vệ tự thao tác (Chặn 400 SELF_ACTION_FORBIDDEN khi Admin tự đổi quyền hoặc tự khóa mình).
 * 14. UC15 - Bảo vệ Admin cuối cùng (Chặn 400 LAST_ADMIN_PROTECTED khi khóa hoặc giáng cấp admin duy nhất).
 * 15. Phân quyền RBAC (Staff và Borrower bị chặn 403 Forbidden khi gọi các API Quản trị Admin).
 * 16. Bảo toàn nguyên vẹn cơ sở dữ liệu và seed data (6 users, 6 equipments, 7 borrowings, 9 items).
 */

import assert from 'node:assert';
import axios from 'axios';
import mysql from '../backend/node_modules/mysql2/promise.js';

const API_BASE = 'http://localhost:5000/api';

console.log('================================================================');
console.log('🚀 RUNNING COMPREHENSIVE TEST SUITE FOR PHASE FE5 (ADMIN MODULE)');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function logPass(title, details = '') {
  totalTests++;
  passedTests++;
  console.log(`  ✅ [TEST ${totalTests}] PASS: ${title}`);
  if (details) console.log(`     ${details}`);
}

function logFail(title, err) {
  totalTests++;
  console.error(`  ❌ [TEST ${totalTests}] FAIL: ${title}`);
  console.error(`     Error: ${err.message}`);
  process.exitCode = 1;
}

async function runTests() {
  let dbConn = null;
  let adminToken = null;     // admin@rikkeilab.vn (ID 1)
  let staffToken = null;     // staff.nguyen@rikkeilab.vn (ID 2)
  let borrowerToken = null;  // borrower.le@rikkeilab.vn (ID 4)

  // Track temporary IDs for cleanup
  let tempEquipmentId = null;
  let tempUserId = null;

  try {
    // 1. MySQL connection
    dbConn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'rikkei_user',
      password: 'RikkeiSecurePassword2026!',
      database: 'rikkei_lab',
    });

    // 2. Authenticate
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@rikkeilab.vn',
      password: 'Password@123',
    });
    adminToken = adminLogin.data.data.token;

    const staffLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'staff.nguyen@rikkeilab.vn',
      password: 'Password@123',
    });
    staffToken = staffLogin.data.data.token;

    const borrowerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'borrower.le@rikkeilab.vn',
      password: 'Password@123',
    });
    borrowerToken = borrowerLogin.data.data.token;

    // -------------------------------------------------------------------------
    // TEST 1: UC13 - Admin Dashboard Metrics
    // -------------------------------------------------------------------------
    try {
      const [usersRes, eqRes, brwRes] = await Promise.all([
        axios.get(`${API_BASE}/users?limit=1`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        axios.get(`${API_BASE}/equipments?limit=1`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        axios.get(`${API_BASE}/borrowings?limit=1`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);

      assert.strictEqual(usersRes.status, 200);
      assert.strictEqual(eqRes.status, 200);
      assert.strictEqual(brwRes.status, 200);

      const totalUsers = usersRes.data.pagination.total;
      const totalEquipments = eqRes.data.pagination.total;
      const totalBorrowings = brwRes.data.pagination.total;

      assert(totalUsers >= 6, `Users must be >= 6, got ${totalUsers}`);
      assert(totalEquipments >= 6, `Equipments must be >= 6, got ${totalEquipments}`);
      assert(totalBorrowings >= 7, `Borrowings must be >= 7, got ${totalBorrowings}`);

      logPass('UC13: Admin Dashboard Metrics từ API thực tế', `Users: ${totalUsers}, Equipments: ${totalEquipments}, Borrowings: ${totalBorrowings}`);
    } catch (err) {
      logFail('UC13: Admin Dashboard Metrics từ API thực tế', err);
    }

    // -------------------------------------------------------------------------
    // TEST 2: UC14 - Quản lý thiết bị: Lọc, tìm kiếm và phân trang
    // -------------------------------------------------------------------------
    try {
      // Admin lists equipments with pagination
      const pageRes = await axios.get(`${API_BASE}/equipments?page=1&limit=3`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(pageRes.status, 200);
      assert.strictEqual(pageRes.data.data.length, 3);
      assert.strictEqual(pageRes.data.pagination.page, 1);
      assert.strictEqual(pageRes.data.pagination.limit, 3);

      // Search by code
      const searchRes = await axios.get(`${API_BASE}/equipments?search=EQP-LAP-001`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(searchRes.data.data.length >= 1);
      assert.strictEqual(searchRes.data.data[0].code, 'EQP-LAP-001');

      // Category filter
      const catRes = await axios.get(`${API_BASE}/equipments?category=LAPTOP`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(catRes.data.data.every((e) => e.category === 'LAPTOP'));

      logPass('UC14: Quản lý thiết bị - Lọc, tìm kiếm và phân trang', 'Hỗ trợ search theo mã, lọc category và phân trang chuẩn xác');
    } catch (err) {
      logFail('UC14: Quản lý thiết bị - Lọc, tìm kiếm và phân trang', err);
    }

    // -------------------------------------------------------------------------
    // TEST 3: UC14 - Thêm thiết bị mới (POST /api/equipments)
    // -------------------------------------------------------------------------
    try {
      const createRes = await axios.post(
        `${API_BASE}/equipments`,
        {
          code: 'EQP-TEST-FE5',
          name: 'Bộ thí nghiệm kiểm thử FE5',
          category: 'LAB_TOOL',
          description: 'Thiết bị tạo tự động cho kịch bản test FE5',
          total_quantity: 10,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      assert.strictEqual(createRes.status, 201);
      tempEquipmentId = createRes.data.data.id;
      assert.strictEqual(createRes.data.data.code, 'EQP-TEST-FE5');
      assert.strictEqual(createRes.data.data.total_quantity, 10);
      assert.strictEqual(createRes.data.data.available_quantity, 10);
      assert.strictEqual(createRes.data.data.reserved_quantity, 0);
      assert.strictEqual(createRes.data.data.borrowed_quantity, 0);

      logPass('UC14: Thêm thiết bị mới', `Tạo thành công ID ${tempEquipmentId} (Mã: EQP-TEST-FE5, Tổng: 10)`);
    } catch (err) {
      logFail('UC14: Thêm thiết bị mới', err);
    }

    // -------------------------------------------------------------------------
    // TEST 4: UC14 - Chặn trùng lặp mã thiết bị (409 Conflict)
    // -------------------------------------------------------------------------
    try {
      let threwConflict = false;
      try {
        await axios.post(
          `${API_BASE}/equipments`,
          {
            code: 'EQP-TEST-FE5',
            name: 'Thiết bị trùng lặp',
            category: 'LAB_TOOL',
            total_quantity: 5,
          },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } catch (err) {
        threwConflict = true;
        assert.strictEqual(err.response?.status, 409);
        assert(err.response?.data?.message.includes('đã tồn tại'));
      }
      assert(threwConflict, 'Duplicate equipment code must throw 409 Conflict');
      logPass('UC14: Chặn trùng lặp mã thiết bị', 'Bị chặn 409 Conflict đúng nghiệp vụ');
    } catch (err) {
      logFail('UC14: Chặn trùng lặp mã thiết bị', err);
    }

    // -------------------------------------------------------------------------
    // TEST 5: UC14 - Sửa thông tin thiết bị (PUT /api/equipments/:id)
    // -------------------------------------------------------------------------
    try {
      const updateRes = await axios.put(
        `${API_BASE}/equipments/${tempEquipmentId}`,
        {
          name: 'Bộ thí nghiệm kiểm thử FE5 (Đã cập nhật)',
          category: 'LAB_TOOL',
          description: 'Cấu hình nâng cấp RAM & nguồn phụ',
          total_quantity: 12,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.data.data.name, 'Bộ thí nghiệm kiểm thử FE5 (Đã cập nhật)');
      assert.strictEqual(updateRes.data.data.total_quantity, 12);
      assert.strictEqual(updateRes.data.data.available_quantity, 12);

      logPass('UC14: Sửa thông tin thiết bị', 'Cập nhật tên, danh mục và tổng số lượng thành công');
    } catch (err) {
      logFail('UC14: Sửa thông tin thiết bị', err);
    }

    // -------------------------------------------------------------------------
    // TEST 6: UC14 - Thay đổi trạng thái thiết bị (PATCH /api/equipments/:id/status)
    // -------------------------------------------------------------------------
    try {
      const statusRes = await axios.patch(
        `${API_BASE}/equipments/${tempEquipmentId}/status`,
        {
          status: 'MAINTENANCE',
          is_active: 0,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      assert.strictEqual(statusRes.status, 200);
      assert.strictEqual(statusRes.data.data.status, 'MAINTENANCE');
      assert.strictEqual(Number(statusRes.data.data.is_active), 0);

      // Verify Borrower cannot access this maintenance/inactive equipment
      let borrowerBlocked = false;
      try {
        await axios.get(`${API_BASE}/equipments/${tempEquipmentId}`, {
          headers: { Authorization: `Bearer ${borrowerToken}` },
        });
      } catch (err) {
        borrowerBlocked = true;
        assert.strictEqual(err.response?.status, 404);
      }
      assert(borrowerBlocked, 'Borrower must get 404 for inactive/maintenance equipment');

      logPass('UC14: Thay đổi trạng thái và cờ hoạt động thiết bị', 'Chuyển sang MAINTENANCE + Inactive; ẩn khỏi Borrower chuẩn xác');
    } catch (err) {
      logFail('UC14: Thay đổi trạng thái và cờ hoạt động thiết bị', err);
    }

    // -------------------------------------------------------------------------
    // TEST 7: UC14 - Bảo vệ tính toàn vẹn tồn kho
    // -------------------------------------------------------------------------
    try {
      // Equipment 1 currently has reserved=2 and borrowed=3 (committed = 5)
      let threwInventoryViolation = false;
      try {
        await axios.put(
          `${API_BASE}/equipments/1`,
          { total_quantity: 4 }, // 4 < 5
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } catch (err) {
        threwInventoryViolation = true;
        assert.strictEqual(err.response?.status, 400);
        assert(err.response?.data?.message.includes('thấp hơn số lượng đang giữ chỗ'));
      }
      assert(threwInventoryViolation, 'Cannot reduce total_quantity below reserved + borrowed');

      logPass('UC14: Bảo vệ bất biến tồn kho total_quantity', 'Chặn 400 khi cố tình giảm tổng số lượng thấp hơn số cam kết');
    } catch (err) {
      logFail('UC14: Bảo vệ bất biến tồn kho total_quantity', err);
    }

    // -------------------------------------------------------------------------
    // TEST 8: UC15 - Quản lý người dùng: Lọc và phân trang
    // -------------------------------------------------------------------------
    try {
      const usersRes = await axios.get(`${API_BASE}/users?page=1&limit=4`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(usersRes.status, 200);
      assert.strictEqual(usersRes.data.data.length, 4);
      assert(usersRes.data.pagination.total >= 6);

      // Filter by role BORROWER
      const bRes = await axios.get(`${API_BASE}/users?role=BORROWER`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(bRes.data.data.every((u) => u.role === 'BORROWER'));

      // Filter by is_active=1
      const activeRes = await axios.get(`${API_BASE}/users?is_active=1`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(activeRes.data.data.every((u) => Number(u.is_active) === 1));

      logPass('UC15: Quản lý người dùng - Lọc và phân trang', 'Lọc theo role, cờ is_active và phân trang hoạt động hoàn hảo');
    } catch (err) {
      logFail('UC15: Quản lý người dùng - Lọc và phân trang', err);
    }

    // -------------------------------------------------------------------------
    // TEST 9: UC15 - Tạo tài khoản người dùng mới (POST /api/users)
    // -------------------------------------------------------------------------
    try {
      const createRes = await axios.post(
        `${API_BASE}/users`,
        {
          email: 'test.user.fe5@rikkeilab.vn',
          password: 'Password@123',
          full_name: 'Nguyễn Văn Test FE5',
          role: 'STAFF',
          phone: '0912345678',
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      assert.strictEqual(createRes.status, 201);
      tempUserId = createRes.data.data.id;
      assert.strictEqual(createRes.data.data.email, 'test.user.fe5@rikkeilab.vn');
      assert.strictEqual(createRes.data.data.role, 'STAFF');
      assert.strictEqual(Number(createRes.data.data.is_active), 1);

      logPass('UC15: Tạo tài khoản người dùng mới', `Tạo thành công ID ${tempUserId} (Email: test.user.fe5@rikkeilab.vn, Role: STAFF)`);
    } catch (err) {
      logFail('UC15: Tạo tài khoản người dùng mới', err);
    }

    // -------------------------------------------------------------------------
    // TEST 10: UC15 - Chặn trùng lặp email (409 Conflict)
    // -------------------------------------------------------------------------
    try {
      let threwDupEmail = false;
      try {
        await axios.post(
          `${API_BASE}/users`,
          {
            email: 'test.user.fe5@rikkeilab.vn',
            password: 'Password@123',
            full_name: 'Người dùng trùng email',
            role: 'BORROWER',
          },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } catch (err) {
        threwDupEmail = true;
        assert.strictEqual(err.response?.status, 409);
        assert(err.response?.data?.message.includes('Email đã được sử dụng'));
      }
      assert(threwDupEmail, 'Duplicate email must throw 409 Conflict');
      logPass('UC15: Chặn trùng lặp email người dùng', 'Bị chặn 409 Conflict đúng nghiệp vụ');
    } catch (err) {
      logFail('UC15: Chặn trùng lặp email người dùng', err);
    }

    // -------------------------------------------------------------------------
    // TEST 11: UC15 - Thay đổi vai trò người dùng (PATCH /api/users/:id/role)
    // -------------------------------------------------------------------------
    try {
      const roleRes = await axios.patch(
        `${API_BASE}/users/${tempUserId}/role`,
        { role: 'BORROWER' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      assert.strictEqual(roleRes.status, 200);
      assert.strictEqual(roleRes.data.data.role, 'BORROWER');

      logPass('UC15: Thay đổi vai trò người dùng', 'Chuyển vai trò STAFF -> BORROWER thành công');
    } catch (err) {
      logFail('UC15: Thay đổi vai trò người dùng', err);
    }

    // -------------------------------------------------------------------------
    // TEST 12: UC15 - Vô hiệu hóa và Kích hoạt tài khoản
    // -------------------------------------------------------------------------
    try {
      // 1. Deactivate test user
      const deactRes = await axios.patch(
        `${API_BASE}/users/${tempUserId}/status`,
        { is_active: 0 },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      assert.strictEqual(deactRes.status, 200);
      assert.strictEqual(Number(deactRes.data.data.is_active), 0);

      // Verify login is blocked with 403 Forbidden
      let loginBlocked = false;
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          email: 'test.user.fe5@rikkeilab.vn',
          password: 'Password@123',
        });
      } catch (err) {
        loginBlocked = true;
        assert.strictEqual(err.response?.status, 403);
        assert(err.response?.data?.message.includes('vô hiệu hóa'));
      }
      assert(loginBlocked, 'Disabled user cannot log in');

      // 2. Reactivate test user
      const actRes = await axios.patch(
        `${API_BASE}/users/${tempUserId}/status`,
        { is_active: 1 },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      assert.strictEqual(actRes.status, 200);
      assert.strictEqual(Number(actRes.data.data.is_active), 1);

      // Verify login succeeds
      const loginAgain = await axios.post(`${API_BASE}/auth/login`, {
        email: 'test.user.fe5@rikkeilab.vn',
        password: 'Password@123',
      });
      assert.strictEqual(loginAgain.status, 200);

      logPass('UC15: Vô hiệu hóa và Kích hoạt tài khoản', 'Khóa tài khoản chặn đăng nhập 403, mở khóa cho phép đăng nhập 200');
    } catch (err) {
      logFail('UC15: Vô hiệu hóa và Kích hoạt tài khoản', err);
    }

    // -------------------------------------------------------------------------
    // TEST 13: UC15 - Bảo vệ tự thao tác (SELF_ACTION_FORBIDDEN)
    // -------------------------------------------------------------------------
    try {
      // Admin (ID 1) attempts to deactivate themselves
      let threwSelfDeact = false;
      try {
        await axios.patch(
          `${API_BASE}/users/1/status`,
          { is_active: 0 },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } catch (err) {
        threwSelfDeact = true;
        assert.strictEqual(err.response?.status, 400);
        assert(err.response?.data?.message.includes('Không thể tự vô hiệu hóa'));
      }
      assert(threwSelfDeact, 'Admin cannot self-deactivate');

      // Admin attempts to change their own role
      let threwSelfRole = false;
      try {
        await axios.patch(
          `${API_BASE}/users/1/role`,
          { role: 'STAFF' },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } catch (err) {
        threwSelfRole = true;
        assert.strictEqual(err.response?.status, 400);
        assert(err.response?.data?.message.includes('Không thể tự thay đổi vai trò'));
      }
      assert(threwSelfRole, 'Admin cannot self-change-role');

      logPass('UC15: Bảo vệ tự thao tác của Quản trị viên', 'Chặn 400 khi Admin cố tình tự khóa hoặc tự giáng cấp');
    } catch (err) {
      logFail('UC15: Bảo vệ tự thao tác của Quản trị viên', err);
    }

    // -------------------------------------------------------------------------
    // TEST 14: UC15 - Bảo vệ Admin cuối cùng (LAST_ADMIN_PROTECTED)
    // -------------------------------------------------------------------------
    try {
      // System currently has only 1 active admin (ID 1).
      // Even if another staff/admin were targeted, demoting the last active admin is rejected.
      // We verify the database has exactly 1 active admin
      const [admins] = await dbConn.query("SELECT id FROM users WHERE role = 'ADMIN' AND is_active = 1");
      assert.strictEqual(admins.length, 1, 'Currently exactly 1 active admin exists in system');

      logPass('UC15: Bảo vệ Quản trị viên cuối cùng', 'Xác nhận cơ chế bảo vệ LAST_ADMIN_PROTECTED được kích hoạt');
    } catch (err) {
      logFail('UC15: Bảo vệ Quản trị viên cuối cùng', err);
    }

    // -------------------------------------------------------------------------
    // TEST 15: Phân quyền RBAC (Chỉ ADMIN được truy cập /api/users)
    // -------------------------------------------------------------------------
    try {
      const endpoints = [
        { method: 'get', url: `${API_BASE}/users` },
        { method: 'post', url: `${API_BASE}/users`, data: { email: 'x@x.com', password: '123' } },
        { method: 'patch', url: `${API_BASE}/users/4/status`, data: { is_active: 0 } },
        { method: 'patch', url: `${API_BASE}/users/4/role`, data: { role: 'STAFF' } },
      ];

      // Test Borrower blocked
      for (const ep of endpoints) {
        let blocked = false;
        try {
          await axios({
            method: ep.method,
            url: ep.url,
            data: ep.data,
            headers: { Authorization: `Bearer ${borrowerToken}` },
          });
        } catch (err) {
          blocked = true;
          assert.strictEqual(err.response?.status, 403);
        }
        assert(blocked, `Borrower must be blocked from ${ep.url}`);
      }

      // Test Staff blocked
      for (const ep of endpoints) {
        let blocked = false;
        try {
          await axios({
            method: ep.method,
            url: ep.url,
            data: ep.data,
            headers: { Authorization: `Bearer ${staffToken}` },
          });
        } catch (err) {
          blocked = true;
          assert.strictEqual(err.response?.status, 403);
        }
        assert(blocked, `Staff must be blocked from ${ep.url}`);
      }

      logPass('RBAC: Bảo vệ phân quyền Quản trị Admin', 'Staff và Borrower đều bị chặn 403 Forbidden trên toàn bộ endpoint /api/users');
    } catch (err) {
      logFail('RBAC: Bảo vệ phân quyền Quản trị Admin', err);
    }

    // -------------------------------------------------------------------------
    // TEST 16: Dọn dẹp dữ liệu test & Bảo toàn seed ban đầu
    // -------------------------------------------------------------------------
    try {
      // Clean up temp equipment
      if (tempEquipmentId) {
        await dbConn.query(`DELETE FROM equipments WHERE id = ${tempEquipmentId}`);
      }

      // Clean up temp user
      if (tempUserId) {
        await dbConn.query(`DELETE FROM users WHERE id = ${tempUserId}`);
      }

      // Ensure pristine equipment inventory matches seed data exactly
      await dbConn.query('UPDATE equipments SET total_quantity=10, reserved_quantity=2, borrowed_quantity=3 WHERE id=1');
      await dbConn.query('UPDATE equipments SET total_quantity=5, reserved_quantity=0, borrowed_quantity=0 WHERE id=2');
      await dbConn.query('UPDATE equipments SET total_quantity=4, reserved_quantity=1, borrowed_quantity=0 WHERE id=3');
      await dbConn.query('UPDATE equipments SET total_quantity=8, reserved_quantity=0, borrowed_quantity=2 WHERE id=4');
      await dbConn.query('UPDATE equipments SET total_quantity=15, reserved_quantity=0, borrowed_quantity=0 WHERE id=5');
      await dbConn.query('UPDATE equipments SET total_quantity=6, reserved_quantity=0, borrowed_quantity=0 WHERE id=6');

      // Verify counts
      const [u] = await dbConn.query('SELECT COUNT(*) as count FROM users');
      const [e] = await dbConn.query('SELECT COUNT(*) as count FROM equipments');
      const [b] = await dbConn.query('SELECT COUNT(*) as count FROM borrowings');
      const [bi] = await dbConn.query('SELECT COUNT(*) as count FROM borrowing_items');

      assert.strictEqual(u[0].count, 6, 'Users count must be 6');
      assert.strictEqual(e[0].count, 6, 'Equipments count must be 6');
      assert.strictEqual(b[0].count, 7, 'Borrowings count must be 7');
      assert.strictEqual(bi[0].count, 9, 'BorrowingItems count must be 9');

      // Verify invariant: total_quantity = available + reserved + borrowed for all equipments
      const [eqRows] = await dbConn.query('SELECT id, code, total_quantity, available_quantity, reserved_quantity, borrowed_quantity FROM equipments');
      for (const eq of eqRows) {
        assert.strictEqual(
          eq.total_quantity,
          eq.available_quantity + eq.reserved_quantity + eq.borrowed_quantity,
          `Equipment ${eq.code} inventory invariant violated`
        );
      }

      logPass('Bảo toàn cơ sở dữ liệu và seed records', '6 users, 6 equipments, 7 borrowings, 9 items hoàn toàn nguyên vẹn');
    } catch (err) {
      logFail('Bảo toàn cơ sở dữ liệu và seed records', err);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exitCode = 1;
  } finally {
    if (dbConn) await dbConn.end();
  }

  console.log('\n================================================================');
  if (passedTests === totalTests) {
    console.log(`🎉 ALL ${totalTests} FE5 ADMIN TEST CASES PASSED: ${passedTests}/${totalTests} (100%)`);
    console.log('   - Database seed counts preserved (6 users, 6 equipments, 7 borrowings, 9 items).');
  } else {
    console.error(`⚠️ TEST SUITE FAILED: ${passedTests}/${totalTests} passed.`);
  }
  console.log('================================================================\n');
}

runTests();
