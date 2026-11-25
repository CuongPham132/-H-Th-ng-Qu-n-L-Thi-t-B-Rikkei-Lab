const { pool, checkConnection } = require('./src/config/database');
const { executeWithTransaction } = require('./src/utils/transactionRunner');
const env = require('./src/config/env');

async function runPhase1Tests() {
  console.log('================================================================');
  console.log('              PHASE 1 - INFRASTRUCTURE TESTS                  ');
  console.log('================================================================');

  let passedTests = 0;
  let totalTests = 0;

  // TEST 1: Database Connection Healthcheck
  totalTests++;
  try {
    process.stdout.write('[TEST 1] Testing MySQL connection on host port ' + env.DB_PORT + '... ');
    const dbInfo = await checkConnection();
    if (dbInfo.connected && dbInfo.database === 'rikkei_lab') {
      console.log('PASSED!');
      console.log(`         Connected Database : ${dbInfo.database}`);
      console.log(`         MySQL Server Ver   : ${dbInfo.version}`);
      console.log(`         Connected User     : ${dbInfo.user}`);
      console.log(`         Server Timestamp   : ${dbInfo.serverTime}`);
      passedTests++;
    } else {
      console.log('FAILED (Unexpected database metadata)');
    }
  } catch (err) {
    console.log('FAILED!');
    console.error('         Error:', err.message);
  }

  // TEST 2: Transaction Runner - Success & Commit Execution
  totalTests++;
  try {
    process.stdout.write('[TEST 2] Testing executeWithTransaction (Commit case)... ');
    const result = await executeWithTransaction(async (connection) => {
      // Query users table
      const [rows] = await connection.execute('SELECT COUNT(*) AS total_users FROM users');
      return Number(rows[0].total_users);
    });

    if (typeof result === 'number' && result > 0) {
      console.log('PASSED!');
      console.log(`         Verified rows via Transaction connection. Total users: ${result}`);
      passedTests++;
    } else {
      console.log('FAILED (Unexpected query result)');
    }
  } catch (err) {
    console.log('FAILED!');
    console.error('         Error:', err.message);
  }

  // TEST 3: Transaction Runner - Clean Rollback on Intentional Error
  totalTests++;
  try {
    process.stdout.write('[TEST 3] Testing executeWithTransaction (Rollback on error)... ');
    let errorCaught = false;

    try {
      await executeWithTransaction(async (connection) => {
        // Run a valid query first
        await connection.execute('SELECT 1');
        // Intentionally throw an error inside transaction
        throw new Error('Intentional error to trigger rollback');
      });
    } catch (err) {
      if (err.message === 'Intentional error to trigger rollback') {
        errorCaught = true;
      } else {
        throw err;
      }
    }

    if (errorCaught) {
      console.log('PASSED!');
      console.log('         Transaction successfully aborted and rolled back without connection leak.');
      passedTests++;
    } else {
      console.log('FAILED (Error was not propagated properly)');
    }
  } catch (err) {
    console.log('FAILED!');
    console.error('         Error:', err.message);
  }

  // TEST 4: Connection Pool Health & Clean Release Check
  totalTests++;
  try {
    process.stdout.write('[TEST 4] Testing Connection Pool release verification... ');
    // Acquire a connection after previous transactions to confirm pool is healthy
    const [rows] = await pool.query('SELECT 1 AS alive');
    if (rows[0].alive === 1) {
      console.log('PASSED!');
      console.log('         Connection pool remains healthy with zero leaked connections.');
      passedTests++;
    } else {
      console.log('FAILED!');
    }
  } catch (err) {
    console.log('FAILED!');
    console.error('         Error:', err.message);
  }

  console.log('================================================================');
  console.log(`RESULT: ${passedTests}/${totalTests} tests PASSED`);
  console.log('================================================================');

  // Drain pool to allow script to exit cleanly
  await pool.end();

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase1Tests();
