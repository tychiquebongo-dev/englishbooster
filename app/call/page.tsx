'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import confetti from 'canvas-confetti';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Sparkles, 
  Share2, 
  Volume2, 
  Trophy, 
  ArrowRight,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Phone,
  PhoneForwarded
} from 'lucide-react';
import Link from 'next/link';
import { initPeerInstance, getCleanPeerId, stopLocalMediaStream } from '@/lib/webrtcCall';
import { getUserAvatar } from '@/lib/avatarHelper';
import { broadcastIncomingCall, broadcastCallEnded, broadcastPartnerReady } from '@/lib/callSignaling';

const DISCUSSION_PROMPTS = [
  "What is your dream travel destination and what would you do there first?",
  "How has artificial intelligence impacted your daily life or your career so far?",
  "If you had the chance to live in any country for 1 year, where would you choose?",
  "What is the most useful piece of advice someone has ever given you?",
  "Do you prefer living in a bustling metropolitan city or a peaceful countryside, and why?",
  "What is an interesting tradition or cultural celebration from your native country?",
  "What was the most challenging project you have ever worked on, and how did you overcome it?"
];

function CallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isFr } = useTranslation();
  const partnerId = searchParams?.get('partnerId');
  const partnerName = searchParams?.get('partnerName') || (isFr ? 'Partenaire Inscrit' : 'Registered Partner');
  const isVideoParam = searchParams?.get('video') !== 'false';
  const { user, profile, playSound, refreshProfile } = useAuth();
  const supabase = createClient();

  const roomId = searchParams?.get('roomId') || (user?.id && partnerId ? `room_${[user.id, partnerId].sort().join('_')}` : `room_${Date.now()}`);

  const [partnerProfile, setPartnerProfile] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    flag: string | null;
    current_level: string | null;
    country: string | null;
  } | null>(null);

  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(isVideoParam);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [savingCall, setSavingCall] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [remoteEndedNotice, setRemoteEndedNotice] = useState<string | null>(null);
  const [callDeclined, setCallDeclined] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerInstanceRef = useRef<any>(null);

  // Fetch partner profile
  useEffect(() => {
    if (!partnerId) return;
    const fetchPartner = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, flag, current_level, country')
          .eq('id', partnerId)
          .single();
        if (data) {
          setPartnerProfile(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPartner();
  }, [partnerId, supabase]);

  // Realtime Signaling: Listen for hangup, decline, or partner entering the room
  useEffect(() => {
    if (!roomId) return;
    const roomChannel = supabase.channel(`call-room-${roomId}`);

    roomChannel
      .on('broadcast', { event: 'call_ended' }, () => {
        playSound('chime');
        setRemoteEndedNotice(isFr ? 'Votre partenaire a mis fin à l\'appel.' : 'Your partner has ended the call.');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setCallEnded(true);
      })
      .on('broadcast', { event: 'call_declined' }, () => {
        playSound('chime');
        setCallDeclined(true);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      })
      .on('broadcast', { event: 'partner_ready' }, ({ payload }: any) => {
        // Partner is in the room and ready for WebRTC handshake
        if (payload?.userId !== user?.id && peerInstanceRef.current && partnerId && streamRef.current && !hasRemoteStream) {
          const remotePeerId = getCleanPeerId(partnerId);
          try {
            const outgoingCall = peerInstanceRef.current.call(remotePeerId, streamRef.current, {
              metadata: {
                callerId: user?.id,
                callerName: profile?.full_name || 'English Learner',
                isVideo: isVideoParam,
              },
            });
            outgoingCall.on('stream', (remoteStream: MediaStream) => {
              setHasRemoteStream(true);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
            });
            outgoingCall.on('close', () => {
              setRemoteEndedNotice(isFr ? 'Votre partenaire a mis fin à l\'appel.' : 'Your partner has ended the call.');
              setCallEnded(true);
            });
          } catch (e) {
            console.warn('partner_ready call attempt:', e);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, supabase, playSound, isFr, user?.id, partnerId, hasRemoteStream, isVideoParam, profile]);

  // Broadcast incoming call to partner when caller mounts page (unless auto-answering receiver)
  useEffect(() => {
    if (!user?.id || !partnerId) return;
    const isAutoAnswer = searchParams?.get('autoAnswer') === 'true';

    if (!isAutoAnswer) {
      broadcastIncomingCall({
        callerId: user.id,
        callerName: profile?.full_name || 'English Learner',
        callerAvatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
        callerFlag: profile?.flag || '🌐',
        callerLevel: profile?.current_level || 'B2',
        receiverId: partnerId,
        roomId: roomId,
        isVideo: isVideoParam,
      });
    }

    // Announce readiness to room
    broadcastPartnerReady(roomId, user.id);
  }, [user?.id, partnerId, roomId, isVideoParam, profile, searchParams]);

  // Initialize camera, microphone and remote PeerJS WebRTC connection
  useEffect(() => {
    let localStream: MediaStream | null = null;
    let peer: any = null;

    const startMediaAndPeer = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: isVideoParam,
          audio: true,
        });
        streamRef.current = localStream;
        if (localVideoRef.current && isVideoParam) {
          localVideoRef.current.srcObject = localStream;
        }

        // Initialize remote PeerJS WebRTC API
        if (user?.id) {
          peer = await initPeerInstance(user.id);
          peerInstanceRef.current = peer;

          if (peer && partnerId) {
            const remotePeerId = getCleanPeerId(partnerId);
            const call = peer.call(remotePeerId, localStream, {
              metadata: {
                callerId: user.id,
                callerName: profile?.full_name || 'English Learner',
                isVideo: isVideoParam,
              },
            });

            call.on('stream', (remoteStream: MediaStream) => {
              setHasRemoteStream(true);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
            });

            call.on('close', () => {
              setRemoteEndedNotice(isFr ? 'Votre partenaire a mis fin à l\'appel.' : 'Your partner has ended the call.');
              setCallEnded(true);
            });
          }

          if (peer) {
            peer.on('call', (incomingCall: any) => {
              incomingCall.answer(localStream);
              incomingCall.on('stream', (remoteStream: MediaStream) => {
                setHasRemoteStream(true);
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = remoteStream;
                }
              });
              incomingCall.on('close', () => {
                setRemoteEndedNotice(isFr ? 'Votre partenaire a mis fin à l\'appel.' : 'Your partner has ended the call.');
                setCallEnded(true);
              });
            });
          }
        }
      } catch (err) {
        console.warn("Camera/Mic access denied or unavailable, falling back to simulated session:", err);
        setPermissionError(true);
      }
    };

    startMediaAndPeer();
    playSound('call');

    // Call duration timer
    const interval = setInterval(() => {
      setDurationSeconds(s => s + 1);
    }, 1000);

    // Rotate prompts every 40s
    const promptInterval = setInterval(() => {
      setCurrentPromptIndex(idx => (idx + 1) % DISCUSSION_PROMPTS.length);
    }, 40000);

    return () => {
      clearInterval(interval);
      clearInterval(promptInterval);
      stopLocalMediaStream();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peer) {
        try {
          peer.destroy();
        } catch {}
      }
    };
  }, [partnerId, user?.id, profile?.full_name, playSound, isVideoParam, isFr]);

  // Toggle Mute
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
        playSound('click');
      }
    } else {
      setMicActive(!micActive);
      playSound('click');
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoActive(videoTrack.enabled);
        playSound('click');
      }
    } else {
      setVideoActive(!videoActive);
      playSound('click');
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        playSound('click');

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && streamRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
          }
        };
      } else {
        if (localVideoRef.current && streamRef.current) {
          localVideoRef.current.srcObject = streamRef.current;
        }
        setIsScreenSharing(false);
        playSound('click');
      }
    } catch (err) {
      console.warn("Screen share error:", err);
    }
  };

  // End Call
  const handleEndCall = async () => {
    playSound('click');
    setSavingCall(true);

    // Stop streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Broadcast call_ended to room channel and partner immediately
    if (roomId) {
      broadcastCallEnded(roomId, partnerId || undefined, user?.id);
    }

    // Persist call session in Supabase
    if (user?.id) {
      try {
        const minsSpoken = Math.max(1, Math.round(durationSeconds / 60));
        const callRoomId = roomId || `room_${Date.now()}`;
        
        await supabase.from('calls').insert({
          caller_id: user.id,
          room_id: callRoomId,
          receiver_id: partnerId || null,
          receiver_name: partnerProfile?.full_name || partnerName || (isFr ? 'Partenaire de conversation' : 'Conversation partner'),
          receiver_avatar: partnerProfile?.avatar_url || null,
          duration_seconds: durationSeconds,
          fluency_score: 88,
          xp_earned: 50,
          status: 'completed',
          topic: DISCUSSION_PROMPTS[currentPromptIndex] || 'General English Conversation',
        });

        if (profile) {
          await supabase.from('profiles').update({
            minutes_spoken: (profile.minutes_spoken || 0) + minsSpoken,
          }).eq('id', user.id);

          await refreshProfile();
        }
      } catch (err) {
        console.error("Error saving call:", err);
      }
    }

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4ade80', '#60a5fa', '#f59e0b'],
      });
    } catch {}

    playSound('success');
    setSavingCall(false);
    setCallEnded(true);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 min-h-[calc(100dvh-5rem)] md:h-[calc(100dvh-5.5rem)] flex flex-col justify-between space-y-3">
      
      {/* Top Floating Control Bar */}
      <div className="saas-card bg-white dark:bg-[#060a14] border-slate-200 dark:border-white/10 shadow-sm p-3 sm:p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500 animate-ping" />
          <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
            {formatTimer(durationSeconds)}
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline">
            • {isFr ? 'Session Live avec' : 'Live Session with'} <strong className="text-slate-900 dark:text-white">{partnerName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFr ? 'Sujets Guidés' : 'Guided Topics'}</span>
          </span>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 my-2 sm:my-4 relative min-h-0">
        
        {/* Remote Partner Screen */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b1329] via-[#070d1d] to-[#040814] border border-white/10 flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl min-h-[180px] xs:min-h-[220px] md:min-h-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover absolute inset-0 ${hasRemoteStream ? 'block' : 'hidden'}`}
          />
          {partnerProfile?.avatar_url ? (
            <div className="relative flex flex-col items-center">
              <div className="relative">
                <img
                  src={partnerProfile.avatar_url}
                  alt={partnerName}
                  className="w-24 h-24 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-emerald-400/60 shadow-[0_0_40px_rgba(74,222,128,0.3)]"
                />
                <span className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#060a14] border border-white/20 flex items-center justify-center text-xs sm:text-sm shadow">
                  {partnerProfile.flag || '🌐'}
                </span>
              </div>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg font-black text-white">{partnerName}</p>
              <div className="text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 mt-1">
                {hasRemoteStream ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-emerald-400">{isFr ? 'En direct • Connecté' : 'Live • Connected'}</span>
                  </>
                ) : callDeclined ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-rose-400">{isFr ? 'Appel refusé / Indisponible' : 'Call declined / Unavailable'}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300">{isFr ? 'Sonnerie chez le partenaire...' : 'Ringing partner...'}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 border-2 border-emerald-400/40 flex items-center justify-center text-2xl sm:text-4xl font-black text-emerald-300 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                {partnerName ? partnerName.charAt(0).toUpperCase() : 'P'}
              </div>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{partnerName}</span>
                <span>{partnerProfile?.flag || '🌐'}</span>
              </p>
              <div className="text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 mt-1">
                {hasRemoteStream ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-emerald-400">{isFr ? 'En direct • Connecté' : 'Live • Connected'}</span>
                  </>
                ) : callDeclined ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-rose-400">{isFr ? 'Appel refusé / Indisponible' : 'Call declined / Unavailable'}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300">{isFr ? 'Sonnerie chez le partenaire...' : 'Ringing partner...'}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-10 flex items-center gap-2">
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-black/60 border border-white/20 text-white font-bold text-[11px] sm:text-xs backdrop-blur-md">
              {partnerName} {partnerProfile?.current_level ? `(${partnerProfile.current_level})` : ''}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Local User Screen (WebRTC Live Stream) */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl min-h-[180px] xs:min-h-[220px] md:min-h-0">
          {permissionError || !videoActive ? (
            <div className="flex flex-col items-center gap-2 sm:gap-3 text-center p-4 sm:p-6">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-emerald-400/50 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl sm:text-2xl font-black text-emerald-300 shadow-lg">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <p className="font-bold text-white text-xs sm:text-sm">{profile?.full_name || (isFr ? 'Vous' : 'You')}</p>
              <p className="text-[11px] sm:text-xs text-slate-400">{isFr ? 'Caméra désactivée • Audio actif' : 'Camera off • Audio active'}</p>
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-10">
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-black/60 border border-white/20 text-white font-bold text-[11px] sm:text-xs backdrop-blur-md">
              {profile?.full_name || (isFr ? 'Moi' : 'Me')} ({isFr ? 'Vous' : 'You'})
            </span>
          </div>
        </div>

        {/* Floating AI Coach Discussion Prompt Overlay */}
        <div className="md:absolute md:bottom-6 md:left-1/2 md:-translate-x-1/2 w-full md:w-11/12 max-w-xl z-20 col-span-1 md:col-span-2 pointer-events-auto">
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#060a14]/95 border border-emerald-400/40 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-start gap-2.5 sm:gap-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                  {isFr ? 'Idée de sujet de conversation' : 'Conversation topic suggestion'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const utt = new SpeechSynthesisUtterance(DISCUSSION_PROMPTS[currentPromptIndex]);
                        utt.lang = 'en-US';
                        utt.rate = 0.95;
                        window.speechSynthesis.speak(utt);
                        playSound('chime');
                      }
                    }}
                    title={isFr ? "Écouter la prononciation" : "Listen to pronunciation"}
                    className="p-1 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPromptIndex(idx => (idx + 1) % DISCUSSION_PROMPTS.length)}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    {isFr ? 'Suivant →' : 'Next →'}
                  </button>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed line-clamp-2 sm:line-clamp-none">
                « {DISCUSSION_PROMPTS[currentPromptIndex]} »
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Calling Controls Bar */}
      <div className="saas-card bg-white dark:bg-[#060a14] border-slate-200 dark:border-white/10 shadow-lg p-2 xs:p-2.5 sm:p-4 flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-4 z-20 safe-pb">
        
        {/* Toggle Mic */}
        <button
          onClick={toggleMic}
          className={`p-2.5 xs:p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
            micActive
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white'
              : 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
          }`}
          title={micActive ? (isFr ? 'Couper le micro' : 'Mute microphone') : (isFr ? 'Activer le micro' : 'Unmute microphone')}
        >
          {micActive ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Toggle Video */}
        <button
          onClick={toggleVideo}
          className={`p-2.5 xs:p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
            videoActive
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white'
              : 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
          }`}
          title={videoActive ? (isFr ? 'Couper la caméra' : 'Turn off video') : (isFr ? 'Activer la caméra' : 'Turn on video')}
        >
          {videoActive ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Toggle Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`p-2.5 xs:p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
            isScreenSharing
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white'
          }`}
          title={isFr ? "Partager l'écran" : "Share screen"}
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          className="px-3.5 xs:px-4 sm:px-6 py-2.5 xs:py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center gap-1.5 sm:gap-2 shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-transform hover:scale-105 active:scale-95"
        >
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm font-bold">{isFr ? "Terminer" : "End call"}</span>
        </button>

      </div>

      {/* POST-CALL SUMMARY MODAL */}
      {callEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="saas-card max-w-md w-full p-8 text-center space-y-6 bg-white dark:bg-[#0a1124] border-slate-200 dark:border-emerald-400/40 shadow-2xl">
            
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-300 mx-auto flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {isFr ? "Session de Conversation Terminée" : "Conversation Session Ended"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {isFr ? "Vous avez échangé pendant" : "You conversed for"} <strong className="text-slate-900 dark:text-white">{formatTimer(durationSeconds)}</strong> {isFr ? "avec" : "with"} {partnerName}.
              </p>
            </div>

            {remoteEndedNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
                <span>⚡</span>
                <span>{remoteEndedNotice}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{isFr ? "Temps de Parole" : "Speaking Time"}</p>
                <p className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-1">+{Math.max(1, Math.round(durationSeconds / 60))} min</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{isFr ? "Score Aisance" : "Fluency Score"}</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">88%</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                onClick={() => playSound('click')}
                className="w-full py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 text-sm shadow-md"
              >
                {isFr ? "Retour au Tableau de Bord" : "Return to Dashboard"}
              </Link>
              <Link
                href={`/chat?partnerId=${partnerId}&partnerName=${encodeURIComponent(partnerName)}`}
                onClick={() => playSound('click')}
                className="w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                {isFr ? "Envoyer un message de débriefing" : "Send debrief message"}
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* CALL DECLINED MODAL */}
      {callDeclined && !callEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
          <div className="saas-card max-w-md w-full p-8 text-center space-y-6 bg-white dark:bg-[#0a1124] border-rose-500/40 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400 shadow-lg">
              <PhoneOff className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {isFr ? "Partenaire Indisponible" : "Partner Unavailable"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {isFr 
                  ? `${partnerName} n'a pas pu décrocher ou a refusé l'appel pour le moment.` 
                  : `${partnerName} was unable to answer or declined the call.`}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/partners"
                onClick={() => playSound('click')}
                className="w-full py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 text-sm shadow-md"
              >
                {isFr ? "Trouver un autre partenaire" : "Find another partner"}
              </Link>
              <Link
                href={`/chat?partnerId=${partnerId}&partnerName=${encodeURIComponent(partnerName)}`}
                onClick={() => playSound('click')}
                className="w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                {isFr ? "Envoyer un message à la place" : "Send a message instead"}
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CallPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallContent />
    </React.Suspense>
  );
}
