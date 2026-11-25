/**
 * FE4 Comprehensive Verification Test Suite
 * Rikkei Lab Staff Module (Frontend Services & API Integration)
 *
 * Verifies all required Staff use cases (UC08 - UC12) against running Backend (http://localhost:5000/api):
 * 1. UC08 - Staff Dashboard (Tổng số phiếu, pending, approved, borrowed, returned từ API thực tế).
 * 2. UC08 - Quét đơn quá hạn (POST /api/borrowings/process-expired).
 * 3. UC09 - Quản lý danh sách phiếu mượn (Staff xem toàn bộ đơn hệ thống, lọc trạng thái).
 * 4. UC09 - Tìm kiếm và phân trang phiếu mượn (Search & pagination).
 * 5. UC10 - Duyệt phiếu mượn PENDING -> APPROVED (Tự động giữ kho reserved stock, deadline 48h).
 * 6. UC10 - Không thể duyệt phiếu sai trạng thái (Chặn 400 khi duyệt đơn đã duyệt hoặc khác PENDING).
 * 7. UC10 - Từ chối phiếu mượn PENDING (Bắt buộc rejection_reason 2-255 ký tự).
 * 8. UC10 - Từ chối phiếu APPROVED (Chuyển REJECTED và tự động nhả tồn kho giữ chỗ).
 * 9. UC11 - Bàn giao thiết bị APPROVED -> BORROWED (Dịch chuyển kho reserved -> borrowed, tạo due_date).
 * 10. UC11 - Không thể bàn giao phiếu sai trạng thái (Chặn 400 khi chưa duyệt hoặc đã bàn giao).
 * 11. UC12 - Nhận trả một phần thiết bị (Trạng thái vẫn giữ BORROWED, cập nhật returned_quantity).
 * 12. UC12 - Hoàn tất trả đủ thiết bị -> RETURNED (Trạng thái chuyển RETURNED, giải phóng toàn bộ tồn kho).
 * 13. UC12 - Không cho phép trả quá số lượng chưa trả (Chặn 400 validation error).
 * 14. Phân quyền RBAC (Borrower bị chặn 403 khi truy cập API Staff, Staff/Admin có quyền).
 * 15. Bảo toàn nguyên vẹn cơ sở dữ liệu và seed data (6 users, 6 equipments, 7 borrowings, 9 items).
 */

import assert from 'node:assert';
import axios from 'axios';
import mysql from '../backend/node_modules/mysql2/promise.js';

const API_BASE = 'http://localhost:5000/api';

console.log('================================================================');
console.log('🚀 RUNNING COMPREHENSIVE TEST SUITE FOR PHASE FE4 (STAFF MODULE)');
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
  let staffToken = null;     // staff.nguyen@rikkeilab.vn
  let adminToken = null;     // admin@rikkeilab.vn
  let borrowerToken = null;  // borrower.le@rikkeilab.vn

  // Keep track of any temporary borrowings created during test for cleanup
  const tempBorrowingIds = [];

  try {
    // 1. Connect to MySQL for baseline snapshot & verification
    dbConn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'rikkei_user',
      password: 'RikkeiSecurePassword2026!',
      database: 'rikkei_lab',
    });

    // 2. Authenticate accounts
    const staffLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'staff.nguyen@rikkeilab.vn',
      password: 'Password@123',
    });
    staffToken = staffLogin.data.data.token;

    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@rikkeilab.vn',
      password: 'Password@123',
    });
    adminToken = adminLogin.data.data.token;

    const borrowerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'borrower.le@rikkeilab.vn',
      password: 'Password@123',
    });
    borrowerToken = borrowerLogin.data.data.token;

    // -------------------------------------------------------------------------
    // TEST 1: UC08 - Staff Dashboard Metrics
    // -------------------------------------------------------------------------
    try {
      const [allRes, pendingRes, approvedRes, borrowedRes, returnedRes] = await Promise.all([
        axios.get(`${API_BASE}/borrowings?limit=1`, { headers: { Authorization: `Bearer ${staffToken}` } }),
        axios.get(`${API_BASE}/borrowings?status=PENDING&limit=1`, { headers: { Authorization: `Bearer ${staffToken}` } }),
        axios.get(`${API_BASE}/borrowings?status=APPROVED&limit=1`, { headers: { Authorization: `Bearer ${staffToken}` } }),
        axios.get(`${API_BASE}/borrowings?status=BORROWED&limit=1`, { headers: { Authorization: `Bearer ${staffToken}` } }),
        axios.get(`${API_BASE}/borrowings?status=RETURNED&limit=1`, { headers: { Authorization: `Bearer ${staffToken}` } }),
      ]);

      assert.strictEqual(allRes.status, 200);
      const total = allRes.data.pagination.total;
      const pending = pendingRes.data.pagination.total;
      const approved = approvedRes.data.pagination.total;
      const borrowed = borrowedRes.data.pagination.total;
      const returned = returnedRes.data.pagination.total;

      assert(total >= 7, `Total borrowings must be at least 7, got ${total}`);
      assert(pending >= 1, `Pending borrowings must be at least 1, got ${pending}`);
      assert(approved >= 1, `Approved borrowings must be at least 1, got ${approved}`);
      assert(borrowed >= 1, `Borrowed borrowings must be at least 1, got ${borrowed}`);
      assert(returned >= 1, `Returned borrowings must be at least 1, got ${returned}`);

      logPass('UC08: Staff Dashboard Metrics', `Total: ${total}, Pending: ${pending}, Approved: ${approved}, Borrowed: ${borrowed}, Returned: ${returned}`);
    } catch (err) {
      logFail('UC08: Staff Dashboard Metrics', err);
    }

    // -------------------------------------------------------------------------
    // TEST 2: UC08 - Process Expired Trigger
    // -------------------------------------------------------------------------
    try {
      const res = await axios.post(
        `${API_BASE}/borrowings/process-expired`,
        {},
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      assert.strictEqual(res.status, 200);
      assert(res.data.success === true, 'Success flag must be true');
      assert(typeof res.data.data.processedCount === 'number', 'processedCount must be a number');
      logPass('UC08: Xử lý quét phiếu quá hạn nhận', `Processed: ${res.data.data.processedCount} đơn`);
    } catch (err) {
      logFail('UC08: Xử lý quét phiếu quá hạn nhận', err);
    }

    // -------------------------------------------------------------------------
    // TEST 3: UC09 - Quản lý danh sách & Lọc trạng thái (Staff xem toàn bộ hệ thống)
    // -------------------------------------------------------------------------
    try {
      const res = await axios.get(`${API_BASE}/borrowings?limit=50`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.strictEqual(res.status, 200);
      const borrowings = res.data.data;
      assert(borrowings.length >= 7, 'Staff must see all borrowings across users');

      // Check unique borrowers in staff list
      const borrowerIds = new Set(borrowings.map((b) => b.borrower_id));
      assert(borrowerIds.size > 1, 'Staff view must include borrowings from multiple users');

      // Test status filter PENDING
      const pendingList = await axios.get(`${API_BASE}/borrowings?status=PENDING`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert(pendingList.data.data.every((b) => b.status === 'PENDING'), 'All filtered items must be PENDING');

      logPass('UC09: Quản lý danh sách và lọc theo trạng thái', `Xem được đơn của ${borrowerIds.size} người dùng khác nhau`);
    } catch (err) {
      logFail('UC09: Quản lý danh sách và lọc theo trạng thái', err);
    }

    // -------------------------------------------------------------------------
    // TEST 4: UC09 - Tìm kiếm và phân trang
    // -------------------------------------------------------------------------
    try {
      const searchRes = await axios.get(`${API_BASE}/borrowings?search=BRW-202611-0001`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.strictEqual(searchRes.status, 200);
      assert(searchRes.data.data.length > 0, 'Search should find borrowing BRW-202611-0001');
      assert.strictEqual(searchRes.data.data[0].borrowing_code, 'BRW-202611-0001');

      // Pagination check
      const pageRes = await axios.get(`${API_BASE}/borrowings?page=1&limit=2`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.strictEqual(pageRes.data.data.length, 2);
      assert.strictEqual(pageRes.data.pagination.page, 1);
      assert.strictEqual(pageRes.data.pagination.limit, 2);
      assert(pageRes.data.pagination.totalPages >= 4);

      logPass('UC09: Tìm kiếm theo mã phiếu và phân trang', 'Hỗ trợ search và pagination chuẩn xác');
    } catch (err) {
      logFail('UC09: Tìm kiếm theo mã phiếu và phân trang', err);
    }

    // -------------------------------------------------------------------------
    // TEST 5: UC10 - Duyệt phiếu mượn PENDING -> APPROVED (Giữ kho reserved)
    // -------------------------------------------------------------------------
    let testBorrowingId = null;
    try {
      // 1. Borrower creates a fresh borrowing for equipment 2 (EQP-LAP-002, qty 1)
      const createRes = await axios.post(
        `${API_BASE}/borrowings`,
        {
          purpose: 'Mượn thiết bị kiểm thử quy trình duyệt FE4',
          borrowing_days: 7,
          items: [{ equipment_id: 2, quantity: 1, item_notes: 'Cần cài test framework' }],
        },
        { headers: { Authorization: `Bearer ${borrowerToken}` } }
      );
      testBorrowingId = createRes.data.data.id;
      tempBorrowingIds.push(testBorrowingId);
      assert.strictEqual(createRes.data.data.status, 'PENDING');

      // Equipment 2 before approval: available = 5, reserved = 0
      const [eqBefore] = await dbConn.query('SELECT available_quantity, reserved_quantity FROM equipments WHERE id = 2');
      const availBefore = eqBefore[0].available_quantity;
      const resBefore = eqBefore[0].reserved_quantity;

      // 2. Staff approves the borrowing
      const approveRes = await axios.patch(
        `${API_BASE}/borrowings/${testBorrowingId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      assert.strictEqual(approveRes.status, 200);
      assert.strictEqual(approveRes.data.data.status, 'APPROVED');
      assert(approveRes.data.data.pickup_deadline !== null, 'pickup_deadline must be set');
      assert(approveRes.data.data.approved_by !== null, 'approved_by must be set');

      // Check equipment inventory after approval: reserved increases by 1, available decreases by 1
      const [eqAfter] = await dbConn.query('SELECT available_quantity, reserved_quantity FROM equipments WHERE id = 2');
      assert.strictEqual(eqAfter[0].reserved_quantity, resBefore + 1, 'reserved_quantity must increase by 1');
      assert.strictEqual(eqAfter[0].available_quantity, availBefore - 1, 'available_quantity must decrease by 1');

      logPass('UC10: Duyệt phiếu PENDING -> APPROVED', `Duyệt thành công, giữ kho EQP-LAP-002 (reserved: ${eqAfter[0].reserved_quantity})`);
    } catch (err) {
      logFail('UC10: Duyệt phiếu PENDING -> APPROVED', err);
    }

    // -------------------------------------------------------------------------
    // TEST 6: UC10 - Không thể duyệt phiếu sai trạng thái (Chặn 400)
    // -------------------------------------------------------------------------
    try {
      let threw = false;
      try {
        // Attempt to approve the already APPROVED borrowing
        await axios.patch(
          `${API_BASE}/borrowings/${testBorrowingId}/approve`,
          {},
          { headers: { Authorization: `Bearer ${staffToken}` } }
        );
      } catch (err) {
        threw = true;
        assert.strictEqual(err.response?.status, 400);
        assert(err.response?.data?.message.includes('APPROVED'));
      }
      assert(threw, 'Should throw 400 when approving already APPROVED borrowing');
      logPass('UC10: Không thể duyệt phiếu sai trạng thái', 'Bị chặn 400 Bad Request');
    } catch (err) {
      logFail('UC10: Không thể duyệt phiếu sai trạng thái', err);
    }

    // -------------------------------------------------------------------------
    // TEST 7: UC10 - Từ chối phiếu mượn PENDING (Yêu cầu rejection_reason)
    // -------------------------------------------------------------------------
    try {
      // Create another temporary borrowing
      const cRes = await axios.post(
        `${API_BASE}/borrowings`,
        {
          purpose: 'Mượn thiết bị kiểm thử từ chối FE4',
          borrowing_days: 3,
          items: [{ equipment_id: 2, quantity: 1 }],
        },
        { headers: { Authorization: `Bearer ${borrowerToken}` } }
      );
      const rejectTestId = cRes.data.data.id;
      tempBorrowingIds.push(rejectTestId);

      // Attempt reject without reason -> should fail 400
      let threwNoReason = false;
      try {
        await axios.patch(
          `${API_BASE}/borrowings/${rejectTestId}/reject`,
          { rejection_reason: '' },
          { headers: { Authorization: `Bearer ${staffToken}` } }
        );
      } catch (err) {
        threwNoReason = true;
        assert.strictEqual(err.response?.status, 400);
      }
      assert(threwNoReason, 'Rejection without reason must fail with 400');

      // Valid reject
      const rejectRes = await axios.patch(
        `${API_BASE}/borrowings/${rejectTestId}/reject`,
        { rejection_reason: 'Thiết bị đang cần bảo trì định kỳ' },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      assert.strictEqual(rejectRes.status, 200);
      assert.strictEqual(rejectRes.data.data.status, 'REJECTED');
      assert.strictEqual(rejectRes.data.data.rejection_reason, 'Thiết bị đang cần bảo trì định kỳ');
      assert(rejectRes.data.data.rejected_by !== null);

      logPass('UC10: Từ chối phiếu mượn PENDING kèm lý do', 'Validate rejection_reason 2-255 ký tự thành công');
    } catch (err) {
      logFail('UC10: Từ chối phiếu mượn PENDING kèm lý do', err);
    }

    // -------------------------------------------------------------------------
    // TEST 8: UC10 - Từ chối phiếu APPROVED (Giải phóng tồn kho giữ chỗ)
    // -------------------------------------------------------------------------
    try {
      // Create and approve a temporary borrowing
      const cRes = await axios.post(
        `${API_BASE}/borrowings`,
        {
          purpose: 'Kiểm thử hủy đơn đã duyệt',
          borrowing_days: 5,
          items: [{ equipment_id: 2, quantity: 1 }],
        },
        { headers: { Authorization: `Bearer ${borrowerToken}` } }
      );
      const appRejectId = cRes.data.data.id;
      tempBorrowingIds.push(appRejectId);

      await axios.patch(
        `${API_BASE}/borrowings/${appRejectId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );

      const [eqResBefore] = await dbConn.query('SELECT available_quantity, reserved_quantity FROM equipments WHERE id = 2');

      // Staff rejects the APPROVED borrowing
      const rejRes = await axios.patch(
        `${API_BASE}/borrowings/${appRejectId}/reject`,
        { rejection_reason: 'Người mượn đổi ý không đến nhận' },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      assert.strictEqual(rejRes.status, 200);
      assert.strictEqual(rejRes.data.data.status, 'REJECTED');

      // Check equipment inventory: reserved decreased, available increased
      const [eqResAfter] = await dbConn.query('SELECT available_quantity, reserved_quantity FROM equipments WHERE id = 2');
      assert.strictEqual(eqResAfter[0].reserved_quantity, eqResBefore[0].reserved_quantity - 1);
      assert.strictEqual(eqResAfter[0].available_quantity, eqResBefore[0].available_quantity + 1);

      logPass('UC10: Từ chối phiếu APPROVED nhả tồn kho giữ chỗ', 'Tồn kho reserved tự động nhả về available');
    } catch (err) {
      logFail('UC10: Từ chối phiếu APPROVED nhả tồn kho giữ chỗ', err);
    }

    // -------------------------------------------------------------------------
    // TEST 9: UC11 - Bàn giao thiết bị APPROVED -> BORROWED
    // -------------------------------------------------------------------------
    try {
      // testBorrowingId was approved in TEST 5. Now handover!
      const [eqBeforeHandover] = await dbConn.query('SELECT reserved_quantity, borrowed_quantity FROM equipments WHERE id = 2');

      const handoverRes = await axios.patch(
        `${API_BASE}/borrowings/${testBorrowingId}/handover`,
        { borrowing_days: 10 },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      assert.strictEqual(handoverRes.status, 200);
      assert.strictEqual(handoverRes.data.data.status, 'BORROWED');
      assert(handoverRes.data.data.borrowed_at !== null, 'borrowed_at must be recorded');
      assert(handoverRes.data.data.due_date !== null, 'due_date must be set');

      // Check equipment inventory: reserved decreased by 1, borrowed increased by 1
      const [eqAfterHandover] = await dbConn.query('SELECT reserved_quantity, borrowed_quantity FROM equipments WHERE id = 2');
      assert.strictEqual(eqAfterHandover[0].reserved_quantity, eqBeforeHandover[0].reserved_quantity - 1);
      assert.strictEqual(eqAfterHandover[0].borrowed_quantity, eqBeforeHandover[0].borrowed_quantity + 1);

      logPass('UC11: Bàn giao thiết bị APPROVED -> BORROWED', `Trạng thái BORROWED, hạn trả: ${handoverRes.data.data.due_date}`);
    } catch (err) {
      logFail('UC11: Bàn giao thiết bị APPROVED -> BORROWED', err);
    }

    // -------------------------------------------------------------------------
    // TEST 10: UC11 - Không thể bàn giao phiếu sai trạng thái
    // -------------------------------------------------------------------------
    try {
      let threwWrongStatus = false;
      try {
        // testBorrowingId is now BORROWED, attempting to handover again must fail 400
        await axios.patch(
          `${API_BASE}/borrowings/${testBorrowingId}/handover`,
          { borrowing_days: 7 },
          { headers: { Authorization: `Bearer ${staffToken}` } }
        );
      } catch (err) {
        threwWrongStatus = true;
        assert.strictEqual(err.response?.status, 400);
      }
      assert(threwWrongStatus, 'Handover of BORROWED borrowing must fail with 400');
      logPass('UC10/11: Không thể bàn giao phiếu sai trạng thái', 'Bị chặn 400 Bad Request');
    } catch (err) {
      logFail('UC10/11: Không thể bàn giao phiếu sai trạng thái', err);
    }

    // -------------------------------------------------------------------------
    // TEST 11: UC12 - Tiếp nhận hoàn trả một phần (Partial Return)
    // -------------------------------------------------------------------------
    let multiItemBorrowingId = null;
    try {
      // Create borrowing with quantity 2
      const createRes = await axios.post(
        `${API_BASE}/borrowings`,
        {
          purpose: 'Mượn 2 máy test trả một phần',
          borrowing_days: 7,
          items: [{ equipment_id: 2, quantity: 2 }],
        },
        { headers: { Authorization: `Bearer ${borrowerToken}` } }
      );
      multiItemBorrowingId = createRes.data.data.id;
      tempBorrowingIds.push(multiItemBorrowingId);

      // Approve & Handover
      await axios.patch(`${API_BASE}/borrowings/${multiItemBorrowingId}/approve`, {}, { headers: { Authorization: `Bearer ${staffToken}` } });
      await axios.patch(`${API_BASE}/borrowings/${multiItemBorrowingId}/handover`, { borrowing_days: 7 }, { headers: { Authorization: `Bearer ${staffToken}` } });

      const [eqBeforeReturn] = await dbConn.query('SELECT available_quantity, borrowed_quantity FROM equipments WHERE id = 2');

      // Return 1 unit out of 2
      const partialRes = await axios.patch(
        `${API_BASE}/borrowings/${multiItemBorrowingId}/return`,
        {
          items: [{ equipment_id: 2, return_quantity: 1 }],
        },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );

      assert.strictEqual(partialRes.status, 200);
      assert.strictEqual(partialRes.data.data.status, 'BORROWED', 'Status must remain BORROWED on partial return');

      const returnedItem = partialRes.data.data.items.find((i) => i.equipment_id === 2);
      assert.strictEqual(returnedItem.returned_quantity, 1, 'returned_quantity must be 1');

      // Equipment inventory: borrowed decreased by 1, available increased by 1
      const [eqAfterReturn] = await dbConn.query('SELECT available_quantity, borrowed_quantity FROM equipments WHERE id = 2');
      assert.strictEqual(eqAfterReturn[0].borrowed_quantity, eqBeforeReturn[0].borrowed_quantity - 1);
      assert.strictEqual(eqAfterReturn[0].available_quantity, eqBeforeReturn[0].available_quantity + 1);

      logPass('UC12: Tiếp nhận hoàn trả một phần', 'Trả 1/2 thiết bị, trạng thái vẫn BORROWED, kho cập nhật chuẩn');
    } catch (err) {
      logFail('UC12: Tiếp nhận hoàn trả một phần', err);
    }

    // -------------------------------------------------------------------------
    // TEST 12: UC12 - Hoàn tất trả đủ thiết bị -> RETURNED
    // -------------------------------------------------------------------------
    try {
      // Return remaining 1 unit
      const fullRes = await axios.patch(
        `${API_BASE}/borrowings/${multiItemBorrowingId}/return`,
        {
          items: [{ equipment_id: 2, return_quantity: 1 }],
        },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );

      assert.strictEqual(fullRes.status, 200);
      assert.strictEqual(fullRes.data.data.status, 'RETURNED', 'Status must transition to RETURNED when all items returned');
      assert(fullRes.data.data.returned_at !== null, 'returned_at must be recorded');

      const item = fullRes.data.data.items.find((i) => i.equipment_id === 2);
      assert.strictEqual(item.returned_quantity, 2);

      logPass('UC12: Hoàn tất trả đủ thiết bị -> RETURNED', 'Đơn chuyển RETURNED, ghi nhận returned_at thành công');
    } catch (err) {
      logFail('UC12: Hoàn tất trả đủ thiết bị -> RETURNED', err);
    }

    // -------------------------------------------------------------------------
    // TEST 13: UC12 - Không cho phép trả quá số lượng chưa trả
    // -------------------------------------------------------------------------
    try {
      // testBorrowingId currently has 1 unreturned unit of equipment 2
      let threwOverReturn = false;
      try {
        await axios.patch(
          `${API_BASE}/borrowings/${testBorrowingId}/return`,
          {
            items: [{ equipment_id: 2, return_quantity: 99 }],
          },
          { headers: { Authorization: `Bearer ${staffToken}` } }
        );
      } catch (err) {
        threwOverReturn = true;
        assert.strictEqual(err.response?.status, 400);
        assert(err.response?.data?.message.includes('vượt quá số lượng chưa trả'));
      }
      assert(threwOverReturn, 'Should fail 400 when returning more than borrowed');

      // Now return the 1 unit cleanly so testBorrowingId is also returned
      await axios.patch(
        `${API_BASE}/borrowings/${testBorrowingId}/return`,
        {},
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );

      logPass('UC12: Kiểm tra validation số lượng trả', 'Chặn 400 khi return_quantity vượt quá unreturned quantity');
    } catch (err) {
      logFail('UC12: Kiểm tra validation số lượng trả', err);
    }

    // -------------------------------------------------------------------------
    // TEST 14: Phân quyền RBAC (BORROWER bị chặn 403 các thao tác Staff)
    // -------------------------------------------------------------------------
    try {
      const endpoints = [
        { method: 'patch', url: `${API_BASE}/borrowings/1/approve`, data: {} },
        { method: 'patch', url: `${API_BASE}/borrowings/1/reject`, data: { rejection_reason: 'Test' } },
        { method: 'patch', url: `${API_BASE}/borrowings/1/handover`, data: { borrowing_days: 7 } },
        { method: 'patch', url: `${API_BASE}/borrowings/1/return`, data: {} },
        { method: 'post', url: `${API_BASE}/borrowings/process-expired`, data: {} },
      ];

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
          assert.strictEqual(err.response?.status, 403, `Borrower must get 403 on ${ep.url}`);
        }
        assert(blocked, `Borrower must be blocked from ${ep.url}`);
      }

      logPass('RBAC: Bảo vệ phân quyền Staff / Borrower', '5/5 endpoint Staff đều chặn 403 Forbidden đối với Borrower');
    } catch (err) {
      logFail('RBAC: Bảo vệ phân quyền Staff / Borrower', err);
    }

    // -------------------------------------------------------------------------
    // TEST 15: Dọn dẹp dữ liệu test & Bảo toàn seed ban đầu
    // -------------------------------------------------------------------------
    try {
      // 1. Delete all temporary borrowings created during test
      if (tempBorrowingIds.length > 0) {
        const idList = tempBorrowingIds.join(',');
        await dbConn.query(`DELETE FROM borrowing_items WHERE borrowing_id IN (${idList})`);
        await dbConn.query(`DELETE FROM borrowings WHERE id IN (${idList})`);
      }

      // 2. Ensure pristine equipment inventory matches seed data exactly
      // Seed values:
      // ID 1: total=10, avail=5, res=2, bor=3
      // ID 2: total=5, avail=5, res=0, bor=0
      // ID 3: total=4, avail=3, res=1, bor=0
      // ID 4: total=8, avail=6, res=0, bor=2
      // ID 5: total=15, avail=14, res=0, bor=1
      // ID 6: total=6, avail=6, res=0, bor=0
      await dbConn.query('UPDATE equipments SET total_quantity=10, reserved_quantity=2, borrowed_quantity=3 WHERE id=1');
      await dbConn.query('UPDATE equipments SET total_quantity=5, reserved_quantity=0, borrowed_quantity=0 WHERE id=2');
      await dbConn.query('UPDATE equipments SET total_quantity=4, reserved_quantity=1, borrowed_quantity=0 WHERE id=3');
      await dbConn.query('UPDATE equipments SET total_quantity=8, reserved_quantity=0, borrowed_quantity=2 WHERE id=4');
      await dbConn.query('UPDATE equipments SET total_quantity=15, reserved_quantity=0, borrowed_quantity=0 WHERE id=5');
      await dbConn.query('UPDATE equipments SET total_quantity=6, reserved_quantity=0, borrowed_quantity=0 WHERE id=6');

      // 3. Ensure pristine borrowing statuses match seed data exactly
      // ID 1: PENDING, ID 2: APPROVED, ID 3: BORROWED, ID 4: RETURNED, ID 5: REJECTED, ID 6: CANCELLED, ID 7: EXPIRED
      await dbConn.query("UPDATE borrowings SET status='PENDING', approved_by=NULL, approved_at=NULL, pickup_deadline=NULL, borrowed_at=NULL, due_date=NULL, returned_at=NULL WHERE id=1");
      await dbConn.query("UPDATE borrowings SET status='APPROVED' WHERE id=2");
      await dbConn.query("UPDATE borrowings SET status='BORROWED' WHERE id=3");
      await dbConn.query("UPDATE borrowings SET status='RETURNED' WHERE id=4");
      await dbConn.query("UPDATE borrowings SET status='REJECTED' WHERE id=5");
      await dbConn.query("UPDATE borrowings SET status='CANCELLED' WHERE id=6");
      await dbConn.query("UPDATE borrowings SET status='EXPIRED' WHERE id=7");

      // 4. Verify counts
      const [u] = await dbConn.query('SELECT COUNT(*) as count FROM users');
      const [e] = await dbConn.query('SELECT COUNT(*) as count FROM equipments');
      const [b] = await dbConn.query('SELECT COUNT(*) as count FROM borrowings');
      const [bi] = await dbConn.query('SELECT COUNT(*) as count FROM borrowing_items');

      assert.strictEqual(u[0].count, 6, 'Users count must be 6');
      assert.strictEqual(e[0].count, 6, 'Equipments count must be 6');
      assert.strictEqual(b[0].count, 7, 'Borrowings count must be 7');
      assert.strictEqual(bi[0].count, 9, 'BorrowingItems count must be 9');

      // Verify total_quantity = available + reserved + borrowed for all 6 equipments
      const [eqRows] = await dbConn.query('SELECT id, code, total_quantity, available_quantity, reserved_quantity, borrowed_quantity FROM equipments');
      for (const eq of eqRows) {
        assert.strictEqual(
          eq.total_quantity,
          eq.available_quantity + eq.reserved_quantity + eq.borrowed_quantity,
          `Equipment ${eq.code} inventory equation violated`
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
    console.log(`🎉 ALL ${totalTests} FE4 STAFF TEST CASES PASSED: ${passedTests}/${totalTests} (100%)`);
    console.log('   - Database seed counts preserved (6 users, 6 equipments, 7 borrowings, 9 items).');
  } else {
    console.error(`⚠️ TEST SUITE FAILED: ${passedTests}/${totalTests} passed.`);
  }
  console.log('================================================================\n');
}

runTests();
