const { Client } = require('pg');

async function testEuWest1() {
  const ports = [5432, 6543];
  const users = [
    'postgres.bolmrscavaeiqzytfzej',
    'postgres'
  ];

  for (const port of ports) {
    for (const user of users) {
      console.log(`Trying eu-west-1 port ${port} with user ${user}...`);
      const client = new Client({
        host: 'aws-0-eu-west-1.pooler.supabase.com',
        port,
        user,
        password: 'PIbVowXsMum22Y7G',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });

      try {
        await client.connect();
        console.log(`🎉🎉🎉 SUCCESS CONNECTED to eu-west-1 on port ${port} with user ${user}!`);
        const res = await client.query('SELECT id, email, full_name FROM public.profiles');
        console.log('Profiles in DB:', res.rows);
        await client.end();
        return;
      } catch (err) {
        console.log(`Error (port ${port}, user ${user}):`, err.message);
        try { await client.end(); } catch {}
      }
    }
  }
}

testEuWest1();
