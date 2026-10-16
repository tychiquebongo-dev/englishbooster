const { Client } = require('pg');

async function main() {
  const connectionStrings = [
    'postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
    'postgresql://postgres:PIbVowXsMum22Y7G@db.bolmrscavaeiqzytfzej.supabase.co:5432/postgres'
  ];

  let client = null;
  for (const cs of connectionStrings) {
    try {
      const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
      await c.connect();
      client = c;
      console.log('Connected with:', cs.split('@')[1]);
      break;
    } catch (e) {
      console.log('Failed connecting to:', cs.split('@')[1], e.message);
    }
  }

  if (!client) {
    console.error('Could not connect to any pooler');
    return;
  }

  // Check auth.users triggers
  const triggers = await client.query(`
    SELECT tgname, relname, proname 
    FROM pg_trigger 
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
    JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
    WHERE relname IN ('users', 'profiles');
  `);
  console.log('TRIGGERS on users/profiles:', triggers.rows);

  // Check profiles columns
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'profiles';
  `);
  console.log('PROFILES COLUMNS:', cols.rows);

  // Check recent auth users
  const recentUsers = await client.query(`
    SELECT id, email, confirmed_at, email_confirmed_at, raw_user_meta_data, created_at 
    FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 5;
  `);
  console.log('RECENT USERS:', JSON.stringify(recentUsers.rows, null, 2));

  // Check corresponding profiles
  const userIds = recentUsers.rows.map(u => u.id);
  if (userIds.length > 0) {
    const profs = await client.query(`
      SELECT * FROM public.profiles WHERE id = ANY($1::uuid[]);
    `, [userIds]);
    console.log('CORRESPONDING PROFILES:', JSON.stringify(profs.rows, null, 2));
  }

  await client.end();
}

main().catch(console.error);
