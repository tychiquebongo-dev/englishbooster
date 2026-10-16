const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim();
const key = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))?.split('=')[1]?.trim();

const supabase = createClient(url, key);

async function testDelete() {
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', '939856ce-efb4-4d39-a9c9-54bce7514910')
    .select();

  console.log('Delete result data:', data);
  console.log('Delete result error:', error);
}

testDelete();
