const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const parsed = {};
env.split('\n').forEach(l => {
  const p = l.split('=');
  if (p.length >= 2) parsed[p[0].trim()] = p.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(parsed.NEXT_PUBLIC_SUPABASE_URL, parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: user, error: findErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'tychiquebongo@gmail.com')
    .single();

  if (findErr || !user) {
    console.error('User not found:', findErr);
    return;
  }

  console.log('Current profile:', user);

  const updates = {
    country: "Côte d'Ivoire",
    flag: "🇨🇮",
    current_level: "C2",
    target_level: "C2",
    native_language: "Français",
    bio: "Fondateur & CEO d'English Booster. Coach en fluidité et prise de parole en public.",
    interests: ["EdTech", "Public Speaking", "International Business", "Language Coaching"],
    plan: "Fondateur / Admin",
    plan_status: "lifetime",
    role: "admin",
    updated_at: new Date().toISOString()
  };

  const { data: updated, error: updateErr } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (updateErr) {
    console.error('Update error:', updateErr);
  } else {
    console.log('Successfully updated Tychique profile:', JSON.stringify(updated, null, 2));
  }
}

run();
