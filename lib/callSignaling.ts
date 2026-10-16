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
  const channel = supabase.channel(channelName);

  return new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: {
            ...payload,
            timestamp: Date.now(),
          },
        }).then(() => {
          setTimeout(() => {
            supabase.removeChannel(channel);
            resolve();
          }, 300);
        });
      }
    });

    // Also persist call invitation into calls table
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
  });
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

