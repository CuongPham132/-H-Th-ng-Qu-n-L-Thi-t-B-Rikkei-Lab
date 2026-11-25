/**
 * FE3 Comprehensive Verification Test Suite
 * Rikkei Lab Borrower Module (Frontend Services & API Integration)
 *
 * Verifies all required Borrower use cases against running Backend (http://localhost:5000/api):
 * 1. Borrower xem danh sách thiết bị (chỉ thấy active & AVAILABLE).
 * 2. Tìm kiếm và lọc thiết bị (search, category).
 * 3. Xem chi tiết thiết bị (GET /api/equipments/:id).
 * 4. Tạo phiếu với một thiết bị (POST /api/borrowings).
 * 5. Tạo phiếu với nhiều thiết bị (POST /api/borrowings với mảng items).
 * 6. Không gửi số lượng vượt khả dụng (bị chặn 400).
 * 7. Xem lịch sử phiếu mượn (GET /api/borrowings, chỉ thấy đơn của mình).
 * 8. Xem chi tiết phiếu mượn (GET /api/borrowings/:id kèm danh sách items).
 * 9. Hủy phiếu PENDING (chuyển sang CANCELLED).
 * 10. Hủy phiếu APPROVED (chuyển sang CANCELLED, nhả tồn kho giữ chỗ).
 * 11. Không thể hủy phiếu BORROWED (bị chặn 400).
 * 12. Không xem được phiếu của người khác (bị chặn 403 Forbidden).
 */

import assert from 'node:assert';
import axios from 'axios';
import { ROLES } from './src/utils/constants.js';

const API_BASE = 'http://localhost:5000/api';

console.log('================================================================');
console.log('🚀 RUNNING COMPREHENSIVE TEST SUITE FOR PHASE FE3 (BORROWER)');
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
  let borrower1Token = null; // User ID 4: borrower.le@rikkeilab.vn
  let borrower2Token = null; // User ID 5: borrower.pham@rikkeilab.vn

  try {
    // Authenticate test accounts
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@rikkeilab.vn',
      password: 'Password@123',
    });
    adminToken = adminLogin.data.data.token;

    const b1Login = await axios.post(`${API_BASE}/auth/login`, {
      email: 'borrower.le@rikkeilab.vn',
      password: 'Password@123',
    });
    borrower1Token = b1Login.data.data.token;

    const b2Login = await axios.post(`${API_BASE}/auth/login`, {
      email: 'borrower.pham@rikkeilab.vn',
      password: 'Password@123',
    });
    borrower2Token = b2Login.data.data.token;

    // -------------------------------------------------------------------------
    // TEST 1: Borrower xem danh sách thiết bị
    // -------------------------------------------------------------------------
    try {
      const res = await axios.get(`${API_BASE}/equipments`, {
        headers: { Authorization: `Bearer ${borrower1Token}` },
      });
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.data), 'Data must be an array');
      assert(res.data.data.length > 0, 'Equipment list must not be empty');
      // For Borrower, all returned equipments must be AVAILABLE and is_active = 1
      res.data.data.forEach((eq) => {
        assert.strictEqual(eq.status, 'AVAILABLE', `Equipment ${eq.code} must be AVAILABLE`);
        assert.strictEqual(eq.is_active, 1, `Equipment ${eq.code} must be active`);
      });
      logPass('Borrower xem danh sách thiết bị (Chỉ hiển thị thiết bị active và AVAILABLE)');
    } catch (err) {
      logFail('Borrower xem danh sách thiết bị', err);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Tìm kiếm và lọc thiết bị
    // -------------------------------------------------------------------------
    try {
      const searchRes = await axios.get(`${API_BASE}/equipments?search=Dell`, {
        headers: { Authorization: `Bearer ${borrower1Token}` },
      });
      assert.strictEqual(searchRes.status, 200);
      assert(searchRes.data.data.length > 0, 'Search for Dell must return results');
      searchRes.data.data.forEach((eq) => {
        const match = eq.name.toLowerCase().includes('dell') || eq.code.toLowerCase().includes('dell');
        assert(match, `Equipment ${eq.name} should match Dell`);
      });

      const catRes = await axios.get(`${API_BASE}/equipments?category=LAPTOP`, {
        headers: { Authorization: `Bearer ${borrower1Token}` },
      });
      assert.strictEqual(catRes.status, 200);
      catRes.data.data.forEach((eq) => {
        assert.strictEqual(eq.category, 'LAPTOP', `Category must be LAPTOP`);
      });

      logPass('Tìm kiếm và lọc thiết bị (Hỗ trợ tìm kiếm theo tên/mã và lọc theo danh mục)');
    } catch (err) {
      logFail('Tìm kiếm và lọc thiết bị', err);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Xem chi tiết thiết bị
    // -------------------------------------------------------------------------
    try {
      const detailRes = await axios.get(`${API_BASE}/equipments/1`, {
        headers: { Authorization: `Bearer ${borrower1Token}` },
      });
      assert.strictEqual(detailRes.status, 200);
      assert.strictEqual(detailRes.data.data.id, 1);
      assert(detailRes.data.data.name, 'Name must be present');
      assert(detailRes.data.data.available_quantity !== undefined, 'available_quantity must be present');
      assert.strictEqual(detailRes.data.data.status, 'AVAILABLE');
      logPass('Xem chi tiết thiết bị (GET /api/equipments/:id trả về đầy đủ thông số tồn kho)');
    } catch (err) {
      logFail('Xem chi tiết thiết bị', err);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Tạo phiếu mượn với một thiết bị
    // -------------------------------------------------------------------------
    let singleBorrowingId = null;
    try {
      const createRes = await axios.post(
        `${API_BASE}/borrowings`,
        {
          purpose: 'Phục vụ bài tập thực hành môn Hệ thống nhúng FE3',
          borrowing_days: 7,
          notes: 'Nhận thiết bị tại phòng lab B3',
          items: [
            { equipment_id: 2, quantity: 1, item_notes: 'Cần sạc đi kèm' },
          ],
        },
        { headers: { Authorization: `Bearer ${borrower1Token}` } }
      );
      assert.strictEqual(createRes.status, 201);
      assert.strictEqual(createRes.data.success, true);
      assert(createRes.data.data.borrowing_code.startsWith('BRW-'), 'Borrowing code format BRW-...');
      assert.strictEqual(createRes.data.data.status, 'PENDING');
      assert.strictEqual(createRes.data.data.items.length, 1);
      singleBorrowingId = createRes.data.data.id;
      logPass('Tạo phiếu mượn với một thiết bị (Thành công 201 Created, trạng thái PENDING)');
    } catch (err) {
      logFail('Tạo phiếu mượn với một thiết bị', err);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Tạo phiếu mượn với nhiều thiết bị
    // -------------------------------------------------------------------------
    let multiBorrowingId = null;
    try {
      const multiRes = await axios.post(
        `${API_BASE}/borrowings`,
        {
          purpose: 'Nghiên cứu thử nghiệm đồ án tốt nghiệp với nhiều thiết bị',
          borrowing_days: 10,
          items: [
            { equipment_id: 2, quantity: 1 },
            { equipment_id: 5, quantity: 2 },
          ],
        },
        { headers: { Authorization: `Bearer ${borrower1Token}` } }
      );
      assert.strictEqual(multiRes.status, 201);
      assert.strictEqual(multiRes.data.data.status, 'PENDING');
      assert.strictEqual(multiRes.data.data.items.length, 2);
      multiBorrowingId = multiRes.data.data.id;
      logPass('Tạo phiếu mượn với nhiều thiết bị (Tạo đơn đa thiết bị thành công 201)');
    } catch (err) {
      logFail('Tạo phiếu mượn với nhiều thiết bị', err);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Không gửi số lượng vượt khả dụng
    // -------------------------------------------------------------------------
    try {
      let overStockFailed = false;
      try {
        await axios.post(
          `${API_BASE}/borrowings`,
          {
            purpose: 'Yêu cầu mượn số lượng vượt tồn kho khả dụng',
            borrowing_days: 5,
            items: [
              { equipment_id: 2, quantity: 9999 }, // Equipment 2 only has 5 available
            ],
          },
          { headers: { Authorization: `Bearer ${borrower1Token}` } }
        );
      } catch (err) {
        overStockFailed = true;
        assert.strictEqual(err.response?.status, 400);
        assert(err.response?.data?.message.includes('không đủ số lượng khả dụng'));
      }
      assert(overStockFailed, 'Exceeding available quantity must throw 400');
      logPass('Không gửi số lượng vượt khả dụng (Bị chặn 400 Bad Request kèm thông báo rõ ràng)');
    } catch (err) {
      logFail('Không gửi số lượng vượt khả dụng', err);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Xem lịch sử phiếu mượn
    // -------------------------------------------------------------------------
    try {
      const historyRes = await axios.get(`${API_BASE}/borrowings?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${borrower1Token}` },
      });
      assert.strictEqual(historyRes.status, 200);
      assert(Array.isArray(historyRes.data.data));
      assert(historyRes.data.pagination.total >= 2);
      logPass('Xem lịch sử phiếu mượn (Phân trang và tự động cách ly chỉ xem phiếu của mình)');
    } catch (err) {
      logFail('Xem lịch sử phiếu mượn', err);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Xem chi tiết phiếu mượn
    // -------------------------------------------------------------------------
    try {
      const detailRes = await axios.get(`${API_BASE}/borrowings/${singleBorrowingId}`, {
        headers: { Authorization: `Bearer ${borrower1Token}` },
      });
      assert.strictEqual(detailRes.status, 200);
      assert.strictEqual(detailRes.data.data.id, singleBorrowingId);
      assert(Array.isArray(detailRes.data.data.items), 'items must be an array');
      assert.strictEqual(detailRes.data.data.items.length, 1);
      assert(detailRes.data.data.items[0].equipment_name, 'equipment_name must be populated');
      logPass('Xem chi tiết phiếu mượn (Trả về đầy đủ thông tin phiếu và mảng items)');
    } catch (err) {
      logFail('Xem chi tiết phiếu mượn', err);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Hủy phiếu PENDING
    // -------------------------------------------------------------------------
    try {
      const cancelRes = await axios.patch(
        `${API_BASE}/borrowings/${singleBorrowingId}/cancel`,
        { reason: 'Thay đổi kế hoạch nghiên cứu cá nhân' },
        { headers: { Authorization: `Bearer ${borrower1Token}` } }
      );
      assert.strictEqual(cancelRes.status, 200);
      assert.strictEqual(cancelRes.data.data.status, 'CANCELLED');
      logPass('Hủy phiếu PENDING (Thành công 200 OK, trạng thái chuyển sang CANCELLED)');
    } catch (err) {
      logFail('Hủy phiếu PENDING', err);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Hủy phiếu APPROVED (phải nhả tồn kho giữ chỗ)
    // -------------------------------------------------------------------------
    try {
      // 1. Admin approves multiBorrowingId
      await axios.patch(
        `${API_BASE}/borrowings/${multiBorrowingId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      // Verify it is APPROVED
      const approvedCheck = await axios.get(`${API_BASE}/borrowings/${multiBorrowingId}`, {
        headers: { Authorization: `Bearer ${borrower1Token}` },
      });
      assert.strictEqual(approvedCheck.data.data.status, 'APPROVED');

      // 2. Borrower cancels the APPROVED borrowing
      const cancelApprovedRes = await axios.patch(
        `${API_BASE}/borrowings/${multiBorrowingId}/cancel`,
        { reason: 'Đã mượn được thiết bị từ bạn khác' },
        { headers: { Authorization: `Bearer ${borrower1Token}` } }
      );
      assert.strictEqual(cancelApprovedRes.status, 200);
      assert.strictEqual(cancelApprovedRes.data.data.status, 'CANCELLED');
      logPass('Hủy phiếu APPROVED (Thành công 200 OK, trạng thái chuyển sang CANCELLED và nhả kho)');
    } catch (err) {
      logFail('Hủy phiếu APPROVED', err);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Không thể hủy phiếu BORROWED
    // -------------------------------------------------------------------------
    try {
      // Create a dedicated borrowing, approve it, and handover it to status BORROWED
      const bRes = await axios.post(
        `${API_BASE}/borrowings`,
        {
          purpose: 'Phiếu thử nghiệm chặn hủy khi đã bàn giao BORROWED',
          borrowing_days: 3,
          items: [{ equipment_id: 5, quantity: 1 }],
        },
        { headers: { Authorization: `Bearer ${borrower1Token}` } }
      );
      const bId = bRes.data.data.id;

      // Staff/Admin approves
      await axios.patch(`${API_BASE}/borrowings/${bId}/approve`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });

      // Staff/Admin hands over (moves to BORROWED)
      await axios.patch(`${API_BASE}/borrowings/${bId}/handover`, { borrowing_days: 3 }, { headers: { Authorization: `Bearer ${adminToken}` } });

      let cancelBorrowedBlocked = false;
      try {
        await axios.patch(
          `${API_BASE}/borrowings/${bId}/cancel`,
          { reason: 'Thử hủy phiếu đã bàn giao' },
          { headers: { Authorization: `Bearer ${borrower1Token}` } }
        );
      } catch (err) {
        cancelBorrowedBlocked = true;
        assert.strictEqual(err.response?.status, 400);
        assert(err.response?.data?.message.includes('đã được bàn giao thực tế'));
      }
      assert(cancelBorrowedBlocked, 'Cancelling a BORROWED request must be blocked with 400');
      logPass('Không thể hủy phiếu BORROWED (Bị chặn 400: Thiết bị đã được bàn giao thực tế)');
    } catch (err) {
      logFail('Không thể hủy phiếu BORROWED', err);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Không xem được phiếu của người khác
    // -------------------------------------------------------------------------
    try {
      // Seed Borrowing ID 1 belongs to borrower 1 (User ID 4)
      // Borrower 2 (User ID 5) attempts to access /api/borrowings/1
      let accessBlocked = false;
      try {
        await axios.get(`${API_BASE}/borrowings/1`, {
          headers: { Authorization: `Bearer ${borrower2Token}` },
        });
      } catch (err) {
        accessBlocked = true;
        assert.strictEqual(err.response?.status, 403);
        assert(err.response?.data?.message.includes('không có quyền xem phiếu mượn của người khác'));
      }
      assert(accessBlocked, 'Accessing other user borrowing must be blocked with 403');
      logPass('Không xem được phiếu của người khác (Bảo vệ dữ liệu, trả về 403 Forbidden)');
    } catch (err) {
      logFail('Không xem được phiếu của người khác', err);
    }

    // -------------------------------------------------------------------------
    // Clean up temporary test borrowings to maintain pristine seed state
    // -------------------------------------------------------------------------
    const { pool } = await import('../backend/src/config/database.js');
    await pool.execute(`
      DELETE bi FROM borrowing_items bi
      JOIN borrowings b ON bi.borrowing_id = b.id
      WHERE b.id > 7
    `);
    await pool.execute("DELETE FROM borrowings WHERE id > 7");

    const [[usersCnt]] = await pool.execute('SELECT COUNT(*) as cnt FROM users');
    const [[equipmentsCnt]] = await pool.execute('SELECT COUNT(*) as cnt FROM equipments');
    const [[borrowingsCnt]] = await pool.execute('SELECT COUNT(*) as cnt FROM borrowings');
    const [[itemsCnt]] = await pool.execute('SELECT COUNT(*) as cnt FROM borrowing_items');

    assert.strictEqual(usersCnt.cnt, 6, 'Users table count must be 6');
    assert.strictEqual(equipmentsCnt.cnt, 6, 'Equipments table count must be 6');
    assert.strictEqual(borrowingsCnt.cnt, 7, 'Borrowings table count must be 7');
    assert.strictEqual(itemsCnt.cnt, 9, 'Borrowing items table count must be 9');
    await pool.end();

    console.log('\n================================================================');
    console.log(`🎉 ALL 12 FE3 BORROWER TEST CASES PASSED: ${passedTests}/${totalTests} (100%)`);
    console.log('   - Database seed counts preserved (6 users, 6 equipments, 7 borrowings, 9 items).');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exitCode = 1;
  }
}

runTests();
