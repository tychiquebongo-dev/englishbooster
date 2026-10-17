'use client';

import React, { useEffect, useState, useRef, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Headphones,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Copy,
  Check,
  LayoutGrid,
  Maximize2,
  Settings,
  Globe,
  Lock,
  PhoneOff,
  HelpCircle,
  Tv,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import CreateLiveRoomModal from '@/components/CreateLiveRoomModal';
import { 
  LiveRoom, 
  LiveRoomCategory, 
  LiveRoomLevel, 
  getStoredLiveRooms, 
  saveCustomLiveRoom, 
  deleteCustomLiveRoom, 
  findLiveRoomById,
  INITIAL_LIVE_ROOMS
} from '@/lib/liveRooms';

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

// ============================================================================
// MAIN LIVE ROOMS CONTROLLER (INSIDE SUSPENSE)
// ============================================================================
function LiveRoomsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const activeRoomIdParam = searchParams?.get('room') || null;

  // Rooms Directory State
  const [allRooms, setAllRooms] = useState<LiveRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [directRoomCode, setDirectRoomCode] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Active Room Stage State
  const [activeRoom, setActiveRoom] = useState<LiveRoom | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [stageLayout, setStageLayout] = useState<'grid' | 'spotlight'>('grid');
  const [activeSideDrawer, setActiveSideDrawer] = useState<'chat' | 'participants' | 'ai' | null>('chat');

  // Video / Audio / Stage Controls
  const INITIAL_SEATS_COUNT = 12;
  const [seats, setSeats] = useState<LiveSeat[]>([]);
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
  const [roomDurationSec, setRoomDurationSec] = useState(0);

  // Gemini AI Co-Host Live Advice inside Room
  const [aiPrompts, setAiPrompts] = useState<string[]>([
    "What is one habit that accelerated your English fluency the most?",
    "If you could work from any country next month, where would you go and why?",
    "How do you handle conversations when you forget a specific English vocabulary word?"
  ]);
  const [currentAiPromptIndex, setCurrentAiPromptIndex] = useState(0);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveAudioChunksRef = useRef<Blob[]>([]);
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const liveRecognitionRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // 1. Load Rooms Directory & Listen for Sync Broadcasts
  useEffect(() => {
    const loadRooms = () => {
      const stored = getStoredLiveRooms();
      setAllRooms(stored);
    };

    loadRooms();

    // Cross-tab broadcast receiver
    try {
      const bc = new BroadcastChannel('eb_live_rooms_sync');
      bc.onmessage = () => {
        loadRooms();
      };
      return () => {
        bc.close();
      };
    } catch {}
  }, []);

  // 2. Synchronize active room when query parameter changes
  useEffect(() => {
    if (!activeRoomIdParam) {
      setActiveRoom(null);
      return;
    }

    const found = findLiveRoomById(activeRoomIdParam) || {
      id: activeRoomIdParam,
      title: `${activeRoomIdParam} • Live Video Room`,
      topic: 'Live English debate and real-time speaking practice between global partners.',
      category: 'conversation',
      level: 'All Levels',
      hostId: user?.id || 'host-live',
      hostName: profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Partner Host'),
      hostAvatar: profile?.avatar_url || '',
      hostFlag: profile?.flag || '🌐',
      hostLevel: profile?.current_level || 'B2',
      maxSeats: 'unlimited',
      isPublic: true,
      createdAt: new Date().toISOString(),
      activeParticipantsCount: 1,
      spectatorCount: 1,
      aiCoHostEnabled: true,
      tags: ['Live Video', 'English Debate'],
      isLive: true,
    };

    setActiveRoom(found);
    setRoomDurationSec(0);

    // Start room duration ticker
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = setInterval(() => {
      setRoomDurationSec(s => s + 1);
    }, 1000);

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [activeRoomIdParam, user?.id, user?.email, profile?.full_name, profile?.avatar_url, profile?.flag, profile?.current_level]);

  // 3. Supabase Realtime Channel & Presence for the Active Room
  useEffect(() => {
    if (!activeRoom) return;

    const buildSeatList = (count: number): LiveSeat[] => {
      const list: LiveSeat[] = [];
      for (let i = 1; i <= count; i++) {
        list.push({
          seatNumber: i,
          user: null,
          isHost: i === 1,
          isMuted: false,
          isVideoOn: true,
          isSpeaking: false,
          handRaised: false,
        });
      }
      return list;
    };

    const initialSeats: LiveSeat[] = buildSeatList(INITIAL_SEATS_COUNT);
    setSeats(initialSeats);

    const channelName = `live_room_${activeRoom.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
    const channel = supabase.channel(channelName, {
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

        setSeats(prev => {
          const maxPresSeat = seatedPresences.reduce((acc, p) => Math.max(acc, p.seatNumber || 1), 1);
          const totalCountNeeded = Math.max(INITIAL_SEATS_COUNT, prev.length, maxPresSeat);
          const updated = buildSeatList(totalCountNeeded);

          for (const s of seatedPresences) {
            const idx = s.seatNumber - 1;
            if (idx >= 0 && idx < updated.length) {
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
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (payload?.emoji) {
          triggerFloatingReaction(payload.emoji);
        }
      })
      .on('broadcast', { event: 'chat_msg' }, ({ payload }) => {
        if (payload?.msg) {
          setChatMessages(prev => [...prev, payload.msg]);
        }
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
      channelRef.current = null;
    };
  }, [activeRoom?.id, user?.id, supabase]);

  // 4. Handle Local Camera Video Stream
  useEffect(() => {
    if (mySeatNumber && isVideoOn) {
      navigator.mediaDevices?.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, 
        audio: true 
      })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Camera permission denied; fallback to avatar
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

  // 5. Handle Screen Sharing
  const toggleScreenShare = async () => {
    playSound('click');
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert(isFr ? "Le partage d'écran n'est pas pris en charge par ce navigateur." : "Screen sharing is not supported on this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      playSound('success');

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        screenStreamRef.current = null;
      };
    } catch {
      setIsScreenSharing(false);
    }
  };

  // Join Seat on Stage
  const handleJoinSeat = (targetSeatNumber?: number) => {
    if (!user || !profile) {
      playSound('click');
      router.push('/login');
      return;
    }

    playSound('call');

    let emptyIndex = targetSeatNumber 
      ? targetSeatNumber - 1 
      : seats.findIndex(s => s.user === null);

    if (emptyIndex === -1) {
      emptyIndex = seats.length;
    }

    const newSeatNum = emptyIndex + 1;

    setSeats(prev => {
      const updated = [...prev];
      while (updated.length <= emptyIndex) {
        updated.push({
          seatNumber: updated.length + 1,
          user: null,
          isHost: false,
          isMuted: false,
          isVideoOn: true,
          isSpeaking: false,
          handRaised: false,
        });
      }
      updated[emptyIndex] = {
        seatNumber: newSeatNum,
        user: profile,
        isHost: newSeatNum === 1 || activeRoom?.hostId === user.id,
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
        isHost: newSeatNum === 1 || activeRoom?.hostId === user.id,
        isMuted: false,
        isVideoOn: true,
        isSpeaking: true,
        handRaised: false,
      });
    }

    setMySeatNumber(newSeatNum);
    playSound('success');
  };

  // Leave Seat
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

  // Toggle Mute
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

  // Toggle Video
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

  // Toggle Hand Raise
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

  // Add more seats dynamically (Unlimited floor capacity)
  const handleAddMoreSeats = (countToAdd = 4) => {
    playSound('click');
    setSeats(currentSeats => {
      const copy = [...currentSeats];
      const nextCount = copy.length + countToAdd;
      for (let i = copy.length + 1; i <= nextCount; i++) {
        copy.push({
          seatNumber: i,
          user: null,
          isHost: false,
          isMuted: false,
          isVideoOn: true,
          isSpeaking: false,
          handRaised: false,
        });
      }
      return copy;
    });
  };

  // Floating Reaction Trigger
  const triggerFloatingReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 60) + 20;
    setFloatingReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2200);
  };

  const handleSendReaction = (emoji: string) => {
    playSound('click');
    triggerFloatingReaction(emoji);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji }
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
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat_msg',
        payload: { msg: newMsg }
      });
    }
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
          text: `🎙️ ${isFr ? 'Note vocale' : 'Voice note'} (${liveRecordingSec}s)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          audio_url: audioUrl,
        };

        setChatMessages(prev => [...prev, voiceMsg]);
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'chat_msg',
            payload: { msg: voiceMsg }
          });
        }
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

  // Text-to-Speech in Live Chat
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
    utterance.rate = 0.95;

    utterance.onend = () => setSpeakingLiveMsgId(null);
    utterance.onerror = () => setSpeakingLiveMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Copy Room Invite Link
  const handleCopyInviteLink = () => {
    playSound('click');
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/live?room=${encodeURIComponent(activeRoom?.id || '')}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Exit Room back to Directory
  const handleExitRoom = () => {
    playSound('click');
    if (mySeatNumber) {
      handleLeaveSeat();
    }
    router.push('/live');
  };

  // Filtered Rooms for Hub View
  const filteredRooms = useMemo(() => {
    return allRooms.filter(room => {
      const matchQuery = !searchQuery.trim() || 
        room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCat = selectedCategory === 'all' || room.category === selectedCategory;
      const matchLevel = selectedLevel === 'all' || room.level === selectedLevel;

      return matchQuery && matchCat && matchLevel;
    });
  }, [allRooms, searchQuery, selectedCategory, selectedLevel]);

  // Format Room Duration Time
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const occupiedSeatsCount = seats.filter(s => s.user !== null).length;

  // ==========================================================================
  // VIEW 1: ACTIVE LIVE VIDEO ROOM STAGE
  // ==========================================================================
  if (activeRoom) {
    const isMeHost = (user && activeRoom.hostId === user.id) || mySeatNumber === 1;

    return (
      <div className="min-h-[calc(100vh-5rem)] bg-[#040814] text-slate-100 flex flex-col">
        
        {/* Floating Reactions Overlay */}
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {floatingReactions.map(r => (
            <div
              key={r.id}
              style={{ left: `${r.left}%` }}
              className="absolute bottom-24 text-3xl sm:text-4xl animate-bounce-up select-none filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Top Room Navigation Bar */}
        <header className="px-3 sm:px-6 py-3 border-b border-white/10 bg-[#070d1b]/95 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-3">
          
          {/* Left: Back + Room Info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleExitRoom}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold"
              title={isFr ? "Quitter le salon" : "Leave room"}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{isFr ? "Tous les Salons" : "All Rooms"}</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span>EN DIRECT</span>
                </span>
                <h1 className="text-sm sm:text-base font-black text-white truncate">
                  {activeRoom.title}
                </h1>
                {isMeHost && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="hidden xs:inline">Hôte</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate italic">
                « {activeRoom.topic} »
              </p>
            </div>
          </div>

          {/* Right: Metrics + Layout Switcher + Invite Link */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Live Timer */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-cyan-300">
              <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>{formatTime(roomDurationSec)}</span>
            </div>

            {/* Stage Participants Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300">
              <Users className="w-3.5 h-3.5" />
              <span>{occupiedSeatsCount} <span className="hidden xs:inline">{isFr ? 'sur scène' : 'on stage'}</span></span>
            </div>

            {/* Spectator Indicator */}
            <div className="hidden xs:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs font-bold text-purple-300">
              <Headphones className="w-3.5 h-3.5" />
              <span>{spectatorCount}</span>
            </div>

            {/* Layout Toggle */}
            <button
              onClick={() => {
                playSound('click');
                setStageLayout(stageLayout === 'grid' ? 'spotlight' : 'grid');
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title={stageLayout === 'grid' ? 'Switch to Spotlight View' : 'Switch to Grid View'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {/* Copy Invite Link */}
            <button
              onClick={handleCopyInviteLink}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
              }`}
              title={isFr ? "Copier le lien d'invitation" : "Copy invite link"}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {copiedLink ? (isFr ? 'Copié !' : 'Copied!') : (isFr ? 'Inviter' : 'Invite')}
              </span>
            </button>
          </div>
        </header>

        {/* Gemini AI Co-Host Live Challenge Banner */}
        {activeRoom.aiCoHostEnabled && (
          <div className="px-3 sm:px-6 py-2 bg-gradient-to-r from-blue-950/60 via-cyan-950/40 to-slate-950 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-300 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-cyan-300 shrink-0">Gemini AI Co-Host:</span>
              <span className="italic truncate text-slate-200">« {aiPrompts[currentAiPromptIndex]} »</span>
            </div>

            <button
              onClick={() => {
                playSound('click');
                setCurrentAiPromptIndex((currentAiPromptIndex + 1) % aiPrompts.length);
              }}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
            >
              <span>{isFr ? "Question Suivante" : "Next Question"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Stage & Video Grid + Side Panel */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Main Stage Video Arena */}
          <main className="flex-1 p-3 sm:p-5 overflow-y-auto flex flex-col space-y-4">
            
            {/* Screen Share Screen (If Active) */}
            {isScreenSharing && (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center gap-2">
                  <Monitor className="w-4 h-4 animate-pulse text-cyan-400" />
                  <span>{isFr ? "Votre Partage d'Écran en Direct (1080p)" : "Your Live Screen Share (1080p)"}</span>
                </div>
              </div>
            )}

            {/* Video Seats Grid */}
            <div className={`grid gap-3 sm:gap-4 flex-1 ${
              stageLayout === 'spotlight' 
                ? 'grid-cols-1 md:grid-cols-3' 
                : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            }`}>
              {seats.map((seat) => {
                const isMe = mySeatNumber === seat.seatNumber;
                const hasUser = seat.user !== null;

                return (
                  <div
                    key={seat.seatNumber}
                    className={`relative aspect-[4/3] rounded-2xl overflow-hidden border transition-all duration-300 ${
                      hasUser
                        ? seat.isSpeaking
                          ? 'border-emerald-400 shadow-[0_0_25px_rgba(74,222,128,0.3)] ring-2 ring-emerald-400/40 bg-slate-950'
                          : 'border-white/15 bg-slate-950/90 shadow-md'
                        : 'border-dashed border-white/20 bg-white/[0.02] hover:border-emerald-400/40'
                    }`}
                  >
                    {hasUser ? (
                      <>
                        {/* Video Element or Avatar Tile */}
                        {isMe && isVideoOn ? (
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-b from-[#0b1329] to-[#040814]">
                            <div className="relative">
                              {seat.user?.avatar_url ? (
                                <img
                                  src={seat.user.avatar_url}
                                  alt={seat.user?.full_name || 'Partner'}
                                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-xl transition-all ${
                                    seat.isSpeaking ? 'ring-4 ring-emerald-400 scale-105' : 'ring-2 ring-white/20'
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 border-2 border-emerald-400/40 flex items-center justify-center text-xl font-black text-emerald-300 shadow-xl transition-all ${
                                    seat.isSpeaking ? 'ring-4 ring-emerald-400 scale-105' : 'ring-2 ring-white/20'
                                  }`}
                                >
                                  {seat.user?.full_name ? seat.user.full_name.charAt(0).toUpperCase() : 'P'}
                                </div>
                              )}

                              {/* Live Audio Equalizer Indicator */}
                              {seat.isSpeaking && (
                                <div className="absolute -bottom-2 inset-x-0 flex items-center justify-center gap-0.5">
                                  <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                  <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                  <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Top Stage Badges */}
                        <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
                          <div className="flex items-center gap-1.5">
                            {seat.isHost && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1 backdrop-blur-md">
                                <Crown className="w-3 h-3 text-amber-400" />
                                <span>Host</span>
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-emerald-400 border border-white/10 backdrop-blur-md">
                              S{seat.seatNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {seat.handRaised && (
                              <span className="p-1 rounded-full bg-amber-500 text-slate-950 font-bold text-xs animate-bounce shadow-md">
                                ✋
                              </span>
                            )}
                            <div className={`p-1.5 rounded-full backdrop-blur-md border ${
                              seat.isMuted 
                                ? 'bg-rose-500/30 border-rose-500/40 text-rose-300' 
                                : 'bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
                            }`}>
                              {seat.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Name & Level Ribbon */}
                        <div className="absolute bottom-2 inset-x-2 z-10 flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-sm">{seat.user?.flag || '🌐'}</span>
                            <span className="font-bold text-white truncate">
                              {isMe ? `${seat.user?.full_name?.split(' ')[0]} (${isFr ? 'Moi' : 'You'})` : seat.user?.full_name?.split(' ')[0]}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-white/10 text-slate-300 shrink-0">
                            {seat.user?.current_level || 'B2'}
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Empty Seat Slot */
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-emerald-400/30 bg-emerald-500/5 flex items-center justify-center text-emerald-400 mb-1.5">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-300">
                          {isFr ? `Siège ${seat.seatNumber} Libre` : `Seat ${seat.seatNumber} Open`}
                        </span>
                        <p className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
                          {isFr ? 'Scène Ouverte (∞)' : 'Open Floor (∞)'}
                        </p>
                        
                        {!mySeatNumber && (
                          <button
                            onClick={() => handleJoinSeat(seat.seatNumber)}
                            className="mt-2 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>{isFr ? 'Prendre ce siège' : 'Take seat'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Floor Expansion Banner */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <span className="text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {isFr ? 'Capacité illimitée pour ce salon vidéo direct.' : 'Unlimited capacity for this live video stage.'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleAddMoreSeats(4)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 font-bold transition-colors cursor-pointer"
              >
                + 4 {isFr ? 'sièges' : 'seats'}
              </button>
            </div>

          </main>

          {/* Side Drawer: Live Chat / Participants / Gemini AI Coach */}
          {activeSideDrawer && (
            <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#070d1b] flex flex-col h-80 lg:h-auto">
              
              {/* Drawer Tabs */}
              <div className="p-2 border-b border-white/10 flex items-center justify-between gap-1 bg-[#091024]">
                <div className="flex items-center gap-1 flex-1">
                  <button
                    onClick={() => {
                      playSound('click');
                      setActiveSideDrawer('chat');
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeSideDrawer === 'chat'
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat ({chatMessages.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      playSound('click');
                      setActiveSideDrawer('participants');
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeSideDrawer === 'participants'
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Membres ({occupiedSeatsCount})</span>
                  </button>

                  <button
                    onClick={() => {
                      playSound('click');
                      setActiveSideDrawer('ai');
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeSideDrawer === 'ai'
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gemini AI</span>
                  </button>
                </div>

                <button
                  onClick={() => setActiveSideDrawer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                  title={isFr ? "Réduire" : "Collapse"}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* TAB 1: LIVE CHAT */}
                {activeSideDrawer === 'chat' && (
                  <>
                    <div className="flex-1 p-3 space-y-2.5 overflow-y-auto scrollbar-thin">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                          <MessageSquare className="w-8 h-8 stroke-[1.5]" />
                          <p className="text-xs font-semibold text-slate-300">
                            {isFr ? "Le chat est calme pour l'instant" : "Chat is quiet for now"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isFr ? "Posez une question en anglais aux partenaires sur scène !" : "Ask a question in English to participants on stage!"}
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <div key={msg.id} className="flex items-start gap-2 text-xs">
                            {msg.sender_avatar ? (
                              <img
                                src={msg.sender_avatar}
                                alt={msg.sender_name}
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : 'P'}
                              </div>
                            )}
                            <div className="flex-1 bg-white/5 p-2 rounded-xl border border-white/5">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-cyan-400 text-[11px]">{msg.sender_name}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => speakLiveText(msg.text, msg.id)}
                                    className={`p-0.5 rounded ${
                                      speakingLiveMsgId === msg.id 
                                        ? 'text-amber-400 bg-amber-400/20 animate-pulse' 
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    <Volume2 className="w-3 h-3" />
                                  </button>
                                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                                </div>
                              </div>
                              <p className="text-slate-200 leading-relaxed">{msg.text}</p>
                              {msg.audio_url && (
                                <audio src={msg.audio_url} controls className="w-full h-6 mt-1" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chat Input Bar */}
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#091024] space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder={isFr ? "Message en anglais..." : "Type in English..."}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-white placeholder-slate-500"
                        />
                        <button
                          type="submit"
                          disabled={!inputMessage.trim()}
                          className="p-2 rounded-xl bg-cyan-500 text-slate-950 font-bold disabled:opacity-40 transition-transform active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        {isRecordingLiveVoice ? (
                          <button
                            type="button"
                            onClick={stopLiveRecording}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1.5 animate-pulse"
                          >
                            <Square className="w-3 h-3" />
                            <span>Arrêter ({liveRecordingSec}s)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={startLiveRecording}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold flex items-center gap-1"
                          >
                            <Mic className="w-3 h-3 text-emerald-400" />
                            <span>{isFr ? "Note vocale" : "Voice note"}</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          {['🔥', '👏', '💯', '🚀'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleSendReaction(emoji)}
                              className="hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </form>
                  </>
                )}

                {/* TAB 2: PARTICIPANTS */}
                {activeSideDrawer === 'participants' && (
                  <div className="p-3 space-y-2 overflow-y-auto scrollbar-thin">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between">
                      <span>{isFr ? "Partenaires sur scène :" : "On stage partners:"}</span>
                      <span className="font-bold">{occupiedSeatsCount}</span>
                    </div>

                    {seats.filter(s => s.user !== null).map((s) => (
                      <div key={s.seatNumber} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{s.user?.flag || '🌐'}</span>
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              <span>{s.user?.full_name}</span>
                              {s.isHost && <Crown className="w-3 h-3 text-amber-400" />}
                            </p>
                            <p className="text-[10px] text-slate-400">{s.user?.current_level || 'B2'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${s.isMuted ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                          <span className="text-[10px] text-slate-400">{s.isMuted ? 'Muted' : 'Mic On'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: GEMINI AI COACH */}
                {activeSideDrawer === 'ai' && (
                  <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin text-xs">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-bold text-white">Gemini AI Live Coach</h4>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {isFr 
                          ? "Utilisez ces structures de phrases en anglais pour enrichir votre intervention :" 
                          : "Use these high-impact phrasing patterns for your live discussion:"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Expressing an Opinion</span>
                        <p className="text-slate-200 italic">« In my personal experience, the real turning point was... »</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase">Polite Disagreement</span>
                        <p className="text-slate-200 italic">« I see where you are coming from, however looking at it from another angle... »</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[10px] font-bold text-amber-400 uppercase">Buying Time to Think</span>
                        <p className="text-slate-200 italic">« That is a fascinating question. If I had to boil it down to one key factor... »</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </aside>
          )}

        </div>

        {/* Bottom Floating Control Dock (Zoom / Google Meet Style) */}
        <footer className="px-3 sm:px-6 py-3 border-t border-white/10 bg-[#070d1b] sticky bottom-0 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Left Controls: Mic & Camera */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {mySeatNumber ? (
                <>
                  <button
                    onClick={toggleMute}
                    className={`px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isMuted
                        ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isMuted ? (isFr ? 'Coupé' : 'Muted') : (isFr ? 'Actif' : 'Unmuted')}</span>
                  </button>

                  <button
                    onClick={toggleVideo}
                    className={`px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      !isVideoOn
                        ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200'
                    }`}
                  >
                    {isVideoOn ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isVideoOn ? 'Caméra On' : 'Caméra Off'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleJoinSeat()}
                  className="px-4 py-2 sm:py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(74,222,128,0.35)] flex items-center gap-2 cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>{isFr ? '🎙️ Rejoindre la Scène' : '🎙️ Take the Floor'}</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-black">∞</span>
                </button>
              )}
            </div>

            {/* Center Controls: Screen Share & Hand & Reactions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={toggleScreenShare}
                className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isScreenSharing
                    ? 'bg-cyan-500 text-slate-950 font-black border-cyan-400'
                    : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-200'
                }`}
                title={isFr ? "Partager l'écran" : "Share screen"}
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden md:inline">{isFr ? "Écran" : "Share"}</span>
              </button>

              {mySeatNumber && (
                <button
                  onClick={toggleHand}
                  className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    handRaised
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-400'
                      : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-200'
                  }`}
                  title={isFr ? "Lever la main" : "Raise hand"}
                >
                  <Hand className="w-4 h-4" />
                  <span className="hidden md:inline">{handRaised ? (isFr ? 'Main Levée' : 'Hand Raised') : (isFr ? 'Lever Main' : 'Raise')}</span>
                </button>
              )}

              {/* Reaction Emojis Ribbon */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white/5 border border-white/10">
                {['🔥', '👏', '💯', '🎙️', '❤️'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="p-1 text-sm hover:scale-125 transition-transform"
                    title={`Send ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Controls: Chat Drawer Toggle & Leave Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  playSound('click');
                  setActiveSideDrawer(activeSideDrawer ? null : 'chat');
                }}
                className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeSideDrawer
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-200'
                }`}
                title={isFr ? "Ouvrir le Chat" : "Toggle Chat"}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </button>

              {mySeatNumber ? (
                <button
                  onClick={handleLeaveSeat}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{isFr ? 'Descendre' : 'Leave Stage'}</span>
                </button>
              ) : (
                <button
                  onClick={handleExitRoom}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>{isFr ? 'Quitter' : 'Exit'}</span>
                </button>
              )}
            </div>

          </div>
        </footer>

      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: LIVE VIDEO ROOMS HUB / DIRECTORY (WHEN NO ROOM IS ACTIVE)
  // ==========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      
      {/* Hero Banner: Salons Vidéo en Direct */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-[#0a1226] via-[#070d1b] to-[#040814] border border-cyan-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.6),0_0_40px_rgba(6,182,212,0.1)]">
        
        {/* Glow Spheres */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>
                  🔴 EN DIRECT • {allRooms.length > 0 ? `${allRooms.length} ${allRooms.length === 1 ? (isFr ? 'SALON ACTIF' : 'ACTIVE ROOM') : (isFr ? 'SALONS ACTIFS' : 'ACTIVE ROOMS')}` : (isFr ? '0 SALON EN COURS' : '0 ACTIVE ROOMS')}
                </span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                🎥 Vidéo & Audio HD
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {isFr ? 'Salons Vidéo Directs entre Partenaires' : 'Live Video Rooms for Global Partners'}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {isFr 
                ? 'Créez votre propre salon vidéo ou rejoignez instantanément d\'autres partenaires en direct pour échanger en anglais, débattre et booster votre aisance orale sans complexe.'
                : 'Host your custom live video room or jump directly into active rooms hosted by partners around the world. Strictly English immersion, real conversations, zero anxiety.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setCreateModalOpen(true);
                }}
                className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{isFr ? 'Créer un Salon Live' : 'Create Live Room'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (allRooms.length > 0) {
                    playSound('call');
                    router.push(`/live?room=${encodeURIComponent(allRooms[0].id)}`);
                  } else {
                    playSound('click');
                    setCreateModalOpen(true);
                  }
                }}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>
                  {allRooms.length > 0 
                    ? (isFr ? '⚡ Rejoindre un Salon Rapide' : '⚡ Quick Join Live')
                    : (isFr ? '⚡ Lancer un Salon Live' : '⚡ Launch Live Room')}
                </span>
              </button>
            </div>

          </div>

          {/* Quick Direct Code Input */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md max-w-sm w-full space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isFr ? 'Rejoindre un salon par son Code :' : 'Join with Room Code:'}</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={directRoomCode}
                onChange={(e) => setDirectRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: EB-LIVE-8492"
                className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-white font-mono uppercase placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (directRoomCode.trim()) {
                    playSound('call');
                    router.push(`/live?room=${encodeURIComponent(directRoomCode.trim())}`);
                  }
                }}
                disabled={!directRoomCode.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs disabled:opacity-40 hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                {isFr ? 'Rejoindre' : 'Join'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              {isFr ? 'Partagez votre code à vos partenaires pour qu\'ils rejoignent votre direct.' : 'Share your room code with friends to join your live video call.'}
            </p>
          </div>

        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#070d1b] border border-slate-200 dark:border-white/10 shadow-sm">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFr ? "Rechercher un salon, un thème, un hôte..." : "Search live rooms, topic, host..."}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-cyan-500 focus:outline-none text-xs text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Category Dropdown / Pills */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">{isFr ? 'Toutes Catégories' : 'All Categories'}</option>
            <option value="conversation">🗣️ Conversation & Fluency</option>
            <option value="business">💼 Business & Jobs</option>
            <option value="debate">⚔️ Debates</option>
            <option value="ielts">🎓 IELTS & Exam</option>
            <option value="tech">🚀 Tech & Startups</option>
          </select>

          {/* Level Dropdown */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">{isFr ? 'Tous Niveaux' : 'All Levels'}</option>
            <option value="A1-A2">🌱 A1-A2 Débutant</option>
            <option value="B1-B2">⚡ B1-B2 Intermédiaire</option>
            <option value="C1-C2">🔥 C1-C2 Avancé</option>
          </select>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors shadow-sm ml-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{isFr ? 'Nouveau Salon' : 'New Room'}</span>
          </button>

        </div>
      </div>

      {/* Live Rooms Cards Grid or Empty State */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {searchQuery || selectedCategory !== 'all' || selectedLevel !== 'all'
                ? (isFr ? 'Aucun salon ne correspond à votre recherche' : 'No rooms match your filter criteria')
                : (isFr ? 'Aucun salon vidéo en direct actuellement' : 'No active live video rooms right now')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {isFr 
                ? 'Soyez le premier à lancer un salon vidéo direct et invitez d\'autres partenaires réels à pratiquer l\'anglais avec vous !' 
                : 'Be the first to launch a live room and invite partners to practice speaking English together!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isFr ? 'Créer le Premier Salon' : 'Create First Room'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 sm:gap-6">
          {filteredRooms.map((room) => {
            const isUserHost = user && room.hostId === user.id;

            return (
              <div
                key={room.id}
                className="group relative rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#080d1e] border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Pulsing Ambient Hover Light */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-cyan-500/5 group-hover:bg-cyan-500/15 blur-2xl transition-all pointer-events-none" />

                <div>
                  
                  {/* Header row: Live badge + Level + Category */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span>EN DIRECT</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {room.level}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400 hidden xs:inline">
                        {room.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{room.activeParticipantsCount} {isFr ? 'sur scène' : 'on stage'}</span>
                    </div>
                  </div>

                  {/* Room Title */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {room.title}
                  </h3>

                  {/* Topic / Prompt */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic line-clamp-2 mt-1 mb-4 leading-relaxed">
                    « {room.topic} »
                  </p>

                  {/* Host Info Capsule */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      {room.hostAvatar ? (
                        <img
                          src={room.hostAvatar}
                          alt={room.hostName}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/40"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-cyan-500/40">
                          {room.hostName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{room.hostFlag}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {room.hostName}
                          </span>
                          <Crown className="w-3 h-3 text-amber-500" />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {isFr ? 'Hôte du Salon' : 'Room Host'} • {room.hostLevel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-300 font-semibold">
                      <Headphones className="w-3.5 h-3.5" />
                      <span>{room.spectatorCount} {isFr ? 'auditeurs' : 'spectators'}</span>
                    </div>
                  </div>

                </div>

                {/* Action Buttons: Join Live & Share */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        if (typeof window !== 'undefined') {
                          const url = `${window.location.origin}/live?room=${encodeURIComponent(room.id)}`;
                          navigator.clipboard.writeText(url);
                          alert(isFr ? "Lien d'invitation copié dans le presse-papier !" : "Invite link copied to clipboard!");
                        }
                      }}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                      title={isFr ? "Copier le lien" : "Copy link"}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {isUserHost && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(isFr ? "Voulez-vous fermer ce salon ?" : "Do you want to close this room?")) {
                            playSound('click');
                            const updated = deleteCustomLiveRoom(room.id);
                            setAllRooms(updated);
                          }
                        }}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                        title={isFr ? "Supprimer mon salon" : "Delete my room"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/live?room=${encodeURIComponent(room.id)}`}
                    onClick={() => playSound('call')}
                    className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(74,222,128,0.3)] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>{isFr ? 'Rejoindre en Direct' : 'Join Live Video'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Live Room */}
      <CreateLiveRoomModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onRoomCreated={(newRoom) => {
          setAllRooms(prev => [newRoom, ...prev]);
        }}
      />

    </div>
  );
}

// ============================================================================
// DEFAULT EXPORT WRAPPED IN SUSPENSE FOR NEXT.JS BUILD COMPATIBILITY
// ============================================================================
export default function LiveRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#040814] flex items-center justify-center p-6 text-white text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto animate-pulse">
          <Radio className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-sm font-bold text-slate-300">
          Chargement du Salon Vidéo Direct...
        </p>
      </div>
    }>
      <LiveRoomsContent />
    </Suspense>
  );
}
