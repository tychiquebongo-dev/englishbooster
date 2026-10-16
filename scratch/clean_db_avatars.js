const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');

const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim();
const key = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))?.split('=')[1]?.trim();

const supabase = createClient(url, key);

async function cleanMockAvatars() {
  const { data, error } = await supabase.from('profiles').select('id, email, full_name, avatar_url');
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  for (const p of data) {
    if (p.avatar_url && p.avatar_url.includes('/assets/avatars/')) {
      console.log(`Fixing avatar for ${p.email || p.id} (was: ${p.avatar_url})`);
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', p.id);
      if (upErr) console.error('Update error:', upErr);
      else console.log(`✓ Cleaned avatar for ${p.email || p.id}`);
    }
  }
  process.exit(0);
}

cleanMockAvatars();
