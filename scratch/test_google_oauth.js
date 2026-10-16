const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim();
const key = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))?.split('=')[1]?.trim();

const supabase = createClient(url, key);

async function testGoogleOAuth() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback?next=/dashboard'
    }
  });

  console.log('Data:', data);
  console.log('Error:', error);

  if (data?.url) {
    try {
      const res = await fetch(data.url);
      console.log('Fetch URL status:', res.status);
      const text = await res.text();
      console.log('Fetch URL response:', text.slice(0, 300));
    } catch (e) {
      console.log('Fetch URL err:', e.message);
    }
  }
}

testGoogleOAuth();
