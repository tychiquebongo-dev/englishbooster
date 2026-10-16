const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const parsed = {};
for (const line of lines) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    parsed[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  }
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(parsed.NEXT_PUBLIC_SUPABASE_URL, parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: profs } = await supabase.from('profiles').select('id, full_name, email, role');
  console.log('PROFILES count:', profs ? profs.length : 0);
  console.log('PROFILES list:', JSON.stringify(profs, null, 2));

  const { data: partners } = await supabase.from('partners').select('*');
  console.log('PARTNERS table count:', partners ? partners.length : 0);
  console.log('PARTNERS list:', JSON.stringify(partners, null, 2));

  const { data: calls } = await supabase.from('calls').select('*');
  console.log('CALLS table count:', calls ? calls.length : 0);
  console.log('CALLS list:', JSON.stringify(calls, null, 2));

  const { data: posts } = await supabase.from('posts').select('id, user_id, category, content');
  console.log('POSTS count:', posts ? posts.length : 0);
  console.log('POSTS list:', JSON.stringify(posts, null, 2));
}

check().catch(console.error);
