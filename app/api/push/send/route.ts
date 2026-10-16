import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getPushSubscription, removePushSubscription } from '@/lib/pushStore';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '@/lib/pushConfig';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      receiverId, 
      title, 
      body: notifBody, 
      icon, 
      url, 
      type, 
      callerId, 
      callerName, 
      callerAvatar,
      roomId,
      isVideo,
      senderId, 
      senderName 
    } = body;

    if (!receiverId) {
      return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });
    }

    const subRecord = getPushSubscription(receiverId);
    if (!subRecord || !subRecord.subscription) {
      return NextResponse.json({
        success: false,
        message: 'No push subscription found for receiver (receiver has not enabled push notifications yet)',
      });
    }

    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const isCall = type === 'call';

    const payload = JSON.stringify({
      title: title || (isCall ? `📞 Appel entrant : ${callerName || 'Partenaire'}` : `💬 Message de ${senderName || 'Partenaire'}`),
      body: notifBody || (isCall ? 'Appuyez pour décrocher l’appel en direct sur English Booster.' : 'Nouveau message reçu.'),
      icon: icon || callerAvatar || '/assets/images/logo.svg',
      url: url || (isCall ? `/call?roomId=${roomId}&partnerId=${callerId}&video=${isVideo}&autoAnswer=true` : `/chat?partnerId=${senderId}`),
      type: type || 'notification',
      tag: isCall ? 'eb-incoming-call' : `eb-msg-${senderId || Date.now()}`,
      callerId,
      callerName,
      roomId,
      isVideo,
      senderId,
      senderName,
      timestamp: Date.now(),
    });

    try {
      await webpush.sendNotification(subRecord.subscription as any, payload, {
        TTL: isCall ? 60 : 3600, // 60s for calls, 1h for messages
        urgency: isCall ? 'high' : 'normal',
      });

      return NextResponse.json({
        success: true,
        message: 'Background push notification sent successfully',
      });
    } catch (pushErr: any) {
      console.warn('Web push delivery status:', pushErr.statusCode, pushErr.message);

      // If subscription has expired or unsubscribed, remove it
      if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
        removePushSubscription(receiverId);
      }

      return NextResponse.json({
        success: false,
        error: pushErr.message,
        statusCode: pushErr.statusCode,
      });
    }
  } catch (err: any) {
    console.error('Error in /api/push/send:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
