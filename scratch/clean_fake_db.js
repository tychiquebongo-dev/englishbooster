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

async function cleanFakeData() {
  console.log('--- PURGING FAKE PARTNERS ---');
  const fakeNames = ['Sofia Martínez', 'Kenji Sato', 'Amara Okafor', 'Lucas Weber', 'Chloe Laurent'];
  
  const { data: deleted, error: delErr } = await supabase
    .from('partners')
    .delete()
    .in('name', fakeNames)
    .select();

  if (delErr) {
    console.error('Error deleting fake partners:', delErr);
  } else {
    console.log('Successfully deleted partners:', deleted ? deleted.length : 0);
  }

  // Verify partners table
  const { data: remainingPartners } = await supabase.from('partners').select('*');
  console.log('Remaining partners in DB:', remainingPartners);
}

cleanFakeData().catch(console.error);
