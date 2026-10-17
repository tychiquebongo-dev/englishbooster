'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Radio,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { 
  RTC_CONFIG, 
  getLocalUserMedia, 
  stopLocalMediaStream, 
  toggleAudioTrack, 
  toggleVideoTrack 
} from '@/lib/webrtcCall';
import { getUserAvatar } from '@/lib/avatarHelper';
import { 
  broadcastIncomingCall, 
  broadcastCallEnded, 
  broadcastCallDeclined,
  recordMissedCall 
} from '@/lib/callSignaling';

const DISCUSSION_PROMPTS = [
  "What is your dream travel destination and what would you do there first?",
  "How has artificial intelligence impacted your daily life or your career so far?",
  "If you had the chance to live in any country for 1 year, where would you choose?",
  "What is the most useful piece of advice someone has ever given you?",
  "Do you prefer living in a bustling metropolitan city or a peaceful countryside, and why?",
  "What is an interesting tradition or cultural celebration from your native country?",
  "What was the most challenging project you have ever worked on, and how did you overcome it?"
];

type CallStatus = 'calling' | 'connecting' | 'connected' | 'declined' | 'ended';

function CallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isFr } = useTranslation();
  const partnerId = searchParams?.get('partnerId');
  const partnerName = searchParams?.get('partnerName') || (isFr ? 'Partenaire Inscrit' : 'Registered Partner');
  const isVideoParam = searchParams?.get('video') !== 'false';
  const isAutoAnswer = searchParams?.get('autoAnswer') === 'true';
  const isCaller = !isAutoAnswer;

  const { user, profile, playSound, refreshProfile } = useAuth();
  const supabase = createClient();

  // Deterministic or explicit roomId
  const roomId = searchParams?.get('roomId') || (user?.id && partnerId ? `room_${[user.id, partnerId].sort().join('_')}` : `room_${Date.now()}`);

  const [partnerProfile, setPartnerProfile] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    flag: string | null;
    current_level: string | null;
    country: string | null;
  } | null>(null);

  // Call connection state machine
  const [callStatus, setCallStatus] = useState<CallStatus>(isCaller ? 'calling' : 'connecting');
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

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const userChannelRef = useRef<any>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasOfferedRef = useRef<boolean>(false);

  // Stop all media tracks helper
  const stopAllMedia = useCallback(() => {
    if (streamRef.current) {
      stopLocalMediaStream(streamRef.current);
      streamRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
  }, []);

  // Handle remote partner hanging up or disconnecting
  const handleRemoteHangup = useCallback(() => {
    playSound('chime');
    setRemoteEndedNotice(isFr ? 'Votre interlocuteur a raccroché ou a mis fin à l\'appel.' : 'Your partner has ended the call.');
    stopAllMedia();
    setCallStatus('ended');
    setCallEnded(true);
  }, [isFr, playSound, stopAllMedia]);

  // 1. Fetch partner profile from database
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

  // 2. Dial tone sound loop for caller while waiting for partner to answer
  useEffect(() => {
    if (callStatus !== 'calling') return;

    // Caller hears dial tone while ringing
    playSound('call');
    const ringInterval = setInterval(() => {
      playSound('call');
    }, 2800);

    return () => clearInterval(ringInterval);
  }, [callStatus, playSound]);

  // 2b. Auto-timeout after 30s ringing if partner does not answer (e.g. offline partner)
  useEffect(() => {
    if (callStatus !== 'calling' || !isCaller) return;

    const ringTimeout = setTimeout(async () => {
      if (callStatus === 'calling') {
        if (partnerId && user?.id) {
          try {
            await recordMissedCall({
              callerId: user.id,
              callerName: profile?.full_name || 'English Learner',
              callerAvatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
              receiverId: partnerId,
              isVideo: isVideoParam,
              roomId,
            });
          } catch (e) {
            console.warn('Error recording missed call timeout:', e);
          }
        }
        stopAllMedia();
        setCallStatus('ended');
        setRemoteEndedNotice(
          isFr 
            ? "Aucune réponse. Le partenaire est peut-être hors ligne. Une notification d'appel manqué lui a été transmise." 
            : "No response. Partner might be offline. A missed call notification was sent."
        );
        setCallEnded(true);
      }
    }, 28000);

    return () => clearTimeout(ringTimeout);
  }, [callStatus, isCaller, partnerId, user?.id, profile, isVideoParam, roomId, isFr, stopAllMedia]);

  // 3. Call duration timer: strictly only ticks when call is connected
  useEffect(() => {
    if (callStatus !== 'connected') return;

    // Call has successfully connected: chime once!
    playSound('chime');

    const timer = setInterval(() => {
      setDurationSeconds(s => s + 1);
    }, 1000);

    // Rotate discussion prompt suggestions every 45s during active call
    const promptInterval = setInterval(() => {
      setCurrentPromptIndex(idx => (idx + 1) % DISCUSSION_PROMPTS.length);
    }, 45000);

    return () => {
      clearInterval(timer);
      clearInterval(promptInterval);
    };
  }, [callStatus, playSound]);

  // 4. Initialize Local Media and WebRTC Peer Connection
  useEffect(() => {
    if (!user?.id || !roomId) return;

    let isMounted = true;
    hasOfferedRef.current = false;
    pendingCandidatesRef.current = [];

    const initializeCall = async () => {
      // A. Acquire local camera & microphone stream
      let localStream: MediaStream | null = null;
      try {
        localStream = await getLocalUserMedia(isVideoParam);
        if (!isMounted) return;
        streamRef.current = localStream;

        if (localVideoRef.current && localStream && isVideoParam) {
          localVideoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.warn('Camera/mic access blocked or error:', err);
        setPermissionError(true);
      }

      // B. Create RTCPeerConnection with STUN servers
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add local stream tracks to PeerConnection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream!);
        });
      }

      // Listen for remote tracks
      pc.ontrack = (event) => {
        console.log('WebRTC ontrack received remote media:', event.track.kind);
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }

        setHasRemoteStream(true);
        setCallStatus('connected');

        // Automatically disconnect if remote track ends
        event.track.onended = () => {
          console.log('Remote media track ended by partner');
          handleRemoteHangup();
        };
      };

      // Listen for local ICE candidates to transmit to partner
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: {
              type: 'ice_candidate',
              candidate: event.candidate.toJSON(),
              from: user.id,
            },
          });
        }
      };

      // Realtime peer connection state listener
      pc.onconnectionstatechange = () => {
        console.log('RTCPeerConnection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setHasRemoteStream(true);
          setCallStatus('connected');
        } else if (
          pc.connectionState === 'disconnected' || 
          pc.connectionState === 'failed' || 
          pc.connectionState === 'closed'
        ) {
          handleRemoteHangup();
        }
      };

      // ICE connection state listener
      pc.oniceconnectionstatechange = () => {
        console.log('RTCPeerConnection ICE state:', pc.iceConnectionState);
        if (
          pc.iceConnectionState === 'disconnected' || 
          pc.iceConnectionState === 'failed' || 
          pc.iceConnectionState === 'closed'
        ) {
          handleRemoteHangup();
        }
      };

      // C. WebRTC Signaling Dispatcher
      const handleWebRTCSignal = async (payload: any) => {
        if (!payload || payload.from === user.id) return;
        const currentPC = pcRef.current;
        if (!currentPC) return;

        switch (payload.type) {
          case 'hangup':
          case 'call_ended':
            console.log('Received hangup signal via WebRTC signaling');
            handleRemoteHangup();
            break;

          case 'partner_ready':
            // Partner is in room and ready for handshake.
            // If we are Caller, initiate the SDP Offer!
            if (isCaller && !hasOfferedRef.current) {
              try {
                hasOfferedRef.current = true;
                const offer = await currentPC.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: isVideoParam,
                });
                await currentPC.setLocalDescription(offer);
                channelRef.current?.send({
                  type: 'broadcast',
                  event: 'webrtc_signal',
                  payload: {
                    type: 'offer',
                    sdp: offer,
                    from: user.id,
                  },
                });
              } catch (e) {
                console.error('Error creating SDP Offer:', e);
                hasOfferedRef.current = false;
              }
            }
            break;

          case 'offer':
            // Receiver gets Offer from Caller
            try {
              await currentPC.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              
              // Drain any queued ICE candidates that arrived early
              for (const cand of pendingCandidatesRef.current) {
                try {
                  await currentPC.addIceCandidate(new RTCIceCandidate(cand));
                } catch (ce) {
                  console.warn('Error draining candidate:', ce);
                }
              }
              pendingCandidatesRef.current = [];

              const answer = await currentPC.createAnswer();
              await currentPC.setLocalDescription(answer);
              channelRef.current?.send({
                type: 'broadcast',
                event: 'webrtc_signal',
                payload: {
                  type: 'answer',
                  sdp: answer,
                  from: user.id,
                },
              });
            } catch (e) {
              console.error('Error handling SDP Offer:', e);
            }
            break;

          case 'answer':
            // Caller receives Answer from Receiver
            try {
              await currentPC.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              
              // Drain any queued ICE candidates
              for (const cand of pendingCandidatesRef.current) {
                try {
                  await currentPC.addIceCandidate(new RTCIceCandidate(cand));
                } catch (ce) {
                  console.warn('Error draining candidate:', ce);
                }
              }
              pendingCandidatesRef.current = [];
            } catch (e) {
              console.error('Error handling SDP Answer:', e);
            }
            break;

          case 'ice_candidate':
            if (payload.candidate) {
              if (currentPC.remoteDescription && currentPC.remoteDescription.type) {
                try {
                  await currentPC.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (e) {
                  console.warn('Error adding ICE candidate:', e);
                }
              } else {
                // Queue until remote description is set
                pendingCandidatesRef.current.push(payload.candidate);
              }
            }
            break;
        }
      };

      // D. Subscribe to Supabase Realtime Room Channel
      const roomChannel = supabase.channel(`call-room-${roomId}`);
      channelRef.current = roomChannel;

      roomChannel
        .on('broadcast', { event: 'webrtc_signal' }, ({ payload }: any) => {
          handleWebRTCSignal(payload);
        })
        .on('broadcast', { event: 'call_ended' }, () => {
          console.log('Room broadcast call_ended received');
          handleRemoteHangup();
        })
        .on('broadcast', { event: 'call_declined' }, () => {
          playSound('chime');
          stopAllMedia();
          setCallStatus('declined');
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // If caller, send push/in-app alert to partner's notification channel
            if (isCaller && partnerId) {
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

            // Broadcast that we are ready in the room
            roomChannel.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'partner_ready', from: user.id },
            });
          }
        });

      // E. Subscribe to user's personal notifications channel as instant redundancy
      const userChannel = supabase.channel(`user-notifications-${user.id}`);
      userChannelRef.current = userChannel;

      userChannel
        .on('broadcast', { event: 'call_ended' }, () => {
          console.log('User personal notification call_ended received');
          handleRemoteHangup();
        })
        .on('broadcast', { event: 'webrtc_signal' }, ({ payload }: any) => {
          if (payload?.type === 'hangup') {
            console.log('User personal notification hangup signal received');
            handleRemoteHangup();
          }
        })
        .on('broadcast', { event: 'call_declined' }, () => {
          playSound('chime');
          stopAllMedia();
          setCallStatus('declined');
        })
        .subscribe();
    };

    initializeCall();

    // Heartbeat ping every 2s until connected so late-joining partner receives partner_ready
    const readyInterval = setInterval(() => {
      if (channelRef.current && pcRef.current && pcRef.current.connectionState !== 'connected') {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { type: 'partner_ready', from: user.id },
        });
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(readyInterval);

      // Notify partner immediately if user leaves call room
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'call_ended',
            payload: { roomId, senderId: user?.id },
          });
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: { type: 'hangup', from: user?.id, roomId },
          });
        } catch {}
      }
      if (roomId && partnerId && user?.id) {
        broadcastCallEnded(roomId, partnerId, user.id);
      }

      stopAllMedia();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current);
      }
    };
  }, [user?.id, roomId, isCaller, partnerId, isVideoParam, profile, isFr, playSound, stopAllMedia, handleRemoteHangup, supabase]);

  // Window beforeunload listener so tab close immediately terminates call on partner device
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'call_ended',
            payload: { roomId, senderId: user?.id },
          });
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: { type: 'hangup', from: user?.id, roomId },
          });
        } catch {}
      }
      if (roomId && partnerId && user?.id) {
        broadcastCallEnded(roomId, partnerId, user.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId, partnerId, user?.id]);

  // Toggle Microphone
  const toggleMic = () => {
    if (streamRef.current) {
      const active = toggleAudioTrack(streamRef.current);
      setMicActive(active);
      playSound('click');
    } else {
      setMicActive(!micActive);
      playSound('click');
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (streamRef.current) {
      const active = toggleVideoTrack(streamRef.current);
      setVideoActive(active);
      playSound('click');
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
        const screenTrack = screenStream.getVideoTracks()[0];

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        const videoSender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender && screenTrack) {
          videoSender.replaceTrack(screenTrack);
        }

        setIsScreenSharing(true);
        playSound('click');

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          const originalVideoTrack = streamRef.current?.getVideoTracks()[0];
          if (videoSender && originalVideoTrack) {
            videoSender.replaceTrack(originalVideoTrack);
          }
          if (localVideoRef.current && streamRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
          }
        };
      } else {
        setIsScreenSharing(false);
        const originalVideoTrack = streamRef.current?.getVideoTracks()[0];
        const videoSender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender && originalVideoTrack) {
          videoSender.replaceTrack(originalVideoTrack);
        }
        if (localVideoRef.current && streamRef.current) {
          localVideoRef.current.srcObject = streamRef.current;
        }
        playSound('click');
      }
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
    }
  };

  // End Call explicitly
  const handleEndCall = async () => {
    playSound('click');
    setSavingCall(true);
    const wasConnected = callStatus === 'connected' && durationSeconds > 0;

    // 1. Send immediate hangup & call_ended over open room WebSocket channel
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: { roomId, senderId: user?.id },
        });
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { type: 'hangup', from: user?.id, roomId },
        });
      } catch (e) {
        console.warn('Error sending immediate call_ended:', e);
      }
    }

    // 2. Broadcast to partner's personal notifications channel as backup
    if (roomId) {
      broadcastCallEnded(roomId, partnerId || undefined, user?.id);
    }

    // 3. If caller hangs up before partner answers or while partner was offline/unavailable -> record missed call!
    if (!wasConnected && isCaller && partnerId && user?.id) {
      try {
        await recordMissedCall({
          callerId: user.id,
          callerName: profile?.full_name || 'English Learner',
          callerAvatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
          receiverId: partnerId,
          isVideo: isVideoParam,
          roomId,
        });
      } catch (err) {
        console.warn('Error recording missed call:', err);
      }
    }

    // 4. Stop all local tracks and close WebRTC peer connection
    stopAllMedia();
    setCallStatus('ended');

    // Persist call session in Supabase database
    if (user?.id) {
      try {
        if (wasConnected) {
          const minsSpoken = Math.max(1, Math.round(durationSeconds / 60));
          await supabase.from('calls').insert({
            caller_id: user.id,
            room_id: roomId,
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

          try {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#4ade80', '#60a5fa', '#f59e0b'],
            });
          } catch {}

          playSound('success');
        } else {
          // Missed / Unanswered call
          await supabase.from('calls').insert({
            caller_id: user.id,
            room_id: roomId,
            receiver_id: partnerId || null,
            receiver_name: partnerProfile?.full_name || partnerName || (isFr ? 'Partenaire de conversation' : 'Conversation partner'),
            receiver_avatar: partnerProfile?.avatar_url || null,
            duration_seconds: 0,
            fluency_score: 0,
            xp_earned: 0,
            status: 'missed',
            topic: isVideoParam ? 'Missed Video Call' : 'Missed Voice Call',
          });
        }
      } catch (err) {
        console.error('Error saving call record:', err);
      }
    }

    setSavingCall(false);
    setCallEnded(true);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div data-fullscreen-route="true" className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-6 h-[calc(100dvh-4.5rem)] md:h-[calc(100dvh-5.5rem)] flex flex-col justify-between space-y-2 sm:space-y-3">
      
      {/* Hidden audio element dedicated to remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Floating Header Control Bar */}
      <div className="saas-card bg-white dark:bg-[#060a14] border-slate-200 dark:border-white/10 shadow-sm p-2.5 sm:p-4 flex items-center justify-between z-20">
        
        <div className="flex items-center gap-2 sm:gap-3">
          {callStatus === 'connected' ? (
            <>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                {formatTimer(durationSeconds)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline">
                • {isFr ? 'Session Live avec' : 'Live Session with'} <strong className="text-slate-900 dark:text-white">{partnerName}</strong>
              </span>
            </>
          ) : callStatus === 'calling' ? (
            <>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 animate-ping" />
              <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-500 dark:text-amber-400">
                00:00
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                • {isFr ? `Sonnerie chez ${partnerName}...` : `Calling ${partnerName}...`}
              </span>
            </>
          ) : callStatus === 'connecting' ? (
            <>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-teal-400 animate-pulse" />
              <span className="font-mono text-xs sm:text-sm font-extrabold text-teal-400">
                00:00
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                • {isFr ? `Connexion avec ${partnerName}...` : `Connecting with ${partnerName}...`}
              </span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500" />
              <span className="font-mono text-xs sm:text-sm font-extrabold text-rose-500">
                {formatTimer(durationSeconds)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                • {isFr ? 'Appel terminé' : 'Call ended'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFr ? 'Sujets Guidés' : 'Guided Topics'}</span>
          </span>
        </div>
      </div>

      {/* Main Video Stage with Mobile Picture-in-Picture (PiP) */}
      <div className="flex-1 relative md:grid md:grid-cols-2 gap-3 sm:gap-4 my-1 sm:my-3 min-h-0 overflow-hidden rounded-2xl sm:rounded-3xl">
        
        {/* Remote Partner Screen (Full screen on mobile, 1st col on desktop) */}
        <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b1329] via-[#070d1d] to-[#040814] border border-white/10 flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl">
          
          {/* Live Video Stream from Partner */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${hasRemoteStream ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}
          />

          {/* Fallback & Waiting Avatar Interface */}
          <div className="relative z-0 flex flex-col items-center text-center">
            {partnerProfile?.avatar_url ? (
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
            ) : (
              <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 border-2 border-emerald-400/40 flex items-center justify-center text-2xl sm:text-4xl font-black text-emerald-300 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                {partnerName ? partnerName.charAt(0).toUpperCase() : 'P'}
              </div>
            )}

            <p className="mt-3 sm:mt-4 text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>{partnerName}</span>
              <span>{partnerProfile?.flag || '🌐'}</span>
            </p>

            {/* Contextual Status Badge */}
            <div className="text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 mt-2">
              {callStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-bold">{isFr ? '🟢 En direct • Connecté' : '🟢 Live • Connected'}</span>
                </>
              ) : callStatus === 'declined' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-400 font-bold">{isFr ? 'Appel refusé / Indisponible' : 'Call declined / Unavailable'}</span>
                </>
              ) : callStatus === 'calling' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-300 font-medium">
                    {isFr ? 'Sonnerie chez le partenaire (signal & alerte Push envoyés)...' : 'Ringing partner (signal & Push alert sent)...'}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-teal-300 font-medium">
                    {isFr ? 'Connexion au flux vidéo/audio...' : 'Connecting live stream...'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-20 flex items-center gap-2">
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-black/70 border border-white/20 text-white font-bold text-[11px] sm:text-xs backdrop-blur-md">
              {partnerName} {partnerProfile?.current_level ? `(${partnerProfile.current_level})` : ''}
            </span>
            {callStatus === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Local User Screen (Mobile Floating PiP / Desktop 2nd column) */}
        <div className="absolute top-3 right-3 w-24 h-32 xs:w-28 xs:h-38 sm:w-36 sm:h-48 md:relative md:top-auto md:right-auto md:w-full md:h-full z-20 rounded-xl sm:rounded-3xl overflow-hidden bg-slate-900 border-2 border-emerald-400/50 md:border md:border-white/10 shadow-2xl flex items-center justify-center transition-all">
          {permissionError || !videoActive ? (
            <div className="flex flex-col items-center gap-1 sm:gap-3 text-center p-2 sm:p-6">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-12 h-12 xs:w-14 xs:h-14 sm:w-24 sm:h-24 rounded-full object-cover ring-2 ring-emerald-400/50 shadow-lg"
                />
              ) : (
                <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-sm xs:text-base sm:text-2xl font-black text-emerald-300 shadow-lg">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <p className="font-bold text-white text-[10px] sm:text-sm truncate max-w-[80px] xs:max-w-none">{profile?.full_name || (isFr ? 'Vous' : 'You')}</p>
              <p className="text-[9px] sm:text-xs text-slate-400 hidden xs:block">{isFr ? 'Caméra off' : 'Camera off'}</p>
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

          <div className="absolute bottom-1.5 left-1.5 sm:bottom-4 sm:left-4 z-10">
            <span className="px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-white font-bold text-[9px] sm:text-xs backdrop-blur-md">
              {isFr ? 'Vous' : 'You'}
            </span>
          </div>
        </div>

        {/* Floating AI Coach Discussion Prompt Overlay */}
        <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-11/12 max-w-xl z-20 pointer-events-auto">
          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#060a14]/95 border border-emerald-400/40 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-start gap-2 sm:gap-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
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
          className={`p-2.5 xs:p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
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
          className={`p-2.5 xs:p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
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
          className={`p-2.5 xs:p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
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
          className="px-3.5 xs:px-4 sm:px-6 py-2.5 xs:py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center gap-1.5 sm:gap-2 shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm font-bold">{isFr ? "Terminer" : "End call"}</span>
        </button>

      </div>

      {/* POST-CALL SUMMARY MODAL */}
      {callEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="saas-card max-w-md w-full p-8 text-center space-y-6 bg-white dark:bg-[#0a1124] border-slate-200 dark:border-emerald-400/40 shadow-2xl">
            
            {durationSeconds > 0 ? (
              <>
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
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400 shadow-lg">
                  <PhoneOff className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {isFr ? "Appel non abouti / Manqué" : "Missed Call / Unanswered"}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {isFr 
                      ? `L'appel avec ${partnerName} n'a pas été décroché. Un avis d'appel manqué a été notifié dans votre chat.` 
                      : `The call with ${partnerName} was not answered. A missed call notification was recorded in your chat.`}
                  </p>
                </div>
              </>
            )}

            {remoteEndedNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
                <span>⚡</span>
                <span>{remoteEndedNotice}</span>
              </div>
            )}

            {durationSeconds > 0 && (
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
            )}

            <div className="flex flex-col gap-3">
              {durationSeconds === 0 && partnerId && (
                <button
                  type="button"
                  onClick={() => {
                    setCallEnded(false);
                    setCallStatus('calling');
                    setDurationSeconds(0);
                    router.push(`/call?partnerId=${partnerId}&partnerName=${encodeURIComponent(partnerName)}&video=${isVideoParam}&roomId=${roomId}_retry`);
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>{isFr ? "Rappeler maintenant" : "Call back now"}</span>
                </button>
              )}
              <Link
                href={`/chat?partnerId=${partnerId}&partnerName=${encodeURIComponent(partnerName)}`}
                onClick={() => playSound('click')}
                className="w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                {isFr ? "Ouvrir le chat avec le partenaire" : "Open chat with partner"}
              </Link>
              <Link
                href="/dashboard"
                onClick={() => playSound('click')}
                className="w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                {isFr ? "Retour au Tableau de Bord" : "Return to Dashboard"}
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* CALL DECLINED MODAL */}
      {callStatus === 'declined' && !callEnded && (
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
