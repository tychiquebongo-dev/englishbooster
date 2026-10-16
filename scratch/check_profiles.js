const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');

const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim();
const key = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))?.split('=')[1]?.trim();

if (!url || !key) {
  console.log('No url/key');
  process.exit(0);
}

const supabase = createClient(url, key);

supabase.from('profiles').select('id, email, full_name, avatar_url').then(({ data, error }) => {
  if (error) console.error('Error:', error);
  else console.log('PROFILES:', JSON.stringify(data, null, 2));
  process.exit(0);
});
