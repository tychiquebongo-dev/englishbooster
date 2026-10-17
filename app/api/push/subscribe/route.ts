import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscription, getPushSubscriptions } from '@/lib/pushStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription, deviceType } = body;

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Missing userId or valid push subscription' },
        { status: 400 }
      );
    }

    // 1. Save in local/temp push store
    savePushSubscription(userId, subscription, deviceType);
    const count = getPushSubscriptions(userId).length;

    // 2. Synchronize to Supabase profiles.interests so all serverless instances and callers can reach this device
    try {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bolmrscavaeiqzytfzej.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbG1yc2NhdmFlaXF6eXRmemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDU2MjEsImV4cCI6MjEwNzMyMTYyMX0.A3lmy57zKqvSxfjRumabXqm5v4MTAe_EvP9MvVBXHrE';
      const sb = createSupabaseClient(supabaseUrl, supabaseKey);

      const { data: myProf } = await sb
        .from('profiles')
        .select('interests')
        .eq('id', userId)
        .maybeSingle();

      const currentInterests = Array.isArray(myProf?.interests) ? myProf.interests : [];
      const myEndpoint = subscription.endpoint;

      const cleanInterests = currentInterests.filter((item: string) => {
        if (typeof item !== 'string' || !item.startsWith('__eb_push__:')) return true;
        try {
          const parsed = JSON.parse(item.replace('__eb_push__:', ''));
          return parsed.endpoint !== myEndpoint;
        } catch {
          return false;
        }
      });

      const token = `__eb_push__:${JSON.stringify(subscription)}`;
      await sb
        .from('profiles')
        .update({
          interests: [...cleanInterests, token],
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (syncErr) {
      console.warn('Server sync of push subscription to Supabase profile failed:', syncErr);
    }

    return NextResponse.json({
      success: true,
      registeredCount: count,
      message: 'Push subscription successfully registered for offline background notifications',
    });
  } catch (err: any) {
    console.error('Error in /api/push/subscribe:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
