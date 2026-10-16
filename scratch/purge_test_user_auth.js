const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bolmrscavaeiqzytfzej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbG1yc2NhdmFlaXF6eXRmemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDU2MjEsImV4cCI6MjEwNzMyMTYyMX0.A3lmy57zKqvSxfjRumabXqm5v4MTAe_EvP9MvVBXHrE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeTestUser() {
  const email = 'test_user_1792119529971@testmail.com';
  console.log('Signing in as test user:', email);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password: 'Password123!'
  });

  if (authErr) {
    console.error('Sign in failed:', authErr.message);
    return;
  }

  console.log('Signed in successfully as test user! UID:', authData.user.id);

  // Attempt delete from profiles
  const { data: delData, error: delErr } = await supabase
    .from('profiles')
    .delete()
    .eq('id', authData.user.id)
    .select();

  console.log('Profile delete result:', delData, 'error:', delErr);
}

purgeTestUser();
