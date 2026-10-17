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

    savePushSubscription(userId, subscription, deviceType);
    const count = getPushSubscriptions(userId).length;

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
