const { Client } = require('pg');

async function run() {
  const connectionStrings = [
    'postgresql://postgres:PIbVowXsMum22Y7G@db.bolmrscavaeiqzytfzej.supabase.co:5432/postgres',
    'postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
  ];

  for (const conn of connectionStrings) {
    console.log('Trying connection:', conn.replace(/:PIbVowXsMum22Y7G@/, ':****@'));
    const client = new Client({
      connectionString: conn,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log('Connected successfully!');
      
      const res = await client.query(`
        DELETE FROM partners 
        WHERE name IN ('Sofia Martínez', 'Kenji Sato', 'Amara Okafor', 'Lucas Weber', 'Chloe Laurent')
        RETURNING *;
      `);
      console.log('Deleted rows count:', res.rowCount);
      console.log('Deleted rows:', res.rows);

      const remaining = await client.query('SELECT * FROM partners;');
      console.log('Remaining partners count:', remaining.rowCount);
      console.log('Remaining partners:', remaining.rows);

      await client.end();
      return;
    } catch (err) {
      console.error('Failed with:', err.message);
      try { await client.end(); } catch (e) {}
    }
  }
}

run().catch(console.error);
