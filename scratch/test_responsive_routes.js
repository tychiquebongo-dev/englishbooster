const http = require('http');

const routes = [
  '/',
  '/shorts',
  '/chat',
  '/call',
  '/live',
  '/dashboard',
  '/pricing',
  '/partners',
  '/challenges'
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ path, status: res.statusCode, length: data.length });
      });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing Next.js routes...');
  for (const route of routes) {
    const res = await checkRoute(route);
    console.log(`[ROUTE] ${res.path} -> ${res.status || 'ERR: ' + res.error} (${res.length || 0} bytes)`);
  }
}

run();
