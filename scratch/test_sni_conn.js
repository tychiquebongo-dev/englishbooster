const { Client } = require('pg');

async function test() {
  const configs = [
    {
      host: 'db.bolmrscavaeiqzytfzej.supabase.co',
      port: 5432,
      user: 'postgres',
      password: 'PIbVowXsMum22Y7G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    },
    {
      host: '2a05:d018:a0:6001:7bd2:7380:34c6:11c3',
      port: 5432,
      user: 'postgres.bolmrscavaeiqzytfzej',
      password: 'PIbVowXsMum22Y7G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false, servername: 'db.bolmrscavaeiqzytfzej.supabase.co' }
    },
    {
      host: '2a05:d018:a0:6001:7bd2:7380:34c6:11c3',
      port: 5432,
      user: 'postgres',
      password: 'PIbVowXsMum22Y7G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false, servername: 'db.bolmrscavaeiqzytfzej.supabase.co' }
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const client = new Client({ ...configs[i], connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      console.log(`CONFIG ${i} SUCCESS! Connected!`);
      const res = await client.query('SELECT count(*) FROM public.profiles');
      console.log('Profiles count:', res.rows[0]);
      await client.end();
      return;
    } catch (err) {
      console.log(`Config ${i} failed:`, err.message);
      try { await client.end(); } catch {}
    }
  }
}

test();
