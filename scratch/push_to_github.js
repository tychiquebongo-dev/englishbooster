const { execSync } = require('child_process');

try {
  const creds = execSync('git credential fill', { 
    input: 'protocol=https\nhost=github.com\n', 
    encoding: 'utf8' 
  });
  const match = creds.match(/password=(.*)/);
  if (!match) {
    console.error('No token found');
    process.exit(1);
  }
  const token = match[1].trim();
  const pushUrl = `https://tychiquebongo-dev:${token}@github.com/tychiquebongo-dev/englishbooster.git`;
  
  console.log('Pushing to GitHub englishbooster...');
  const out = execSync(`git push ${pushUrl} master`, { encoding: 'utf8' });
  console.log('Push result:', out || 'OK');
} catch (err) {
  console.error('Push error:', err.message);
}
