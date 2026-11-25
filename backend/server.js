const app = require('./src/app');
const env = require('./src/config/env');
const { checkConnection } = require('./src/config/database');

let server;
let isShuttingDown = false;

async function startServer() {
  try {
    console.log('================================================================');
    console.log('             RIKKEI LAB BACKEND - INITIALIZING                 ');
    console.log('================================================================');
    console.log(`[Config] Environment : ${env.NODE_ENV}`);
    console.log(`[Config] Target DB   : ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);

    // Verify MySQL Database Connection before binding HTTP port
    console.log('[Database] Checking connection to MySQL Server...');
    const dbInfo = await checkConnection();
    console.log(`[Database] Connection SUCCESSFUL!`);
    console.log(`           - Connected to: ${dbInfo.database} (MySQL ${dbInfo.version})`);
    console.log(`           - Host/Port   : ${dbInfo.host}:${dbInfo.port}`);
    console.log(`           - Server Time : ${dbInfo.serverTime}`);

    // Start Express HTTP Server
    server = app.listen(env.PORT, () => {
      console.log('----------------------------------------------------------------');
      console.log(`[HTTP Server] Listening on http://localhost:${env.PORT}`);
      console.log(`[HTTP Server] Health check: http://localhost:${env.PORT}/health`);
      console.log(`[HTTP Server] API Base    : http://localhost:${env.PORT}/api`);
      console.log('================================================================');
    });

  } catch (error) {
    console.error('================================================================');
    console.error('[FATAL] Failed to start Rikkei Lab Backend Server!');
    console.error(`[FATAL] Error message: ${error.message}`);
    if (error.code) console.error(`[FATAL] Error code   : ${error.code}`);
    if (error.errno) console.error(`[FATAL] Error errno  : ${error.errno}`);
    console.error('================================================================');
    process.exit(1);
  }
}

// Graceful shutdown handling (Idempotent: prevents duplicate execution on multiple signals)
function handleShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`\n[Shutdown] Received ${signal}. Closing server gracefully...`);

  // Step 1: Close HTTP server (stop accepting new requests)
  if (server) {
    server.close((serverErr) => {
      if (serverErr) {
        console.error('[Shutdown] Error closing HTTP server:', serverErr.message);
      } else {
        console.log('[Shutdown] HTTP server closed.');
      }

      // Step 2: Drain and close database connection pool after HTTP server is closed
      const { pool } = require('./src/config/database');
      pool.end()
        .then(() => {
          console.log('[Shutdown] Database connection pool drained.');
          process.exit(0);
        })
        .catch((poolErr) => {
          console.error('[Shutdown] Error draining pool:', poolErr.message);
          process.exit(1);
        });
    });
  } else {
    // If HTTP server was never started, drain pool directly
    const { pool } = require('./src/config/database');
    pool.end()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('message', (msg) => {
  if (msg === 'shutdown' || msg === 'SIGINT' || msg === 'SIGTERM') {
    handleShutdown('SIGINT');
  }
});

startServer();
