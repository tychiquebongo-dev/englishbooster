'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { getUserAvatar } from '@/lib/avatarHelper';
import { isRealPartnerProfile } from '@/lib/partnerHelper';
import { broadcastNewMessage, broadcastMessagesRead, recordMissedCall } from '@/lib/callSignaling';
import { 
  initPeerInstance, 
  getLocalUserMedia, 
  stopLocalMediaStream, 
  getCleanPeerId,
  toggleAudioMute,
  toggleCamera 
} from '@/lib/webrtcCall';
import { 
  Send, 
  Mic, 
  Square, 
  ArrowLeft, 
  Phone, 
  Video, 
  Check, 
  CheckCheck, 
  Users, 
  Search, 
  Smile, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  UserPlus, 
  Paperclip,
  PhoneOff, 
  MicOff, 
  VideoOff, 
  MessageCircle,
  LogIn,
  Share2,
  Lock,
  Trash2,
  Copy,
  MoreVertical,
  AlertTriangle,
  Home,
  Reply,
  WifiOff,
  X,
  CornerDownRight
} from 'lucide-react';
import Link from 'next/link';
import InvitePartnerModal from '@/components/InvitePartnerModal';
import { useTranslation } from '@/lib/i18n';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface RealPartner {
  id: string;
  name: string;
  country: string;
  flag: string;
  avatar: string;
  level: string;
  specialty: string;
  is_online: boolean;
  bio: string;
}

interface ChatReplyTo {
  id: string;
  sender_name: string;
  text: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  text: string;
  audio_url?: string | null;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  reply_to?: ChatReplyTo | null;
}

const POPULAR_EMOJIS = ['😊', '👍', '🔥', '❤️', '🇬🇧', '👋', '🎉', '💡', '☕', '🚀', '✨', '🌍', '👏', '🎯', '💯'];

const CONVERSATION_STARTERS = [
  "✈️ What is your dream travel destination and why?",
  "🎬 Can you recommend a good English movie or series?",
  "☕ How do you like to start your morning routine?",
  "💡 What is a popular idiom you use often in English?",
  "🚀 What are you currently learning or working on?",
  "🌍 What is the best dish from your hometown?",
];

const GRAMMAR_RULES = [
  {
    regex: /\b(i have went|i had went)\b/i,
    replace: 'I went',
    explanation: 'Use simple past "I went" with finished past events. "Went" is never preceded by "have".'
  },
  {
    regex: /\b(i am agree|i\'m agree)\b/i,
    replace: 'I agree',
    explanation: '"Agree" is an action verb in English. Say "I agree", not "I am agree".'
  },
  {
    regex: /\bhe don't\b/i,
    replace: "he doesn't",
    explanation: 'Third person singular takes "doesn\'t", not "don\'t".'
  },
  {
    regex: /\bshe don't\b/i,
    replace: "she doesn't",
    explanation: 'Third person singular takes "doesn\'t", not "don\'t".'
  },
  {
    regex: /\bexplain me\b/i,
    replace: 'explain to me',
    explanation: 'The verb "explain" requires the preposition "to" before the person.'
  },
  {
    regex: /\b(i look forward to hear|looking forward to hear)\b/i,
    replace: 'look forward to hearing',
    explanation: '"Look forward to" is always followed by a gerund (-ing form).'
  },
  {
    regex: /\binformations\b/i,
    replace: 'information',
    explanation: '"Information" is an uncountable noun in English; it never takes an "s".'
  },
  {
    regex: /\badvices\b/i,
    replace: 'advice',
    explanation: '"Advice" is uncountable in English. Say "some advice" or "a piece of advice".'
  },
];

function detectGrammarIssue(text: string) {
  if (!text || text.length < 5) return null;
  for (const rule of GRAMMAR_RULES) {
    if (rule.regex.test(text)) {
      const match = text.match(rule.regex);
      if (match) {
        const original = match[0];
        const corrected = original.replace(rule.regex, rule.replace);
        return { original, corrected, explanation: rule.explanation };
      }
    }
  }
  return null;
}

// Helper: Parse stored message text to extract quoted reply if present
function parseMessageText(rawText: string): { text: string; replyTo: ChatReplyTo | null } {
  if (!rawText) return { text: '', replyTo: null };
  const match = rawText.match(/^>>reply:([^|]+)\|([^|]+)\|(.*?)<<\n([\s\S]*)$/);
  if (match) {
    try {
      return {
        replyTo: {
          id: match[1],
          sender_name: decodeURIComponent(match[2]),
          text: decodeURIComponent(match[3]),
        },
        text: match[4],
      };
    } catch {
      return { text: rawText, replyTo: null };
    }
  }
  return { text: rawText, replyTo: null };
}

function RealConversationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partnerIdParam = searchParams ? searchParams.get('partnerId') : null;
  const partnerNameParam = searchParams ? searchParams.get('partnerName') : null;

  const { user, profile, playSound } = useAuth();
  const supabase = createClient();
  const { isFr } = useTranslation();

  // ONLY 100% real registered partners from database
  const [partners, setPartners] = useState<RealPartner[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [conversationMap, setConversationMap] = useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  
  // Mobile responsive toggle
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Message Reply, Highlight & Selection state (WhatsApp Style)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

  // Offline Call Signal Outline Warning Modal
  const [showOfflineCallModal, setShowOfflineCallModal] = useState<{
    isOpen: boolean;
    videoMode: boolean;
  } | null>(null);

  // Audio voice note recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Audio voice note playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1);
  const [audioProgress, setAudioProgress] = useState<Record<string, { currentTime: number; duration: number }>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const chatChannelRef = useRef<any>(null);

  // Real Remote WebRTC Calling state (PeerJS)
  const [callActive, setCallActive] = useState(false);
  const [callIsVideo, setCallIsVideo] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<{
    callerId: string;
    callerName: string;
    callerAvatar: string;
    isVideo: boolean;
    callObject: any;
  } | null>(null);

  // Video refs for real remote PeerJS stream
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerInstanceRef = useRef<any>(null);
  const activeMediaCallRef = useRef<any>(null);

  // Guarantee streams attach to elements as soon as ready
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [localStream, callActive]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream, callActive]);

  // Drawers and assistants
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [grammarSuggestion, setGrammarSuggestion] = useState<{ original: string; corrected: string; explanation: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Smooth scroll to an identified message with glow pulse
  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const targetTop = el.offsetTop - container.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setHighlightedMsgId(msgId);
      setTimeout(() => {
        setHighlightedMsgId(prev => (prev === msgId ? null : prev));
      }, 2500);
    }
  };

  // Start reply to a message and scroll to it
  const handleStartReply = (msg: ChatMessage) => {
    playSound?.('click');
    setReplyingTo(msg);
    scrollToMessage(msg.id);
    inputRef.current?.focus();
  };

  // Share message via Web Share API or Clipboard
  const handleShareMessage = async (msg: ChatMessage) => {
    playSound?.('click');
    const shareText = `"${msg.text}" — ${msg.sender_name} on English Booster`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'English Booster Chat',
          text: shareText,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  // 1. Load ONLY REAL registered profiles from Supabase database
  useEffect(() => {
    let isMounted = true;

    const loadRealProfiles = async () => {
      setLoadingPartners(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (isMounted && data) {
          // Filter out current user and all unreal/test accounts so they see ONLY real registered partners
          const otherProfiles = data.filter((p: Profile) => (!user?.id || p.id !== user.id) && isRealPartnerProfile(p));

          const realList: RealPartner[] = otherProfiles.map((p: Profile) => {
            const isFounder = p.email === 'tychiquebongo@gmail.com' || p.role === 'admin';
            return {
              id: p.id,
              name: p.full_name || (isFounder ? 'Tychique Bongo' : 'Registered Member'),
              country: isFounder ? "Côte d'Ivoire" : (p.country || 'Global Community'),
              flag: isFounder ? '🇨🇮' : (p.flag || '🌐'),
              avatar: getUserAvatar(p.avatar_url, p.full_name, p.email),
              level: isFounder ? 'C2' : (p.current_level || 'B1'),
              specialty: isFounder ? '👑 Founder & Fluency Coach' : (p.target_level ? `Target ${p.target_level}` : 'English Conversation'),
              is_online: Boolean(p.is_online),
              bio: isFounder 
                ? "Founder of English Booster. Certified fluency mentor."
                : (p.bio || "Registered member practicing spoken English in real time."),
            };
          });

          setPartners(realList);

          // Mark current user online in database immediately
          if (user?.id) {
            supabase
              .from('profiles')
              .update({ is_online: true, updated_at: new Date().toISOString() })
              .eq('id', user.id)
              .then(() => {});
          }

          // Select matching partner if query param passed, otherwise select first real user
          if (realList.length > 0) {
            if (partnerIdParam && realList.some(r => r.id === partnerIdParam)) {
              setActivePartnerId(partnerIdParam);
              setMobileShowChat(true);
            } else if (partnerNameParam && realList.some(r => r.name.toLowerCase().includes(partnerNameParam.toLowerCase()))) {
              const matched = realList.find(r => r.name.toLowerCase().includes(partnerNameParam.toLowerCase()));
              if (matched) {
                setActivePartnerId(matched.id);
                setMobileShowChat(true);
              }
            } else {
              setActivePartnerId(realList[0].id);
              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                setMobileShowChat(true);
              } else {
                setMobileShowChat(false);
              }
            }
          } else {
            setActivePartnerId(null);
          }
        }
      } catch (err) {
        console.error('Error loading real profiles:', err);
      } finally {
        if (isMounted) setLoadingPartners(false);
      }
    };

    loadRealProfiles();

    // Load locally saved real conversations cache
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('eb_production_chat_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setConversationMap(parsed);
          }
        }
      } catch {}
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, partnerIdParam, partnerNameParam]);

  const activePartner = useMemo(() => {
    const base = partners.find(p => p.id === activePartnerId) || partners[0] || null;
    if (!base) return null;
    return {
      ...base,
      is_online: Boolean(base.is_online || onlineUserIds.has(base.id)),
    };
  }, [partners, activePartnerId, onlineUserIds]);

  // Global Realtime Presence & Database status listener across all registered users
  useEffect(() => {
    const presenceChannel = supabase.channel('global_online_presence', {
      config: { presence: { key: user?.id || 'chat_visitor' } }
    });

    const updatePresenceState = () => {
      const state = presenceChannel.presenceState();
      const ids = new Set<string>();
      Object.keys(state).forEach(key => {
        ids.add(key);
        const list = state[key] as any[];
        if (Array.isArray(list)) {
          list.forEach(p => {
            if (p.user_id) ids.add(p.user_id);
          });
        }
      });
      setOnlineUserIds(prev => {
        const merged = new Set([...prev, ...ids]);
        return merged;
      });
    };

    presenceChannel
      .on('presence', { event: 'sync' }, updatePresenceState)
      .on('presence', { event: 'join' }, updatePresenceState)
      .on('presence', { event: 'leave' }, updatePresenceState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user?.id) {
          try {
            await presenceChannel.track({
              user_id: user.id,
              name: profile?.full_name || user.email,
              online_at: new Date().toISOString(),
            });
          } catch {}
        }
      });

    // Realtime database listener for profile status updates
    const profilesChannel = supabase
      .channel('chat_profiles_db_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload: any) => {
        if (payload.new && payload.new.id) {
          const updatedId = payload.new.id;
          const isOnline = Boolean(payload.new.is_online);
          setPartners(prev => prev.map(p => p.id === updatedId ? { ...p, is_online: isOnline } : p));
          if (isOnline) {
            setOnlineUserIds(prev => new Set(prev).add(updatedId));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user?.id, profile?.full_name, supabase]);

  const currentMessages = useMemo(() => {
    if (!activePartner) return [];
    return conversationMap[activePartner.id] || [];
  }, [activePartner, conversationMap]);

  // Auto-scroll to bottom of conversation inside the scroll container
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom(currentMessages.length > 5 ? 'smooth' : 'auto');
    }, 60);
    return () => clearTimeout(timer);
  }, [currentMessages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom('auto');
    }, 100);
    return () => clearTimeout(timer);
  }, [activePartnerId, mobileShowChat]);

  const saveConversation = (updatedMap: Record<string, ChatMessage[]>) => {
    setConversationMap(updatedMap);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('eb_production_chat_v1', JSON.stringify(updatedMap));
      } catch {}
    }
  };

  // 2. Load REAL messages from Supabase database & Subscribe to Live Realtime updates
  useEffect(() => {
    if (!user?.id || !activePartner?.id) return;
    let isSubscribed = true;

    const loadRealDatabaseConversation = async () => {
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(participant_1.eq.${user.id},participant_2.eq.${activePartner.id}),and(participant_1.eq.${activePartner.id},participant_2.eq.${user.id})`)
          .limit(1)
          .maybeSingle();

        if (conv && isSubscribed) {
          const { data: dbMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (dbMessages && isSubscribed) {
            // Find any unread messages sent by the partner and mark them as read in Supabase
            const unreadPartnerMsgIds = dbMessages
              .filter(m => m.sender_id === activePartner.id && !m.is_read)
              .map(m => m.id);

            if (unreadPartnerMsgIds.length > 0) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .in('id', unreadPartnerMsgIds)
                .then(() => {});

              if (chatChannelRef.current) {
                chatChannelRef.current.send({
                  type: 'broadcast',
                  event: 'messages_read',
                  payload: {
                    reader_id: user.id,
                    conversation_id: conv.id,
                    message_ids: unreadPartnerMsgIds,
                  },
                });
              }

              broadcastMessagesRead(conv.id, user.id, activePartner.id, unreadPartnerMsgIds);
            }

            const mapped: ChatMessage[] = dbMessages.map(m => {
              const isMe = m.sender_id === user.id;
              const parsed = parseMessageText(m.text);
              return {
                id: m.id,
                sender_id: m.sender_id,
                sender_name: isMe ? (profile?.full_name || 'You') : activePartner.name,
                sender_avatar: isMe ? getUserAvatar(profile?.avatar_url, profile?.full_name, user.email) : activePartner.avatar,
                text: parsed.text,
                reply_to: parsed.replyTo,
                audio_url: m.audio_url,
                created_at: m.created_at,
                // Si le message a été lu par le partenaire (m.is_read): TOUJOURS 2 traits bleus ('read') !
                // Sinon: 2 traits gris si connecté ('delivered'), 1 trait si hors ligne ('sent')
                status: isMe ? (m.is_read ? 'read' : activePartner.is_online ? 'delivered' : 'sent') : 'read',
              };
            });

            setConversationMap(prev => {
              const updated = { ...prev, [activePartner.id]: mapped };
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('eb_production_chat_v1', JSON.stringify(updated));
                } catch {}
              }
              return updated;
            });
          }
        }
      } catch (err) {
        console.error('Error fetching real conversation:', err);
      }
    };

    loadRealDatabaseConversation();

    // Supabase Realtime channel for live messages between real users
    const channelName = `real_chat_${user.id < activePartner.id ? `${user.id}_${activePartner.id}` : `${activePartner.id}_${user.id}`}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } }
    });
    chatChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const hasPartner = Object.keys(state).some(k => k === activePartner.id) ||
          Object.values(state).some((list: any) => Array.isArray(list) && list.some((p: any) => p.user_id === activePartner.id));
        if (hasPartner) {
          setOnlineUserIds(prev => new Set(prev).add(activePartner.id));
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        if (key === activePartner.id || (Array.isArray(newPresences) && newPresences.some((p: any) => p.user_id === activePartner.id))) {
          setOnlineUserIds(prev => new Set(prev).add(activePartner.id));
        }
      })
      .on('broadcast', { event: 'user_active' }, ({ payload }: any) => {
        if (payload?.user_id) {
          setOnlineUserIds(prev => new Set(prev).add(payload.user_id));
        }
      })

    channel
      .on('broadcast', { event: 'messages_read' }, ({ payload }: any) => {
        if (!payload || payload.reader_id === user.id) return;
        // The partner has read our messages! Update our messages' status to 'read' (2 blue ticks)
        setConversationMap(prev => {
          const current = prev[activePartner.id] || [];
          const updated = current.map(m => {
            if (m.sender_id === user.id) {
              if (!payload.message_ids || payload.message_ids.includes(m.id)) {
                return { ...m, status: 'read' as const };
              }
            }
            return m;
          });
          const nextMap = { ...prev, [activePartner.id]: updated };
          saveConversation(nextMap);
          return nextMap;
        });
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }: any) => {
        if (!payload || payload.sender_id === user.id) return;
        const parsed = parseMessageText(payload.text);
        const incoming: ChatMessage = {
          ...payload,
          text: parsed.text,
          reply_to: payload.reply_to || parsed.replyTo,
          status: 'read',
        };
        setConversationMap(prev => {
          const current = prev[activePartner.id] || [];
          if (current.some(m => m.id === incoming.id)) return prev;
          const nextList = [...current, incoming];
          const nextMap = { ...prev, [activePartner.id]: nextList };
          saveConversation(nextMap);
          return nextMap;
        });
        playSound?.('chime');

        // Since user is currently active in this conversation, mark incoming message as read immediately!
        supabase
          .from('messages')
          .update({ is_read: true })
          .eq('id', payload.id)
          .then(() => {});

        // Broadcast to sender that message was read so their 2 traits immediately become blue!
        channel.send({
          type: 'broadcast',
          event: 'messages_read',
          payload: {
            reader_id: user.id,
            message_ids: [payload.id],
          },
        });
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.sender_id === activePartner.id) {
            const parsed = parseMessageText(newMsg.text);
            const incoming: ChatMessage = {
              id: newMsg.id,
              sender_id: newMsg.sender_id,
              sender_name: activePartner.name,
              sender_avatar: activePartner.avatar,
              text: parsed.text,
              reply_to: parsed.replyTo,
              audio_url: newMsg.audio_url,
              created_at: newMsg.created_at,
              status: 'read',
            };
            setConversationMap(prev => {
              const current = prev[activePartner.id] || [];
              if (current.some(m => m.id === incoming.id)) return prev;
              const nextList = [...current, incoming];
              const nextMap = { ...prev, [activePartner.id]: nextList };
              saveConversation(nextMap);
              return nextMap;
            });
            playSound?.('chime');

            // Mark message as read and notify sender
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then(() => {});

            channel.send({
              type: 'broadcast',
              event: 'messages_read',
              payload: {
                reader_id: user.id,
                message_ids: [newMsg.id],
              },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const updatedMsg = payload.new as any;
          if (updatedMsg && updatedMsg.is_read) {
            setConversationMap(prev => {
              const current = prev[activePartner.id] || [];
              const updated = current.map(m => {
                if (m.id === updatedMsg.id || (m.sender_id === user.id && updatedMsg.sender_id === user.id)) {
                  return { ...m, status: 'read' as const };
                }
                return m;
              });
              const nextMap = { ...prev, [activePartner.id]: updated };
              saveConversation(nextMap);
              return nextMap;
            });
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({ user_id: user.id, in_chat: true, online_at: new Date().toISOString() });
            channel.send({
              type: 'broadcast',
              event: 'user_active',
              payload: { user_id: user.id, is_online: true },
            });
          } catch {}
        }
      });

    return () => {
      isSubscribed = false;
      chatChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [user?.id, activePartner?.id]);

  // 3. Initialize PeerJS Remote Calling API for live Audio / Video calls
  useEffect(() => {
    if (!user?.id) return;
    let peerInstance: any = null;

    const setupPeerCalling = async () => {
      peerInstance = await initPeerInstance(user.id);
      peerInstanceRef.current = peerInstance;

      if (!peerInstance) return;

      // Listen for incoming remote calls from other real members
      peerInstance.on('call', (incomingCall: any) => {
        playSound?.('call');
        const callerPeerId = incomingCall.peer;
        const callerName = incomingCall.metadata?.callerName || 'Registered Partner';
        const callerAvatar = incomingCall.metadata?.callerAvatar || '';
        const isVideo = Boolean(incomingCall.metadata?.isVideo);

        setIncomingCallData({
          callerId: callerPeerId,
          callerName,
          callerAvatar,
          isVideo,
          callObject: incomingCall,
        });
      });
    };

    setupPeerCalling();

    return () => {
      stopLocalMediaStream();
      if (peerInstance) {
        try {
          peerInstance.destroy();
        } catch {}
      }
    };
  }, [user?.id]);

  // Answer Incoming Remote Call
  const handleAnswerCall = async () => {
    if (!incomingCallData) return;
    playSound?.('click');

    const isVideo = incomingCallData.isVideo;
    setCallIsVideo(isVideo);
    setCallActive(true);
    setCallStatus('connected');
    setCallDuration(0);
    setIsCallMuted(false);
    setIsCameraOff(false);

    const stream = await getLocalUserMedia(isVideo);
    setLocalStream(stream);

    incomingCallData.callObject.answer(stream);
    activeMediaCallRef.current = incomingCallData.callObject;

    incomingCallData.callObject.on('stream', (rStream: MediaStream) => {
      setRemoteStream(rStream);
      setCallStatus('connected');
    });

    incomingCallData.callObject.on('close', () => {
      handleEndCall();
    });

    incomingCallData.callObject.on('error', (err: any) => {
      console.warn('Call error:', err);
    });

    setIncomingCallData(null);

    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration(s => s + 1);
    }, 1000);
  };

  // Decline Incoming Remote Call
  const handleDeclineCall = () => {
    playSound?.('click');
    if (incomingCallData?.callObject) {
      try {
        incomingCallData.callObject.close();
      } catch {}
    }
    setIncomingCallData(null);
  };

  // Start Outgoing Remote Call by routing directly to the dedicated Call Room
  const handleStartRemoteCall = (videoMode: boolean, bypassOfflineWarning = false) => {
    if (!activePartner || !user?.id) {
      if (!user?.id) alert("Please sign in to make calls.");
      return;
    }

    // If partner is not online, show signal outline modal warning
    if (!activePartner.is_online && !bypassOfflineWarning) {
      playSound?.('click');
      setShowOfflineCallModal({ isOpen: true, videoMode });
      return;
    }

    setShowOfflineCallModal(null);
    playSound?.('call');
    const roomId = `room_${[user.id, activePartner.id].sort().join('_')}_${Date.now()}`;
    router.push(`/call?partnerId=${activePartner.id}&partnerName=${encodeURIComponent(activePartner.name)}&video=${videoMode}&roomId=${roomId}`);
  };

  // Directly log and broadcast a missed call when partner is offline
  const handleRecordMissedCallDirectly = async (videoMode: boolean) => {
    if (!activePartner || !user?.id) return;
    setShowOfflineCallModal(null);
    playSound?.('click');

    const missedText = videoMode ? "📹 Missed video call" : "📞 Missed voice call";

    // 1. Optimistic local update in chat
    const missedMsg: ChatMessage = {
      id: `missed_${Date.now()}`,
      sender_id: user.id,
      sender_name: profile?.full_name || 'You',
      sender_avatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
      text: missedText,
      created_at: new Date().toISOString(),
      status: 'sent',
    };

    setConversationMap(prev => {
      const current = prev[activePartner.id] || [];
      const nextList = [...current, missedMsg];
      const nextMap = { ...prev, [activePartner.id]: nextList };
      saveConversation(nextMap);
      return nextMap;
    });

    // 2. Persist to Supabase messages & calls tables, Realtime notification and Web Push
    try {
      await recordMissedCall({
        callerId: user.id,
        callerName: profile?.full_name || 'English Learner',
        callerAvatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
        receiverId: activePartner.id,
        isVideo: videoMode,
      });
    } catch (err) {
      console.warn('Error recording direct missed call:', err);
    }
  };

  // End Remote Call & Save Call Summary to Database
  const handleEndCall = async () => {
    playSound?.('click');
    setCallActive(false);
    setCallStatus('ended');

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (activeMediaCallRef.current) {
      try {
        activeMediaCallRef.current.close();
      } catch {}
      activeMediaCallRef.current = null;
    }

    stopLocalMediaStream();
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallMuted(false);
    setIsCameraOff(false);

    if (activePartner && user?.id && callDuration > 0) {
      const mins = Math.max(1, Math.round(callDuration / 60));
      const minsFormatted = `${Math.floor(callDuration / 60)}:${callDuration % 60 < 10 ? '0' : ''}${callDuration % 60}`;

      try {
        await supabase.from('calls').insert({
          caller_id: user.id,
          room_id: `call_${Date.now()}_${activePartner.id.substring(0, 5)}`,
          receiver_id: activePartner.id,
          receiver_name: activePartner.name,
          receiver_avatar: activePartner.avatar,
          duration_seconds: callDuration,
          fluency_score: 90,
          xp_earned: 50,
          status: 'completed',
          topic: 'Live English Speaking Exchange',
        });

        await supabase.from('profiles').update({
          minutes_spoken: (profile?.minutes_spoken || 0) + mins,
        }).eq('id', user.id);

        // Record call end message in chat
        const callMsg: ChatMessage = {
          id: `call_log_${Date.now()}`,
          sender_id: user.id,
          sender_name: profile?.full_name || 'You',
          sender_avatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
          text: `📞 Remote ${callIsVideo ? 'Video' : 'Voice'} Call finished (${minsFormatted})`,
          created_at: new Date().toISOString(),
          status: 'read',
        };

        const updated = [...(conversationMap[activePartner.id] || []), callMsg];
        saveConversation({ ...conversationMap, [activePartner.id]: updated });
      } catch (err) {
        console.error("Error saving call:", err);
      }
    }
  };

  // Delete individual message (from local conversation and database)
  const handleDeleteMessage = async (messageId: string) => {
    if (!activePartner) return;
    playSound?.('click');

    const targetPartnerId = activePartner.id;
    const currentMsgs = conversationMap[targetPartnerId] || [];
    const nextMsgs = currentMsgs.filter(m => m.id !== messageId);
    const nextMap = { ...conversationMap, [targetPartnerId]: nextMsgs };
    saveConversation(nextMap);

    // Delete from Supabase messages table if exists
    try {
      await supabase.from('messages').delete().eq('id', messageId);
    } catch (err) {
      console.warn('Message deleted locally:', err);
    }
  };

  // Clear entire conversation with active partner
  const handleClearConversation = async () => {
    if (!activePartner || !user?.id) return;
    playSound?.('click');

    const targetPartnerId = activePartner.id;
    const nextMap = { ...conversationMap, [targetPartnerId]: [] };
    saveConversation(nextMap);
    setShowClearConfirm(false);

    // Delete messages from Supabase for this conversation
    try {
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetPartnerId}),and(participant_1.eq.${targetPartnerId},participant_2.eq.${user.id})`)
        .limit(1)
        .maybeSingle();

      if (convData?.id) {
        await supabase.from('messages').delete().eq('conversation_id', convData.id);
      }
    } catch (err) {
      console.warn('Conversation cleared locally:', err);
    }
  };

  // Copy message text to clipboard
  const handleCopyMessage = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      playSound?.('click');
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  // 4. Send REAL message to Database and persist
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (!activePartner || !user?.id) {
      if (!user?.id) {
        alert("Please sign in to send messages to registered members.");
      }
      return;
    }

    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    playSound?.('click');

    const grammarCheck = detectGrammarIssue(textToSend);

    const currentReply = replyingTo ? {
      id: replyingTo.id,
      sender_name: replyingTo.sender_name,
      text: (replyingTo.text || (replyingTo.audio_url ? '🎵 Voice note' : '')).slice(0, 140),
    } : null;

    // Database text format encodes reply metadata if replying to an identified message
    const dbText = currentReply 
      ? `>>reply:${currentReply.id}|${encodeURIComponent(currentReply.sender_name)}|${encodeURIComponent(currentReply.text)}<<\n${textToSend}`
      : textToSend;

    const userMsgId = `msg_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender_id: user.id,
      sender_name: profile?.full_name || 'You',
      sender_avatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
      text: textToSend,
      reply_to: currentReply,
      created_at: new Date().toISOString(),
      // 1 trait si destinataire hors ligne, 2 traits gris si connecté
      status: activePartner.is_online ? 'delivered' : 'sent',
    };

    const targetPartnerId = activePartner.id;
    const updatedWithUser = [...(conversationMap[targetPartnerId] || []), userMessage];
    const newMap = { ...conversationMap, [targetPartnerId]: updatedWithUser };

    saveConversation(newMap);
    setInputText('');
    setReplyingTo(null);
    setGrammarSuggestion(null);
    setShowEmojiPicker(false);

    if (chatChannelRef.current) {
      chatChannelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: {
          ...userMessage,
          text: dbText,
        },
      });
    }

    // Save to real Supabase database
    try {
      let conversationId: string | null = null;
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetPartnerId}),and(participant_1.eq.${targetPartnerId},participant_2.eq.${user.id})`)
        .limit(1)
        .maybeSingle();

      if (convData) {
        conversationId = convData.id;
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ participant_1: user.id, participant_2: targetPartnerId })
          .select('id')
          .single();
        if (newConv) conversationId = newConv.id;
      }

      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: dbText,
          grammar_corrected: grammarCheck ? grammarCheck.corrected : null,
          grammar_explanation: grammarCheck ? grammarCheck.explanation : null,
        });

        // Update status to delivered only if partner is online
        if (activePartner.is_online) {
          setConversationMap(prev => {
            const msgs = prev[targetPartnerId] || [];
            const next = msgs.map(m => m.id === userMsgId ? { ...m, status: 'delivered' as const } : m);
            const nextMap = { ...prev, [targetPartnerId]: next };
            saveConversation(nextMap);
            return nextMap;
          });

          // Immediately notify online partner via Supabase Realtime broadcast
          broadcastNewMessage({
            senderId: user.id,
            senderName: profile?.full_name || 'English Learner',
            senderAvatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
            receiverId: targetPartnerId,
            text: textToSend,
            conversationId: conversationId || undefined,
          });
        }
      }
    } catch (err) {
      console.warn('Real message stored locally:', err);
    }
  };

  // Helper: Supported audio MIME type detection across Chrome, Safari iOS, Firefox
  const getSupportedAudioMimeType = (): string => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/aac',
      '',
    ];
    for (const t of types) {
      if (t === '' || (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t))) {
        return t;
      }
    }
    return '';
  };

  // Helper: Format seconds to mm:ss
  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 5. Robust Real Voice Note Recording
  const startRecording = async () => {
    if (!user?.id) {
      alert(isFr ? "Veuillez vous connecter pour enregistrer un message vocal." : "Please sign in to record voice notes.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(isFr ? "L'enregistrement audio n'est pas supporté sur ce navigateur." : "Voice recording is not supported on this browser.");
      return;
    }

    try {
      // Clean up previous stream if any was left open
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      const mimeType = getSupportedAudioMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (!activePartner) return;
        const targetPartnerId = activePartner.id;
        const recordedDuration = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));

        // Stop stream tracks immediately so mic indicator disappears
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
        }

        if (audioChunksRef.current.length === 0) {
          setIsRecording(false);
          setRecordingSeconds(0);
          return;
        }

        const blobMime = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobMime });

        // Convert to base64 Data URL so it is fully playable across all browsers and offline/online
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          playSound?.('chime');

          const voiceMsg: ChatMessage = {
            id: `voice_${Date.now()}`,
            sender_id: user.id,
            sender_name: profile?.full_name || 'You',
            sender_avatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
            text: `🎙️ Voice Note (${recordedDuration}s)`,
            audio_url: base64Audio,
            created_at: new Date().toISOString(),
            status: activePartner.is_online ? 'delivered' : 'sent',
          };

          // Optimistic local update
          setConversationMap(prev => {
            const current = prev[targetPartnerId] || [];
            const nextList = [...current, voiceMsg];
            const nextMap = { ...prev, [targetPartnerId]: nextList };
            saveConversation(nextMap);
            return nextMap;
          });

          // Immediate broadcast to partner via chat channel
          if (chatChannelRef.current) {
            chatChannelRef.current.send({
              type: 'broadcast',
              event: 'chat_message',
              payload: voiceMsg,
            });
          }

          // Persist to Supabase database
          try {
            let convId: string | null = null;
            const { data: convData } = await supabase
              .from('conversations')
              .select('id')
              .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetPartnerId}),and(participant_1.eq.${targetPartnerId},participant_2.eq.${user.id})`)
              .limit(1)
              .maybeSingle();

            if (convData) {
              convId = convData.id;
            } else {
              const { data: newConv } = await supabase
                .from('conversations')
                .insert({ participant_1: user.id, participant_2: targetPartnerId })
                .select('id')
                .single();
              if (newConv) convId = newConv.id;
            }

            if (convId) {
              await supabase.from('messages').insert({
                conversation_id: convId,
                sender_id: user.id,
                text: `🎙️ Voice Note (${recordedDuration}s)`,
                audio_url: base64Audio,
              });

              // Also send real-time notification alert to partner
              broadcastNewMessage({
                senderId: user.id,
                senderName: profile?.full_name || 'English Learner',
                senderAvatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
                receiverId: targetPartnerId,
                text: `🎙️ Voice Note (${recordedDuration}s)`,
                conversationId: convId || undefined,
                audioUrl: base64Audio,
              });
            }
          } catch (e) {
            console.warn('Database persist voice message notice:', e);
          }
        };

        setIsRecording(false);
        setRecordingSeconds(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };

      // Start recording with 200ms slice
      recorder.start(200);
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingSeconds(0);
      playSound?.('click');

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone capture error:", err);
      alert(
        err?.name === 'NotAllowedError'
          ? (isFr ? "Accès microphone refusé. Veuillez autoriser le micro dans les paramètres du navigateur." : "Microphone access was denied. Please allow microphone permissions in your browser settings.")
          : (isFr ? "Impossible d'accéder au microphone. Vérifiez votre périphérique audio." : "Could not access microphone. Please check your audio input device.")
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // Voice note play/pause toggle with live time tracking
  const togglePlayAudio = (msgId: string, audioUrl: string) => {
    let audio = audioElementsRef.current[msgId];
    if (!audio) {
      audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audio.playbackRate = audioPlaybackRate;

      audio.ontimeupdate = () => {
        setAudioProgress(prev => ({
          ...prev,
          [msgId]: {
            currentTime: audio.currentTime,
            duration: audio.duration || 0,
          }
        }));
      };

      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioProgress(prev => ({
          ...prev,
          [msgId]: {
            currentTime: 0,
            duration: audio.duration || 0,
          }
        }));
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error:', e);
        setPlayingAudioId(null);
      };

      audioElementsRef.current[msgId] = audio;
    }

    if (playingAudioId === msgId) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any currently playing audio
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        try {
          audioElementsRef.current[playingAudioId].pause();
          audioElementsRef.current[playingAudioId].currentTime = 0;
        } catch {}
      }
      audio.playbackRate = audioPlaybackRate;
      audio.play().catch(err => {
        console.warn('Audio play failed:', err);
        setPlayingAudioId(null);
      });
      setPlayingAudioId(msgId);
    }
  };

  const toggleSpeedRate = () => {
    const nextRate = audioPlaybackRate === 1 ? 1.5 : audioPlaybackRate === 1.5 ? 2 : 1;
    setAudioPlaybackRate(nextRate);
    if (playingAudioId && audioElementsRef.current[playingAudioId]) {
      audioElementsRef.current[playingAudioId].playbackRate = nextRate;
    }
  };

  // English Pronunciation via SpeechSynthesis
  const speakEnglishText = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingMsgId(msgId);
    playSound?.('click');

    const cleanText = text.replace(/^[^\w]+/, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Filtered partners based on search
  const filteredPartners = useMemo(() => {
    let list = partners;
    const q = searchFilter.toLowerCase().trim();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.specialty.toLowerCase().includes(q)
      );
    }
    return list;
  }, [partners, searchFilter]);

  return (
    <div data-fullscreen-route="true" className="w-full max-w-7xl mx-auto px-0 md:px-4 lg:px-6 py-0 md:py-3 h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5.5rem)] flex flex-col min-h-0 overflow-hidden">
      
      {/* ============================================================== */}
      {/* INCOMING REMOTE CALL MODAL                                     */}
      {/* ============================================================== */}
      {incomingCallData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#111b21] border border-emerald-500/40 p-6 text-center shadow-2xl space-y-4">
            <div className="relative w-20 h-20 mx-auto">
              <img
                src={incomingCallData.callerAvatar || '/assets/images/tychique-bongo.jpg'}
                alt={incomingCallData.callerName}
                className="w-full h-full rounded-full object-cover ring-4 ring-emerald-500 animate-pulse"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#111b21] flex items-center justify-center">
                {incomingCallData.isVideo ? <Video className="w-3.5 h-3.5 text-slate-950" /> : <Phone className="w-3.5 h-3.5 text-slate-950" />}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white">{incomingCallData.callerName}</h3>
              <p className="text-xs text-emerald-400 font-bold mt-0.5">
                Incoming {incomingCallData.isVideo ? 'Video' : 'Voice'} Call...
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleDeclineCall}
                className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Decline</span>
              </button>

              <button
                type="button"
                onClick={handleAnswerCall}
                className="px-6 py-2.5 rounded-full bg-[#00a884] hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg animate-bounce"
              >
                <Phone className="w-4 h-4 fill-slate-950" />
                <span>Answer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ACTIVE REMOTE WEBRTC VIDEO / AUDIO CALL STAGE                  */}
      {/* ============================================================== */}
      {callActive && (
        <div className="fixed inset-0 z-50 bg-[#070d1b] flex flex-col p-3 sm:p-6 animate-fade-in select-none safe-pt safe-pb">
          
          {/* Audio player fallback so partner's voice is always heard loudly */}
          <audio
            ref={(el) => {
              if (el && remoteStream && el.srcObject !== remoteStream) {
                el.srcObject = remoteStream;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted={isSpeakerMuted}
          />

          {/* ============================================================ */}
          {/* 1. WHATSAPP-STYLE AUDIO CALL SCREEN                          */}
          {/* ============================================================ */}
          {!callIsVideo ? (
            <div className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full py-6">
              
              {/* Top Security & Partner Status */}
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-semibold text-emerald-300">English Booster Voice</span>
                </div>
              </div>

              {/* Central Ripple Rings & Partner Avatar */}
              <div className="flex flex-col items-center justify-center text-center my-auto py-8">
                <div className="relative flex items-center justify-center mb-6">
                  {/* Expanding ripples */}
                  <span className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-emerald-500/20 animate-ping opacity-25 pointer-events-none" />
                  <span className="absolute w-40 h-40 sm:w-52 sm:h-52 rounded-full border border-emerald-500/30 animate-pulse pointer-events-none" />
                  <img
                    src={activePartner?.avatar || '/assets/images/tychique-bongo.jpg'}
                    alt={activePartner?.name || 'Partner'}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover ring-4 ring-emerald-500/80 shadow-[0_0_60px_rgba(0,168,132,0.4)] relative z-10"
                  />
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                  <span>{activePartner?.name}</span>
                  <span>{activePartner?.flag}</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {activePartner?.country} • Fluency Level <span className="text-emerald-400 font-bold">{activePartner?.level}</span>
                </p>

                {/* Call Timer or Ringing status */}
                {callStatus === 'calling' ? (
                  <div className="flex items-center gap-2 mt-5 px-4 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold text-xs animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Calling {activePartner?.name}...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 mt-5">
                    <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-widest">
                      {Math.floor(callDuration / 60)}:{callDuration % 60 < 10 ? '0' : ''}{callDuration % 60}
                    </span>
                    {/* Live Equalizer sound bars */}
                    <div className="flex items-center gap-1.5 h-6">
                      {[10, 22, 16, 26, 14, 28, 18, 12].map((h, idx) => (
                        <span
                          key={idx}
                          style={{ height: `${h}px` }}
                          className="w-1.5 rounded-full bg-emerald-400 animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom WhatsApp-style Dock */}
              <div className="w-full p-4 rounded-3xl bg-[#182229]/95 border border-white/10 backdrop-blur-xl flex items-center justify-around shadow-2xl">
                {/* Speaker Mute Button */}
                <button
                  type="button"
                  onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                  className={`p-3.5 rounded-full transition-all ${
                    isSpeakerMuted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
                >
                  {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Mic Mute Button */}
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !isCallMuted;
                    setIsCallMuted(nextMuted);
                    toggleAudioMute(nextMuted);
                  }}
                  className={`p-3.5 rounded-full transition-all ${
                    isCallMuted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-white/10 text-emerald-400 hover:bg-white/20'
                  }`}
                  title={isCallMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isCallMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Switch to Video Call */}
                <button
                  type="button"
                  onClick={async () => {
                    const stream = await getLocalUserMedia(true);
                    if (stream) setLocalStream(stream);
                    setCallIsVideo(true);
                  }}
                  className="p-3.5 rounded-full bg-white/10 text-cyan-400 hover:bg-white/20 transition-all"
                  title="Switch to Video Call"
                >
                  <Video className="w-5 h-5" />
                </button>

                {/* End Call */}
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                  title="End Call"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>

            </div>
          ) : (
            /* ============================================================ */
            /* 2. HIGH-RES VIDEO CALL SCREEN WITH PiP & LOCAL PREVIEW       */
            /* ============================================================ */
            <div className="flex-1 flex flex-col justify-between h-full min-h-0">
              
              {/* Top Video Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <img
                    src={activePartner?.avatar || '/assets/images/tychique-bongo.jpg'}
                    alt="Partner"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{activePartner?.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-black">
                        {remoteStream ? 'HD Video Live' : 'Connecting STUN...'}
                      </span>
                    </h3>
                    <p className="text-xs font-mono font-bold text-cyan-400">
                      {Math.floor(callDuration / 60)}:{callDuration % 60 < 10 ? '0' : ''}{callDuration % 60}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 hidden sm:inline">WebRTC Peer-to-Peer</span>
                </div>
              </div>

              {/* Video Content Canvas */}
              <div className="flex-1 py-3 min-h-0 relative">
                {remoteStream ? (
                  /* Main Remote Video Screen with Floating PiP */
                  <div className="w-full h-full rounded-3xl overflow-hidden bg-[#0a0f1d] border border-white/10 relative flex items-center justify-center shadow-2xl">
                    <video
                      ref={(el) => {
                        remoteVideoRef.current = el;
                        if (el && remoteStream && el.srcObject !== remoteStream) {
                          el.srcObject = remoteStream;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={isSpeakerMuted}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2 z-10">
                      <span>{activePartner?.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>

                    {/* Floating PiP Local Camera Preview */}
                    <div className="absolute bottom-4 right-4 w-28 xs:w-40 sm:w-60 aspect-video rounded-xl sm:rounded-2xl overflow-hidden border-2 border-cyan-400/50 shadow-2xl bg-slate-900 z-20">
                      {isCameraOff ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-2 text-center">
                          <img
                            src={getUserAvatar(profile?.avatar_url, profile?.full_name, user?.email)}
                            alt="You"
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20 mb-1"
                          />
                          <span className="text-[10px] text-slate-400">Camera Off</span>
                        </div>
                      ) : (
                        <video
                          ref={(el) => {
                            localVideoRef.current = el;
                            if (el && localStream && el.srcObject !== localStream) {
                              el.srcObject = localStream;
                              el.play().catch(() => {});
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute bottom-1.5 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-bold text-white">
                        You {isCallMuted && '(Muted)'}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Waiting for partner connection: Split card with Local Camera Active Preview */
                  <div className="w-full h-full flex flex-col md:grid md:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto">
                    {/* Ringing Partner Card */}
                    <div className="w-full h-full rounded-3xl bg-[#111b21] border border-white/10 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden shadow-2xl">
                      <div className="relative mb-4">
                        <span className="absolute inset-0 w-28 h-28 rounded-full border border-cyan-400 animate-ping opacity-40 pointer-events-none" />
                        <img
                          src={activePartner?.avatar || '/assets/images/tychique-bongo.jpg'}
                          alt="Partner"
                          className="w-24 h-24 rounded-full object-cover ring-4 ring-cyan-500 shadow-xl relative z-10"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-white">{activePartner?.name}</h3>
                      <p className="text-xs text-cyan-400 font-semibold mt-1">Calling for live English video session...</p>
                      <span className="text-[11px] text-slate-400 mt-2">Waiting for partner to answer WebRTC peer stream</span>
                    </div>

                    {/* Local Camera Live Viewfinder (High-Tech HUD) */}
                    <div className="w-full h-full rounded-3xl bg-[#070d1b] border-2 border-cyan-500/40 flex items-center justify-center relative overflow-hidden shadow-2xl group">
                      {/* Viewfinder corner brackets */}
                      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-20" />
                      <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-20" />
                      <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-20" />
                      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-20" />

                      {/* Viewfinder Top HUD */}
                      <div className="absolute top-3 left-10 right-10 flex items-center justify-between text-[11px] font-mono text-cyan-300 pointer-events-none z-20">
                        <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          <span className="font-bold">VIEWFINDER • HD</span>
                        </div>
                        <span className="bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                          720p 60FPS
                        </span>
                      </div>

                      {isCameraOff ? (
                        <div className="text-center p-6 z-10">
                          <VideoOff className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                          <p className="text-xs text-slate-300 font-bold">Camera is turned off</p>
                          <p className="text-[11px] text-slate-500 mt-1">Click the video button below to enable camera</p>
                        </div>
                      ) : (
                        <video
                          ref={(el) => {
                            localVideoRef.current = el;
                            if (el && localStream && el.srcObject !== localStream) {
                              el.srcObject = localStream;
                              el.play().catch(() => {});
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      )}

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 px-4 py-1.5 rounded-full text-xs font-bold text-cyan-300 backdrop-blur-md border border-cyan-500/30 shadow-lg z-20 flex items-center gap-2">
                        <Video className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Self-Preview • Frame Your Face</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Call Controls Dock */}
              <div className="flex items-center justify-center gap-3 pt-3 border-t border-white/10 shrink-0">
                {/* Mute Mic */}
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !isCallMuted;
                    setIsCallMuted(nextMuted);
                    toggleAudioMute(nextMuted);
                  }}
                  className={`p-3.5 rounded-full transition-all ${
                    isCallMuted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isCallMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isCallMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextCam = !isCameraOff;
                    setIsCameraOff(nextCam);
                    toggleCamera(nextCam);
                  }}
                  className={`p-3.5 rounded-full transition-all ${
                    isCameraOff ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-cyan-400" />}
                </button>

                {/* Switch to Audio Only */}
                <button
                  type="button"
                  onClick={() => setCallIsVideo(false)}
                  className="p-3.5 rounded-full bg-white/10 text-emerald-400 hover:bg-white/20 transition-all"
                  title="Switch to Audio Only"
                >
                  <Phone className="w-5 h-5" />
                </button>

                {/* End Call */}
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>End Call</span>
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* WHATSAPP CONTAINER (Real Sidebar + Real Discussion Stage)      */}
      {/* ============================================================== */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 grid-rows-1 overflow-hidden rounded-none md:rounded-2xl border-0 md:border md:border-white/10 bg-[#111b21] shadow-2xl h-full">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: REAL MEMBERS DIRECTORY                          */}
        {/* ============================================================ */}
        <aside className={`md:col-span-5 lg:col-span-4 flex flex-col h-full min-h-0 overflow-hidden border-r border-white/10 bg-[#111b21] ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header */}
          <div className="h-14 sm:h-16 px-3.5 sm:px-4 bg-[#202c33] flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={getUserAvatar(profile?.avatar_url, profile?.full_name, user?.email)}
                  alt="My Profile"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/40"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1.5 ring-[#202c33]" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-white block truncate leading-tight">
                  {profile?.full_name || (user ? user.email?.split('@')[0] : 'Guest User')}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Real Database Members
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </Link>
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="p-2 rounded-full hover:bg-white/10 text-emerald-400 transition-colors"
                title="Invite Member"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2.5 bg-[#111b21] border-b border-white/5 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search registered members..."
                className="w-full pl-9 pr-3 py-2 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Real Registered Members List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5 scrollbar-thin chat-scroll-container">
            {loadingPartners ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading registered members...</p>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white">No other registered members found.</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Only real registered users appear here. Invite a conversation partner to start practicing!
                </p>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Invite Partner
                </button>
              </div>
            ) : (
              filteredPartners.map((partner) => {
                const isSelected = activePartner?.id === partner.id;
                const isOnline = Boolean(partner.is_online || onlineUserIds.has(partner.id));
                const msgs = conversationMap[partner.id] || [];
                const lastMsg = msgs[msgs.length - 1];

                return (
                  <button
                    key={partner.id}
                    onClick={() => {
                      playSound?.('click');
                      setActivePartnerId(partner.id);
                      setMobileShowChat(true);
                      setShowEmojiPicker(false);
                    }}
                    className={`w-full px-3.5 py-3 flex items-center gap-3 transition-colors text-left ${
                      isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={partner.avatar}
                        alt={partner.name}
                        className={`w-12 h-12 rounded-full object-cover transition-all ${
                          isOnline ? 'ring-2 ring-emerald-500/60' : 'ring-1 ring-amber-400/50 ring-dashed'
                        }`}
                      />
                      {isOnline ? (
                        <span 
                          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00a884] border-2 border-[#111b21] shadow-[0_0_8px_rgba(0,168,132,0.8)]" 
                          title="on line" 
                        />
                      ) : (
                        <span 
                          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-dashed border-amber-400 bg-amber-500/40" 
                          title="outline" 
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 gap-1">
                        <span className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <span>{partner.name}</span>
                          <span>{partner.flag}</span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isOnline ? (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              on line
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border border-dashed border-amber-400/70 bg-amber-500/10 text-amber-300 inline-flex items-center gap-1 uppercase tracking-wider">
                              outline
                            </span>
                          )}
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-[#202c33] text-slate-300 border border-white/5">
                            {partner.level}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 truncate">
                        {lastMsg ? lastMsg.text : partner.specialty}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </aside>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: REAL CONVERSATION VIEW & REMOTE WEBRTC CALLS  */}
        {/* ============================================================ */}
        <section className={`md:col-span-7 lg:col-span-8 flex flex-col h-full min-h-0 overflow-hidden bg-[#0b141a] ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
          
          {activePartner ? (
            <>
              {/* WhatsApp Active Chat Header */}
              <div className="h-14 sm:h-16 px-2.5 sm:px-4 bg-[#202c33] flex items-center justify-between border-b border-white/10 shrink-0 z-10">
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileShowChat(false);
                      inputRef.current?.blur();
                    }}
                    className="md:hidden p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white shrink-0 active:scale-95 transition-transform cursor-pointer"
                    title="Back to Chats"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <img
                      src={activePartner.avatar}
                      alt={activePartner.name}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover transition-all ${
                        activePartner.is_online ? 'ring-2 ring-emerald-500/70' : 'ring-1 ring-amber-400/50 ring-dashed'
                      }`}
                    />
                    {activePartner.is_online ? (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#00a884] border-2 border-[#202c33] shadow-[0_0_8px_rgba(0,168,132,0.8)]" title="on line" />
                    ) : (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-dashed border-amber-400 bg-amber-500/40" title="outline" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-1 sm:gap-1.5 truncate leading-tight">
                      <span className="truncate">{activePartner.name}</span>
                      <span className="shrink-0">{activePartner.flag}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hidden sm:inline-flex shrink-0">
                        {activePartner.level}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 sm:gap-1.5 mt-0.5">
                      <span className="hidden xs:inline">{activePartner.country} •</span>
                      {activePartner.is_online ? (
                        <span className="text-[#00a884] font-semibold inline-flex items-center gap-1 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-pulse" />
                          online
                        </span>
                      ) : (
                        <span className="text-amber-400/90 font-medium inline-flex items-center gap-1 text-[11px]">
                          <WifiOff className="w-2.5 h-2.5 text-amber-400" />
                          offline
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* WhatsApp Action Icons (Video, Audio, Options) */}
                <div className="flex items-center gap-0.5 sm:gap-1.5 text-[#aebac1] shrink-0">
                  {/* WhatsApp Video Call */}
                  <button
                    type="button"
                    onClick={() => handleStartRemoteCall(true)}
                    className="p-1.5 sm:p-2.5 rounded-full hover:bg-white/10 text-[#aebac1] hover:text-white transition-colors cursor-pointer active:scale-95"
                    title={activePartner.is_online ? "HD Video Call (on line)" : "HD Video Call (outline)"}
                  >
                    <Video className="w-5 h-5" />
                  </button>

                  {/* WhatsApp Voice Call */}
                  <button
                    type="button"
                    onClick={() => handleStartRemoteCall(false)}
                    className="p-1.5 sm:p-2.5 rounded-full hover:bg-white/10 text-[#aebac1] hover:text-white transition-colors cursor-pointer active:scale-95"
                    title={activePartner.is_online ? "Voice Call (on line)" : "Voice Call (outline)"}
                  >
                    <Phone className="w-5 h-5" />
                  </button>

                  {/* WhatsApp Options / Clear */}
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="p-1.5 sm:p-2.5 rounded-full hover:bg-white/10 text-[#aebac1] hover:text-white transition-colors cursor-pointer active:scale-95"
                    title="Menu / Clear conversation"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Real Messages Feed */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3 sm:px-5 sm:py-4 space-y-2.5 sm:space-y-3 relative overscroll-contain chat-scroll-container"
                style={{
                  backgroundColor: '#0b141a',
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0, 168, 132, 0.04) 0%, transparent 60%)`,
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                }}
              >
                <div className="flex justify-center my-1 sticky top-2 z-10">
                  <span className="px-3 py-1 rounded-lg bg-[#182229] border border-white/5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    End-to-End Real Chat
                  </span>
                </div>

                {currentMessages.length === 0 ? (
                  <div className="text-center py-12 space-y-3 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-white font-bold">
                      Direct conversation with {activePartner.name}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Send a message, record a voice note, or launch a distinct Audio or Video call above!
                    </p>
                  </div>
                ) : (
                  currentMessages.map((msg) => {
                    const isMe = msg.sender_id === (user?.id || 'me');
                    const isSelected = selectedMsgId === msg.id;
                    const isHighlighted = highlightedMsgId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        id={`msg-${msg.id}`}
                        className={`flex items-end gap-1.5 group relative transition-all duration-300 rounded-2xl ${
                          isHighlighted ? 'ring-2 ring-emerald-400 bg-emerald-500/15 p-1 scale-[1.01]' : ''
                        } ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          onClick={() => setSelectedMsgId(prev => prev === msg.id ? null : msg.id)}
                          style={{ touchAction: 'pan-y' }}
                          className={`relative max-w-[85%] sm:max-w-md px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md group/bubble cursor-pointer select-text transition-all ${
                            isMe
                              ? 'bg-[#005c4b] text-white rounded-tr-none'
                              : 'bg-[#202c33] text-white rounded-tl-none border border-white/5'
                          }`}
                        >
                          {/* Floating quick actions on bubble hover or tap */}
                          <div className={`absolute -top-3.5 ${isMe ? 'right-2' : 'left-2'} ${
                            isSelected ? 'flex' : 'hidden group-hover/bubble:flex'
                          } items-center gap-1 bg-[#111b21] border border-white/20 px-2 py-0.5 rounded-full shadow-xl z-20 animate-fade-in`}>
                            {/* Reply button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartReply(msg);
                              }}
                              className="p-1 hover:text-emerald-400 text-slate-300 transition-colors flex items-center gap-1"
                              title="Répondre (Scroll & Citer) / Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>

                            {/* Share button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareMessage(msg);
                              }}
                              className="p-1 hover:text-cyan-300 text-slate-300 transition-colors"
                              title="Partager ce message / Share"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyMessage(msg.text, msg.id);
                              }}
                              className="p-1 hover:text-cyan-300 text-slate-300 transition-colors"
                              title="Copier le texte / Copy"
                            >
                              {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(msg.id);
                              }}
                              className="p-1 hover:text-rose-400 text-slate-300 transition-colors"
                              title="Delete message / Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quoted Reply Card inside Bubble */}
                          {msg.reply_to && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToMessage(msg.reply_to!.id);
                              }}
                              className="mb-2 p-2 rounded-xl bg-black/30 border-l-4 border-emerald-400 hover:bg-black/50 transition-colors cursor-pointer text-left select-none group/quote"
                              title="Cliquer pour faire défiler jusqu'au message cité"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                                <span className="flex items-center gap-1">
                                  <CornerDownRight className="w-3 h-3 text-emerald-400" />
                                  {msg.reply_to.sender_name}
                                </span>
                                <span className="text-[9px] text-emerald-400/80 group-hover/quote:underline">
                                  Voir le message ↗
                                </span>
                              </div>
                              <p className="text-xs text-white/85 line-clamp-2 mt-0.5 font-normal">
                                {msg.reply_to.text}
                              </p>
                            </div>
                          )}

                          {/* WhatsApp-Style Missed Call or Standard Message Bubble */}
                          {(() => {
                            const rawText = msg?.text || '';
                            const isMissedCall = /missed\s*(voice|video)?\s*call|appel\s*(vocal|vidéo|video)?\s*manqué/i.test(rawText);
                            const isVideoMissed = /video|vidéo/i.test(rawText);

                            if (isMissedCall) {
                              return (
                                <div className="py-1 px-0.5 flex flex-col gap-2 min-w-[210px] sm:min-w-[250px]">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400 shadow-sm">
                                      {isVideoMissed ? <VideoOff className="w-5 h-5 text-rose-400" /> : <PhoneOff className="w-5 h-5 text-rose-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-extrabold text-sm text-rose-300 flex items-center gap-1.5 leading-tight">
                                        <span>{isVideoMissed ? (isFr ? "Appel vidéo manqué" : "Missed video call") : (isFr ? "Appel vocal manqué" : "Missed voice call")}</span>
                                      </p>
                                      <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">
                                        {isMe 
                                          ? (isFr ? "Appel sortant non décroché" : "Outgoing call was not answered") 
                                          : (isFr ? "Appel manqué • Touchez pour rappeler" : "Missed call • Tap to call back")}
                                      </p>
                                    </div>
                                  </div>

                                  {/* WhatsApp Call Back Action Button */}
                                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                      {isVideoMissed ? (isFr ? "Vidéo HD" : "HD Video") : (isFr ? "Vocal Direct" : "Direct Voice")}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartRemoteCall(isVideoMissed);
                                      }}
                                      className="px-3 py-1 rounded-full bg-[#00a884] hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                                      title={isFr ? "Rappeler ce partenaire" : "Call back partner"}
                                    >
                                      {isVideoMissed ? <Video className="w-3.5 h-3.5 fill-slate-950" /> : <Phone className="w-3.5 h-3.5 fill-slate-950" />}
                                      <span>{isFr ? "Rappeler" : "Call back"}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return <p className="whitespace-pre-line text-sm break-words pr-4">{msg.text}</p>;
                          })()}

                          {/* Real Voice Note Player */}
                          {msg.audio_url && (
                            <div className="mt-2.5 p-2.5 rounded-2xl bg-black/25 border border-white/10 flex items-center gap-3 shadow-inner">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlayAudio(msg.id, msg.audio_url!);
                                }}
                                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] text-slate-950 flex items-center justify-center shrink-0 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                title={playingAudioId === msg.id ? "Pause" : "Play"}
                              >
                                {playingAudioId === msg.id ? (
                                  <Pause className="w-4 h-4 fill-slate-950" />
                                ) : (
                                  <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                                )}
                              </button>

                              <div className="flex-1 flex flex-col justify-center min-w-[120px] gap-1">
                                {/* Waveform visualizer */}
                                <div className="flex items-center gap-1 h-5 overflow-hidden">
                                  {[8, 16, 22, 14, 20, 10, 18, 12, 24, 15, 19, 11, 25, 14, 20, 9].map((h, idx) => {
                                    const isPlaying = playingAudioId === msg.id;
                                    return (
                                      <span
                                        key={idx}
                                        style={{ height: `${h}px` }}
                                        className={`w-1 rounded-full transition-all ${
                                          isPlaying 
                                            ? 'bg-emerald-400 animate-pulse' 
                                            : 'bg-white/40'
                                        }`}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-white/70 font-mono">
                                  <span>{audioProgress[msg.id] ? formatAudioTime(audioProgress[msg.id].currentTime) : '0:00'}</span>
                                  <span>{audioProgress[msg.id]?.duration ? formatAudioTime(audioProgress[msg.id].duration) : ''}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSpeedRate();
                                }}
                                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-black text-emerald-300 hover:text-white transition-colors shrink-0 cursor-pointer"
                                title="Playback Speed"
                              >
                                {audioPlaybackRate}x
                              </button>
                            </div>
                          )}

                          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-white/70 select-none">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakEnglishText(msg.text, msg.id);
                              }}
                              className={`p-0.5 rounded hover:text-white transition-colors flex items-center gap-0.5 mr-auto ${
                                speakingMsgId === msg.id ? 'text-amber-300 animate-pulse' : 'text-white/60'
                              }`}
                              title="Listen to English Pronunciation"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span className="text-[9px]">Listen</span>
                            </button>

                            {/* Reply Quick Action */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartReply(msg);
                              }}
                              className="opacity-0 group-hover/bubble:opacity-100 p-0.5 rounded text-white/50 hover:text-emerald-400 transition-all cursor-pointer"
                              title="Répondre / Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>

                            {/* Share Quick Action */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareMessage(msg);
                              }}
                              className="opacity-0 group-hover/bubble:opacity-100 p-0.5 rounded text-white/50 hover:text-cyan-400 transition-all cursor-pointer"
                              title="Partager ce message / Share"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Direct Delete Shortcut Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(msg.id);
                              }}
                              className="opacity-0 group-hover/bubble:opacity-100 p-0.5 rounded text-white/40 hover:text-rose-400 transition-all cursor-pointer"
                              title="Delete message / Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <span>
                              {(() => {
                                try {
                                  const d = msg.created_at ? new Date(msg.created_at) : new Date();
                                  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } catch {
                                  return '';
                                }
                              })()}
                            </span>

                            {/* WhatsApp Checkmarks: 2 traits bleus si lu ('read'), 1 trait si non connecté ('sent'), 2 traits gris si reçu ('delivered') */}
                            {isMe && (
                              <span className="flex items-center ml-0.5">
                                {msg.status === 'read' ? (
                                  <span title="Lu par le partenaire (Deux traits bleus)">
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                  </span>
                                ) : (!activePartner.is_online || msg.status === 'sent') ? (
                                  <span title="Envoyé (Partenaire non connecté : 1 trait)">
                                    <Check className="w-3.5 h-3.5 text-slate-300" />
                                  </span>
                                ) : (
                                  <span title="Distribué (Partenaire connecté : 2 traits gris)">
                                    <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Compose Bar (WhatsApp Authentic) */}
              <div className="p-2 sm:p-3 bg-[#202c33] border-t border-[#2a3942] shrink-0 safe-pb relative">
                
                {/* Replying To Quote Banner (WhatsApp Style) */}
                {replyingTo && (
                  <div className="mb-2 p-2.5 rounded-xl bg-[#111b21] border-l-4 border-[#00a884] border-y border-r border-white/10 flex items-center justify-between gap-3 animate-fade-in shadow-md">
                    <button
                      type="button"
                      onClick={() => scrollToMessage(replyingTo.id)}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                      title="Cliquer pour faire défiler jusqu'au message / Scroll to message"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#00a884]">
                        <Reply className="w-3.5 h-3.5" />
                        <span>Répondre à {replyingTo.sender_name}</span>
                      </div>
                      <p className="text-[11px] text-[#8696a0] truncate mt-0.5">
                        {replyingTo.text || (replyingTo.audio_url ? '🎵 Message vocal / Voice note' : '')}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 rounded-full hover:bg-white/10 text-[#8696a0] hover:text-white transition-colors shrink-0 cursor-pointer"
                      title="Annuler la réponse"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* AI Grammar Correction Tooltip (Sleek Floating Chip) */}
                {grammarSuggestion && (
                  <div className="mb-2 p-2.5 rounded-xl bg-[#111b21] border border-amber-500/30 flex items-center justify-between gap-3 animate-fade-in shadow-lg">
                    <div className="text-xs">
                      <p className="font-bold text-white">
                        <span className="line-through text-rose-400 mr-1.5">{grammarSuggestion.original}</span>
                        ➔ <span className="text-[#00a884] font-extrabold ml-1">{grammarSuggestion.corrected}</span>
                      </p>
                      <p className="text-[11px] text-[#8696a0] mt-0.5">{grammarSuggestion.explanation}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInputText(prev => prev.replace(grammarSuggestion.original, grammarSuggestion.corrected));
                        setGrammarSuggestion(null);
                        playSound?.('chime');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#00a884] text-slate-950 font-black text-xs shrink-0 cursor-pointer"
                    >
                      Apply ✓
                    </button>
                  </div>
                )}

                {/* WhatsApp Attachment Menu Popup */}
                {showAttachMenu && (
                  <div className="absolute bottom-16 left-2 sm:left-6 p-2 rounded-2xl bg-[#233138] border border-white/10 shadow-2xl flex flex-col gap-1 z-30 animate-fade-in w-64 max-w-[calc(100vw-1rem)]">
                    <div className="flex items-center justify-between px-2.5 py-1">
                      <span className="text-[10px] font-black uppercase text-[#8696a0]">Quick Practice Topics</span>
                      <button 
                        type="button"
                        onClick={() => setShowAttachMenu(false)}
                        className="text-[#8696a0] hover:text-white text-xs p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {CONVERSATION_STARTERS.slice(0, 4).map((starter, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          handleSendMessage(undefined, starter);
                          setShowAttachMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 text-xs text-[#e9edef] truncate transition-colors active:scale-98"
                      >
                        💬 {starter}
                      </button>
                    ))}
                  </div>
                )}

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="mb-2 p-2 rounded-xl bg-[#111b21] border border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none animate-fade-in">
                    {POPULAR_EMOJIS.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setInputText(prev => prev + ' ' + emoji);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Recording Bar or WhatsApp Input Form */}
                {isRecording ? (
                  <div className="p-2 sm:p-2.5 rounded-2xl bg-[#182229] border border-rose-500/40 flex items-center justify-between gap-2 sm:gap-4 shadow-lg animate-fade-in">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-white font-mono shrink-0">
                        {Math.floor(recordingSeconds / 60)}:{recordingSeconds % 60 < 10 ? '0' : ''}{recordingSeconds % 60}
                      </span>
                      {/* Live recording waveform simulator */}
                      <div className="hidden xs:flex items-center gap-1 h-5 overflow-hidden">
                        {[10, 20, 14, 26, 18, 12, 24, 16, 28, 12, 22, 14, 8].map((h, i) => (
                          <span
                            key={i}
                            className="w-1 rounded-full bg-rose-400 animate-pulse"
                            style={{
                              height: `${h}px`,
                              animationDelay: `${i * 90}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold hover:bg-white/20 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Cancel recording"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span className="hidden xs:inline">Cancel</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-4 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Send voice note"
                      >
                        <Send className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* WhatsApp Emoji Button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1.5 text-[#8696a0] hover:text-[#d1d7db] transition-colors shrink-0 cursor-pointer"
                      title="Emojis"
                    >
                      <Smile className="w-6 h-6" />
                    </button>

                    {/* WhatsApp Attachment Button */}
                    <button
                      type="button"
                      onClick={() => setShowAttachMenu(!showAttachMenu)}
                      className="p-1.5 text-[#8696a0] hover:text-[#d1d7db] transition-colors shrink-0 cursor-pointer"
                      title="Attach / Quick topics"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    {/* Native WhatsApp Text Input Field */}
                    <input
                      ref={inputRef}
                      type="text"
                      lang="en"
                      spellCheck={true}
                      autoCorrect="on"
                      autoCapitalize="sentences"
                      inputMode="text"
                      value={inputText}
                      onFocus={() => {
                        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputText(val);
                        setGrammarSuggestion(detectGrammarIssue(val));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={user ? "Type a message" : "Sign in to send messages..."}
                      className="flex-1 min-w-0 py-2.5 px-4 bg-[#2a3942] rounded-lg text-[#d1d7db] placeholder-[#8696a0] text-sm sm:text-[15px] focus:outline-none transition-colors border border-transparent"
                    />

                    {/* WhatsApp Action: Send if text, Mic if empty */}
                    {inputText.trim() ? (
                      <button
                        type="submit"
                        className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] text-slate-950 flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
                        title="Send Message"
                      >
                        <Send className="w-4 h-4 fill-slate-950 ml-0.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-10 h-10 rounded-full text-[#8696a0] hover:text-[#00a884] hover:bg-white/5 flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95"
                        title="Record Voice Note"
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                    )}
                  </form>
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">English Booster WhatsApp Chat</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                Connect and practice speaking English with registered members worldwide via real-time text, voice notes, and live audio/video calls.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors"
                >
                  <Home className="w-4 h-4 text-cyan-400" />
                  <span>Home</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              </div>
            </div>
          )}

        </section>

      </div>

      {/* Clear Conversation Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#182229] border border-rose-500/40 p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Clear this conversation?</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                This will permanently delete all messages and voice notes with <strong className="text-white">{activePartner?.name}</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearConversation}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-lg cursor-pointer"
              >
                Delete All / Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signal Outline Warning Modal for Offline Partner Call */}
      {showOfflineCallModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#111b21] border-2 border-amber-500/80 p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center">
            {/* Outline Signal Icon */}
            <div className="w-16 h-16 rounded-full border-2 border-amber-400 bg-amber-500/10 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse">
              <WifiOff className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Signal Outline : Partenaire Hors Ligne
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              {activePartner?.name} n&apos;est pas connecté(e)
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Le signal outline indique que <strong className="text-amber-300">{activePartner?.name}</strong> est actuellement déconnecté(e). Il/elle ne pourra peut-être pas décrocher l&apos;appel en direct.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleStartRemoteCall(showOfflineCallModal.videoMode, true)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer"
              >
                <Phone className="w-4 h-4 fill-slate-950" />
                <span>Lancer l&apos;appel quand même / Call Anyway</span>
              </button>

              <button
                type="button"
                onClick={() => handleRecordMissedCallDirectly(showOfflineCallModal.videoMode)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <PhoneOff className="w-4 h-4 text-rose-400" />
                <span>Laisser un avis d&apos;appel manqué / Leave Missed Call Alert</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOfflineCallModal(null);
                  inputRef.current?.focus();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Laisser un message / Send Message</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOfflineCallModal(null)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <InvitePartnerModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

    </div>
  );
}

export default function ChatPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RealConversationContent />
    </React.Suspense>
  );
}
