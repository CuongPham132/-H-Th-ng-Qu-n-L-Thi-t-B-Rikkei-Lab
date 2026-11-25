const mysql = require('mysql2/promise');
const env = require('./env');

// Create MySQL connection pool
const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true, // Return dates as strings to avoid UTC-offset timezone shifts
  timezone: '+07:00', // Vietnam Standard Time
});

/**
 * Checks connection health to MySQL server and retrieves database metadata.
 * Guarantees connection is always released in finally block.
 * @returns {Promise<Object>} Information about connected database
 */
async function checkConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(`
      SELECT 
        DATABASE() AS current_db,
        VERSION() AS version,
        CURRENT_USER() AS connected_as,
        NOW() AS server_time
    `);
    const meta = rows[0];
    return {
      connected: true,
      database: meta.current_db,
      version: meta.version,
      user: meta.connected_as,
      serverTime: meta.server_time,
      host: env.DB_HOST,
      port: env.DB_PORT,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  pool,
  checkConnection,
};
