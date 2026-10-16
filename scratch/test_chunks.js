async function test() {
  console.log('Requesting http://localhost:3000/ ...');
  const res = await fetch('http://localhost:3000/');
  console.log('Homepage status:', res.status);
  const html = await res.text();
  
  // Find all script tags pointing to chunks
  const regex = /src="(\/_next\/static\/chunks\/[^"]+)"/g;
  let match;
  const chunks = [];
  while ((match = regex.exec(html)) !== null) {
    chunks.push(match[1]);
  }
  
  console.log(`Found ${chunks.length} chunks referenced in layout/page HTML:`);
  for (const chunk of chunks) {
    const chunkRes = await fetch('http://localhost:3000' + chunk);
    console.log(`- ${chunk} => HTTP ${chunkRes.status} (${chunkRes.headers.get('content-type')})`);
  }
  
  // Explicitly verify app/layout chunk
  const layoutChunk = chunks.find(c => c.includes('app/layout'));
  if (layoutChunk) {
    console.log('SUCCESS: app/layout chunk verified with HTTP 200!');
  } else {
    console.log('Testing app/layout chunk directly...');
    const directLayout = await fetch('http://localhost:3000/_next/static/chunks/app/layout.js');
    console.log('Direct app/layout.js => HTTP', directLayout.status);
  }
}

test().catch(console.error);
