/**
 * Phase 3 Comprehensive Test Suite
 * Rikkei Lab Equipment Borrowing System - Equipment Management
 *
 * Verifies all Phase 3 requirements:
 * 1. Unauthenticated access rejected (401)
 * 2. RBAC & role-based visibility:
 *    - Borrower can only view active, AVAILABLE equipment
 *    - Borrower blocked from adding/editing/changing status (403)
 *    - Staff and Admin can view all equipment and perform management actions
 * 3. Equipment Creation (POST /api/equipments):
 *    - Success creation (201)
 *    - Inventory counters protected (cannot inject reserved/borrowed/available)
 *    - Duplicate equipment code rejected (409)
 *    - Input validation (missing name, code, category, negative total_quantity -> 400)
 * 4. Equipment Detail (GET /api/equipments/:id):
 *    - Valid ID returns equipment details (200)
 *    - Invalid ID format returns 400
 *    - Non-existent ID returns 404
 *    - Borrower cannot access non-AVAILABLE or inactive equipment (404)
 * 5. Search, Filter & Pagination (GET /api/equipments):
 *    - Pagination (page, limit)
 *    - Search by code or name
 *    - Filter by category
 *    - Filter by status (Staff/Admin)
 *    - Pagination parameter validation (page <= 0, limit > 100 -> 400)
 *    - SQL Injection protection on search
 * 6. Equipment Update (PUT /api/equipments/:id):
 *    - Admin/Staff update info (200)
 *    - Invariant protection: total_quantity cannot be reduced below (reserved + borrowed) (400)
 *    - Inventory counters and code cannot be modified via client payload
 * 7. Status Management (PATCH /api/equipments/:id/status):
 *    - Transition status (AVAILABLE -> MAINTENANCE -> AVAILABLE)
 *    - Maintenance device hidden from Borrower immediately
 *    - Invalid enum status rejected (400)
 * 8. Transaction rollback verification on update failure
 * 9. Post-test cleanup and database integrity verification (exactly 6 seed equipments remain)
 */

const request = require('supertest');
const app = require('./src/app');
const { pool } = require('./src/config/database');
const { ROLES } = require('./src/constants/roles');
const { EQUIPMENT_STATUS } = require('./src/constants/equipment');

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
  console.log('🚀 STARTING BACKEND PHASE 3 - EQUIPMENT MANAGEMENT TEST SUITE');
  console.log('================================================================\n');

  let adminToken = null;
  let staffToken = null;
  let borrowerToken = null;
  let createdEquipmentId = null;

  try {
    // Clean up any stale test records from aborted runs
    await pool.execute("DELETE FROM equipments WHERE code LIKE 'TEST-%'");

    // -------------------------------------------------------------------------
    // Preliminary: Authenticate Seed Users
    // -------------------------------------------------------------------------
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

    const borrowerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'borrower.le@rikkeilab.vn', password: 'Password@123' });
    assert(borrowerLogin.status === 200, 'Borrower login returns 200');
    borrowerToken = borrowerLogin.body.data.token;

    // -------------------------------------------------------------------------
    // 1. Unauthenticated Access Rejected
    // -------------------------------------------------------------------------
    console.log('\n--- 1. UNAUTHENTICATED ACCESS REJECTION (401) ---');
    const unauthGet = await request(app).get('/api/equipments');
    assert(unauthGet.status === 401, 'GET /api/equipments without token returns 401');

    const unauthDetail = await request(app).get('/api/equipments/1');
    assert(unauthDetail.status === 401, 'GET /api/equipments/:id without token returns 401');

    const unauthPost = await request(app).post('/api/equipments').send({ name: 'Test' });
    assert(unauthPost.status === 401, 'POST /api/equipments without token returns 401');

    const unauthPut = await request(app).put('/api/equipments/1').send({ name: 'Test' });
    assert(unauthPut.status === 401, 'PUT /api/equipments/:id without token returns 401');

    const unauthPatch = await request(app).patch('/api/equipments/1/status').send({ status: 'MAINTENANCE' });
    assert(unauthPatch.status === 401, 'PATCH /api/equipments/:id/status without token returns 401');

    // -------------------------------------------------------------------------
    // 2. RBAC & Borrower Permissions Check
    // -------------------------------------------------------------------------
    console.log('\n--- 2. RBAC & BORROWER PERMISSIONS (403) ---');
    const borrowerCreate = await request(app)
      .post('/api/equipments')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        code: 'TEST-FORBIDDEN',
        name: 'Borrower Test Device',
        category: 'LAPTOP',
        total_quantity: 5,
      });
    assert(borrowerCreate.status === 403, 'Borrower cannot create equipment (403 Forbidden)');

    const borrowerUpdate = await request(app)
      .put('/api/equipments/1')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({ name: 'Borrower Hacked Name' });
    assert(borrowerUpdate.status === 403, 'Borrower cannot update equipment (403 Forbidden)');

    const borrowerStatus = await request(app)
      .patch('/api/equipments/1/status')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({ status: 'MAINTENANCE' });
    assert(borrowerStatus.status === 403, 'Borrower cannot change equipment status (403 Forbidden)');

    // -------------------------------------------------------------------------
    // 3. Equipment Creation (POST /api/equipments)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. EQUIPMENT CREATION (POST /api/equipments) ---');
    // 3.1 Staff creates new equipment
    const staffCreate = await request(app)
      .post('/api/equipments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        code: 'TEST-DEV-001',
        name: 'Thiết bị đo xung tần số cao Siglent',
        category: 'LAB_TOOL',
        description: 'Máy hiện sóng oscilloscope 200MHz phục vụ đo kiểm',
        total_quantity: 8,
        // Injected inventory counters should be ignored
        reserved_quantity: 5,
        borrowed_quantity: 3,
        available_quantity: 0,
      });
    assert(staffCreate.status === 201, 'Staff creates equipment successfully (201 Created)');
    assert(staffCreate.body.data.code === 'TEST-DEV-001', 'Created equipment has correct code');
    assert(staffCreate.body.data.total_quantity === 8, 'Created equipment has total_quantity = 8');
    assert(staffCreate.body.data.reserved_quantity === 0, 'reserved_quantity is strictly initialized to 0');
    assert(staffCreate.body.data.borrowed_quantity === 0, 'borrowed_quantity is strictly initialized to 0');
    assert(staffCreate.body.data.available_quantity === 8, 'available_quantity is computed automatically to 8');
    assert(staffCreate.body.data.status === 'AVAILABLE', 'status defaults to AVAILABLE');
    assert(staffCreate.body.data.is_active === 1, 'is_active defaults to 1');
    createdEquipmentId = staffCreate.body.data.id;

    // 3.2 Duplicate equipment code rejected
    const dupCode = await request(app)
      .post('/api/equipments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TEST-DEV-001',
        name: 'Another Device with Same Code',
        category: 'LAB_TOOL',
        total_quantity: 3,
      });
    assert(dupCode.status === 409, 'Duplicate equipment code returns 409 Conflict');

    // 3.3 Validation: Missing required fields
    const missingName = await request(app)
      .post('/api/equipments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'TEST-DEV-002', category: 'LAPTOP', total_quantity: 5 });
    assert(missingName.status === 400, 'Missing name returns 400 Bad Request');

    const missingCode = await request(app)
      .post('/api/equipments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Device No Code', category: 'LAPTOP', total_quantity: 5 });
    assert(missingCode.status === 400, 'Missing code returns 400 Bad Request');

    const negativeQty = await request(app)
      .post('/api/equipments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'TEST-DEV-003', name: 'Negative Qty Device', category: 'LAPTOP', total_quantity: -1 });
    assert(negativeQty.status === 400, 'Negative total_quantity returns 400 Bad Request');

    // -------------------------------------------------------------------------
    // 4. Equipment Detail (GET /api/equipments/:id)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. EQUIPMENT DETAIL (GET /api/equipments/:id) ---');
    const validDetail = await request(app)
      .get(`/api/equipments/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(validDetail.status === 200, 'Borrower views valid AVAILABLE equipment detail (200 OK)');
    assert(validDetail.body.data.code === 'TEST-DEV-001', 'Detail returns correct equipment code');

    const notFoundDetail = await request(app)
      .get('/api/equipments/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(notFoundDetail.status === 404, 'Non-existent equipment ID returns 404 Not Found');

    const invalidIdDetail = await request(app)
      .get('/api/equipments/abc')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(invalidIdDetail.status === 400, 'Invalid ID format returns 400 Bad Request');

    // -------------------------------------------------------------------------
    // 5. Search, Filter & Pagination (GET /api/equipments)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. SEARCH, FILTER & PAGINATION (GET /api/equipments) ---');
    // 5.1 Pagination
    const pageRes = await request(app)
      .get('/api/equipments?page=1&limit=3')
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(pageRes.status === 200, 'List equipments with pagination returns 200 OK');
    assert(pageRes.body.data.length <= 3, 'Respects pagination limit');
    assert(pageRes.body.pagination && pageRes.body.pagination.total >= 6, 'Pagination metadata is correct');

    // 5.2 Filter by Category
    const categoryRes = await request(app)
      .get('/api/equipments?category=LAPTOP')
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(categoryRes.status === 200, 'Filter by category LAPTOP returns 200 OK');
    assert(categoryRes.body.data.every(e => e.category === 'LAPTOP'), 'All returned equipments have category LAPTOP');

    // 5.3 Search by Keyword (Name / Code)
    const searchRes = await request(app)
      .get('/api/equipments?search=Dell')
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(searchRes.status === 200, 'Search by keyword Dell returns 200 OK');
    assert(searchRes.body.data.length > 0, 'Finds matching Dell devices');

    // 5.4 Pagination Validation
    const pageZero = await request(app).get('/api/equipments?page=0').set('Authorization', `Bearer ${adminToken}`);
    assert(pageZero.status === 400, 'page=0 returns 400 Bad Request');

    const limitExcess = await request(app).get('/api/equipments?limit=101').set('Authorization', `Bearer ${adminToken}`);
    assert(limitExcess.status === 400, 'limit=101 (>100) returns 400 Bad Request');

    const invalidStatusFilter = await request(app).get('/api/equipments?status=BROKEN').set('Authorization', `Bearer ${adminToken}`);
    assert(invalidStatusFilter.status === 400, 'Invalid status filter returns 400 Bad Request');

    // 5.5 SQL Injection Probe
    const sqliSearch = await request(app)
      .get("/api/equipments?search=' OR '1'='1' --")
      .set('Authorization', `Bearer ${adminToken}`);
    assert(sqliSearch.status === 200, 'SQL injection search returns 200 (treated as literal)');
    assert(sqliSearch.body.data.length === 0, 'No matching records, no SQL syntax error');

    // -------------------------------------------------------------------------
    // 6. Equipment Update & Invariant Protection (PUT /api/equipments/:id)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. EQUIPMENT UPDATE & INVARIANT (PUT /api/equipments/:id) ---');
    // 6.1 Normal info update
    const normalUpdate = await request(app)
      .put(`/api/equipments/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Máy đo xung Siglent SDS1202X-E',
        description: 'Cập nhật model và độ phân giải hiển thị',
      });
    assert(normalUpdate.status === 200, 'Admin updates equipment info successfully (200 OK)');
    assert(normalUpdate.body.data.name === 'Máy đo xung Siglent SDS1202X-E', 'Name updated correctly');

    // 6.2 Cannot modify code or inventory counters via update
    const attemptTamper = await request(app)
      .put(`/api/equipments/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'HACKED-CODE',
        reserved_quantity: 99,
        borrowed_quantity: 88,
      });
    // Validator expects at least one valid editable field or returns 400
    assert(attemptTamper.status === 400, 'Attempting to only update immutable fields is rejected with 400');

    // 6.3 INVARIANT PROTECTION:
    // Equipment ID 1 in seed data has: total=10, reserved=2, borrowed=3 (committed sum = 5)
    // Attempting to set total_quantity < 5 (e.g. 4) MUST BE REJECTED!
    const violateInvariant = await request(app)
      .put('/api/equipments/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ total_quantity: 4 });
    assert(violateInvariant.status === 400, 'Reducing total_quantity below reserved + borrowed is blocked with 400 Bad Request');
    assert(violateInvariant.body.message.toLowerCase().includes('không thể'), 'Error message clearly explains invariant violation');

    // Total quantity equal to committed sum (5) is allowed:
    const equalInvariant = await request(app)
      .put('/api/equipments/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ total_quantity: 5 });
    assert(equalInvariant.status === 200, 'Setting total_quantity equal to reserved + borrowed is allowed (200 OK)');
    assert(equalInvariant.body.data.total_quantity === 5, 'total_quantity updated to 5');
    assert(equalInvariant.body.data.available_quantity === 0, 'available_quantity drops to 0 automatically');

    // Restore Equipment 1 total_quantity = 10
    const restoreEq1 = await request(app)
      .put('/api/equipments/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ total_quantity: 10 });
    assert(restoreEq1.status === 200, 'Restored Equipment 1 total_quantity = 10');
    assert(restoreEq1.body.data.available_quantity === 5, 'available_quantity restored to 5');

    // -------------------------------------------------------------------------
    // 7. Status Management & Borrower Isolation (PATCH /api/equipments/:id/status)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. STATUS MANAGEMENT & BORROWER VISIBILITY (PATCH /status) ---');
    // 7.1 Admin changes created equipment status to MAINTENANCE
    const setMaintenance = await request(app)
      .patch(`/api/equipments/${createdEquipmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'MAINTENANCE' });
    assert(setMaintenance.status === 200, 'Equipment status updated to MAINTENANCE (200 OK)');
    assert(setMaintenance.body.data.status === 'MAINTENANCE', 'Status field is MAINTENANCE');

    // 7.2 Borrower cannot see MAINTENANCE equipment in list
    const borrowerListAfter = await request(app)
      .get('/api/equipments')
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(borrowerListAfter.status === 200, 'Borrower list returns 200');
    const isMaintenanceVisible = borrowerListAfter.body.data.some(e => e.id === createdEquipmentId);
    assert(!isMaintenanceVisible, 'MAINTENANCE equipment is NOT visible to Borrower in list');

    // 7.3 Borrower cannot see MAINTENANCE equipment by direct ID
    const borrowerDetailAfter = await request(app)
      .get(`/api/equipments/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(borrowerDetailAfter.status === 404, 'Direct access to MAINTENANCE equipment by Borrower returns 404 Not Found');

    // 7.4 Staff / Admin CAN see MAINTENANCE equipment
    const staffDetailMaintenance = await request(app)
      .get(`/api/equipments/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert(staffDetailMaintenance.status === 200, 'Staff can view MAINTENANCE equipment detail (200 OK)');

    // 7.5 Restore status to AVAILABLE
    const setAvailable = await request(app)
      .patch(`/api/equipments/${createdEquipmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'AVAILABLE' });
    assert(setAvailable.status === 200, 'Equipment status restored to AVAILABLE (200 OK)');

    // Verify Borrower sees it again
    const borrowerDetailRestored = await request(app)
      .get(`/api/equipments/${createdEquipmentId}`)
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(borrowerDetailRestored.status === 200, 'Borrower can view AVAILABLE equipment again (200 OK)');

    // 7.6 Invalid status rejected
    const invalidStatus = await request(app)
      .patch(`/api/equipments/${createdEquipmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISCARDED_INVALID' });
    assert(invalidStatus.status === 400, 'Invalid enum status returns 400 Bad Request');

    // -------------------------------------------------------------------------
    // 8. Transaction Rollback Verification on Update Failure
    // -------------------------------------------------------------------------
    console.log('\n--- 8. TRANSACTION ROLLBACK VERIFICATION ---');
    const [[beforeRow]] = await pool.query('SELECT total_quantity, name FROM equipments WHERE id = 1');
    const originalQty = beforeRow.total_quantity;
    const originalName = beforeRow.name;

    // Trigger failure by violating invariant
    await request(app)
      .put('/api/equipments/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Should Not Persist',
        total_quantity: 1, // Violates committed sum = 5
      });

    const [[afterRow]] = await pool.query('SELECT total_quantity, name FROM equipments WHERE id = 1');
    assert(afterRow.total_quantity === originalQty, 'Transaction rolled back: total_quantity is unchanged');
    assert(afterRow.name === originalName, 'Transaction rolled back: name is unchanged');

    // -------------------------------------------------------------------------
    // 9. Post-Test Cleanup & Integrity Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 9. POST-TEST CLEANUP & INTEGRITY VERIFICATION ---');
    // Delete any test-created equipment
    const [delResult] = await pool.execute("DELETE FROM equipments WHERE code LIKE 'TEST-%'");
    console.log(`  🧹 Cleaned up ${delResult.affectedRows} transient test equipment records.`);

    // Restore Seed Equipments 1-6
    await pool.execute("UPDATE equipments SET status = 'AVAILABLE', is_active = 1 WHERE id IN (1, 2, 3, 4, 5, 6)");
    await pool.execute('UPDATE equipments SET total_quantity = 10 WHERE id = 1');

    const [[finalCountRow]] = await pool.query('SELECT COUNT(*) AS total FROM equipments');
    assert(Number(finalCountRow.total) === 6, 'Equipments table count is exactly 6 after test completion');

    console.log('\n================================================================');
    console.log(`🎉 ALL PHASE 3 TESTS PASSED! (${passedTests}/${totalTests} tests)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ PHASE 3 TEST SUITE FAILED WITH ERROR:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTests();
