const http = require('http');

async function fetchPage(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => resolve(''));
  });
}

async function verify() {
  console.log('=== VERIFYING REAL-ONLY DATA ACROSS PLATFORM ===');
  
  const partnersHtml = await fetchPage('http://localhost:3000/partners');
  const hasTestTester = partnersHtml.includes('Test Tester') || partnersHtml.includes('test_user');
  const hasFakeSofia = partnersHtml.includes('Sofia Martínez') || partnersHtml.includes('Kenji Sato');
  console.log('Partners HTML contains Test Tester?:', hasTestTester);
  console.log('Partners HTML contains Fake partners?:', hasFakeSofia);

  const statusHtml = await fetchPage('http://localhost:3000/status');
  const hasSeedFounder = statusHtml.includes('seed-founder') || statusHtml.includes('seed-1');
  console.log('Status HTML contains seed IDs?:', hasSeedFounder);

  const leaderboardHtml = await fetchPage('http://localhost:3000/leaderboard');
  const lbHasTest = leaderboardHtml.includes('Test Tester');
  console.log('Leaderboard HTML contains Test Tester?:', lbHasTest);

  console.log('✅ ALL VERIFICATIONS COMPLETED.');
}

verify();
