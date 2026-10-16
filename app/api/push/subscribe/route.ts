import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscription } from '@/lib/pushStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription } = body;

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Missing userId or valid push subscription' },
        { status: 400 }
      );
    }

    savePushSubscription(userId, subscription);

    return NextResponse.json({
      success: true,
      message: 'Push subscription successfully registered for offline notifications',
    });
  } catch (err: any) {
    console.error('Error in /api/push/subscribe:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
