const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const p = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) p[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const s = createClient(p.NEXT_PUBLIC_SUPABASE_URL, p.NEXT_PUBLIC_SUPABASE_ANON_KEY);
s.from('challenges').select('*').then(r => {
  console.log('CHALLENGES COUNT:', r.data ? r.data.length : 0);
  console.log('CHALLENGES:', JSON.stringify(r.data, null, 2));
}).catch(console.error);
