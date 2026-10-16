const { Client } = require('pg');

async function main() {
  const hosts = [
    'db.bolmrscavaeiqzytfzej.supabase.co',
    'aws-0-eu-central-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-us-west-1.pooler.supabase.com'
  ];

  for (const host of hosts) {
    console.log(`Trying host ${host}...`);
    const isPooler = host.includes('pooler');
    const user = isPooler ? 'postgres.bolmrscavaeiqzytfzej' : 'postgres';
    const port = isPooler ? 6543 : 5432;

    const client = new Client({
      host,
      port,
      user,
      password: process.env.MOTDEPASSEDB || 'PIbVowXsMum22Y7G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`SUCCESS connected to ${host}!`);

      // Check partners
      const res = await client.query('SELECT * FROM partners');
      console.log('Partners count:', res.rows.length);
      console.log('Partners rows:', res.rows.map(r => r.name));

      // Delete fake partners
      const delRes = await client.query('DELETE FROM partners');
      console.log('Deleted from partners:', delRes.rowCount);

      // Verify
      const checkRes = await client.query('SELECT count(*) FROM partners');
      console.log('Partners after delete:', checkRes.rows[0].count);

      await client.end();
      return;
    } catch (err) {
      console.log(`Failed on ${host}:`, err.message);
      try { await client.end(); } catch {}
    }
  }
}

main();
