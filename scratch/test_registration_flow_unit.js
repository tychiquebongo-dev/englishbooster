const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bolmrscavaeiqzytfzej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbG1yc2NhdmFlaXF6eXRmemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDU2MjEsImV4cCI6MjEwNzMyMTYyMX0.A3lmy57zKqvSxfjRumabXqm5v4MTAe_EvP9MvVBXHrE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFlow() {
  console.log('Testing flow for existing member: tyshabongo@gmail.com');
  const cleanEmail = 'tyshabongo@gmail.com';
  const password = 'AnyRandomPassword!';

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
  });

  const isDuplicateIdentities = Boolean(
    !error &&
    data?.user &&
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  );

  console.log('Duplicate detected via identities length === 0?:', isDuplicateIdentities);

  if (isDuplicateIdentities) {
    console.log('Attempting password check...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    console.log('SignIn error (expected Invalid credentials):', signInError?.message);
    console.log('Successfully identified existing user without hanging or sending false confirmation email!');
  }
}

testFlow();
