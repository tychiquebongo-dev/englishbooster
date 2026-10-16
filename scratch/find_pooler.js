const { Client } = require('pg');

const regions = [
  'eu-west-3',
  'eu-west-1',
  'eu-central-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'ap-southeast-1'
];

async function test() {
  for (const reg of regions) {
    const cs = `postgresql://postgres.bolmrscavaeiqzytfzej:PIbVowXsMum22Y7G@aws-0-${reg}.pooler.supabase.com:6543/postgres`;
    const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
    try {
      await c.connect();
      console.log('SUCCESS with region:', reg);
      
      const q = await c.query("SELECT * FROM profiles WHERE email = 'tychiquebongo@gmail.com'");
      console.log('Tychique profile from DB:', q.rows);

      // Update Tychique Bongo profile to remove all unreal elements
      const updateRes = await c.query(`
        UPDATE profiles
        SET 
          country = 'Côte d''Ivoire',
          flag = '🇨🇮',
          current_level = 'C2',
          target_level = 'C2',
          native_language = 'Français',
          bio = 'Fondateur & CEO d''English Booster. Coach en fluidité et prise de parole en public.',
          interests = ARRAY['EdTech', 'Public Speaking', 'International Business', 'Language Coaching'],
          plan = 'Fondateur / Admin',
          plan_status = 'active',
          role = 'admin',
          updated_at = NOW()
        WHERE email = 'tychiquebongo@gmail.com'
        RETURNING *;
      `);
      console.log('UPDATED PROFILE IN DB:', updateRes.rows);

      await c.end();
      return;
    } catch (e) {
      // console.log(reg, e.message);
      try { await c.end(); } catch (err) {}
    }
  }
  console.log('No region connected');
}

test();
