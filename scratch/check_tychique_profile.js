const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const parsed = {};
env.split('\n').forEach(l => {
  const p = l.split('=');
  if (p.length >= 2) parsed[p[0].trim()] = p.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(parsed.NEXT_PUBLIC_SUPABASE_URL, parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log('Profiles found:', data.length);
  const tychique = data.filter(p => 
    (p.full_name && p.full_name.toLowerCase().includes('tychique')) ||
    (p.email && p.email.toLowerCase().includes('tychique'))
  );
  console.log('Tychique profiles:', JSON.stringify(tychique, null, 2));
  console.log('All profiles:', JSON.stringify(data, null, 2));
}

run();
