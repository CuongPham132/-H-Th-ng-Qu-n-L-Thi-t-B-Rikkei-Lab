const { pool } = require('../config/database');

/**
 * Executes an async callback within a managed MySQL Transaction with bounded Deadlock Retry.
 * 
 * Key Architectural Guarantees:
 * 1. Single Connection: A single connection is acquired from the pool ONCE before the retry loop.
 * 2. Guaranteed Release: connection.release() is executed in an outer finally block exactly once.
 * 3. Scope Safety: Errors are scoped properly within catch(txError) without leaking variables.
 * 4. Safe Rollback: If rollback fails, the connection state is indeterminate; we abort immediately
 *    and NEVER retry on an unsafe connection. Both original error and rollback error are preserved.
 * 5. Deadlock-Specific Retry: Only MySQL deadlock (1213 / ER_LOCK_DEADLOCK) is retried.
 * 6. Clarified maxRetries: maxRetries specifies the number of retry attempts AFTER the initial attempt.
 *    (e.g., maxRetries = 3 means 1 initial attempt + up to 3 retries = max 4 total executions).
 * 
 * @param {Function} callback - Async function receiving (connection)
 * @param {Object} [options]
 * @param {number} [options.maxRetries=3] - Number of retry attempts after initial execution
 * @param {number} [options.initialBackoffMs=50] - Initial backoff in milliseconds
 * @returns {Promise<any>}
 */
async function executeWithTransaction(callback, options = {}) {
  const maxRetries = typeof options.maxRetries === 'number' ? options.maxRetries : 3;
  const initialBackoffMs = typeof options.initialBackoffMs === 'number' ? options.initialBackoffMs : 50;

  // 1. Connection acquired ONCE before the execution and retry loop
  const connection = await pool.getConnection();

  try {
    let retriesCount = 0;

    while (true) {
      try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
      } catch (txError) {
        // Attempt rollback for the current failed transaction
        let rollbackError = null;
        try {
          await connection.rollback();
        } catch (rbErr) {
          rollbackError = rbErr;
          console.error('[Transaction] Rollback failed. Connection state is indeterminate:', rbErr.message);
        }

        // If rollback failed, we CANNOT safely retry on this connection
        if (rollbackError) {
          txError.rollbackFailure = rollbackError;
          throw txError;
        }

        // Check if error is MySQL Deadlock (1213 / ER_LOCK_DEADLOCK)
        const isDeadlock = (
          txError.errno === 1213 ||
          txError.code === 'ER_LOCK_DEADLOCK' ||
          (typeof txError.message === 'string' && txError.message.includes('Deadlock found'))
        );

        // Only retry if error is Deadlock AND we have not exceeded maxRetries
        if (isDeadlock && retriesCount < maxRetries) {
          retriesCount++;
          // Exponential backoff + randomized jitter
          const backoff = Math.pow(2, retriesCount) * initialBackoffMs + Math.floor(Math.random() * 50);
          console.warn(
            `[Transaction] Deadlock 1213 detected. Retry attempt ${retriesCount}/${maxRetries} ` +
            `in ${backoff}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue; // Start next attempt of transaction on clean connection
        }

        // If not a deadlock, or if maxRetries reached, throw original txError
        throw txError;
      }
    }
  } finally {
    // 2. Connection released ONCE outside the retry loop, guaranteed in both success and failure
    connection.release();
  }
}

module.exports = {
  executeWithTransaction,
};
