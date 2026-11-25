/**
 * Phase 4 Comprehensive Test Suite
 * Rikkei Lab Equipment Borrowing System - Borrowing Workflow
 *
 * Covers all 8 Use Cases:
 * - UC01: Borrower creates borrowing request (POST /api/borrowings)
 * - UC02: View list & details with RBAC (GET /api/borrowings, GET /api/borrowings/:id)
 * - UC03: Borrower cancels request (PENDING & APPROVED) with inventory release
 * - UC04: Staff/Admin approves request with deadlock-free locking & inventory reservation
 * - UC05: Staff/Admin rejects request (PENDING & APPROVED) with inventory release
 * - UC06: Staff/Admin hands over equipment (APPROVED -> BORROWED), reserved to borrowed transition
 * - UC07: Staff/Admin returns equipment (Partial Return & Full Return), borrowed to available transition
 * - UC08: Automatic expiration of unclaimed approved requests (APPROVED -> EXPIRED)
 * - Post-test cleanup & database integrity verification
 */

const request = require('supertest');
const app = require('./src/app');
const { pool } = require('./src/config/database');
const { ROLES } = require('./src/constants/roles');
const { BORROWING_STATUS } = require('./src/constants/borrowing');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 STARTING BACKEND PHASE 4 - BORROWING WORKFLOW TEST SUITE');
  console.log('================================================================\n');

  let adminToken = null;
  let staffToken = null;
  let borrower1Token = null; // User ID: 4 (borrower.le@rikkeilab.vn)
  let borrower2Token = null; // User ID: 5 (borrower.pham@rikkeilab.vn)

  try {
    // -------------------------------------------------------------------------
    // Preliminary: Clean up any stale test borrowings from prior aborted runs
    // -------------------------------------------------------------------------
    await pool.execute(`
      DELETE bi FROM borrowing_items bi
      JOIN borrowings b ON bi.borrowing_id = b.id
      WHERE b.borrowing_code LIKE 'BRW-%' AND b.id > 7
    `);
    await pool.execute("DELETE FROM borrowings WHERE id > 7");

    // Authenticate users
    console.log('--- PRELIMINARY: Authenticating Seed Accounts ---');
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@rikkeilab.vn', password: 'Password@123' });
    assert(adminLogin.status === 200, 'Admin login returns 200');
    adminToken = adminLogin.body.data.token;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff.nguyen@rikkeilab.vn', password: 'Password@123' });
    assert(staffLogin.status === 200, 'Staff login returns 200');
    staffToken = staffLogin.body.data.token;

    const borrower1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'borrower.le@rikkeilab.vn', password: 'Password@123' });
    assert(borrower1Login.status === 200, 'Borrower 1 login returns 200');
    borrower1Token = borrower1Login.body.data.token;

    const borrower2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'borrower.pham@rikkeilab.vn', password: 'Password@123' });
    assert(borrower2Login.status === 200, 'Borrower 2 login returns 200');
    borrower2Token = borrower2Login.body.data.token;

    // -------------------------------------------------------------------------
    // 1. UC01: Borrower creates borrowing request (POST /api/borrowings)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. UC01: CREATE BORROWING REQUEST ---');
    // 1.1 Unauthenticated rejected
    const unauthPost = await request(app).post('/api/borrowings').send({ purpose: 'Test' });
    assert(unauthPost.status === 401, 'POST /api/borrowings without token returns 401');

    // 1.2 Staff / Admin cannot create request
    const staffCreateReq = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        purpose: 'Staff pretending to be borrower',
        items: [{ equipment_id: 1, quantity: 1 }],
      });
    assert(staffCreateReq.status === 403, 'Staff creating borrowing request returns 403 Forbidden');

    // 1.3 Validation errors (missing purpose, empty items, duplicate item IDs)
    const emptyItems = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({ purpose: 'Mượn thiết bị kiểm thử', items: [] });
    assert(emptyItems.status === 400, 'Empty items array returns 400 Bad Request');

    const duplicateItems = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({
        purpose: 'Mượn thiết bị kiểm thử',
        items: [
          { equipment_id: 2, quantity: 1 },
          { equipment_id: 2, quantity: 2 },
        ],
      });
    assert(duplicateItems.status === 400, 'Duplicate equipment_id in items returns 400 Bad Request');

    const invalidQty = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({
        purpose: 'Mượn thiết bị kiểm thử',
        items: [{ equipment_id: 2, quantity: 0 }],
      });
    assert(invalidQty.status === 400, 'Zero quantity returns 400 Bad Request');

    const excessQty = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({
        purpose: 'Mượn vượt quá tồn kho khả dụng',
        items: [{ equipment_id: 2, quantity: 9999 }], // MacBook available is 5
      });
    assert(excessQty.status === 400, 'Exceeding available quantity at creation returns 400 Bad Request');

    // 1.4 Successful Creation by Borrower 1
    // Check initial inventory of equipment 2 (MacBook Pro, total=5, reserved=0, borrowed=0, available=5)
    const [[eq2Before]] = await pool.query('SELECT reserved_quantity, available_quantity FROM equipments WHERE id = 2');
    
    const createRes = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({
        purpose: 'Phát triển module trí tuệ nhân tạo và xử lý ảnh',
        borrowing_days: 7,
        notes: 'Cần cài đặt trước Docker và PyTorch',
        items: [
          { equipment_id: 2, quantity: 2, item_notes: 'Kèm sạc MagSafe 3' },
          { equipment_id: 6, quantity: 1, item_notes: 'Kèm dây mạng Cat6' },
        ],
      });
    assert(createRes.status === 201, 'Borrower creates borrowing request successfully (201 Created)');
    assert(createRes.body.data.status === BORROWING_STATUS.PENDING, 'Initial status is PENDING');
    assert(createRes.body.data.borrowing_code.startsWith('BRW-'), 'Borrowing code is generated correctly');
    assert(createRes.body.data.items.length === 2, 'Response includes 2 items');

    // CRITICAL: PENDING status does NOT reserve inventory yet!
    const [[eq2AfterPending]] = await pool.query('SELECT reserved_quantity, available_quantity FROM equipments WHERE id = 2');
    assert(eq2AfterPending.reserved_quantity === eq2Before.reserved_quantity, 'PENDING request does NOT hold inventory (reserved_quantity unchanged)');
    assert(eq2AfterPending.available_quantity === eq2Before.available_quantity, 'available_quantity unchanged in PENDING');

    const createdBorrowingId = createRes.body.data.id;

    // -------------------------------------------------------------------------
    // 2. UC02: View list & details with RBAC (GET /api/borrowings)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. UC02: LIST & DETAIL BORROWINGS ---');
    // 2.1 Borrower only sees their own borrowings
    const borrower1List = await request(app)
      .get('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`);
    assert(borrower1List.status === 200, 'Borrower lists borrowings (200 OK)');
    assert(borrower1List.body.data.every(b => b.borrower_id === 4), 'Borrower 1 ONLY sees their own requests (borrower_id=4)');

    // 2.2 Staff sees all borrowings across all users
    const staffList = await request(app)
      .get('/api/borrowings')
      .set('Authorization', `Bearer ${staffToken}`);
    assert(staffList.status === 200, 'Staff lists all borrowings (200 OK)');
    assert(staffList.body.pagination.total >= 8, 'Staff sees borrowings from all users');

    // 2.3 Filter by status
    const pendingList = await request(app)
      .get('/api/borrowings?status=PENDING')
      .set('Authorization', `Bearer ${staffToken}`);
    assert(pendingList.status === 200, 'Filter by status PENDING returns 200 OK');
    assert(pendingList.body.data.every(b => b.status === 'PENDING'), 'All returned items have status PENDING');

    // 2.4 Borrower 1 views their own borrowing detail
    const ownDetail = await request(app)
      .get(`/api/borrowings/${createdBorrowingId}`)
      .set('Authorization', `Bearer ${borrower1Token}`);
    assert(ownDetail.status === 200, 'Borrower views their own borrowing detail (200 OK)');
    assert(ownDetail.body.data.items.length === 2, 'Detail includes items array');
    assert(ownDetail.body.data.borrower.id === 4, 'Detail includes borrower profile');

    // 2.5 Borrower 2 views Borrower 1's borrowing detail -> 403 Forbidden!
    const otherDetail = await request(app)
      .get(`/api/borrowings/${createdBorrowingId}`)
      .set('Authorization', `Bearer ${borrower2Token}`);
    assert(otherDetail.status === 403, 'Borrower accessing another user borrowing returns 403 Forbidden');

    // 2.6 Staff views Borrower 1's borrowing detail -> 200 OK
    const staffDetail = await request(app)
      .get(`/api/borrowings/${createdBorrowingId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert(staffDetail.status === 200, 'Staff views any borrowing detail (200 OK)');

    // -------------------------------------------------------------------------
    // 3. UC04: Staff/Admin approves request & reserves inventory
    // -------------------------------------------------------------------------
    console.log('\n--- 3. UC04: APPROVE BORROWING & INVENTORY RESERVATION ---');
    // 3.1 Borrower cannot approve
    const borrowerApprove = await request(app)
      .patch(`/api/borrowings/${createdBorrowingId}/approve`)
      .set('Authorization', `Bearer ${borrower1Token}`);
    assert(borrowerApprove.status === 403, 'Borrower approving request returns 403 Forbidden');

    // 3.2 Staff approves request
    const [[eq2BeforeApprove]] = await pool.query('SELECT reserved_quantity, available_quantity FROM equipments WHERE id = 2');
    const staffApprove = await request(app)
      .patch(`/api/borrowings/${createdBorrowingId}/approve`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert(staffApprove.status === 200, 'Staff approves borrowing request (200 OK)');
    assert(staffApprove.body.data.status === BORROWING_STATUS.APPROVED, 'Status updated to APPROVED');
    assert(staffApprove.body.data.approved_by === 2, 'approved_by recorded correctly');
    assert(staffApprove.body.data.pickup_deadline !== null, 'pickup_deadline generated');

    // Verify inventory reservation in database
    const [[eq2AfterApprove]] = await pool.query('SELECT reserved_quantity, available_quantity FROM equipments WHERE id = 2');
    assert(eq2AfterApprove.reserved_quantity === eq2BeforeApprove.reserved_quantity + 2, 'Equipment 2 reserved_quantity increased by 2');
    assert(eq2AfterApprove.available_quantity === eq2BeforeApprove.available_quantity - 2, 'Equipment 2 available_quantity decreased by 2');

    // 3.3 Cannot re-approve an already APPROVED request
    const reApprove = await request(app)
      .patch(`/api/borrowings/${createdBorrowingId}/approve`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert(reApprove.status === 400, 'Re-approving an already APPROVED request returns 400 Bad Request');

    // -------------------------------------------------------------------------
    // 4. UC03: Cancel borrowing (PENDING & APPROVED) with inventory release
    // -------------------------------------------------------------------------
    console.log('\n--- 4. UC03: CANCEL BORROWING & INVENTORY RELEASE ---');
    // Test canceling the APPROVED borrowing:
    // Borrower 1 cancels their approved borrowing -> Must release reserved inventory!
    const cancelApproved = await request(app)
      .patch(`/api/borrowings/${createdBorrowingId}/cancel`)
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({ reason: 'Thay đổi kế hoạch nghiên cứu' });
    assert(cancelApproved.status === 200, 'Borrower cancels APPROVED borrowing (200 OK)');
    assert(cancelApproved.body.data.status === BORROWING_STATUS.CANCELLED, 'Status changed to CANCELLED');

    // Verify inventory release in database
    const [[eq2AfterCancel]] = await pool.query('SELECT reserved_quantity, available_quantity FROM equipments WHERE id = 2');
    assert(eq2AfterCancel.reserved_quantity === eq2BeforeApprove.reserved_quantity, 'Inventory released: reserved_quantity restored to original');
    assert(eq2AfterCancel.available_quantity === eq2BeforeApprove.available_quantity, 'Inventory released: available_quantity restored to original');

    // Re-cancelling a cancelled request returns 400
    const reCancel = await request(app)
      .patch(`/api/borrowings/${createdBorrowingId}/cancel`)
      .set('Authorization', `Bearer ${borrower1Token}`);
    assert(reCancel.status === 400, 'Re-cancelling already CANCELLED request returns 400 Bad Request');

    // -------------------------------------------------------------------------
    // 5. UC05: Staff/Admin rejects request (PENDING & APPROVED)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. UC05: REJECT BORROWING & INVENTORY RELEASE ---');
    // Create another borrowing for rejection test
    const createReqForReject = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({
        purpose: 'Yêu cầu mượn để test từ chối',
        items: [{ equipment_id: 2, quantity: 1 }],
      });
    const rejectBorrowingId = createReqForReject.body.data.id;

    // Staff approves it first (holding 1 unit of Eq 2)
    await request(app)
      .patch(`/api/borrowings/${rejectBorrowingId}/approve`)
      .set('Authorization', `Bearer ${staffToken}`);

    const [[eq2BeforeReject]] = await pool.query('SELECT reserved_quantity FROM equipments WHERE id = 2');

    // Missing rejection_reason -> 400
    const missingReason = await request(app)
      .patch(`/api/borrowings/${rejectBorrowingId}/reject`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({});
    assert(missingReason.status === 400, 'Rejecting without rejection_reason returns 400 Bad Request');

    // Staff rejects the APPROVED request -> Must release reserved inventory!
    const rejectRes = await request(app)
      .patch(`/api/borrowings/${rejectBorrowingId}/reject`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ rejection_reason: 'Thiết bị cần thu hồi gấp phục vụ sự kiện công ty' });
    assert(rejectRes.status === 200, 'Staff rejects borrowing request (200 OK)');
    assert(rejectRes.body.data.status === BORROWING_STATUS.REJECTED, 'Status changed to REJECTED');
    assert(rejectRes.body.data.rejection_reason.includes('phục vụ sự kiện'), 'Rejection reason recorded');

    const [[eq2AfterReject]] = await pool.query('SELECT reserved_quantity FROM equipments WHERE id = 2');
    assert(eq2AfterReject.reserved_quantity === eq2BeforeReject.reserved_quantity - 1, 'Rejecting APPROVED request released reserved_quantity');

    // -------------------------------------------------------------------------
    // 6. UC06: Staff hands over equipment (APPROVED -> BORROWED)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. UC06: HANDOVER EQUIPMENT (BORROW) ---');
    // Create and approve a borrowing for handover test
    const handoverReq = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({
        purpose: 'Đơn mượn phục vụ kiểm thử bàn giao và hoàn trả',
        items: [
          { equipment_id: 2, quantity: 2 }, // MacBook Pro
          { equipment_id: 5, quantity: 3 }, // Kit STM32
        ],
      });
    const handoverBorrowingId = handoverReq.body.data.id;

    // Handover while PENDING -> 400
    const prematureHandover = await request(app)
      .patch(`/api/borrowings/${handoverBorrowingId}/handover`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert(prematureHandover.status === 400, 'Handover of PENDING request returns 400 Bad Request');

    // Approve the request
    await request(app)
      .patch(`/api/borrowings/${handoverBorrowingId}/approve`)
      .set('Authorization', `Bearer ${staffToken}`);

    // Check inventory before handover
    const [[eq2BeforeHandover]] = await pool.query('SELECT reserved_quantity, borrowed_quantity FROM equipments WHERE id = 2');

    // Staff performs Handover (borrowing_days = 10)
    const handoverRes = await request(app)
      .patch(`/api/borrowings/${handoverBorrowingId}/handover`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ borrowing_days: 10 });
    assert(handoverRes.status === 200, 'Staff hands over equipment successfully (200 OK)');
    assert(handoverRes.body.data.status === BORROWING_STATUS.BORROWED, 'Status updated to BORROWED');
    assert(handoverRes.body.data.borrowed_at !== null, 'borrowed_at timestamp set');
    assert(handoverRes.body.data.due_date !== null, 'due_date set');

    // Verify inventory transition: reserved_quantity - 2, borrowed_quantity + 2
    const [[eq2AfterHandover]] = await pool.query('SELECT reserved_quantity, borrowed_quantity FROM equipments WHERE id = 2');
    assert(eq2AfterHandover.reserved_quantity === eq2BeforeHandover.reserved_quantity - 2, 'reserved_quantity decreased by 2');
    assert(eq2AfterHandover.borrowed_quantity === eq2BeforeHandover.borrowed_quantity + 2, 'borrowed_quantity increased by 2');

    // Borrower cannot cancel a BORROWED request
    const cancelBorrowed = await request(app)
      .patch(`/api/borrowings/${handoverBorrowingId}/cancel`)
      .set('Authorization', `Bearer ${borrower1Token}`);
    assert(cancelBorrowed.status === 400, 'Cancelling a BORROWED request is blocked (400 Bad Request)');

    // -------------------------------------------------------------------------
    // 7. UC07: Staff receives return (Partial Return & Full Return)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. UC07: RETURN EQUIPMENT (PARTIAL & FULL) ---');
    // 7.1 Partial Return: Return 1 of 2 MacBook Pros (Eq 2)
    const partialReturn = await request(app)
      .patch(`/api/borrowings/${handoverBorrowingId}/return`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ equipment_id: 2, return_quantity: 1 }],
      });
    assert(partialReturn.status === 200, 'Staff records partial return (200 OK)');
    assert(partialReturn.body.data.status === BORROWING_STATUS.BORROWED, 'Status remains BORROWED after partial return');
    
    // Check item returned_quantity in response
    const eq2Item = partialReturn.body.data.items.find(i => i.equipment_id === 2);
    assert(eq2Item.returned_quantity === 1, 'Eq 2 returned_quantity is 1');
    assert(eq2Item.quantity === 2, 'Eq 2 quantity is 2');

    // Check equipment 2 borrowed_quantity decreased by 1
    const [[eq2AfterPartial]] = await pool.query('SELECT borrowed_quantity FROM equipments WHERE id = 2');
    assert(eq2AfterPartial.borrowed_quantity === eq2AfterHandover.borrowed_quantity - 1, 'Equipment 2 borrowed_quantity decreased by 1');

    // 7.2 Return with quantity exceeding remaining borrowed -> 400
    const excessReturn = await request(app)
      .patch(`/api/borrowings/${handoverBorrowingId}/return`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ equipment_id: 2, return_quantity: 2 }], // Only 1 remaining!
      });
    assert(excessReturn.status === 400, 'Returning more than remaining borrowed quantity returns 400 Bad Request');

    // 7.3 Full Return of remaining items (omit items array -> returns all remaining!)
    const fullReturn = await request(app)
      .patch(`/api/borrowings/${handoverBorrowingId}/return`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({}); // Full return
    assert(fullReturn.status === 200, 'Staff records full return of remaining items (200 OK)');
    assert(fullReturn.body.data.status === BORROWING_STATUS.RETURNED, 'Status transitions to RETURNED when all items returned');
    assert(fullReturn.body.data.returned_at !== null, 'returned_at timestamp recorded');
    assert(fullReturn.body.data.items.every(i => i.returned_quantity === i.quantity), 'All items returned_quantity equal quantity');

    // 7.4 Returning already RETURNED request -> 400
    const reReturn = await request(app)
      .patch(`/api/borrowings/${handoverBorrowingId}/return`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert(reReturn.status === 400, 'Returning already RETURNED request returns 400 Bad Request');

    // -------------------------------------------------------------------------
    // 8. UC08: Expire unclaimed approved borrowings
    // -------------------------------------------------------------------------
    console.log('\n--- 8. UC08: EXPIRE UNCLAIMED APPROVED BORROWINGS ---');
    // Create an approved borrowing with past pickup_deadline
    const expireReq = await request(app)
      .post('/api/borrowings')
      .set('Authorization', `Bearer ${borrower1Token}`)
      .send({
        purpose: 'Yêu cầu mượn để test quá hạn nhận thiết bị',
        items: [{ equipment_id: 6, quantity: 1 }], // Switch Cisco
      });
    const expireBorrowingId = expireReq.body.data.id;

    // Approve it
    await request(app)
      .patch(`/api/borrowings/${expireBorrowingId}/approve`)
      .set('Authorization', `Bearer ${staffToken}`);

    // Artificially set pickup_deadline to 2 hours ago
    await pool.execute(
      'UPDATE borrowings SET pickup_deadline = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?',
      [expireBorrowingId]
    );

    const [[eq6BeforeExpire]] = await pool.query('SELECT reserved_quantity FROM equipments WHERE id = 6');

    // Handover should be blocked because deadline is passed
    const blockedHandover = await request(app)
      .patch(`/api/borrowings/${expireBorrowingId}/handover`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert(blockedHandover.status === 400, 'Handover of past-deadline borrowing is blocked (400 Bad Request)');

    // Call expire endpoint
    const expireProcessRes = await request(app)
      .post('/api/borrowings/process-expired')
      .set('Authorization', `Bearer ${staffToken}`);
    assert(expireProcessRes.status === 200, 'Process expired borrowings returns 200 OK');
    assert(expireProcessRes.body.data.expiredIds.includes(expireBorrowingId), 'Expired borrowing ID included in processed list');

    // Verify status changed to EXPIRED and reserved_quantity released
    const [[expiredBorrowingRow]] = await pool.query('SELECT status FROM borrowings WHERE id = ?', [expireBorrowingId]);
    assert(expiredBorrowingRow.status === BORROWING_STATUS.EXPIRED, 'Borrowing status updated to EXPIRED');

    const [[eq6AfterExpire]] = await pool.query('SELECT reserved_quantity FROM equipments WHERE id = 6');
    assert(eq6AfterExpire.reserved_quantity === eq6BeforeExpire.reserved_quantity - 1, 'Expired request released reserved inventory in equipments');

    // -------------------------------------------------------------------------
    // 9. Post-Test Cleanup & Integrity Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 9. POST-TEST CLEANUP & INTEGRITY VERIFICATION ---');
    // Clean up test items and borrowings created during this test run (ID > 7)
    await pool.execute(`
      DELETE bi FROM borrowing_items bi
      JOIN borrowings b ON bi.borrowing_id = b.id
      WHERE b.id > 7
    `);
    const [delBorrowings] = await pool.execute('DELETE FROM borrowings WHERE id > 7');
    console.log(`  🧹 Cleaned up ${delBorrowings.affectedRows} transient test borrowings.`);

    // Restore Seed Equipments 1-6 quantities
    // Seed states:
    // ID 1: total=10, reserved=2, borrowed=3
    // ID 2: total=5, reserved=0, borrowed=0
    // ID 3: total=4, reserved=1, borrowed=0
    // ID 4: total=8, reserved=0, borrowed=2
    // ID 5: total=15, reserved=0, borrowed=0
    // ID 6: total=6, reserved=0, borrowed=0
    await pool.execute('UPDATE equipments SET total_quantity=10, reserved_quantity=2, borrowed_quantity=3, status="AVAILABLE", is_active=1 WHERE id=1');
    await pool.execute('UPDATE equipments SET total_quantity=5, reserved_quantity=0, borrowed_quantity=0, status="AVAILABLE", is_active=1 WHERE id=2');
    await pool.execute('UPDATE equipments SET total_quantity=4, reserved_quantity=1, borrowed_quantity=0, status="AVAILABLE", is_active=1 WHERE id=3');
    await pool.execute('UPDATE equipments SET total_quantity=8, reserved_quantity=0, borrowed_quantity=2, status="AVAILABLE", is_active=1 WHERE id=4');
    await pool.execute('UPDATE equipments SET total_quantity=15, reserved_quantity=0, borrowed_quantity=0, status="AVAILABLE", is_active=1 WHERE id=5');
    await pool.execute('UPDATE equipments SET total_quantity=6, reserved_quantity=0, borrowed_quantity=0, status="AVAILABLE", is_active=1 WHERE id=6');

    // Verify final counts
    const [[userCount]] = await pool.query('SELECT COUNT(*) as c FROM users');
    const [[eqCount]] = await pool.query('SELECT COUNT(*) as c FROM equipments');
    const [[brCount]] = await pool.query('SELECT COUNT(*) as c FROM borrowings');
    const [[biCount]] = await pool.query('SELECT COUNT(*) as c FROM borrowing_items');

    assert(Number(userCount.c) === 6, 'Users table count is exactly 6');
    assert(Number(eqCount.c) === 6, 'Equipments table count is exactly 6');
    assert(Number(brCount.c) === 7, 'Borrowings table count is exactly 7');
    assert(Number(biCount.c) === 9, 'Borrowing items table count is exactly 9');

    console.log('\n================================================================');
    console.log(`🎉 ALL PHASE 4 TESTS PASSED! (${passedTests}/${totalTests} tests)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ PHASE 4 TEST SUITE FAILED WITH ERROR:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTests();
