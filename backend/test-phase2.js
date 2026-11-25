/**
 * Phase 2 Comprehensive Test Suite - Enhanced with Concurrency & Security Tests
 * Rikkei Lab Equipment Borrowing System
 *
 * Tests all 8 Use Cases:
 * - UC01: Registration (Public, force BORROWER, active=1, duplicate check)
 * - UC02: Login (Bcrypt verification, JWT issuance, generic error, inactive block)
 * - UC03: Get Profile & JWT Security:
 *         - Bearer extraction & signature validation
 *         - Expired token rejection
 *         - Malformed / tampered token rejection
 *         - Real-time DB role check: Demoted Admin's token is immediately rejected (403)
 *         - Real-time DB status check: Deactivated user's token is immediately rejected (403)
 * - UC04: List Users:
 *         - Admin only, RBAC rejection for STAFF & BORROWER
 *         - Pagination bounds validation (page <= 0, limit > 100 rejected)
 *         - Whitelist validation on role and is_active
 *         - SQL Injection defense on search parameter
 * - UC05: Get User Detail (Admin only, 404 handling, 400 invalid ID)
 * - UC06: Admin Create User:
 *         - Admin creates STAFF, BORROWER, and ADMIN
 *         - Staff and Borrower blocked from creating users (403)
 *         - Validation & duplicate email handling
 * - UC07: Status Update:
 *         - Deactivate and reactivate users
 *         - Self-deactivation prevention (400)
 *         - Concurrency Test: Two concurrent requests attempting to deactivate both remaining
 *           active Admins -> Exactly 1 succeeds, 1 fails with LAST_ADMIN_PROTECTED, DB keeps 1 active admin!
 * - UC08: Role Update:
 *         - Promote and demote users
 *         - Self-role modification prevention (400)
 *         - Concurrency Test: Two concurrent requests attempting to demote both remaining
 *           active Admins -> Exactly 1 succeeds, 1 fails with LAST_ADMIN_PROTECTED, DB keeps 1 active admin!
 *
 * Cleanup: Removes all transient test users and restores original seed state.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const { pool } = require('./src/config/database');
const env = require('./src/config/env');
const { ROLES } = require('./src/constants/roles');
const { hashPassword } = require('./src/utils/password');

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
  console.log('🚀 STARTING BACKEND PHASE 2 COMPREHENSIVE & CONCURRENCY TEST SUITE');
  console.log('================================================================\n');

  let adminToken = null;
  let staffToken = null;
  let borrowerToken = null;

  try {
    // -------------------------------------------------------------------------
    // Preliminary: Login with Seed Users to obtain tokens
    // -------------------------------------------------------------------------
    console.log('--- PRELIMINARY: Authenticating Seed Accounts ---');
    
    // Login Admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@rikkeilab.vn', password: 'Password@123' });
    assert(adminLoginRes.status === 200, 'Seed Admin login returns 200');
    assert(adminLoginRes.body.data && adminLoginRes.body.data.token, 'Seed Admin token received');
    assert(!adminLoginRes.body.data.user.password_hash, 'Admin user object excludes password_hash');
    adminToken = adminLoginRes.body.data.token;

    // Login Staff
    const staffLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff.nguyen@rikkeilab.vn', password: 'Password@123' });
    assert(staffLoginRes.status === 200, 'Seed Staff login returns 200');
    staffToken = staffLoginRes.body.data.token;

    // Login Borrower
    const borrowerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'borrower.le@rikkeilab.vn', password: 'Password@123' });
    assert(borrowerLoginRes.status === 200, 'Seed Borrower login returns 200');
    borrowerToken = borrowerLoginRes.body.data.token;

    console.log('\n--- USE CASE 01: POST /api/auth/register ---');
    // 1.1 Successful Registration
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test.borrower.p2@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Test Borrower P2',
        phone: '0901234567',
      });
    assert(regRes.status === 201, 'Registration returns 201 Created');
    assert(regRes.body.data.role === ROLES.BORROWER, 'Registration sets role to BORROWER');
    assert(regRes.body.data.is_active === 1, 'Registration sets is_active to 1');
    assert(!regRes.body.data.password_hash, 'Registration response excludes password_hash');
    const createdUserId = regRes.body.data.id;

    // 1.2 Duplicate Email
    const dupRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test.borrower.p2@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Test Borrower P2',
      });
    assert(dupRes.status === 409, 'Duplicate email registration returns 409 Conflict');

    // 1.3 Validation Errors (short password, invalid email)
    const valRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: '123',
        full_name: '',
      });
    assert(valRes.status === 400, 'Invalid registration data returns 400 Bad Request');
    assert(Array.isArray(valRes.body.errors) && valRes.body.errors.length >= 2, 'Validation returns array of error messages');

    // 1.4 Privilege Escalation Prevention
    const fakeAdminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test.fakeadmin.p2@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Hacker Pretending Admin',
        role: 'ADMIN',
        is_active: 0,
      });
    assert(fakeAdminRes.status === 201, 'Registration with injected role returns 201');
    assert(fakeAdminRes.body.data.role === ROLES.BORROWER, 'Client-supplied role is ignored, forced to BORROWER');
    assert(fakeAdminRes.body.data.is_active === 1, 'Client-supplied is_active is ignored, forced to 1');

    console.log('\n--- USE CASE 02: POST /api/auth/login ---');
    // 2.1 Login with newly created user
    const loginSuccessRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.borrower.p2@rikkeilab.vn',
        password: 'Password@123',
      });
    assert(loginSuccessRes.status === 200, 'Login with correct credentials returns 200 OK');
    assert(typeof loginSuccessRes.body.data.token === 'string', 'Login returns valid JWT string');
    assert(loginSuccessRes.body.data.user.email === 'test.borrower.p2@rikkeilab.vn', 'Login returns sanitized user profile');

    // 2.2 Wrong Password
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.borrower.p2@rikkeilab.vn',
        password: 'WrongPassword@999',
      });
    assert(wrongPassRes.status === 401, 'Wrong password returns 401 Unauthorized');
    assert(wrongPassRes.body.message === 'Email hoặc mật khẩu không chính xác.', 'Error message is generic');

    // 2.3 Non-existent Email
    const noEmailRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@rikkeilab.vn',
        password: 'Password@123',
      });
    assert(noEmailRes.status === 401, 'Non-existent email returns 401 Unauthorized');
    assert(noEmailRes.body.message === 'Email hoặc mật khẩu không chính xác.', 'Error message does not leak email existence');

    // 2.4 Inactive User Login Blocked
    await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [createdUserId]);
    const inactiveLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.borrower.p2@rikkeilab.vn',
        password: 'Password@123',
      });
    assert(inactiveLoginRes.status === 403, 'Inactive account login returns 403 Forbidden');
    // Restore user active status for further tests
    await pool.execute('UPDATE users SET is_active = 1 WHERE id = ?', [createdUserId]);

    console.log('\n--- USE CASE 03: GET /api/auth/me & JWT SECURITY ---');
    // 3.1 Missing Token
    const noTokenRes = await request(app).get('/api/auth/me');
    assert(noTokenRes.status === 401, 'Missing Authorization header returns 401');

    // 3.2 Malformed Token
    const badTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.value');
    assert(badTokenRes.status === 401, 'Malformed token returns 401');

    // 3.3 Expired Token
    const expiredToken = jwt.sign({ id: 1, email: 'admin@rikkeilab.vn', role: 'ADMIN' }, env.JWT_SECRET, { expiresIn: '0s' });
    const expiredTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    assert(expiredTokenRes.status === 401, 'Expired token returns 401 Unauthorized');
    assert(expiredTokenRes.body.message.includes('hết hạn'), 'Expired token returns descriptive expiration message');

    // 3.4 Tampered Signature Token
    const tamperedToken = jwt.sign({ id: 1, email: 'admin@rikkeilab.vn', role: 'ADMIN' }, 'wrong-secret-key-123456');
    const tamperedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`);
    assert(tamperedRes.status === 401, 'Token with wrong signature returns 401 Unauthorized');

    // 3.5 Valid Profile Retrieval
    const profileRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(profileRes.status === 200, 'Valid token returns 200 OK');
    assert(profileRes.body.data.email === 'admin@rikkeilab.vn', 'Profile returns correct email');
    assert(!profileRes.body.data.password_hash, 'Profile excludes password_hash');

    // 3.6 Real-time DB deactivation check (token was valid, but user is now inactive)
    const tempUserTokenRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.borrower.p2@rikkeilab.vn', password: 'Password@123' });
    const tempToken = tempUserTokenRes.body.data.token;
    await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [createdUserId]);
    const blockedProfileRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tempToken}`);
    assert(blockedProfileRes.status === 403, 'Subsequent request with token of deactivated user returns 403 Forbidden');
    await pool.execute('UPDATE users SET is_active = 1 WHERE id = ?', [createdUserId]);

    // 3.7 Real-time DB Role Update Check:
    // Create an Admin, obtain token with role ADMIN in payload.
    // Demote to BORROWER in database. Call Admin endpoint -> MUST RETURN 403!
    const createTempAdminRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test.tempadmin.p2@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Temp Admin For Role Revocation Test',
        role: 'ADMIN',
      });
    const tempAdminId = createTempAdminRes.body.data.id;
    const tempAdminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.tempadmin.p2@rikkeilab.vn', password: 'Password@123' });
    const tempAdminToken = tempAdminLoginRes.body.data.token;

    // Verify temp admin can access /api/users initially
    const tempAdminAccess1 = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tempAdminToken}`);
    assert(tempAdminAccess1.status === 200, 'Temp Admin accesses /api/users with initial ADMIN token');

    // Demote temp admin to BORROWER
    await request(app)
      .patch(`/api/users/${tempAdminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'BORROWER' });

    // Temp admin calls /api/users using OLD JWT (which contains role: 'ADMIN')
    const tempAdminAccessRevoked = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tempAdminToken}`);
    assert(tempAdminAccessRevoked.status === 403, 'Demoted Admin using old JWT is IMMEDIATELY blocked with 403 Forbidden');

    console.log('\n--- USE CASE 04: GET /api/users (List Users & Whitelist & SQL Injection) ---');
    // 4.1 RBAC: Borrower Blocked
    const borrowerListRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(borrowerListRes.status === 403, 'Borrower accessing /api/users returns 403 Forbidden');

    // 4.2 RBAC: Staff Blocked
    const staffListRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`);
    assert(staffListRes.status === 403, 'Staff accessing /api/users returns 403 Forbidden');

    // 4.3 Admin Access Allowed
    const adminListRes = await request(app)
      .get('/api/users?page=1&limit=3')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminListRes.status === 200, 'Admin accessing /api/users returns 200 OK');
    assert(Array.isArray(adminListRes.body.data), 'Data is an array');
    assert(adminListRes.body.data.length <= 3, 'Respects pagination limit');
    assert(adminListRes.body.pagination && adminListRes.body.pagination.total >= 6, 'Pagination info is populated');
    assert(!adminListRes.body.data[0].password_hash, 'No user items leak password_hash');

    // 4.4 Filter by role
    const staffFilterRes = await request(app)
      .get('/api/users?role=STAFF')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(staffFilterRes.status === 200, 'Filter by role returns 200 OK');
    assert(staffFilterRes.body.data.every(u => u.role === ROLES.STAFF), 'All returned users have role STAFF');

    // 4.5 Filter by search
    const searchRes = await request(app)
      .get('/api/users?search=nguyen')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(searchRes.status === 200, 'Search by keyword returns 200 OK');
    assert(searchRes.body.data.length > 0, 'Finds matching users');

    // 4.6 Validation: Invalid Page values
    const pageZeroRes = await request(app).get('/api/users?page=0').set('Authorization', `Bearer ${adminToken}`);
    assert(pageZeroRes.status === 400, 'page=0 returns 400 Bad Request');
    const pageNegativeRes = await request(app).get('/api/users?page=-5').set('Authorization', `Bearer ${adminToken}`);
    assert(pageNegativeRes.status === 400, 'page=-5 returns 400 Bad Request');
    const pageAlphaRes = await request(app).get('/api/users?page=abc').set('Authorization', `Bearer ${adminToken}`);
    assert(pageAlphaRes.status === 400, 'page=abc returns 400 Bad Request');

    // 4.7 Validation: Invalid Limit values (upper bound 100 enforced)
    const limitZeroRes = await request(app).get('/api/users?limit=0').set('Authorization', `Bearer ${adminToken}`);
    assert(limitZeroRes.status === 400, 'limit=0 returns 400 Bad Request');
    const limitExcessRes = await request(app).get('/api/users?limit=101').set('Authorization', `Bearer ${adminToken}`);
    assert(limitExcessRes.status === 400, 'limit=101 (>100) returns 400 Bad Request');

    // 4.8 Whitelist Validation: Non-whitelisted role filter
    const badRoleRes = await request(app).get('/api/users?role=HACKER').set('Authorization', `Bearer ${adminToken}`);
    assert(badRoleRes.status === 400, 'role=HACKER returns 400 Bad Request');

    // 4.9 Whitelist Validation: Non-whitelisted is_active filter
    const badActiveRes = await request(app).get('/api/users?is_active=99').set('Authorization', `Bearer ${adminToken}`);
    assert(badActiveRes.status === 400, 'is_active=99 returns 400 Bad Request');

    // 4.10 SQL Injection Defense: SQL Injection attack vector in search
    const sqliSearchRes = await request(app)
      .get("/api/users?search=' OR '1'='1' --")
      .set('Authorization', `Bearer ${adminToken}`);
    assert(sqliSearchRes.status === 200, 'SQL injection probe returns 200 OK (treated as literal)');
    assert(sqliSearchRes.body.data.length === 0, 'SQL injection payload returns 0 users, no syntax error');

    console.log('\n--- USE CASE 05: GET /api/users/:id ---');
    // 5.1 RBAC: Borrower Blocked
    const borrowerDetailRes = await request(app)
      .get('/api/users/1')
      .set('Authorization', `Bearer ${borrowerToken}`);
    assert(borrowerDetailRes.status === 403, 'Borrower accessing /api/users/:id returns 403 Forbidden');

    // 5.2 Admin accesses existing user
    const adminDetailRes = await request(app)
      .get('/api/users/1')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminDetailRes.status === 200, 'Admin gets user detail with 200 OK');
    assert(adminDetailRes.body.data.email === 'admin@rikkeilab.vn', 'Detail returns correct user');
    assert(!adminDetailRes.body.data.password_hash, 'Detail excludes password_hash');

    // 5.3 Non-existent user ID
    const notFoundRes = await request(app)
      .get('/api/users/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(notFoundRes.status === 404, 'Non-existent user ID returns 404 Not Found');

    // 5.4 Invalid ID format
    const badIdRes = await request(app)
      .get('/api/users/abc')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(badIdRes.status === 400, 'Invalid ID format returns 400 Bad Request');

    console.log('\n--- USE CASE 06: POST /api/users (Admin Creates STAFF, BORROWER, ADMIN) ---');
    // 6.1 RBAC: Staff Blocked
    const staffCreateRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        email: 'test.staff.p2@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Test Staff P2',
        role: 'STAFF',
      });
    assert(staffCreateRes.status === 403, 'Staff cannot create users (403 Forbidden)');

    // 6.2 RBAC: Borrower Blocked
    const borrowerCreateRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        email: 'test.borrower.p2b@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Test Borrower P2b',
        role: 'BORROWER',
      });
    assert(borrowerCreateRes.status === 403, 'Borrower cannot create users (403 Forbidden)');

    // 6.3 Admin creates STAFF
    const adminCreateStaffRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test.staff.p2@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Test Staff Created By Admin',
        role: 'STAFF',
        phone: '0988776655',
      });
    assert(adminCreateStaffRes.status === 201, 'Admin creates STAFF with 201 Created');
    assert(adminCreateStaffRes.body.data.role === ROLES.STAFF, 'Created user has role STAFF');
    assert(!adminCreateStaffRes.body.data.password_hash, 'Response excludes password_hash');
    const createdStaffId = adminCreateStaffRes.body.data.id;

    // 6.4 Admin creates BORROWER
    const adminCreateBorrowerRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test.borrower.createdbyadmin@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Test Borrower Created By Admin',
        role: 'BORROWER',
      });
    assert(adminCreateBorrowerRes.status === 201, 'Admin creates BORROWER with 201 Created');
    assert(adminCreateBorrowerRes.body.data.role === ROLES.BORROWER, 'Created user has role BORROWER');

    // 6.5 Admin creates ADMIN
    const adminCreateAdminRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test.admin.createdbyadmin@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Test Admin Created By Admin',
        role: 'ADMIN',
      });
    assert(adminCreateAdminRes.status === 201, 'Admin creates ADMIN with 201 Created');
    assert(adminCreateAdminRes.body.data.role === ROLES.ADMIN, 'Created user has role ADMIN');

    // 6.6 Admin creates with invalid role
    const invalidRoleRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test.invalidrole@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Invalid Role User',
        role: 'SUPERADMIN',
      });
    assert(invalidRoleRes.status === 400, 'Invalid role returns 400 Bad Request');

    console.log('\n--- USE CASE 07: PATCH /api/users/:id/status & CONCURRENCY ---');
    // 7.1 RBAC: Borrower Blocked
    const borrowerStatusRes = await request(app)
      .patch(`/api/users/${createdStaffId}/status`)
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({ is_active: 0 });
    assert(borrowerStatusRes.status === 403, 'Borrower cannot update status (403 Forbidden)');

    // 7.2 Admin deactivates created staff
    const deactRes = await request(app)
      .patch(`/api/users/${createdStaffId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: 0 });
    assert(deactRes.status === 200, 'Admin deactivates user (200 OK)');
    assert(deactRes.body.data.is_active === 0, 'User is_active updated to 0');

    // 7.3 Admin reactivates created staff
    const reactRes = await request(app)
      .patch(`/api/users/${createdStaffId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: 1 });
    assert(reactRes.status === 200, 'Admin reactivates user (200 OK)');
    assert(reactRes.body.data.is_active === 1, 'User is_active updated to 1');

    // 7.4 Protection: Admin cannot deactivate themselves
    const selfDeactRes = await request(app)
      .patch('/api/users/1/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: 0 });
    assert(selfDeactRes.status === 400, 'Admin deactivating themselves returns 400 Bad Request');

    // 7.5 Sequential Protection: Single remaining admin cannot be deactivated
    // Clean up temporary admins first so exactly 2 admins exist: Seed Admin 1 and Test Admin 2
    await pool.execute("DELETE FROM users WHERE email LIKE 'test.admin.createdbyadmin%' OR email LIKE 'test.tempadmin%'");
    
    // Create Admin 2
    const createAdmin2Res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test.admin2.p2@rikkeilab.vn',
        password: 'Password@123',
        full_name: 'Test Admin Two',
        role: 'ADMIN',
      });
    const admin2Id = createAdmin2Res.body.data.id;
    const admin2LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.admin2.p2@rikkeilab.vn', password: 'Password@123' });
    const admin2Token = admin2LoginRes.body.data.token;

    // 7.6 CONCURRENCY TEST: Two concurrent requests attempting to deactivate both remaining active admins!
    // Request A: Admin 1 deactivates Admin 2
    // Request B: Admin 2 deactivates Admin 1
    console.log('  -> Executing concurrent deactivation requests...');
    const [resA, resB] = await Promise.all([
      request(app)
        .patch(`/api/users/${admin2Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: 0 }),
      request(app)
        .patch('/api/users/1/status')
        .set('Authorization', `Bearer ${admin2Token}`)
        .send({ is_active: 0 }),
    ]);

    const statuses = [resA.status, resB.status];
    const hasOne200 = statuses.filter(s => s === 200).length === 1;
    const hasOne400 = statuses.filter(s => s === 400).length === 1;
    assert(hasOne200 && hasOne400, 'Concurrent deactivation: Exactly ONE succeeds (200) and ONE fails (400)');

    // Verify Invariant: In the database, exactly 1 active admin remains!
    const [[adminCountRow]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND is_active = 1");
    assert(Number(adminCountRow.count) === 1, 'Invariant holds: Exactly 1 active admin remains after concurrent race');

    // Reactivate both admins for role concurrency tests
    await pool.execute('UPDATE users SET is_active = 1 WHERE id IN (1, ?)', [admin2Id]);

    console.log('\n--- USE CASE 08: PATCH /api/users/:id/role & CONCURRENCY ---');
    // 8.1 RBAC: Borrower Blocked
    const borrowerRoleRes = await request(app)
      .patch(`/api/users/${createdStaffId}/role`)
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({ role: 'ADMIN' });
    assert(borrowerRoleRes.status === 403, 'Borrower cannot update roles (403 Forbidden)');

    // 8.2 Admin updates user role
    const updateRoleRes = await request(app)
      .patch(`/api/users/${createdStaffId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'BORROWER' });
    assert(updateRoleRes.status === 200, 'Admin updates user role to BORROWER (200 OK)');
    assert(updateRoleRes.body.data.role === ROLES.BORROWER, 'Role is updated in database');

    // 8.3 Protection: Admin cannot modify their own role
    const selfRoleRes = await request(app)
      .patch('/api/users/1/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'STAFF' });
    assert(selfRoleRes.status === 400, 'Admin modifying own role returns 400 Bad Request');

    // 8.4 CONCURRENCY TEST: Two concurrent requests attempting to demote both remaining active admins!
    // Request A: Admin 1 demotes Admin 2 to STAFF
    // Request B: Admin 2 demotes Admin 1 to STAFF
    console.log('  -> Executing concurrent demotion requests...');
    const [demoteResA, demoteResB] = await Promise.all([
      request(app)
        .patch(`/api/users/${admin2Id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'STAFF' }),
      request(app)
        .patch('/api/users/1/role')
        .set('Authorization', `Bearer ${admin2Token}`)
        .send({ role: 'STAFF' }),
    ]);

    const demoteStatuses = [demoteResA.status, demoteResB.status];
    const demoteHasOne200 = demoteStatuses.filter(s => s === 200).length === 1;
    const demoteHasOne400 = demoteStatuses.filter(s => s === 400).length === 1;
    assert(demoteHasOne200 && demoteHasOne400, 'Concurrent demotion: Exactly ONE succeeds (200) and ONE fails (400)');

    // Verify Invariant: In the database, exactly 1 active admin remains!
    const [[adminDemoteCountRow]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND is_active = 1");
    assert(Number(adminDemoteCountRow.count) === 1, 'Invariant holds: Exactly 1 active admin remains after concurrent demotion race');

    console.log('\n--- POST-TEST CLEANUP & DATA INTEGRITY VERIFICATION ---');
    // Clean up all created test users
    const [delResult] = await pool.execute(`
      DELETE FROM users 
      WHERE email LIKE 'test.%' OR email LIKE 'reg.%'
    `);
    console.log(`  🧹 Cleaned up ${delResult.affectedRows} transient test records.`);

    // Restore Seed Users 1-6
    const defaultPasswordHash = await hashPassword('Password@123');
    await pool.execute('UPDATE users SET is_active = 1 WHERE id IN (1, 2, 3, 4, 5, 6)');
    await pool.execute("UPDATE users SET role = 'ADMIN' WHERE id = 1");
    await pool.execute("UPDATE users SET role = 'STAFF' WHERE id IN (2, 3)");
    await pool.execute("UPDATE users SET role = 'BORROWER' WHERE id IN (4, 5, 6)");
    await pool.execute('UPDATE users SET password_hash = ? WHERE id IN (1, 2, 3, 4, 5, 6)', [defaultPasswordHash]);

    const [finalUserRows] = await pool.execute('SELECT COUNT(*) AS total FROM users');
    assert(Number(finalUserRows[0].total) === 6, 'Seed users count is exactly 6 after test completion');

    console.log('\n================================================================');
    console.log(`🎉 ALL PHASE 2 TESTS PASSED! (${passedTests}/${totalTests} tests)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTests();
