const http = require('http');

const routes = [
  '/',
  '/partners',
  '/live',
  '/chat',
  '/status',
  '/pricing',
  '/dashboard',
  '/admin',
  '/challenges',
  '/community',
  '/leaderboard'
];

async function checkRoute(r) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${r}`, (res) => {
      console.log(`Route ${r}: STATUS ${res.statusCode}`);
      resolve(res.statusCode);
    }).on('error', (err) => {
      console.error(`Route ${r}: ERROR ${err.message}`);
      resolve(500);
    });
  });
}

async function run() {
  for (const r of routes) {
    await checkRoute(r);
  }
}

run();
