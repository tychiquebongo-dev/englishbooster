'use client';

import { createClient } from '@/lib/supabase/client';

export interface IncomingCallPayload {
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callerFlag?: string;
  callerLevel?: string;
  receiverId: string;
  roomId: string;
  isVideo: boolean;
  timestamp?: number;
}

export interface NewMessagePayload {
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  text: string;
  conversationId?: string;
  audioUrl?: string;
}

/**
 * Broadcast an incoming call to the receiver's personal notification channel
 */
export async function broadcastIncomingCall(payload: IncomingCallPayload) {
  if (typeof window === 'undefined') return;
  const supabase = createClient();
  const channelName = `user-notifications-${payload.receiverId}`;
  const chatChannelName = `chat_${[payload.callerId, payload.receiverId].sort().join('_')}`;
  const roomChannelName = `call-room-${payload.roomId}`;

  // 1. Immediately launch native background Web Push notification to wake receiver's phone/lockscreen
  const pushPromise = (async () => {
    try {
      // Gather any receiver push subscriptions cached on client
      let receiverPushSubscriptions: any[] = [];
      try {
        const { data: recProf } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', payload.receiverId)
          .maybeSingle();

        if (recProf?.interests && Array.isArray(recProf.interests)) {
          receiverPushSubscriptions = recProf.interests
            .filter((item: string) => typeof item === 'string' && item.startsWith('__eb_push__:'))
            .map((item: string) => {
              try {
                return JSON.parse(item.replace('__eb_push__:', ''));
              } catch {
                return null;
              }
            })
            .filter(Boolean);
        }
      } catch {}

      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          receiverId: payload.receiverId,
          subscriptions: receiverPushSubscriptions,
          type: 'call',
          title: payload.isVideo
            ? `📹 Appel Vidéo entrant : ${payload.callerName}`
            : `📞 Appel Vocal entrant : ${payload.callerName}`,
          body: payload.isVideo
            ? `${payload.callerName} vous invite en appel vidéo HD. Touchez pour décrocher.`
            : `${payload.callerName} vous appelle en direct sur English Booster. Touchez pour décrocher.`,
          icon: payload.callerAvatar || '/assets/images/logo.svg',
          url: `/call?partnerId=${payload.callerId}&partnerName=${encodeURIComponent(payload.callerName)}&roomId=${payload.roomId}&video=${payload.isVideo}&autoAnswer=true`,
          callerId: payload.callerId,
          callerName: payload.callerName,
          callerAvatar: payload.callerAvatar,
          roomId: payload.roomId,
          isVideo: payload.isVideo,
        }),
      });
    } catch (pushErr) {
      console.warn('Immediate push dispatch error:', pushErr);
    }
  })();

  // 2. Broadcast immediately to any existing joined channels (e.g. active chat or room)
  try {
    const activeChannels = supabase.getChannels();
    for (const c of activeChannels) {
      if (
        c.topic === `realtime:${chatChannelName}` ||
        c.topic === `realtime:${roomChannelName}` ||
        c.topic === `realtime:${channelName}`
      ) {
        c.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: { ...payload, timestamp: Date.now() },
        }).catch(() => {});
      }
    }
  } catch {}

  // 3. Reliable broadcast to receiver's personal notifications channel
  const sendToPersonalChannel = new Promise<void>((resolve) => {
    let finished = false;
    const safeResolve = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    // Failsafe timeout after 2s so caller is never blocked
    const timeout = setTimeout(safeResolve, 2000);

    try {
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false, ack: true } },
      });

      const doSend = () => {
        channel
          .send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: {
              ...payload,
              timestamp: Date.now(),
            },
          })
          .then(() => {
            clearTimeout(timeout);
            safeResolve();
          })
          .catch(() => safeResolve());
      };

      if (channel.state === 'joined') {
        doSend();
      } else {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            doSend();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            safeResolve();
          }
        });
      }
    } catch {
      safeResolve();
    }
  });

  // 4. Also broadcast over chat conversation channel in case partner is inside chat
  try {
    const chatCh = supabase.channel(chatChannelName, {
      config: { broadcast: { self: false } },
    });
    if (chatCh.state === 'joined') {
      chatCh.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: { ...payload, timestamp: Date.now() },
      }).catch(() => {});
    } else {
      chatCh.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          chatCh.send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: { ...payload, timestamp: Date.now() },
          }).catch(() => {});
        }
      });
    }
  } catch {}

  // 5. Also broadcast over call room channel
  try {
    const roomCh = supabase.channel(roomChannelName, {
      config: { broadcast: { self: false } },
    });
    if (roomCh.state === 'joined') {
      roomCh.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: { ...payload, timestamp: Date.now() },
      }).catch(() => {});
    } else {
      roomCh.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          roomCh.send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: { ...payload, timestamp: Date.now() },
          }).catch(() => {});
        }
      });
    }
  } catch {}

  // 6. Record call invitation in database
  try {
    supabase.from('calls').insert({
      caller_id: payload.callerId,
      receiver_id: payload.receiverId,
      receiver_name: payload.callerName,
      room_id: payload.roomId,
      status: 'calling',
      duration_seconds: 0,
      fluency_score: 85,
      xp_earned: 0,
      topic: payload.isVideo ? 'Live Video Conversation' : 'Live Voice Call',
    }).then(() => {});
  } catch {}

  await Promise.allSettled([pushPromise, sendToPersonalChannel]);
}

/**
 * Broadcast that a call was ended so the other partner disconnects immediately
 */
export async function broadcastCallEnded(roomId: string, partnerId?: string, senderId?: string) {
  if (typeof window === 'undefined') return;
  const supabase = createClient();

  // 1. Broadcast directly to partner's personal notification channel
  if (partnerId) {
    const partnerChannel = supabase.channel(`user-notifications-${partnerId}`);
    partnerChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        partnerChannel.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: { roomId, senderId },
        });
        partnerChannel.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { type: 'hangup', from: senderId, roomId },
        }).then(() => {
          setTimeout(() => supabase.removeChannel(partnerChannel), 800);
        });
      }
    });
  }

  // 2. Broadcast to the room channel
  const roomChannel = supabase.channel(`call-room-${roomId}`);
  roomChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      roomChannel.send({
        type: 'broadcast',
        event: 'call_ended',
        payload: { roomId, senderId },
      });
      roomChannel.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: { type: 'hangup', from: senderId, roomId },
      });
    }
  });

  // 3. Update call record in database
  try {
    supabase
      .from('calls')
      .update({ status: 'completed' })
      .eq('room_id', roomId)
      .then(() => {});
  } catch {}
}

/**
 * Broadcast that a call was declined by the receiver
 */
export async function broadcastCallDeclined(callerId: string, roomId: string) {
  if (typeof window === 'undefined') return;
  const supabase = createClient();

  const callerChannel = supabase.channel(`user-notifications-${callerId}`);
  callerChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      callerChannel.send({
        type: 'broadcast',
        event: 'call_declined',
        payload: { roomId },
      }).then(() => {
        setTimeout(() => supabase.removeChannel(callerChannel), 300);
      });
    }
  });

  const roomChannel = supabase.channel(`call-room-${roomId}`);
  roomChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      roomChannel.send({
        type: 'broadcast',
        event: 'call_declined',
        payload: { roomId },
      }).then(() => {
        setTimeout(() => supabase.removeChannel(roomChannel), 300);
      });
    }
  });

  try {
    supabase
      .from('calls')
      .update({ status: 'declined' })
      .eq('room_id', roomId)
      .then(() => {});
  } catch {}
}

/**
 * Broadcast a new chat message to the receiver's personal notification channel
 */
export async function broadcastNewMessage(payload: NewMessagePayload) {
  if (typeof window === 'undefined') return;
  const supabase = createClient();
  const channelName = `user-notifications-${payload.receiverId}`;
  const channel = supabase.channel(channelName);

  return new Promise<void>((resolve) => {
    // Send background Web Push notification in case receiver is hors application
    try {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          receiverId: payload.receiverId,
          type: 'message',
          title: `💬 Message de ${payload.senderName}`,
          body: payload.text || (payload.audioUrl ? '🎙️ Message vocal' : 'Nouveau message'),
          icon: payload.senderAvatar || '/assets/images/logo.svg',
          url: `/chat?partnerId=${payload.senderId}&partnerName=${encodeURIComponent(payload.senderName)}`,
          senderId: payload.senderId,
          senderName: payload.senderName,
        }),
      }).catch(() => {});
    } catch {}

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload,
        }).then(() => {
          setTimeout(() => {
            supabase.removeChannel(channel);
            resolve();
          }, 300);
        });
      }
    });
  });
}

/**
 * Broadcast that a partner has entered the call room and is ready to exchange WebRTC streams
 */
export async function broadcastPartnerReady(roomId: string, userId: string) {
  if (typeof window === 'undefined') return;
  const supabase = createClient();
  const roomChannel = supabase.channel(`call-room-${roomId}`);

  return new Promise<void>((resolve) => {
    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        roomChannel.send({
          type: 'broadcast',
          event: 'partner_ready',
          payload: { roomId, userId },
        }).then(() => {
          setTimeout(() => {
            supabase.removeChannel(roomChannel);
            resolve();
          }, 300);
        });
      }
    });
  });
}

/**
 * Broadcast that messages were read by partner so sender's checkmarks turn blue immediately
 */
export async function broadcastMessagesRead(conversationId: string, readerId: string, partnerId: string, messageIds?: string[]) {
  if (typeof window === 'undefined') return;
  const supabase = createClient();
  const channelName = `user-notifications-${partnerId}`;
  const channel = supabase.channel(channelName);

  return new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'messages_read',
          payload: { conversationId, readerId, message_ids: messageIds },
        }).then(() => {
          setTimeout(() => {
            supabase.removeChannel(channel);
            resolve();
          }, 300);
        });
      }
    });
  });
}

/**
 * Register the user's browser/phone with Web Push API for background notifications when hors application
 */
export async function registerPushSubscription(userId: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return null;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } = await import('@/lib/pushConfig');
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    if (sub) {
      const subJson = sub.toJSON();
      const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceType = isMobile ? 'mobile' : 'desktop';

      // 1. Register with server push store
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: subJson,
          deviceType,
        }),
      }).catch(() => {});

      // 2. Synchronize push token into user's public profile row in Supabase
      try {
        const supabase = createClient();
        const { data: myProf } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', userId)
          .maybeSingle();

        const currentInterests = Array.isArray(myProf?.interests) ? myProf.interests : [];
        const myEndpoint = subJson.endpoint;

        // Keep normal interest tags and prune any older subscription with this exact endpoint
        const cleanInterests = currentInterests.filter((item: string) => {
          if (typeof item !== 'string' || !item.startsWith('__eb_push__:')) return true;
          try {
            const parsed = JSON.parse(item.replace('__eb_push__:', ''));
            return parsed.endpoint !== myEndpoint;
          } catch {
            return false;
          }
        });

        const token = `__eb_push__:${JSON.stringify(subJson)}`;
        await supabase
          .from('profiles')
          .update({
            interests: [...cleanInterests, token],
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch (dbErr) {
        console.warn('Could not sync push token to Supabase profile:', dbErr);
      }

      return sub;
    }
  } catch (err) {
    console.warn('Could not register push subscription:', err);
  }
  return null;
}

/**
 * Record a missed call in database (messages & calls table), notify chat in real-time, and send Web Push
 */
export async function recordMissedCall({
  callerId,
  callerName,
  callerAvatar,
  receiverId,
  isVideo = false,
  roomId,
}: {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  isVideo?: boolean;
  roomId?: string;
}) {
  if (typeof window === 'undefined') return;
  const supabase = createClient();
  const missedText = isVideo ? "📹 Missed video call" : "📞 Missed voice call";
  const pushTitle = isVideo ? `📹 Appel vidéo manqué : ${callerName}` : `📞 Appel vocal manqué : ${callerName}`;
  const pushBody = `${callerName} a essayé de vous appeler en direct. Touchez pour rappeler.`;

  // 1. Locate or create conversation in Supabase
  let convId: string | null = null;
  try {
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${callerId},participant_2.eq.${receiverId}),and(participant_1.eq.${receiverId},participant_2.eq.${callerId})`)
      .maybeSingle();

    if (conv?.id) {
      convId = conv.id;
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          participant_1: callerId,
          participant_2: receiverId,
        })
        .select('id')
        .single();
      if (newConv?.id) convId = newConv.id;
    }

    // 2. Insert Missed Call message in messages table
    if (convId) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: callerId,
        text: missedText,
        is_read: false,
      });
    }
  } catch (err) {
    console.warn('Error recording missed call message:', err);
  }

  // 3. Insert or update call record in calls table
  try {
    await supabase.from('calls').insert({
      caller_id: callerId,
      receiver_id: receiverId,
      receiver_name: callerName,
      receiver_avatar: callerAvatar || null,
      room_id: roomId || `room_${[callerId, receiverId].sort().join('_')}_${Date.now()}`,
      status: 'missed',
      duration_seconds: 0,
      fluency_score: 0,
      xp_earned: 0,
      topic: isVideo ? 'Missed Video Call' : 'Missed Voice Call',
    });
  } catch {}

  // 4. Realtime broadcast to receiver's notification channel
  try {
    const channelName = `user-notifications-${receiverId}`;
    const channel = supabase.channel(channelName);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: {
            senderId: callerId,
            senderName: callerName,
            senderAvatar: callerAvatar || '',
            receiverId: receiverId,
            text: missedText,
          },
        }).then(() => {
          setTimeout(() => supabase.removeChannel(channel), 500);
        });
      }
    });
  } catch {}

  // 5. Send Web Push Notification for phone lockscreen / background (Hors application)
  try {
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId,
        type: 'message',
        title: pushTitle,
        body: pushBody,
        icon: callerAvatar || '/assets/images/logo.svg',
        url: `/chat?partner=${callerId}`,
      }),
    }).catch(() => {});
  } catch {}
}


