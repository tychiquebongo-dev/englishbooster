const { Client } = require('pg');

const connectionStrings = [
  'postgresql://postgres:PIbVowXsMum22Y7G@db.bolmrscavaeiqzytfzej.supabase.co:5432/postgres',
  'postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-eu-west-3.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
];

async function run() {
  for (const conn of connectionStrings) {
    const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      console.log('Connected to PG successfully via:', conn.split('@')[1]);
      
      const res = await client.query('SELECT id, email, created_at FROM auth.users');
      console.log('Current Auth Users:');
      res.rows.forEach(r => console.log(' -', r.id, '|', r.email));

      const del = await client.query("DELETE FROM auth.users WHERE email ILIKE '%test%' OR email ILIKE '%testmail%'");
      console.log('Deleted test users count:', del.rowCount);

      const checkProfiles = await client.query('SELECT id, full_name, email, role FROM public.profiles');
      console.log('Remaining Real Profiles:');
      checkProfiles.rows.forEach(p => console.log(' -', p.id, '|', p.full_name, '|', p.email, '|', p.role));

      await client.end();
      return;
    } catch (err) {
      // try next connection string
    }
  }
  console.log('Could not connect via poolers, testing Supabase REST');
}

run();
