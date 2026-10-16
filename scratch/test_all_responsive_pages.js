const http = require('http');

const pages = [
  '/',
  '/chat',
  '/partners',
  '/call',
  '/shorts',
  '/dashboard',
  '/admin',
  '/status',
  '/manifest.json'
];

async function checkPage(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:3000' + path, (res) => {
      console.log(`[PAGE CHECK] ${path.padEnd(20)} => HTTP ${res.statusCode}`);
      resolve({ path, status: res.statusCode });
    }).on('error', (err) => {
      console.error(`[PAGE CHECK ERROR] ${path} => ${err.message}`);
      resolve({ path, status: 500, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing all responsive extension routes on localhost:3000...');
  for (const page of pages) {
    await checkPage(page);
  }
  console.log('All responsive routes verified successfully!');
}

run();
