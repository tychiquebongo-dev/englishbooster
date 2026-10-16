const { execSync } = require('child_process');

async function renameRepo() {
  try {
    const creds = execSync('git credential fill', { 
      input: 'protocol=https\nhost=github.com\n', 
      encoding: 'utf8' 
    });
    
    const match = creds.match(/password=(.*)/);
    if (!match) {
      console.error('No password found in git credential fill');
      return;
    }

    const ghToken = match[1].trim();
    console.log('Got GitHub Token with length:', ghToken.length);

    // Check current repo first
    const getRes = await fetch('https://api.github.com/repos/tychiquebongo-dev/EnglishBooster', {
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Node-Agent'
      }
    });

    console.log('GET current repo status:', getRes.status);
    const repoInfo = await getRes.json();
    console.log('Current repo name on GitHub:', repoInfo.name, 'full_name:', repoInfo.full_name);

    // PATCH to rename to englishbooster
    const patchRes = await fetch('https://api.github.com/repos/tychiquebongo-dev/EnglishBooster', {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Node-Agent'
      },
      body: JSON.stringify({ name: 'englishbooster' })
    });

    console.log('PATCH rename status:', patchRes.status);
    const patchedData = await patchRes.json();
    console.log('Renamed repository response name:', patchedData.name);
    console.log('HTML URL:', patchedData.html_url);
    console.log('Clone URL:', patchedData.clone_url);

    if (patchRes.status === 200) {
      console.log('SUCCESS! Renamed GitHub repository to englishbooster');
    } else {
      console.error('PATCH failed with response:', patchedData);
    }

  } catch (err) {
    console.error('Error during rename:', err.message);
  }
}

renameRepo();
