const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const p = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) p[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const s = createClient(p.NEXT_PUBLIC_SUPABASE_URL, p.NEXT_PUBLIC_SUPABASE_ANON_KEY);
s.from('challenge_submissions').select('id').limit(1).then(r => {
  console.log('challenge_submissions status:', r.error ? r.error.message : 'Table exists! Count: ' + r.data.length);
}).catch(console.error);
