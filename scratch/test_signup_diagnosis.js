const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bolmrscavaeiqzytfzej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbG1yc2NhdmFlaXF6eXRmemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDU2MjEsImV4cCI6MjEwNzMyMTYyMX0.A3lmy57zKqvSxfjRumabXqm5v4MTAe_EvP9MvVBXHrE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  console.log('Testing sign up with random new email...');
  const testEmail = `test_user_${Date.now()}@testmail.com`;
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'Password123!',
    options: {
      data: {
        full_name: 'Test Tester',
        country: 'France',
        flag: '🇫🇷',
        current_level: 'B1',
        target_level: 'C1'
      }
    }
  });

  console.log('Result for new user:');
  console.log('Error:', error);
  console.log('User ID:', data?.user?.id);
  console.log('Identities count:', data?.user?.identities?.length);
  console.log('Session exists?:', Boolean(data?.session));

  console.log('\nNow testing signup with ALREADY REGISTERED user (the same email)...');
  const { data: dupData, error: dupError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'Password123!',
  });
  console.log('Result for duplicate user:');
  console.log('Error:', dupError);
  console.log('User ID:', dupData?.user?.id);
  console.log('Identities count:', dupData?.user?.identities?.length);
  console.log('Session exists?:', Boolean(dupData?.session));

  console.log('\nTesting existing user signInWithPassword...');
  const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'Password123!'
  });
  console.log('SignIn Error:', signinError);
  console.log('SignIn Session exists?:', Boolean(signinData?.session));
}

testSignup();
