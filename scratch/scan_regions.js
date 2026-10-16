const { Client } = require('pg');

const regions = [
  'eu-west-3',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'eu-south-1',
  'eu-south-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'me-central-1',
  'af-south-1'
];

async function findRegion() {
  for (const reg of regions) {
    const host = `aws-0-${reg}.pooler.supabase.com`;
    const client = new Client({
      host,
      port: 6543,
      user: 'postgres.bolmrscavaeiqzytfzej',
      password: 'PIbVowXsMum22Y7G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log('🎉🎉 FOUND AND CONNECTED REGION:', reg, host);
      const res = await client.query('SELECT count(*) FROM public.profiles');
      console.log('Profiles count:', res.rows[0]);
      await client.end();
      return reg;
    } catch (err) {
      if (!err.message.includes('not found') && !err.message.includes('ENOTFOUND') && !err.message.includes('getaddrinfo')) {
        console.log(`Region ${reg} responded with different message:`, err.message);
      }
      try { await client.end(); } catch {}
    }
  }
  console.log('Finished region scan.');
}

findRegion();
