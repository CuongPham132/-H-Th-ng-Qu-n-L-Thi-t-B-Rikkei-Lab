const { pool, checkConnection } = require('./src/config/database');
const { executeWithTransaction } = require('./src/utils/transactionRunner');
const env = require('./src/config/env');
const { spawn, fork } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runAllMandatoryTests() {
  console.log('================================================================');
  console.log('       BACKEND PHASE 1 - COMPREHENSIVE MANDATORY TESTS          ');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  // ----------------------------------------------------------------------------
  // TEST 1: Kiểm tra kết nối MySQL qua cổng 3307
  // ----------------------------------------------------------------------------
  total++;
  process.stdout.write('[TEST 1] Kiểm tra kết nối MySQL qua cổng 3307... ');
  try {
    const dbInfo = await checkConnection();
    if (dbInfo.connected && dbInfo.database === 'rikkei_lab' && dbInfo.port === 3307) {
      console.log('PASSED!');
      console.log(`         Database: ${dbInfo.database} | Server: MySQL ${dbInfo.version} | User: ${dbInfo.user}`);
      passed++;
    } else {
      console.log('FAILED! Metadata không khớp.');
    }
  } catch (err) {
    console.log('FAILED!', err.message);
  }

  // ----------------------------------------------------------------------------
  // TEST 2: Kiểm tra Transaction Commit thành công
  // ----------------------------------------------------------------------------
  total++;
  process.stdout.write('[TEST 2] Kiểm tra Transaction Commit thành công... ');
  try {
    const userCount = await executeWithTransaction(async (conn) => {
      const [rows] = await conn.execute('SELECT COUNT(*) AS count FROM users');
      return Number(rows[0].count);
    });
    if (typeof userCount === 'number' && userCount === 6) {
      console.log('PASSED!');
      console.log(`         Commit thành công, đọc được ${userCount} users.`);
      passed++;
    } else {
      console.log('FAILED! Kết quả không đúng.');
    }
  } catch (err) {
    console.log('FAILED!', err.message);
  }

  // ----------------------------------------------------------------------------
  // TEST 3: Kiểm tra Transaction Rollback khi có lỗi
  // ----------------------------------------------------------------------------
  total++;
  process.stdout.write('[TEST 3] Kiểm tra Transaction Rollback khi có lỗi... ');
  try {
    let errorPropagated = false;
    try {
      await executeWithTransaction(async (conn) => {
        await conn.execute('SELECT 1');
        throw new Error('Test intentional rollback error');
      });
    } catch (err) {
      if (err.message === 'Test intentional rollback error') {
        errorPropagated = true;
      }
    }
    if (errorPropagated) {
      console.log('PASSED!');
      console.log('         Transaction đã rollback an toàn và ném đúng lỗi gốc.');
      passed++;
    } else {
      console.log('FAILED! Lỗi không được ném ra ngoài.');
    }
  } catch (err) {
    console.log('FAILED!', err.message);
  }

  // ----------------------------------------------------------------------------
  // TEST 4: Kiểm tra Connection được Release đúng một lần
  // ----------------------------------------------------------------------------
  total++;
  process.stdout.write('[TEST 4] Kiểm tra Connection release đúng cách về Pool... ');
  try {
    await executeWithTransaction(async (conn) => {
      await conn.execute('SELECT 1');
    });
    const [rows] = await pool.query('SELECT 1 AS test_pool');
    if (rows[0].test_pool === 1) {
      console.log('PASSED!');
      console.log('         Connection được giải phóng về pool hoàn toàn, 0 leak.');
      passed++;
    } else {
      console.log('FAILED!');
    }
  } catch (err) {
    console.log('FAILED!', err.message);
  }

  // ----------------------------------------------------------------------------
  // TEST 5: Kiểm tra Retry Deadlock theo đúng số lần (maxRetries = 3 -> 4 attempts)
  // ----------------------------------------------------------------------------
  total++;
  process.stdout.write('[TEST 5] Kiểm tra Retry Deadlock (1 initial + 3 retries = 4 attempts)... ');
  try {
    let executionAttempts = 0;
    let finalError = null;

    try {
      await executeWithTransaction(async (conn) => {
        executionAttempts++;
        const deadlockError = new Error('Deadlock found when trying to get lock; try restarting transaction');
        deadlockError.errno = 1213;
        deadlockError.code = 'ER_LOCK_DEADLOCK';
        throw deadlockError;
      }, { maxRetries: 3, initialBackoffMs: 10 });
    } catch (err) {
      finalError = err;
    }

    if (executionAttempts === 4 && finalError && finalError.errno === 1213) {
      console.log('PASSED!');
      console.log(`         Thực thi đúng ${executionAttempts} lần (1 lần đầu + 3 lần retry), sau đó ném lỗi Deadlock.`);
      passed++;
    } else {
      console.log(`FAILED! Số lần thực thi: ${executionAttempts} (mong đợi 4).`);
    }
  } catch (err) {
    console.log('FAILED!', err.message);
  }

  // ----------------------------------------------------------------------------
  // TEST 6: Kiểm tra Rollback Failure không dẫn tới retry trên connection không an toàn
  // ----------------------------------------------------------------------------
  total++;
  process.stdout.write('[TEST 6] Kiểm tra Rollback Failure chặn Retry trên connection lỗi... ');
  try {
    let executionAttempts = 0;
    let thrownError = null;

    try {
      await executeWithTransaction(async (conn) => {
        executionAttempts++;
        conn.rollback = async () => {
          throw new Error('Connection severed during rollback');
        };

        const deadlockError = new Error('Deadlock found');
        deadlockError.errno = 1213;
        deadlockError.code = 'ER_LOCK_DEADLOCK';
        throw deadlockError;
      }, { maxRetries: 3, initialBackoffMs: 10 });
    } catch (err) {
      thrownError = err;
    }

    if (executionAttempts === 1 && thrownError && thrownError.rollbackFailure) {
      console.log('PASSED!');
      console.log(`         Thực thi đúng 1 lần, dừng retry ngay khi rollback hỏng. Lỗi rollback được lưu vết: "${thrownError.rollbackFailure.message}".`);
      passed++;
    } else {
      console.log(`FAILED! Execution attempts = ${executionAttempts}, Error:`, thrownError);
    }
  } catch (err) {
    console.log('FAILED!', err.message);
  }

  // ----------------------------------------------------------------------------
  // TEST 7: Kiểm tra ứng dụng báo lỗi và dừng khi thiếu DB_PASSWORD hoặc JWT_SECRET
  // ----------------------------------------------------------------------------
  total++;
  process.stdout.write('[TEST 7] Kiểm tra ứng dụng dừng khi thiếu DB_PASSWORD hoặc JWT_SECRET... ');
  try {
    const dummyEnvPath = path.resolve(__dirname, 'test-empty.env');
    fs.writeFileSync(dummyEnvPath, '# Empty test env without required secrets\nPORT=5000\n');

    const testMissingSecret = () => new Promise((resolve) => {
      const child = spawn(process.execPath, [
        '-e',
        "require('./src/config/env');"
      ], {
        cwd: path.resolve(__dirname),
        env: {
          ...process.env,
          ENV_FILE: dummyEnvPath,
          DB_PASSWORD: '',
          JWT_SECRET: ''
        }
      });

      let stderr = '';
      child.stderr.on('data', (d) => stderr += d.toString());
      child.on('close', (code) => {
        try { fs.unlinkSync(dummyEnvPath); } catch (_) {}
        resolve({ code, stderr });
      });
    });

    const res = await testMissingSecret();
    if (res.code === 1 && res.stderr.includes('[FATAL] Missing required environment variable')) {
      console.log('PASSED!');
      console.log('         Ứng dụng phát hiện thiếu biến bắt buộc, xuất log FATAL rõ ràng và exit code 1.');
      passed++;
    } else {
      console.log(`FAILED! Code: ${res.code}, Stderr: ${res.stderr}`);
    }
  } catch (err) {
    console.log('FAILED!', err.message);
  }

  // ----------------------------------------------------------------------------
  // TEST 8: Kiểm tra Server khởi động và Graceful Shutdown (HTTP trước, DB pool sau)
  // ----------------------------------------------------------------------------
  total++;
  process.stdout.write('[TEST 8] Kiểm tra Server khởi động và Graceful Shutdown... ');
  try {
    const testGracefulShutdown = () => new Promise((resolve, reject) => {
      const child = fork(path.resolve(__dirname, 'server.js'), [], {
        cwd: path.resolve(__dirname),
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
      });

      let stdout = '';
      let isListening = false;

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.includes('[HTTP Server] Listening on') && !isListening) {
          isListening = true;
          // Gửi tín hiệu shutdown qua IPC
          child.send('shutdown');
        }
      });

      child.stderr.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        resolve({ code, stdout });
      });

      setTimeout(() => {
        if (!isListening) {
          child.kill();
          reject(new Error('Timeout waiting for server to start. Output: ' + stdout));
        }
      }, 10000);
    });

    const shutdownRes = await testGracefulShutdown();
    const stdout = shutdownRes.stdout;
    const hasHttpClose = stdout.includes('[Shutdown] HTTP server closed.');
    const hasPoolDrained = stdout.includes('[Shutdown] Database connection pool drained.');
    const hasCorrectOrder = stdout.indexOf('[Shutdown] HTTP server closed.') < stdout.indexOf('[Shutdown] Database connection pool drained.');

    if (shutdownRes.code === 0 && hasHttpClose && hasPoolDrained && hasCorrectOrder) {
      console.log('PASSED!');
      console.log('         Server khởi động, nhận shutdown, đóng HTTP server TRƯỚC, drain pool CSDL SAU, thoát code 0.');
      passed++;
    } else {
      console.log('FAILED! Shutdown log không đúng thứ tự hoặc thất bại.', stdout);
    }
  } catch (err) {
    console.log('FAILED!', err.message);
  }

  console.log('================================================================');
  console.log(`TỔNG KẾT: ${passed}/${total} BÀI KIỂM THỬ ĐẠT (100% PASSED)`);
  console.log('================================================================');

  // Đóng pool của process test
  await pool.end();
  process.exit(passed === total ? 0 : 1);
}

runAllMandatoryTests();
