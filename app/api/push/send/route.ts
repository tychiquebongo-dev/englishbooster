import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getPushSubscriptions, removePushSubscription } from '@/lib/pushStore';
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
      senderName,
      subscriptions: passedSubscriptions,
      subscription: passedSingleSubscription,
    } = body;

    if (!receiverId) {
      return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });
    }

    // 1. Gather all potential subscriptions for this receiver
    const candidateSubscriptions: any[] = [];

    // From request body (e.g. pulled from Supabase profiles.interests)
    if (Array.isArray(passedSubscriptions) && passedSubscriptions.length > 0) {
      candidateSubscriptions.push(...passedSubscriptions);
    } else if (passedSingleSubscription && passedSingleSubscription.endpoint) {
      candidateSubscriptions.push(passedSingleSubscription);
    }

    // From local/tmp push store
    const localRecords = getPushSubscriptions(receiverId);
    if (localRecords && localRecords.length > 0) {
      for (const rec of localRecords) {
        if (rec.subscription && rec.subscription.endpoint) {
          candidateSubscriptions.push(rec.subscription);
        }
      }
    }

    // Deduplicate by endpoint URL
    const uniqueMap = new Map<string, any>();
    for (const sub of candidateSubscriptions) {
      if (sub && sub.endpoint && !uniqueMap.has(sub.endpoint)) {
        uniqueMap.set(sub.endpoint, sub);
      }
    }
    const targetSubscriptions = Array.from(uniqueMap.values());

    if (targetSubscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No push subscription found for receiver (receiver has not registered push on this device yet)',
      });
    }

    // 2. Configure web-push with VAPID keys
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const isCall = type === 'call';
    const isVideoCall = isVideo === true;

    const defaultTitle = isCall 
      ? (isVideoCall 
          ? `📹 Appel Vidéo entrant : ${callerName || 'Partenaire'}` 
          : `📞 Appel Vocal entrant : ${callerName || 'Partenaire'}`)
      : `💬 Message de ${senderName || 'Partenaire'}`;

    const defaultBody = isCall
      ? (isVideoCall
          ? `${callerName || 'Un partenaire'} vous invite en appel vidéo HD. Touchez pour décrocher.`
          : `${callerName || 'Un partenaire'} vous appelle en direct. Touchez pour décrocher.`)
      : 'Nouveau message reçu sur English Booster.';

    const targetUrl = url || (isCall 
      ? `/call?roomId=${roomId}&partnerId=${callerId}&video=${isVideoCall}&autoAnswer=true` 
      : `/chat?partnerId=${senderId}`);

    const payload = JSON.stringify({
      title: title || defaultTitle,
      body: notifBody || defaultBody,
      icon: icon || callerAvatar || '/assets/images/logo.svg',
      url: targetUrl,
      type: type || 'notification',
      tag: isCall ? 'eb-incoming-call' : `eb-msg-${senderId || Date.now()}`,
      callerId,
      callerName,
      callerAvatar,
      roomId,
      isVideo: isVideoCall,
      senderId,
      senderName,
      timestamp: Date.now(),
    });

    // 3. Dispatch Web Push notification to all active device endpoints (Mobile phone + PC)
    let sentCount = 0;
    const errors: any[] = [];

    const sendPromises = targetSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload, {
          TTL: isCall ? 60 : 3600, // 60s for live calls, 1h for messages
          urgency: isCall ? 'high' : 'normal',
        });
        sentCount++;
      } catch (pushErr: any) {
        console.warn('Web push delivery failed for endpoint:', sub.endpoint?.substring(0, 40), pushErr.statusCode, pushErr.message);

        // If subscription has expired or was revoked by browser, prune it
        if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
          removePushSubscription(receiverId, sub.endpoint);
        }
        errors.push({ endpoint: sub.endpoint?.substring(0, 40), error: pushErr.message });
      }
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({
      success: sentCount > 0,
      sentCount,
      totalDevices: targetSubscriptions.length,
      errors: errors.length > 0 ? errors : undefined,
      message: sentCount > 0 
        ? `Background push alert successfully sent to ${sentCount} device(s)`
        : 'Failed to deliver push alerts to target devices',
    });
  } catch (err: any) {
    console.error('Error in /api/push/send:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
