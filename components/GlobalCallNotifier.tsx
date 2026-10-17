'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { 
  IncomingCallPayload, 
  NewMessagePayload, 
  broadcastCallDeclined,
  registerPushSubscription
} from '@/lib/callSignaling';
import {
  notifyBrowserBar,
  stopBrowserBarNotification,
  showDesktopNotification
} from '@/lib/browserNotifications';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  MessageSquare, 
  X, 
  Sparkles, 
  Volume2,
  Radio,
  ArrowRight,
  Bell,
  Download
} from 'lucide-react';
import Link from 'next/link';

export default function GlobalCallNotifier() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [messageToast, setMessageToast] = useState<NewMessagePayload | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeNotificationRef = useRef<Notification | null>(null);
  const incomingCallRef = useRef<IncomingCallPayload | null>(null);

  // Register service worker on mount & check notification permissions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        if (user?.id && 'Notification' in window && Notification.permission === 'granted') {
          registerPushSubscription(user.id);
        }
      }).catch(() => {});
    }

    if ('Notification' in window && Notification.permission === 'default') {
      setShowPermissionPrompt(true);
    }

    // Capture PWA install prompt for home screen installation (Hors application capability)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPermissionPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen to Service Worker messages when user answers or declines call from phone notification outside app
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'eb_answer_call' && event.data.url) {
        stopRinging();
        setIncomingCall(null);
        router.push(event.data.url);
      } else if (event.data?.type === 'eb_incoming_call_push' && event.data.callData) {
        handleTriggerIncomingCall(event.data.callData);
      } else if (event.data?.type === 'eb_call_declined_from_sw') {
        stopRinging();
        setIncomingCall(null);
      }
    };

    const handleCallAnsweredEvent = () => {
      stopRinging();
      setIncomingCall(null);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }
    window.addEventListener('eb_call_answered', handleCallAnsweredEvent);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      window.removeEventListener('eb_call_answered', handleCallAnsweredEvent);
    };
  }, [user?.id, router]);

  // Device physical vibration trigger
  const triggerVibration = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  // Close system notifications
  const clearCallNotifications = async () => {
    if (activeNotificationRef.current) {
      try {
        activeNotificationRef.current.close();
      } catch {}
      activeNotificationRef.current = null;
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.getNotifications) {
          const notifs = await reg.getNotifications({ tag: 'eb-incoming-call' });
          notifs.forEach(n => n.close());
        }
      } catch {}
    }
  };

  // Trigger system phone notification for incoming call (wakes lock screen / notification drawer)
  const showPhoneCallNotification = async (payload: IncomingCallPayload) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const title = payload.isVideo
      ? (isFr ? `📹 Appel Vidéo entrant : ${payload.callerName}` : `📹 Incoming Video Call: ${payload.callerName}`)
      : (isFr ? `📞 Appel Vocal entrant : ${payload.callerName}` : `📞 Incoming Voice Call: ${payload.callerName}`);

    const body = isFr
      ? `${payload.callerName} vous appelle en direct sur English Booster. Touchez pour décrocher.`
      : `${payload.callerName} is calling you live on English Booster. Tap to answer.`;

    const callUrl = `/call?partnerId=${payload.callerId}&partnerName=${encodeURIComponent(payload.callerName)}&roomId=${payload.roomId}&video=${payload.isVideo}&autoAnswer=true`;

    // 1. Try via Service Worker (best on mobile / Android / background)
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: payload.callerAvatar || '/assets/images/logo.svg',
            badge: '/assets/images/logo.svg',
            tag: 'eb-incoming-call',
            data: { 
              url: callUrl,
              roomId: payload.roomId,
              callerId: payload.callerId,
              isVideo: payload.isVideo,
            },
            requireInteraction: true,
            renotify: true,
            silent: false,
            vibrate: [1000, 400, 1000, 400, 1000, 400, 1000],
            actions: [
              { action: 'answer', title: payload.isVideo ? '📹 Décrocher / Answer' : '📞 Décrocher / Answer' },
              { action: 'decline', title: '❌ Refuser / Decline' }
            ]
          } as any);
          return;
        }
      }
    } catch {}

    // 2. Fallback to standard Web Notification API
    try {
      const notif = new Notification(title, {
        body,
        icon: payload.callerAvatar || '/assets/images/logo.svg',
        badge: '/assets/images/logo.svg',
        tag: 'eb-incoming-call',
        requireInteraction: true,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
        stopRinging();
        setIncomingCall(null);
        router.push(callUrl);
      };

      activeNotificationRef.current = notif;
    } catch {}
  };

  // Trigger system phone notification for incoming message
  const showPhoneMessageNotification = async (payload: NewMessagePayload) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const title = isFr
      ? `💬 Nouveau message de ${payload.senderName}`
      : `💬 New message from ${payload.senderName}`;

    const chatUrl = `/chat?partnerId=${payload.senderId}&partnerName=${encodeURIComponent(payload.senderName)}`;

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body: payload.text,
            icon: payload.senderAvatar || '/assets/images/logo.svg',
            badge: '/assets/images/logo.svg',
            tag: `eb-msg-${payload.senderId}`,
            data: { url: chatUrl },
            vibrate: [150, 80, 150],
          } as any);
          return;
        }
      }
    } catch {}

    try {
      const notif = new Notification(title, {
        body: payload.text,
        icon: payload.senderAvatar || '/assets/images/logo.svg',
        badge: '/assets/images/logo.svg',
        tag: `eb-msg-${payload.senderId}`,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
        router.push(chatUrl);
      };
    } catch {}
  };

  // Request phone notification permission explicitly & register background push subscription
  const requestPhoneNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setShowPermissionPrompt(false);
      if (result === 'granted') {
        playSound('success');
        triggerVibration([100, 50, 100]);

        // Register Web Push subscription with server so notifications arrive even when hors application!
        if (user?.id) {
          await registerPushSubscription(user.id);
        }

        // Show confirmation test notification
        showPhoneMessageNotification({
          senderId: 'eb-system',
          senderName: 'English Booster',
          senderAvatar: '/assets/images/logo.svg',
          receiverId: user?.id || '',
          text: isFr 
            ? 'Notifications hors-application activées ! Vous recevrez vos alertes d’appels et messages même application fermée ou écran verrouillé.' 
            : 'Background notifications enabled! You will receive calls and messages even with app closed.',
        });
      }
    } catch (err) {
      console.warn('Error activating notifications:', err);
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch {}
    }
  };

  // Stop Ringing helper
  const stopRinging = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    // Stop device vibration and browser tab flashing
    triggerVibration(0);
    clearCallNotifications();
    stopBrowserBarNotification();
  };

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const isFrRef = useRef(isFr);
  isFrRef.current = isFr;

  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;

  // Centralized handler to trigger incoming call modal & notifications
  const handleTriggerIncomingCall = (payload: IncomingCallPayload) => {
    // If current user is already in a call with this roomId, ignore
    if (pathnameRef.current === '/call') return;
    if (!payload || (payload.receiverId && user?.id && payload.receiverId !== user.id)) return;

    incomingCallRef.current = payload;
    setIncomingCall(payload);
    playSoundRef.current('call');
    triggerVibration([1000, 400, 1000, 400, 1000, 400, 1000]);

    // 1. Dynamic flashing notification in partner's browser bar (onglet & taskbar)
    notifyBrowserBar({
      type: payload.isVideo ? 'video_call' : 'voice_call',
      senderName: payload.callerName,
      durationMs: 45000,
    });

    // 2. Native HTML5 desktop / mobile notification
    showPhoneCallNotification(payload);

    // Loop ringtone sound and phone vibration every 2.8s
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    ringIntervalRef.current = setInterval(() => {
      playSoundRef.current('call');
      triggerVibration([1000, 400, 1000, 400, 1000, 400, 1000]);
    }, 2800);

    // Auto dismiss after 45s as missed call if not answered
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    autoDismissTimerRef.current = setTimeout(() => {
      stopRinging();
      const activeCall = incomingCallRef.current;
      incomingCallRef.current = null;
      setIncomingCall(null);

      if (activeCall && user?.id) {
        const missedText = activeCall.isVideo 
          ? (isFrRef.current ? '📹 Appel vidéo manqué' : '📹 Missed video call') 
          : (isFrRef.current ? '📞 Appel vocal manqué' : '📞 Missed voice call');
        showPhoneMessageNotification({
          senderId: activeCall.callerId,
          senderName: activeCall.callerName,
          senderAvatar: activeCall.callerAvatar,
          receiverId: user.id,
          text: `${missedText} (${isFrRef.current ? 'Appuyez pour rappeler' : 'Tap to call back'})`,
        });
      }
    }, 45000);
  };

  useEffect(() => {
    if (!user?.id) return;

    // Listen to local in-app redundant events (e.g. from chat page)
    const handleCustomIncomingCall = (e: any) => {
      if (e.detail) {
        handleTriggerIncomingCall(e.detail);
      }
    };
    window.addEventListener('eb_incoming_call', handleCustomIncomingCall);

    const channelName = `user-notifications-${user.id}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }: { payload: IncomingCallPayload }) => {
        handleTriggerIncomingCall(payload);
      })
      .on('broadcast', { event: 'call_ended' }, () => {
        stopRinging();
        const activeCall = incomingCallRef.current;
        incomingCallRef.current = null;
        setIncomingCall(null);

        if (activeCall && user?.id) {
          const missedText = activeCall.isVideo 
            ? (isFrRef.current ? '📹 Appel vidéo manqué' : '📹 Missed video call') 
            : (isFrRef.current ? '📞 Appel vocal manqué' : '📞 Missed voice call');
          showPhoneMessageNotification({
            senderId: activeCall.callerId,
            senderName: activeCall.callerName,
            senderAvatar: activeCall.callerAvatar,
            receiverId: user.id,
            text: `${missedText} (${isFrRef.current ? 'Appuyez pour rappeler' : 'Tap to call back'})`,
          });
        }
      })
      .on('broadcast', { event: 'call_declined' }, () => {
        stopRinging();
        incomingCallRef.current = null;
        setIncomingCall(null);
      })
      .on('broadcast', { event: 'new_message' }, ({ payload }: { payload: NewMessagePayload }) => {
        // Only show toast if user is not currently in chat with this sender
        if (pathnameRef.current?.startsWith('/chat') && typeof window !== 'undefined' && window.location.search.includes(payload.senderId)) {
          return;
        }

        playSoundRef.current('chime');
        triggerVibration([150, 80, 150]);
        setMessageToast(payload);

        // Flash message notification on browser bar
        notifyBrowserBar({
          type: 'message',
          senderName: payload.senderName,
          textSnippet: payload.text,
          durationMs: 12000,
        });

        showPhoneMessageNotification(payload);

        if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current);
        toastDismissTimerRef.current = setTimeout(() => {
          setMessageToast(null);
        }, 6000);
      })
      .subscribe();

    // Global Presence Channel so all other users on the platform immediately know this user is online
    const existingPresence = supabase.getChannels().find(c => c.topic === 'realtime:global_online_presence');
    const presenceChannel = existingPresence || supabase.channel('global_online_presence', {
      config: { presence: { key: user.id } }
    });

    const updatePresenceState = () => {
      try {
        const state = presenceChannel.presenceState();
        const ids = new Set<string>();
        Object.keys(state).forEach(key => {
          ids.add(key);
          const list = state[key] as any[];
          if (Array.isArray(list)) {
            list.forEach(p => {
              if (p?.user_id) ids.add(p.user_id);
            });
          }
        });
        const idsArray = Array.from(ids);
        if (typeof window !== 'undefined') {
          (window as any).__EB_ONLINE_USER_IDS = idsArray;
          window.dispatchEvent(new CustomEvent('eb_presence_sync', { detail: idsArray }));
        }
      } catch {}
    };

    // Attach callbacks ONLY if channel is not already joined or joining
    if (presenceChannel.state !== 'joined' && presenceChannel.state !== 'joining') {
      presenceChannel
        .on('presence', { event: 'sync' }, updatePresenceState)
        .on('presence', { event: 'join' }, updatePresenceState)
        .on('presence', { event: 'leave' }, updatePresenceState)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await presenceChannel.track({
                user_id: user.id,
                name: profile?.full_name || user.email,
                online_at: new Date().toISOString(),
              });
            } catch {}
          }
        });
    } else {
      // Already subscribed, just track current user and update state
      try {
        presenceChannel.track({
          user_id: user.id,
          name: profile?.full_name || user.email,
          online_at: new Date().toISOString(),
        }).catch(() => {});
        updatePresenceState();
      } catch {}
    }

    return () => {
      stopRinging();
      window.removeEventListener('eb_incoming_call', handleCustomIncomingCall);
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.full_name, supabase]);

  // Accept incoming call
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    stopRinging();
    playSound('click');

    const targetUrl = `/call?partnerId=${incomingCall.callerId}&partnerName=${encodeURIComponent(incomingCall.callerName)}&roomId=${incomingCall.roomId}&video=${incomingCall.isVideo}&autoAnswer=true`;
    setIncomingCall(null);
    router.push(targetUrl);
  };

  // Decline incoming call
  const handleDeclineCall = () => {
    if (!incomingCall) return;
    stopRinging();
    playSound('click');
    broadcastCallDeclined(incomingCall.callerId, incomingCall.roomId);
    setIncomingCall(null);
  };

  return (
    <>
      {/* 1. FULLSCREEN INCOMING CALL MODAL */}
      {incomingCall && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in select-none">
          
          {/* Animated Ambient Light Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="w-[450px] h-[450px] rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
            <div className="w-[300px] h-[300px] rounded-full bg-teal-400/20 blur-2xl animate-ping opacity-60" />
          </div>

          <div className="relative w-full max-w-[92vw] sm:max-w-sm p-5 sm:p-8 rounded-3xl bg-[#070d1d]/95 border-2 border-emerald-400/50 shadow-[0_0_60px_rgba(74,222,128,0.35)] text-center space-y-4 sm:space-y-6">
            
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider animate-bounce">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>
                {incomingCall.isVideo 
                  ? (isFr ? 'Appel Vidéo HD Entrant' : 'Incoming HD Video Call') 
                  : (isFr ? 'Appel Vocal Entrant' : 'Incoming Voice Call')}
              </span>
            </div>

            {/* Caller Avatar with Triple Pulsing Rings */}
            <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-50" />
              <div className="absolute -inset-2 rounded-full border-2 border-teal-300 animate-pulse opacity-40" />
              <img
                src={incomingCall.callerAvatar}
                alt={incomingCall.callerName}
                className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-emerald-400 shadow-[0_0_30px_rgba(74,222,128,0.5)]"
              />
              <span className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 z-20 text-base sm:text-lg bg-[#060a14] p-1 rounded-full border border-white/20 shadow">
                {incomingCall.callerFlag || '🌐'}
              </span>
            </div>

            {/* Caller Information */}
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                {incomingCall.callerName}
              </h3>
              <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {isFr ? 'Souhaite pratiquer l’anglais avec vous' : 'Wants to practice English with you'}
                </span>
                {incomingCall.callerLevel && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    {incomingCall.callerLevel}
                  </span>
                )}
              </p>
            </div>

            {/* Audio Waveform Simulator */}
            <div className="flex items-center justify-center gap-1 py-1">
              {[40, 70, 100, 60, 90, 50, 80, 40].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full animate-pulse"
                  style={{
                    height: `${h * 0.25}px`,
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ))}
            </div>

            {/* Action Buttons: Accept (Green) & Decline (Red) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
              {/* Decline Button */}
              <button
                type="button"
                onClick={handleDeclineCall}
                className="py-3.5 px-4 min-h-[48px] rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>{isFr ? 'Refuser' : 'Decline'}</span>
              </button>

              {/* Accept Button */}
              <button
                type="button"
                onClick={handleAcceptCall}
                className="py-3.5 px-4 min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(74,222,128,0.5)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                {incomingCall.isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                <span>{isFr ? 'Accepter' : 'Accept'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. REAL-TIME NEW MESSAGE FLOATING TOAST */}
      {messageToast && (
        <aside 
          aria-label="New Message Notification"
          className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-[9990] animate-menu-enter safe-pt"
        >
          <div className="p-3.5 rounded-2xl bg-[#091124]/95 border border-emerald-500/40 shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-3">
            <img
              src={messageToast.senderAvatar}
              alt={messageToast.senderName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-400 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-white truncate">
                  {messageToast.senderName}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                  Now
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                {messageToast.text}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href={`/chat?partnerId=${messageToast.senderId}&partnerName=${encodeURIComponent(messageToast.senderName)}`}
                onClick={() => setMessageToast(null)}
                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-transform hover:scale-105 active:scale-95"
                title="Reply in Chat"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setMessageToast(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 3. ONE-TAP BACKGROUND NOTIFICATION & PWA ACTIVATION PILL */}
      {showPermissionPrompt && (
        <aside 
          aria-label="Notification Permission"
          className="fixed bottom-20 sm:bottom-6 left-3 sm:left-6 sm:right-auto z-[9980] max-w-[calc(100vw-1.5rem)] sm:max-w-sm animate-fade-in safe-pb"
        >
          <div className="p-3.5 rounded-2xl bg-[#091124]/95 border border-emerald-400/50 shadow-[0_15px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl text-white">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 shadow-inner">
                  <Bell className="w-4 h-4 animate-bounce" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    {isFr ? "Alertes hors-application (Fond & Verrouillé)" : "Background alerts (Screen locked)"}
                  </p>
                  <p className="text-[10px] text-slate-300 line-clamp-1">
                    {isFr ? "Recevoir les appels et messages même application fermée" : "Receive calls and messages even with app closed"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPermissionPrompt(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={requestPhoneNotifications}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs hover:scale-102 active:scale-98 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isFr ? "Activer les alertes" : "Enable Alerts"}</span>
              </button>

              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors flex items-center gap-1.5 border border-white/10 cursor-pointer"
                  title="Installer l'application sur votre écran d'accueil"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isFr ? "Installer l'App" : "Install App"}</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
