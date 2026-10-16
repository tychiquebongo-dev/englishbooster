const { Client } = require('pg');

async function testPoolers() {
  const regions = ['eu-west-1', 'eu-west-3', 'eu-central-1', 'us-east-1'];
  for (const reg of regions) {
    const host = `aws-0-${reg}.pooler.supabase.com`;
    const user = `postgres.bolmrscavaeiqzytfzej`;
    console.log(`Testing ${reg}...`);
    const client = new Client({
      host,
      port: 6543,
      user,
      password: 'PIbVowXsMum22Y7G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log(`SUCCESS connected to ${reg}!`);
      const res = await client.query(`
        DELETE FROM partners 
        WHERE name IN ('Sofia Martínez', 'Kenji Sato', 'Amara Okafor', 'Lucas Weber', 'Chloe Laurent')
        RETURNING name;
      `);
      console.log('DELETED FAKE PARTNERS:', res.rows);
      await client.end();
      return;
    } catch (e) {
      console.log(`Failed on ${reg}:`, e.message);
      try { await client.end(); } catch (err) {}
    }
  }
}

testPoolers().catch(console.error);
