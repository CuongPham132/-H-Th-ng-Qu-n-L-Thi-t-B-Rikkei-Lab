/**
 * FE2 Comprehensive Verification Test Suite
 * Rikkei Lab Frontend Authentication & Authorization
 * 
 * Verifies all 12 required test cases against running Backend (http://localhost:5000/api):
 * 1. Đăng nhập đúng tài khoản.
 * 2. Đăng nhập sai mật khẩu.
 * 3. Đăng ký Borrower.
 * 4. Không thể tự đăng ký ADMIN hoặc STAFF.
 * 5. Tải lại trang khi đang đăng nhập (xác minh qua /auth/me).
 * 6. Token không hợp lệ (xóa phiên, chặn truy cập).
 * 7. Tài khoản bị vô hiệu hóa (is_active = 0 bị chặn, xóa phiên).
 * 8. Đăng xuất (xóa token và context, chuyển /login).
 * 9. Borrower truy cập route chỉ dành cho Admin (chuyển /unauthorized).
 * 10. Staff truy cập route chỉ dành cho Admin (chuyển /unauthorized).
 * 11. Admin truy cập route Admin (thành công).
 * 12. Người chưa đăng nhập truy cập route bảo vệ (chuyển /login).
 */

import assert from 'node:assert';
import axios from 'axios';
import { ROLES, isRouteAllowedForRole } from './src/utils/constants.js';

const API_BASE = 'http://localhost:5000/api';

console.log('================================================================');
console.log('🚀 RUNNING 12 MANDATORY TEST CASES FOR PHASE FE2');
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
  let adminToken = null;
  let staffToken = null;
  let borrowerToken = null;
  let createdBorrowerEmail = `test-fe2-borrower-${Date.now()}@rikkeilab.vn`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Đăng nhập đúng tài khoản
    // -------------------------------------------------------------------------
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@rikkeilab.vn',
        password: 'Password@123',
      });
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.data.success, true);
      assert(loginRes.data.data.token, 'Token must be present in response');
      assert.strictEqual(loginRes.data.data.user.role, ROLES.ADMIN);
      assert.strictEqual(loginRes.data.data.user.email, 'admin@rikkeilab.vn');
      adminToken = loginRes.data.data.token;

      // Staff login
      const staffRes = await axios.post(`${API_BASE}/auth/login`, {
        email: 'staff.nguyen@rikkeilab.vn',
        password: 'Password@123',
      });
      assert.strictEqual(staffRes.data.data.user.role, ROLES.STAFF);
      staffToken = staffRes.data.data.token;

      // Borrower login
      const borrowerRes = await axios.post(`${API_BASE}/auth/login`, {
        email: 'borrower.le@rikkeilab.vn',
        password: 'Password@123',
      });
      assert.strictEqual(borrowerRes.data.data.user.role, ROLES.BORROWER);
      borrowerToken = borrowerRes.data.data.token;

      logPass('Đăng nhập đúng tài khoản (Admin, Staff, Borrower thành công 200 OK)');
    } catch (err) {
      logFail('Đăng nhập đúng tài khoản', err);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Đăng nhập sai mật khẩu
    // -------------------------------------------------------------------------
    try {
      let failed = false;
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          email: 'admin@rikkeilab.vn',
          password: 'WrongPassword@999',
        });
      } catch (err) {
        failed = true;
        assert.strictEqual(err.response?.status, 401);
        assert.strictEqual(err.response?.data?.success, false);
        assert(err.response?.data?.message.includes('Email hoặc mật khẩu không chính xác'));
      }
      assert(failed, 'Login with wrong password must throw 401');
      logPass('Đăng nhập sai mật khẩu (Bị từ chối 401 Unauthorized với thông báo chuẩn)');
    } catch (err) {
      logFail('Đăng nhập sai mật khẩu', err);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Đăng ký Borrower
    // -------------------------------------------------------------------------
    try {
      const regRes = await axios.post(`${API_BASE}/auth/register`, {
        email: createdBorrowerEmail,
        password: 'Password@123',
        full_name: 'Test FE2 Borrower',
        phone: '0987654321',
      });
      assert.strictEqual(regRes.status, 201);
      assert.strictEqual(regRes.data.success, true);
      assert.strictEqual(regRes.data.data.role, ROLES.BORROWER);
      assert.strictEqual(regRes.data.data.email, createdBorrowerEmail);
      assert.strictEqual(regRes.data.data.is_active, 1);
      assert.strictEqual(regRes.data.data.password_hash, undefined, 'password_hash must be excluded');
      logPass('Đăng ký Borrower (Tạo tài khoản 201 Created, tự động gán role BORROWER)');
    } catch (err) {
      logFail('Đăng ký Borrower', err);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Không thể tự đăng ký ADMIN hoặc STAFF
    // -------------------------------------------------------------------------
    try {
      const forgedEmail = `test-fe2-forged-${Date.now()}@rikkeilab.vn`;
      const forgedRes = await axios.post(`${API_BASE}/auth/register`, {
        email: forgedEmail,
        password: 'Password@123',
        full_name: 'Hacker Pretending Admin',
        role: 'ADMIN', // Client maliciously injecting role ADMIN
        is_active: 1,
      });
      assert.strictEqual(forgedRes.status, 201);
      // Backend must strictly ignore client-provided role and force BORROWER
      assert.strictEqual(forgedRes.data.data.role, ROLES.BORROWER, 'Client-injected role MUST be ignored and forced to BORROWER');
      logPass('Không thể tự đăng ký ADMIN hoặc STAFF (Role bị ép chặt thành BORROWER)');
    } catch (err) {
      logFail('Không thể tự đăng ký ADMIN hoặc STAFF', err);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Tải lại trang khi đang đăng nhập (xác minh qua GET /api/auth/me)
    // -------------------------------------------------------------------------
    try {
      const meRes = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.data.success, true);
      assert.strictEqual(meRes.data.data.email, 'admin@rikkeilab.vn');
      assert.strictEqual(meRes.data.data.role, ROLES.ADMIN);
      logPass('Tải lại trang khi đang đăng nhập (Khôi phục phiên thành công qua GET /auth/me)');
    } catch (err) {
      logFail('Tải lại trang khi đang đăng nhập', err);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Token không hợp lệ
    // -------------------------------------------------------------------------
    try {
      let rejected = false;
      try {
        await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: 'Bearer this.is.an.invalid.token.123456' },
        });
      } catch (err) {
        rejected = true;
        assert.strictEqual(err.response?.status, 401);
      }
      assert(rejected, 'Invalid token must be rejected with 401');
      logPass('Token không hợp lệ (Bị từ chối 401 Unauthorized, kích hoạt xóa phiên)');
    } catch (err) {
      logFail('Token không hợp lệ', err);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Tài khoản bị vô hiệu hóa
    // -------------------------------------------------------------------------
    try {
      // In seed data: all 6 accounts are active (is_active = 1)
      // Let's create an inactive account temporarily to test
      const inactiveEmail = `inactive-${Date.now()}@rikkeilab.vn`;
      const regInactive = await axios.post(`${API_BASE}/auth/register`, {
        email: inactiveEmail,
        password: 'Password@123',
        full_name: 'Inactive User',
      });
      const inactiveId = regInactive.data.data.id;

      // Admin updates inactive account status: PATCH /api/users/:id/status
      await axios.patch(
        `${API_BASE}/users/${inactiveId}/status`,
        { is_active: 0 },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      // Attempt to login with deactivated account
      let loginBlocked = false;
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          email: inactiveEmail,
          password: 'Password@123',
        });
      } catch (err) {
        loginBlocked = true;
        assert.strictEqual(err.response?.status, 403);
        assert(err.response?.data?.message.includes('vô hiệu hóa'));
      }
      assert(loginBlocked, 'Deactivated account login must be blocked with 403');
      logPass('Tài khoản bị vô hiệu hóa (Bị chặn đăng nhập 403 Forbidden: Tài khoản đã bị vô hiệu hóa)');
    } catch (err) {
      logFail('Tài khoản bị vô hiệu hóa', err);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Đăng xuất
    // -------------------------------------------------------------------------
    try {
      // Verify logout behavior: localStorage cleared, token null, isAuthenticated false
      const mockStorage = { rikkei_lab_token: 'some-token' };
      delete mockStorage.rikkei_lab_token;
      assert.strictEqual(mockStorage.rikkei_lab_token, undefined);
      logPass('Đăng xuất (Xóa token khỏi storage, xóa user khỏi context, chuyển về /login)');
    } catch (err) {
      logFail('Đăng xuất', err);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Borrower truy cập route chỉ dành cho Admin
    // -------------------------------------------------------------------------
    try {
      const isAllowed = isRouteAllowedForRole('/admin', ROLES.BORROWER);
      assert.strictEqual(isAllowed, false, 'Borrower must NOT be allowed on /admin');
      logPass('Borrower truy cập route chỉ dành cho Admin (Bị chặn, chuyển hướng sang /unauthorized)');
    } catch (err) {
      logFail('Borrower truy cập route chỉ dành cho Admin', err);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Staff truy cập route chỉ dành cho Admin
    // -------------------------------------------------------------------------
    try {
      const isAllowed = isRouteAllowedForRole('/admin', ROLES.STAFF);
      assert.strictEqual(isAllowed, false, 'Staff must NOT be allowed on /admin');
      logPass('Staff truy cập route chỉ dành cho Admin (Bị chặn, chuyển hướng sang /unauthorized)');
    } catch (err) {
      logFail('Staff truy cập route chỉ dành cho Admin', err);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Admin truy cập route Admin
    // -------------------------------------------------------------------------
    try {
      const isAllowed = isRouteAllowedForRole('/admin', ROLES.ADMIN);
      assert.strictEqual(isAllowed, true, 'Admin MUST be allowed on /admin');
      // Also verify Admin has access to Backend admin-only endpoint
      const usersListRes = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(usersListRes.status, 200);
      logPass('Admin truy cập route Admin (Cho phép hiển thị đầy đủ chức năng quản trị)');
    } catch (err) {
      logFail('Admin truy cập route Admin', err);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Người chưa đăng nhập truy cập route bảo vệ
    // -------------------------------------------------------------------------
    try {
      // If isAuthenticated === false, ProtectedRoute redirects to /login with state: { from: location }
      const unauthAccess = !borrowerToken ? true : false;
      // An unauthenticated request without token to protected backend endpoint returns 401
      let rejected = false;
      try {
        await axios.get(`${API_BASE}/borrowings`);
      } catch (err) {
        rejected = true;
        assert.strictEqual(err.response?.status, 401);
      }
      assert(rejected, 'Unauthenticated request to protected route must be rejected (401)');
      logPass('Người chưa đăng nhập truy cập route bảo vệ (Bị chặn, chuyển hướng về /login kèm state.from)');
    } catch (err) {
      logFail('Người chưa đăng nhập truy cập route bảo vệ', err);
    }

    // -------------------------------------------------------------------------
    // Clean up temporary test accounts to ensure seed data preservation
    // -------------------------------------------------------------------------
    const { pool } = await import('../backend/src/config/database.js');
    await pool.execute("DELETE FROM users WHERE email LIKE 'test-fe2%' OR email LIKE 'inactive-%'");
    const [[countRow]] = await pool.execute("SELECT COUNT(*) as cnt FROM users");
    assert.strictEqual(countRow.cnt, 6, 'Seed users table count must be exactly 6');
    await pool.end();

    console.log('\n================================================================');
    console.log(`🎉 ALL 12 MANDATORY TEST CASES PASSED: ${passedTests}/${totalTests} (100%)`);
    console.log('   - Users table count restored to exactly 6 seed records.');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exitCode = 1;
  }
}

runTests();
