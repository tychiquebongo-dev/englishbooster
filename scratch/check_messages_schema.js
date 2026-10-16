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
const supabase = createClient(parsed.NEXT_PUBLIC_SUPABASE_URL, parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkMessagesSchema() {
  const { data: convs, error: convErr } = await supabase.from('conversations').select('*').limit(5);
  console.log('Conversations:', convErr ? convErr.message : convs);

  const { data: msgs, error: msgErr } = await supabase.from('messages').select('*').limit(5);
  console.log('Messages:', msgErr ? msgErr.message : msgs);
}

checkMessagesSchema();
