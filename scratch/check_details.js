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
  const { data: badges } = await supabase.from('badges').select('*');
  console.log('BADGES:', JSON.stringify(badges, null, 2));

  const { data: calls } = await supabase.from('calls').select('*');
  console.log('CALLS:', JSON.stringify(calls, null, 2));

  const { data: subs } = await supabase.from('challenge_submissions').select('*');
  console.log('CHALLENGE SUBMISSIONS:', JSON.stringify(subs, null, 2));
}

run();
