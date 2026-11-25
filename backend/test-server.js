const app = require('./src/app');
const http = require('http');

async function testHttpEndpoints() {
  const server = app.listen(5001, async () => {
    console.log('[Test Server] Running on http://localhost:5001');

    function makeRequest(path) {
      return new Promise((resolve, reject) => {
        http.get(`http://localhost:5001${path}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }).on('error', reject);
      });
    }

    try {
      // 1. Test /health
      const health = await makeRequest('/health');
      console.log('1. GET /health -> Status:', health.status, '| Response:', JSON.stringify(health.body));

      // 2. Test /api
      const api = await makeRequest('/api');
      console.log('2. GET /api -> Status:', api.status, '| Response:', JSON.stringify(api.body));

      // 3. Test 404 handler
      const notFound = await makeRequest('/api/non-existent-route');
      console.log('3. GET /api/non-existent-route -> Status:', notFound.status, '| Response:', JSON.stringify(notFound.body));

      server.close(() => {
        console.log('[Test Server] Closed cleanly.');
        process.exit(0);
      });
    } catch (err) {
      console.error('[Test Server] Error:', err);
      server.close(() => process.exit(1));
    }
  });
}

testHttpEndpoints();
