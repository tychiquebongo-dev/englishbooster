'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import type { Database } from '@/lib/database.types';
import { 
  Users, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Hand, 
  LogOut, 
  Flame, 
  Sparkles, 
  MessageSquare, 
  Send, 
  Volume2, 
  ShieldCheck, 
  Radio, 
  Crown,
  Share2,
  ChevronRight,
  AlertCircle,
  Trash2,
  Square,
  Headphones
} from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface LiveSeat {
  seatNumber: number;
  user: Profile | null;
  isHost: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
}

interface LiveChatMessage {
  id: string;
  sender_name: string;
  sender_avatar: string;
  text: string;
  timestamp: string;
  audio_url?: string | null;
}

const ENGLISH_TOPICS = [
  {
    id: 1,
    title: "Artificial Intelligence vs Human Creativity",
    question: "Can AI genuinely replace human emotion and critical thinking, or is it just a tool? Speak exclusively in English!",
    level: "B2-C1"
  },
  {
    id: 2,
    title: "Remote Work & Global Living",
    question: "Would you rather work 100% remotely for a foreign company or work locally in your home city? Share your experience!",
    level: "B1-B2"
  },
  {
    id: 3,
    title: "Overcoming Language Anxiety",
    question: "What is your biggest fear when speaking English with native speakers, and how do you overcome it?",
    level: "A2-B2"
  },
  {
    id: 4,
    title: "The Future of EdTech & Language Learning",
    question: "How will immersive virtual roundtables like this change education across developing nations?",
    level: "B2-C2"
  }
];

export default function LiveRoomPage() {
  const router = useRouter();
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  // Maximum 6 participants rule
  const MAX_PARTICIPANTS = 6;

  const [seats, setSeats] = useState<LiveSeat[]>([]);
  const [topicIndex, setTopicIndex] = useState(0);
  const [mySeatNumber, setMySeatNumber] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const [isDictatingLive, setIsDictatingLive] = useState(false);
  const [isRecordingLiveVoice, setIsRecordingLiveVoice] = useState(false);
  const [liveRecordingSec, setLiveRecordingSec] = useState(0);
  const [speakingLiveMsgId, setSpeakingLiveMsgId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const liveMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveAudioChunksRef = useRef<Blob[]>([]);
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const liveRecognitionRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // Initialize 6 seats and synchronize real presence from Supabase
  useEffect(() => {
    const initialSeats: LiveSeat[] = [];

    for (let i = 1; i <= MAX_PARTICIPANTS; i++) {
      initialSeats.push({
        seatNumber: i,
        user: null,
        isHost: i === 1,
        isMuted: false,
        isVideoOn: true,
        isSpeaking: false,
        handRaised: false,
      });
    }

    setSeats(initialSeats);

    // Real Supabase Presence Channel for the Live Roundtable
    const channel = supabase.channel('room_live_main', {
      config: { presence: { key: user?.id || `viewer_${Date.now()}` } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const seatedPresences: any[] = [];
        let totalCount = 0;

        for (const key in state) {
          const presences = state[key] as any[];
          totalCount += presences.length;
          for (const p of presences) {
            if (p.seatNumber && p.user) {
              seatedPresences.push(p);
            }
          }
        }

        setSpectatorCount(Math.max(1, totalCount));

        // Reconstruct live seats purely from genuine connected participants
        setSeats(() => {
          const updated = initialSeats.map(s => ({ ...s }));
          for (const s of seatedPresences) {
            const idx = s.seatNumber - 1;
            if (idx >= 0 && idx < MAX_PARTICIPANTS) {
              updated[idx] = {
                seatNumber: s.seatNumber,
                user: s.user,
                isHost: s.seatNumber === 1,
                isMuted: s.isMuted ?? false,
                isVideoOn: s.isVideoOn ?? true,
                isSpeaking: s.isSpeaking ?? false,
                handRaised: s.handRaised ?? false,
              };
            }
          }
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            isSpectator: true,
            user_id: user?.id || null,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  // Handle local camera toggle
  useEffect(() => {
    if (mySeatNumber && isVideoOn) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Camera permission denied or not available; fallback to stylish avatar
        });
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [mySeatNumber, isVideoOn]);



  // Total seated participants count
  const occupiedSeatsCount = seats.filter(s => s.user !== null).length;
  const isRoomFull = occupiedSeatsCount >= MAX_PARTICIPANTS;

  // Join a seat (capped at 6)
  const handleJoinSeat = (targetSeatNumber?: number) => {
    if (!user || !profile) {
      playSound('click');
      router.push('/login');
      return;
    }

    if (isRoomFull && mySeatNumber === null) {
      playSound('click');
      alert(isFr ? "La salle a atteint son maximum de 6 personnes ! Vous êtes en mode écoute." : "Room is full (max 6 participants)! You are in listening mode.");
      return;
    }

    playSound('call');

    // Find requested or first open seat
    const emptyIndex = targetSeatNumber 
      ? targetSeatNumber - 1 
      : seats.findIndex(s => s.user === null);

    if (emptyIndex === -1) return;

    const newSeatNum = emptyIndex + 1;

    setSeats(prev => {
      const updated = [...prev];
      updated[emptyIndex] = {
        seatNumber: newSeatNum,
        user: profile,
        isHost: newSeatNum === 1,
        isMuted: false,
        isVideoOn: true,
        isSpeaking: true,
        handRaised: false,
      };
      return updated;
    });

    if (channelRef.current && profile) {
      channelRef.current.track({
        seatNumber: newSeatNum,
        user: profile,
        isHost: newSeatNum === 1,
        isMuted: false,
        isVideoOn: true,
        isSpeaking: true,
        handRaised: false,
      });
    }

    setMySeatNumber(newSeatNum);
    playSound('success');
  };

  // Leave seat to spectator mode
  const handleLeaveSeat = () => {
    if (mySeatNumber === null) return;
    playSound('click');

    setSeats(prev => {
      const updated = [...prev];
      const index = mySeatNumber - 1;
      if (updated[index]) {
        updated[index] = {
          seatNumber: mySeatNumber,
          user: null,
          isHost: false,
          isMuted: true,
          isVideoOn: false,
          isSpeaking: false,
          handRaised: false,
        };
      }
      return updated;
    });

    if (channelRef.current) {
      channelRef.current.track({
        isSpectator: true,
        user_id: user?.id || null,
      });
    }

    setMySeatNumber(null);
  };

  // Toggle my mic
  const toggleMute = () => {
    playSound('click');
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (mySeatNumber) {
      setSeats(prev => {
        const updated = [...prev];
        const idx = mySeatNumber - 1;
        if (updated[idx]) {
          updated[idx].isMuted = newMuted;
          if (newMuted) updated[idx].isSpeaking = false;
        }
        return updated;
      });
    }
  };

  // Toggle my video
  const toggleVideo = () => {
    playSound('click');
    const newVideo = !isVideoOn;
    setIsVideoOn(newVideo);
    if (mySeatNumber) {
      setSeats(prev => {
        const updated = [...prev];
        const idx = mySeatNumber - 1;
        if (updated[idx]) {
          updated[idx].isVideoOn = newVideo;
        }
        return updated;
      });
    }
  };

  // Raise Hand
  const toggleHand = () => {
    playSound('click');
    const newHand = !handRaised;
    setHandRaised(newHand);
    if (mySeatNumber) {
      setSeats(prev => {
        const updated = [...prev];
        const idx = mySeatNumber - 1;
        if (updated[idx]) {
          updated[idx].handRaised = newHand;
        }
        return updated;
      });
    }
  };

  // Send Live Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    playSound('click');
    const newMsg: LiveChatMessage = {
      id: `chat-${Date.now()}`,
      sender_name: profile?.full_name || 'Participant',
      sender_avatar: profile?.avatar_url || '',
      text: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, newMsg]);
    setInputMessage('');
  };

  // Live Voice Note Recording
  const startLiveRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      liveMediaRecorderRef.current = recorder;
      liveAudioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) liveAudioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(liveAudioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        playSound('chime');

        const voiceMsg: LiveChatMessage = {
          id: `voice-${Date.now()}`,
          sender_name: profile?.full_name || 'Participant',
          sender_avatar: profile?.avatar_url || '',
          text: `🎙️ ${isFr ? 'Note vocale' : 'Voice message'} (${liveRecordingSec}s)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          audio_url: audioUrl,
        };

        setChatMessages(prev => [...prev, voiceMsg]);
        setIsRecordingLiveVoice(false);
        setLiveRecordingSec(0);
        if (liveTimerRef.current) clearInterval(liveTimerRef.current);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecordingLiveVoice(true);
      setLiveRecordingSec(0);
      playSound('click');

      liveTimerRef.current = setInterval(() => {
        setLiveRecordingSec(s => s + 1);
      }, 1000);
    } catch {
      alert(isFr ? "Accès micro requis pour enregistrer une note vocale." : "Microphone access required to record voice notes.");
    }
  };

  const stopLiveRecording = () => {
    if (liveMediaRecorderRef.current && isRecordingLiveVoice) {
      liveMediaRecorderRef.current.stop();
    }
  };

  // Speech-to-Text Dictation in Live Chat
  const toggleLiveDictation = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert(isFr ? "La dictée vocale n'est pas supportée par ce navigateur." : "Speech dictation is not supported in this browser.");
      return;
    }

    if (isDictatingLive && liveRecognitionRef.current) {
      liveRecognitionRef.current.stop();
      setIsDictatingLive(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsDictatingLive(true);
        playSound('click');
      };

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInputMessage(prev => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
          playSound('chime');
        }
      };

      recognition.onerror = () => setIsDictatingLive(false);
      recognition.onend = () => setIsDictatingLive(false);

      recognition.start();
      liveRecognitionRef.current = recognition;
    } catch {
      setIsDictatingLive(false);
    }
  };

  // Text-to-Speech Pronunciation in Live Chat
  const speakLiveText = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingLiveMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingLiveMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingLiveMsgId(msgId);
    playSound('click');

    const cleanText = text.replace(/^[^\w]+/, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;

    utterance.onend = () => setSpeakingLiveMsgId(null);
    utterance.onerror = () => setSpeakingLiveMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Send Floating Emoji Reaction
  const handleSendReaction = (emoji: string) => {
    playSound('click');
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingReactions(prev => [...prev, { id, emoji, left }]);

    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const currentTopic = ENGLISH_TOPICS[topicIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.4)]">
            <Radio className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {isFr ? 'Live Direct — Table Ronde Internationale' : 'Live Direct — International Roundtable'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-300">
                Max 6
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {isFr 
                ? 'Discussion vocale en direct limitée à 6 personnes maximum. Pratique de l\'anglais exclusive !'
                : 'Direct live roundtable capped at 6 participants maximum. Strictly English immersion!'}
            </p>
          </div>
        </div>

        {/* Capacity Indicator & Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>{occupiedSeatsCount} / {MAX_PARTICIPANTS}</strong> <span className="hidden xs:inline">{isFr ? 'sièges' : 'seats'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-700 dark:text-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>{spectatorCount} <span className="hidden xs:inline">{isFr ? 'auditeurs' : 'spectators'}</span></span>
          </div>

          {/* Join / Leave Seat Action */}
          {mySeatNumber ? (
            <button
              onClick={handleLeaveSeat}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{isFr ? 'Quitter' : 'Leave'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleJoinSeat()}
              disabled={isRoomFull}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isRoomFull
                  ? 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-[0_0_20px_rgba(74,222,128,0.35)] hover:scale-105 active:scale-95'
              }`}
            >
              <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>
                {isRoomFull
                  ? (isFr ? 'Complet (6/6)' : 'Full (6/6)')
                  : (isFr ? '🎙️ Rejoindre' : '🎙️ Join Live')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* English Discussion Topic Banner */}
      <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-[#0d1629] dark:via-[#091122] dark:to-[#12233c] border border-slate-200 dark:border-emerald-500/30 shadow-md dark:shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                🇬🇧 English Only Topic
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                Level {currentTopic.level}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {currentTopic.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic">
              « {currentTopic.question} »
            </p>
          </div>

          <button
            onClick={() => {
              playSound('click');
              setTopicIndex((topicIndex + 1) % ENGLISH_TOPICS.length);
            }}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition-colors shrink-0"
          >
            <span>{isFr ? 'Sujet Suivant' : 'Next Topic'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: 6 Seats Layout + Live Chat Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): 6 Seats Video Grid */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* 6 Seats Responsive Grid (2 cols on mobile, 3 cols on tablet & desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5">
            {seats.map((seat) => {
              const isMe = mySeatNumber === seat.seatNumber;
              const hasUser = seat.user !== null;

              return (
                <div
                  key={seat.seatNumber}
                  className={`relative aspect-[4/3] rounded-2xl overflow-hidden border transition-all duration-300 ${
                    hasUser
                      ? seat.isSpeaking
                        ? 'border-emerald-400 shadow-[0_0_25px_rgba(74,222,128,0.25)] ring-2 ring-emerald-400/40 bg-slate-950'
                        : 'border-white/15 bg-slate-950/80'
                      : 'border-dashed border-white/20 bg-white/[0.02] hover:border-emerald-400/40'
                  }`}
                >
                  {hasUser ? (
                    <>
                      {/* Video Stream or Avatar Tile */}
                      {isMe && isVideoOn ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-b from-[#0b1329] to-[#040814]">
                          <div className="relative">
                            {seat.user?.avatar_url ? (
                              <img
                                src={seat.user.avatar_url}
                                alt={seat.user?.full_name || 'Participant'}
                                className={`w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover shadow-xl transition-all ${
                                  seat.isSpeaking 
                                    ? 'ring-4 ring-emerald-400 scale-105' 
                                    : 'ring-2 ring-white/20'
                                }`}
                              />
                            ) : (
                              <div
                                className={`w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 border-2 border-emerald-400/40 flex items-center justify-center text-lg sm:text-2xl font-black text-emerald-300 shadow-xl transition-all ${
                                  seat.isSpeaking 
                                    ? 'ring-4 ring-emerald-400 scale-105' 
                                    : 'ring-2 ring-white/20'
                                }`}
                              >
                                {seat.user?.full_name ? seat.user.full_name.charAt(0).toUpperCase() : 'M'}
                              </div>
                            )}
                            {seat.isSpeaking && (
                              <div className="absolute -bottom-2 inset-x-0 flex items-center justify-center gap-0.5">
                                <span className="w-1 h-2.5 sm:w-1.5 sm:h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                <span className="w-1 h-3.5 sm:w-1.5 sm:h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-1 h-2.5 sm:w-1.5 sm:h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-1.5 inset-x-1.5 sm:top-2.5 sm:inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          {seat.isHost && (
                            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1 backdrop-blur-md">
                              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                              <span className="hidden xs:inline">Host</span>
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-black/60 text-emerald-400 border border-white/10 backdrop-blur-md">
                            S{seat.seatNumber}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {seat.handRaised && (
                            <span className="p-0.5 sm:p-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] sm:text-xs animate-bounce shadow-md">
                              ✋
                            </span>
                          )}
                          <div className={`p-1 sm:p-1.5 rounded-full backdrop-blur-md border ${
                            seat.isMuted 
                              ? 'bg-rose-500/30 border-rose-500/40 text-rose-300' 
                              : 'bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
                          }`}>
                            {seat.isMuted ? <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Mic className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Info Bar */}
                      <div className="absolute bottom-1.5 inset-x-1.5 sm:bottom-2.5 sm:inset-x-2.5 z-10 flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                          <span className="text-xs sm:text-sm">{seat.user?.flag || '🌐'}</span>
                          <span className="font-bold text-white truncate">
                            {isMe ? `${seat.user?.full_name?.split(' ')[0]} (${isFr ? 'Moi' : 'You'})` : seat.user?.full_name?.split(' ')[0]}
                          </span>
                        </div>
                        <span className="px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-extrabold bg-white/10 text-slate-300 shrink-0">
                          {seat.user?.current_level || 'B2'}
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Empty Seat */
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 text-center">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-slate-500 mb-1 sm:mb-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                        {isFr ? `Siège ${seat.seatNumber} Libre` : `Seat ${seat.seatNumber} Open`}
                      </span>
                      <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 hidden xs:block">
                        {isFr ? 'Max 6 personnes' : 'Capped at 6'}
                      </p>
                      
                      {!mySeatNumber && (
                        <button
                          onClick={() => handleJoinSeat(seat.seatNumber)}
                          className="mt-1.5 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95"
                        >
                          {isFr ? 'Prendre' : 'Take seat'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls Bar for Seated Users or Spectators */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#091024] border border-slate-200 dark:border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
            {mySeatNumber ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {/* Mic Toggle */}
                  <button
                    onClick={toggleMute}
                    className={`p-2.5 sm:p-3 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs transition-all ${
                      isMuted
                        ? 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25'
                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isMuted ? (isFr ? 'Micro Coupé' : 'Muted') : (isFr ? 'Micro Actif' : 'Unmuted')}</span>
                  </button>

                  {/* Video Toggle */}
                  <button
                    onClick={toggleVideo}
                    className={`p-2.5 sm:p-3 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs transition-all ${
                      !isVideoOn
                        ? 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isVideoOn ? <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VideoOff className="w-4 h-4" />}
                    <span>{isVideoOn ? (isFr ? 'Caméra On' : 'Camera On') : (isFr ? 'Caméra Off' : 'Camera Off')}</span>
                  </button>

                  {/* Hand Raise */}
                  <button
                    onClick={toggleHand}
                    className={`p-2.5 sm:p-3 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs transition-all ${
                      handRaised
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Hand className="w-4 h-4" />
                    <span>{handRaised ? (isFr ? 'Main Levée' : 'Hand Raised') : (isFr ? 'Lever main' : 'Raise Hand')}</span>
                  </button>
                </div>

                <button
                  onClick={handleLeaveSeat}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center gap-1.5 sm:gap-2 shadow-lg"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{isFr ? 'Quitter' : 'Leave Live'}</span>
                </button>
              </>
            ) : (
              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    {isFr 
                      ? "Vous écoutez actuellement en mode spectateur." 
                      : "You are currently listening as spectator."}
                  </span>
                </div>

                <button
                  onClick={() => handleJoinSeat()}
                  disabled={isRoomFull}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    isRoomFull
                      ? 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500 dark:bg-emerald-400 text-slate-950 hover:bg-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                  }`}
                >
                  {isRoomFull
                    ? (isFr ? 'Salle Complète (6/6 participants)' : 'Room Full (6/6 participants)')
                    : (isFr ? 'Prendre la parole (Rejoindre)' : 'Take the floor (Join)')}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (4 cols): Live English Chat & Reactions */}
        <div className="lg:col-span-4 flex flex-col h-[480px] sm:h-[540px] lg:h-[580px] rounded-2xl bg-white dark:bg-[#091024] border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isFr ? 'Chat du Live (En Anglais)' : 'Live Chat (English Only)'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                🇬🇧 English
              </span>
              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setChatMessages([]);
                    playSound('click');
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title={isFr ? "Effacer tous les messages" : "Clear all messages"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto scrollbar-thin">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-600 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isFr ? "Le chat est vide pour le moment" : "The chat is empty right now"}
                </p>
                <p className="text-[11px] text-slate-500 max-w-[200px]">
                  {isFr 
                    ? "Envoyez le premier message en anglais pour lancer la discussion !" 
                    : "Send the first message in English to start the conversation!"}
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2.5 text-xs animate-fade-in">
                  {msg.sender_avatar ? (
                    <img
                      src={msg.sender_avatar}
                      alt={msg.sender_name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/20 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                  )}
                  <div className="flex-1 bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">{msg.sender_name}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => speakLiveText(msg.text, msg.id)}
                          className={`p-0.5 rounded transition-colors ${
                            speakingLiveMsgId === msg.id 
                              ? 'text-amber-500 bg-amber-500/20 animate-pulse' 
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                          }`}
                          title={isFr ? "Écouter en anglais" : "Listen in English"}
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{msg.text}</p>
                    {msg.audio_url && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-white/10">
                        <audio src={msg.audio_url} controls className="w-full h-7" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Emoji Reactions */}
          <div className="px-3.5 py-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{isFr ? 'Réactions :' : 'React:'}</span>
            <div className="flex items-center gap-1.5">
              {['🔥', '👏', '💯', '🎙️', '🚀', '❤️'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 flex items-center justify-center text-sm hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box with Voice & Dictation */}
          {isRecordingLiveVoice ? (
            <div className="p-2.5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#060a14] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-300">
                  {isFr ? 'Enregistrement vocal :' : 'Recording voice note:'} 0:{liveRecordingSec < 10 ? `0${liveRecordingSec}` : liveRecordingSec}
                </span>
              </div>
              <button
                type="button"
                onClick={stopLiveRecording}
                className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Square className="w-3 h-3" />
                <span>{isFr ? 'Envoyer' : 'Send'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#060a14] flex items-center gap-1.5">
              {/* Record Voice Note Button */}
              <button
                type="button"
                onClick={startLiveRecording}
                className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                title={isFr ? "Enregistrer une note vocale" : "Record voice message"}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Dictate Voice-to-Text Button */}
              <button
                type="button"
                onClick={toggleLiveDictation}
                className={`p-2 rounded-xl border transition-all shrink-0 ${
                  isDictatingLive
                    ? 'bg-rose-500/25 border-rose-500/50 text-rose-500 dark:text-rose-300 animate-pulse'
                    : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
                title={isFr ? "Dicter en anglais (Parlez pour écrire)" : "Dictate in English (Speech-to-text)"}
              >
                <Headphones className="w-4 h-4" />
              </button>

              <input
                type="text"
                lang="en"
                spellCheck={true}
                autoCorrect="on"
                autoCapitalize="sentences"
                inputMode="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isFr ? "Écrivez ou dictez en anglais..." : "Type or speak in English..."}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="p-2 rounded-xl bg-emerald-500 dark:bg-emerald-400 text-slate-950 font-bold disabled:opacity-40 transition-opacity shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

      </div>

      {/* Floating Reactions Canvas */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            style={{ left: `${r.left}%` }}
            className="absolute bottom-16 text-3xl animate-float-up opacity-90 transition-all"
          >
            {r.emoji}
          </div>
        ))}
      </div>

    </div>
  );
}
