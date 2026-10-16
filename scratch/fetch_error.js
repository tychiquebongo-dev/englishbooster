const http = require('http');

http.get('http://localhost:3000/', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    if (res.statusCode >= 400) {
      console.log('ERROR HTML (first 500 chars):', body.slice(0, 500));
    }
  });
}).on('error', (e) => {
  console.error('Fetch error:', e.message);
});
