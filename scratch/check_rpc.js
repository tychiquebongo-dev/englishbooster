const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim();
const key = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))?.split('=')[1]?.trim();

const supabase = createClient(url, key);

async function checkRpc() {
  const rpcs = [
    'delete_user',
    'delete_profile',
    'purge_test_users',
    'cleanup_test_data',
    'delete_account'
  ];

  for (const rpc of rpcs) {
    const { data, error } = await supabase.rpc(rpc, {});
    console.log(`RPC ${rpc}:`, error ? error.message : data);
  }
}

checkRpc();
