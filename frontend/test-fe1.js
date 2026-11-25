/**
 * Frontend Phase 1 (FE1) Verification Test Suite
 * Rikkei Lab Frontend Foundation
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================');
console.log('🚀 RUNNING FRONTEND PHASE 1 (FE1) VERIFICATION TESTS');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function check(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASSED: ${desc}`);
  } catch (err) {
    console.error(`  ❌ FAILED: ${desc}`);
    console.error('     Error:', err.message);
    process.exitCode = 1;
  }
}

// 1. Check directory structure
check('File structure exists according to requirements', () => {
  const requiredFiles = [
    'package.json',
    'vite.config.js',
    'index.html',
    '.env.example',
    '.env',
    '.gitignore',
    'src/main.jsx',
    'src/App.jsx',
    'src/utils/constants.js',
    'src/services/api.js',
    'src/services/auth.service.js',
    'src/contexts/AuthContext.jsx',
    'src/hooks/useAuth.js',
    'src/routes/AppRoutes.jsx',
    'src/routes/ProtectedRoute.jsx',
    'src/routes/RoleRoute.jsx',
    'src/components/common/Loading.jsx',
    'src/components/common/ErrorMessage.jsx',
    'src/components/layout/Header.jsx',
    'src/components/layout/Sidebar.jsx',
    'src/components/layout/MainLayout.jsx',
    'src/pages/auth/LoginPage.jsx',
    'src/pages/auth/RegisterPage.jsx',
    'src/pages/auth/UnauthorizedPage.jsx',
    'src/pages/HomePage.jsx',
    'src/pages/NotFoundPage.jsx',
    'src/styles/variables.css',
    'src/styles/base.css',
    'src/styles/layout.css',
    'src/styles/auth.css',
    'src/styles/components.css',
  ];

  for (const file of requiredFiles) {
    const fullPath = path.resolve('frontend', file);
    assert(fs.existsSync(fullPath), `Required file missing: ${file}`);
  }
});

// 2. Check Constants
check('Constants file defines roles and storage keys', async () => {
  const { ROLES, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } = await import('./src/utils/constants.js');
  assert.strictEqual(ROLES.ADMIN, 'ADMIN');
  assert.strictEqual(ROLES.STAFF, 'STAFF');
  assert.strictEqual(ROLES.BORROWER, 'BORROWER');
  assert(TOKEN_STORAGE_KEY, 'TOKEN_STORAGE_KEY must be defined');
  assert(USER_STORAGE_KEY, 'USER_STORAGE_KEY must be defined');
});

// 3. Check Axios instance configuration
check('Axios instance has correct base URL and interceptors', async () => {
  const { default: api } = await import('./src/services/api.js');
  assert(api.defaults.baseURL.includes('/api'), 'baseURL must point to /api endpoint');
  assert(api.interceptors.request.handlers.length > 0, 'Request interceptor must be registered');
  assert(api.interceptors.response.handlers.length > 0, 'Response interceptor must be registered');
});

// 4. Check 401 vs 403 behavior in Axios Response Interceptor
check('Response interceptor clears token on 401 but does NOT logout on 403', async () => {
  const { default: api } = await import('./src/services/api.js');
  const { TOKEN_STORAGE_KEY } = await import('./src/utils/constants.js');

  // Mock localStorage and window in node environment
  let storage = { [TOKEN_STORAGE_KEY]: 'mock-token' };
  let eventDispatched = false;

  globalThis.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = v; },
    removeItem: (k) => { delete storage[k]; },
  };
  globalThis.window = {
    dispatchEvent: (ev) => {
      if (ev.type === 'auth:unauthorized') eventDispatched = true;
    },
  };
  globalThis.CustomEvent = class {
    constructor(type) { this.type = type; }
  };

  const responseInterceptor = api.interceptors.response.handlers[0].rejected;

  // Test 403 (Forbidden) -> should NOT clear token
  storage[TOKEN_STORAGE_KEY] = 'test-token';
  eventDispatched = false;
  try {
    await responseInterceptor({ response: { status: 403 } });
  } catch (e) {
    // Expected to reject
  }
  assert.strictEqual(storage[TOKEN_STORAGE_KEY], 'test-token', '403 Forbidden must NOT remove token');
  assert.strictEqual(eventDispatched, false, '403 Forbidden must NOT dispatch auth:unauthorized');

  // Test 401 (Unauthorized) -> MUST clear token and dispatch event
  try {
    await responseInterceptor({ response: { status: 401 } });
  } catch (e) {
    // Expected to reject
  }
  assert.strictEqual(storage[TOKEN_STORAGE_KEY], undefined, '401 Unauthorized MUST remove token');
  assert.strictEqual(eventDispatched, true, '401 Unauthorized MUST dispatch auth:unauthorized');
});

// 5. Check Build output
check('Vite production build output exists in dist/', () => {
  assert(fs.existsSync(path.resolve('frontend/dist/index.html')), 'dist/index.html exists');
  assert(fs.existsSync(path.resolve('frontend/dist/assets')), 'dist/assets exists');
});

console.log('\n================================================================');
console.log(`🎉 ALL FE1 TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
console.log('================================================================\n');
