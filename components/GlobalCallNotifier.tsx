'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { 
  IncomingCallPayload, 
  NewMessagePayload, 
  broadcastCallDeclined 
} from '@/lib/callSignaling';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  MessageSquare, 
  X, 
  Sparkles, 
  Volume2,
  Radio,
  ArrowRight
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
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  };

  useEffect(() => {
    if (!user?.id) return;

    const channelName = `user-notifications-${user.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }: { payload: IncomingCallPayload }) => {
        // If current user is already in a call with this roomId, ignore
        if (pathname === '/call') return;

        setIncomingCall(payload);
        playSound('call');

        // Loop ringtone sound every 2.8s
        if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = setInterval(() => {
          playSound('call');
        }, 2800);

        // Auto dismiss after 32s as missed call
        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = setTimeout(() => {
          stopRinging();
          setIncomingCall(null);
        }, 32000);
      })
      .on('broadcast', { event: 'call_ended' }, () => {
        stopRinging();
        setIncomingCall(null);
      })
      .on('broadcast', { event: 'call_declined' }, () => {
        stopRinging();
        setIncomingCall(null);
      })
      .on('broadcast', { event: 'new_message' }, ({ payload }: { payload: NewMessagePayload }) => {
        // Only show toast if user is not currently in chat with this sender
        if (pathname?.startsWith('/chat') && window.location.search.includes(payload.senderId)) {
          return;
        }

        playSound('chime');
        setMessageToast(payload);

        if (toastDismissTimerRef.current) clearTimeout(toastDismissTimerRef.current);
        toastDismissTimerRef.current = setTimeout(() => {
          setMessageToast(null);
        }, 6000);
      })
      .subscribe();

    return () => {
      stopRinging();
      supabase.removeChannel(channel);
    };
  }, [user?.id, pathname, playSound, supabase]);

  // Accept incoming call
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    stopRinging();
    playSound('click');

    const targetUrl = `/call?partnerId=${incomingCall.callerId}&partnerName=${encodeURIComponent(incomingCall.callerName)}&roomId=${incomingCall.roomId}&video=${incomingCall.isVideo}`;
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
    </>
  );
}
