import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';

const FALLBACK_SUPABASE_URL = 'https://bolmrscavaeiqzytfzej.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbG1yc2NhdmFlaXF6eXRmemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDU2MjEsImV4cCI6MjEwNzMyMTYyMX0.A3lmy57zKqvSxfjRumabXqm5v4MTAe_EvP9MvVBXHrE';

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  if (typeof window === 'undefined') {
    return createBrowserClient(url, key);
  }

  if (!client) {
    client = createBrowserClient(url, key);
  }

  return client;
}
