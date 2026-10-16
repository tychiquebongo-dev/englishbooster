const { Client } = require('pg');

async function main() {
  const hosts = [
    'aws-0-eu-central-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'db.bolmrscavaeiqzytfzej.supabase.co'
  ];

  for (const host of hosts) {
    const isPooler = host.includes('pooler');
    const user = isPooler ? 'postgres.bolmrscavaeiqzytfzej' : 'postgres';
    const port = isPooler ? 6543 : 5432;

    const client = new Client({
      host,
      port,
      user,
      password: process.env.MOTDEPASSEDB || 'PIbVowXsMum22Y7G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`Connected successfully to ${host}`);

      const res = await client.query('SELECT id, name, public FROM storage.buckets');
      console.log('Existing buckets:', res.rows);

      // Create videos bucket
      await client.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('videos', 'videos', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'])
        ON CONFLICT (id) DO UPDATE SET public = true;
      `);
      console.log('Bucket "videos" is now active and public.');

      // Allow public read on storage.objects for videos
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for Videos'
          ) THEN
            CREATE POLICY "Public Access for Videos" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public insert for Videos'
          ) THEN
            CREATE POLICY "Public insert for Videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public update for Videos'
          ) THEN
            CREATE POLICY "Public update for Videos" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
          END IF;
        END
        $$;
      `);
      console.log('Policies configured for videos bucket.');

      await client.end();
      return;
    } catch (err) {
      console.log(`Host ${host} failed:`, err.message);
      try { await client.end(); } catch {}
    }
  }
}

main();
