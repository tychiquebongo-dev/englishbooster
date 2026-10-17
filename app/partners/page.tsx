'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import { isRealPartnerProfile } from '@/lib/partnerHelper';
import { GEMINI_AI_PARTNER } from '@/lib/aiAgent';
import { broadcastIncomingCall } from '@/lib/callSignaling';
import type { Database } from '@/lib/database.types';
import { 
  Users, 
  Search, 
  Filter, 
  PhoneCall, 
  MessageSquare, 
  Star, 
  Sparkles, 
  Globe, 
  CheckCircle2, 
  Flame,
  UserPlus,
  Tv,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Video,
  Download,
  ArrowRight
} from 'lucide-react';
import InvitePartnerModal from '@/components/InvitePartnerModal';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface DisplayPartner {
  id: string;
  name: string;
  avatar: string;
  country: string;
  flag: string;
  level: string;
  target_level?: string;
  bio: string;
  specialty: string;
  interests: string[];
  is_online: boolean;
  rating?: number;
  reviews_count?: number;
  streak?: number;
  is_ai?: boolean;
}

export interface RegisteredMemberShort {
  id: string;
  title: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_flag?: string;
  author_level?: string;
  video_url: string;
  transcript: string;
  category: string;
  level: string;
  likes_count: number;
  created_at: string;
}

export default function PartnersPage() {
  const router = useRouter();
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [partners, setPartners] = useState<DisplayPartner[]>([]);
  const [memberShorts, setMemberShorts] = useState<RegisteredMemberShort[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'shorts'>('members');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedInterest, setSelectedInterest] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Directly initiate call and immediately ring partner's phone & wake notification
  const handleCallPartner = async (e: React.MouseEvent, partner: DisplayPartner) => {
    e.preventDefault();
    playSound('call');

    if (partner.is_ai) {
      router.push(`/call?partnerId=eb-ai-coach&partnerName=${encodeURIComponent(partner.name)}&video=true&ai=true`);
      return;
    }

    const roomId = `room_${user?.id ? [user.id, partner.id].sort().join('_') : partner.id}_${Date.now()}`;

    // Immediately trigger background Web Push and Realtime notifications to ring partner's phone
    if (user?.id) {
      try {
        await broadcastIncomingCall({
          callerId: user.id,
          callerName: profile?.full_name || 'English Learner',
          callerAvatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
          callerFlag: profile?.flag || '🌐',
          callerLevel: profile?.current_level || 'B2',
          receiverId: partner.id,
          roomId: roomId,
          isVideo: true,
        });
      } catch (err) {
        console.warn('Partner immediate call broadcast error:', err);
      }
    }

    router.push(`/call?partnerId=${partner.id}&partnerName=${encodeURIComponent(partner.name)}&video=true&roomId=${roomId}`);
  };

  useEffect(() => {
    const fetchRegisteredPartners = async () => {
      try {
        // Query ONLY REAL registered members and real shorts concurrently
        const [
          { data, error },
          { data: shortsData }
        ] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('posts').select('*').eq('category', 'short').not('media_url', 'is', null).order('created_at', { ascending: false })
        ]);

        if (data && data.length > 0) {
          // Strictly filter out test, mock, and unreal profiles
          const realMembersData = data.filter(isRealPartnerProfile);

          // Map profiles of real registered users
          const realPartners: DisplayPartner[] = realMembersData.map((p: Profile) => {
            const isFounder = p.email === 'tychiquebongo@gmail.com' || p.role === 'admin';
            return {
              id: p.id,
              name: p.full_name || (isFounder ? 'Tychique Bongo' : (isFr ? 'Membre Inscrit' : 'Registered Member')),
              avatar: getUserAvatar(p.avatar_url, p.full_name, p.email),
              country: isFounder ? "Côte d'Ivoire" : (p.country || 'France'),
              flag: isFounder ? '🇨🇮' : (p.flag || '🌐'),
              level: isFounder ? 'C2' : (p.current_level || 'B1'),
              target_level: isFounder ? 'C2' : (p.target_level || undefined),
              bio: isFounder 
                ? "Fondateur & CEO d'English Booster. Coach en fluidité et prise de parole en public."
                : (p.bio || (isFr 
                    ? "Membre actif inscrit sur English Booster pour pratiquer l'anglais à l'oral." 
                    : "Active member registered on English Booster to practice spoken English.")),
              specialty: isFounder
                ? (isFr ? '👑 Fondateur & Coach C2' : '👑 Founder & C2 Coach')
                : (p.target_level 
                  ? `${isFr ? 'Objectif' : 'Goal'} ${p.target_level}` 
                  : (isFr ? 'Conversation Réelle' : 'Real Conversation')),
              interests: isFounder 
                ? ['Public Speaking', 'Coaching', 'Leadership', 'Tech'] 
                : (p.interests && p.interests.filter((i: string) => !i.startsWith('__eb_push__:')).length > 0 
                    ? p.interests.filter((i: string) => !i.startsWith('__eb_push__:')) 
                    : ['Conversation', 'Travel', 'Tech']),
              is_online: Boolean(p.is_online && p.updated_at && (Date.now() - new Date(p.updated_at).getTime() < 90000)),
              streak: p.streak ?? 0,
            };
          });

          // Create Gemini AI Partner card (pinned 24/7 speaking partner & coach)
          const geminiPartner: DisplayPartner = {
            id: GEMINI_AI_PARTNER.id,
            name: GEMINI_AI_PARTNER.name,
            avatar: GEMINI_AI_PARTNER.avatar,
            country: GEMINI_AI_PARTNER.country,
            flag: GEMINI_AI_PARTNER.flag,
            level: GEMINI_AI_PARTNER.level,
            target_level: GEMINI_AI_PARTNER.target_level,
            bio: isFr 
              ? "Bonjour ! Je suis Gemini AI, votre partenaire & assistant IA en anglais disponible 24h/24. Posez-moi toutes vos questions, discutons en direct, développons votre fluidité orale, corrigeons vos erreurs et pratiquons la conversation sans stress !"
              : GEMINI_AI_PARTNER.bio,
            specialty: isFr ? '✨ Google Gemini IA Partenaire • 24/7' : GEMINI_AI_PARTNER.specialty,
            interests: GEMINI_AI_PARTNER.interests,
            is_online: true,
            rating: 5.0,
            reviews_count: 3180,
            streak: 365,
            is_ai: true,
          };

          setPartners([geminiPartner, ...realPartners]);
        } else {
          const geminiPartner: DisplayPartner = {
            id: GEMINI_AI_PARTNER.id,
            name: GEMINI_AI_PARTNER.name,
            avatar: GEMINI_AI_PARTNER.avatar,
            country: GEMINI_AI_PARTNER.country,
            flag: GEMINI_AI_PARTNER.flag,
            level: GEMINI_AI_PARTNER.level,
            target_level: GEMINI_AI_PARTNER.target_level,
            bio: isFr 
              ? "Bonjour ! Je suis Gemini AI, votre partenaire & assistant IA en anglais disponible 24h/24. Posez-moi toutes vos questions, discutons en direct, développons votre fluidité orale, corrigeons vos erreurs et pratiquons la conversation sans stress !"
              : GEMINI_AI_PARTNER.bio,
            specialty: isFr ? '✨ Google Gemini IA Partenaire • 24/7' : GEMINI_AI_PARTNER.specialty,
            interests: GEMINI_AI_PARTNER.interests,
            is_online: true,
            rating: 5.0,
            reviews_count: 3180,
            streak: 365,
            is_ai: true,
          };
          setPartners([geminiPartner]);
        }

        if (shortsData && shortsData.length > 0) {
          let authorsMap: Record<string, any> = {};
          if (data && data.length > 0) {
            for (const a of data) {
              if (isRealPartnerProfile(a)) {
                authorsMap[a.id] = a;
              }
            }
          }

          const mappedShorts: RegisteredMemberShort[] = shortsData
            .filter((sp) => !sp.user_id || authorsMap[sp.user_id])
            .map((sp) => {
            const author = authorsMap[sp.user_id];
            const parts = sp.content.split(':::');
            const title = parts[0] || 'English Practice Short';
            const transcript = parts[1] || parts[0] || '';
            const category = parts[2] || 'Community English';
            const level = parts[3] || 'B2';

            return {
              id: sp.id,
              title,
              author_id: sp.user_id,
              author_name: author?.full_name || (isFr ? 'Membre Inscrit' : 'Registered Member'),
              author_avatar: getUserAvatar(author?.avatar_url, author?.full_name),
              author_flag: author?.flag || '🌐',
              author_level: author?.current_level || 'B2',
              video_url: sp.media_url,
              transcript,
              category,
              level,
              likes_count: sp.likes_count || 0,
              created_at: sp.created_at,
            };
          });
          setMemberShorts(mappedShorts);
        } else {
          setMemberShorts([]);
        }
      } catch (err) {
        console.error('Error fetching real partners & shorts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRegisteredPartners();
  }, [supabase, isFr]);

  // Compatibility score calculation based on user level and interests
  const calculateMatch = (partner: DisplayPartner) => {
    if (partner.is_ai) return 100;
    let score = 75;
    const userLevel = profile?.current_level || 'B1';
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const diff = Math.abs(levels.indexOf(userLevel) - levels.indexOf(partner.level));

    if (diff === 0) score += 18;
    else if (diff === 1) score += 12;
    else score += 5;

    // Check shared interests
    const userInterests = (profile?.interests || []).filter((i: string) => !i.startsWith('__eb_push__:'));
    const shared = partner.interests.filter(i => userInterests.includes(i));
    score += Math.min(10, shared.length * 4);

    return Math.min(99, Math.max(78, score));
  };

  // Filter partners: keep Gemini AI always and hide self from partners list
  const availablePartners = useMemo(() => {
    return user ? partners.filter(p => p.is_ai || p.id !== user.id) : partners;
  }, [user, partners]);

  const onlineCount = useMemo(() => availablePartners.filter(p => p.is_online).length, [availablePartners]);
  const offlineCount = useMemo(() => availablePartners.filter(p => !p.is_online).length, [availablePartners]);

  const filteredPartners = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = availablePartners.filter(p => {
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.interests.some(i => i.toLowerCase().includes(q));

      // Gemini AI speaks with learners of ALL CEFR levels
      const matchesLevel = selectedLevel === 'ALL' || p.is_ai || p.level === selectedLevel;
      const matchesInterest = selectedInterest === 'ALL' || p.is_ai || p.interests.includes(selectedInterest);

      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'ONLINE' && p.is_online) || 
        (statusFilter === 'OFFLINE' && !p.is_online);

      return matchesSearch && matchesLevel && matchesInterest && matchesStatus;
    });

    // Sort: Gemini AI always first, then Online partners, then alphabetical
    list.sort((a, b) => {
      if (a.is_ai && !b.is_ai) return -1;
      if (!a.is_ai && b.is_ai) return 1;
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [availablePartners, searchQuery, selectedLevel, selectedInterest, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      
      {/* Title & Filter Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Users className="w-3.5 h-3.5" />
          <span>{isFr ? "Réseau des Membres Inscrits" : "Registered Members Network"}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {isFr ? "Partenaires Réels de l'Application" : "Real Community Partners"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          {isFr 
            ? "Connectez-vous exclusivement avec les vrais membres inscrits sur English Booster pour échanger en direct."
            : "Connect exclusively with real members registered on English Booster to practice speaking live."}
        </p>

        <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setInviteModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-emerald-500/30 text-slate-700 dark:text-emerald-300 hover:text-slate-950 dark:hover:text-white font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isFr ? "Inviter des partenaires" : "Invite partners"}</span>
          </button>

          <Link
            href="/download"
            onClick={() => playSound('click')}
            className="px-5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{isFr ? "📲 Télécharger l'App (Mobile & PC)" : "📲 Download App (Mobile & PC)"}</span>
          </Link>

          <Link
            href="/shorts"
            onClick={() => playSound('click')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(74,222,128,0.25)]"
          >
            <Tv className="w-4 h-4" />
            <span>{isFr ? "Publier un Short Vidéo" : "Publish a Short Video"}</span>
          </Link>
        </div>

        {/* Banner: Install Mobile & PC App for Instant Call Alerts */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white">
                {isFr ? "Installez l'Application sur Mobile et PC" : "Install the App on Mobile and PC"}
              </p>
              <p className="text-slate-400 text-[11px]">
                {isFr ? "Recevez vos appels en direct avec sonnerie et vibreur persistant même hors ligne !" : "Get live partner calls with persistent ringing and vibration even offline!"}
              </p>
            </div>
          </div>
          <Link
            href="/download"
            onClick={() => playSound('click')}
            className="py-1.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <span>{isFr ? "Installer l'App" : "Install App"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tab Switcher: Membres vs Shorts des Inscrits */}
        <div className="pt-4 flex justify-center">
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 max-w-md w-full">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setActiveTab('members');
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isFr ? `Membres Inscrits (${partners.length})` : `Members (${partners.length})`}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setActiveTab('shorts');
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'shorts'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>{isFr ? `Shorts Publiés (${memberShorts.length})` : `Published Shorts (${memberShorts.length})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEW: TABS TOGGLE */}
      {activeTab === 'shorts' ? (
        /* TAB 2: ALL PUBLISHED SHORTS BY REGISTERED MEMBERS */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isFr ? "Toutes les Vidéos Shorts Publiées par les Membres Inscrits" : "All Shorts Published by Registered Members"}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isFr 
                  ? "Regardez les micro-vidéos partagées par la communauté ou lancez une conversation avec les créateurs."
                  : "Watch micro-videos shared by the community or start a conversation with the creators."}
              </p>
            </div>

            <Link
              href="/shorts"
              onClick={() => playSound('click')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md self-start sm:self-auto shrink-0"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{isFr ? "Ouvrir le Lecteur Reels" : "Open Reels Player"}</span>
            </Link>
          </div>

          {memberShorts.length === 0 ? (
            <div className="text-center py-16 saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 dark:text-rose-400">
                <Tv className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isFr ? "Aucune vidéo Short pour le moment" : "No Short videos yet"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isFr 
                    ? "Les vidéos fictives ont été retirées. Dès qu'un membre inscrit publie une vidéo courte depuis sa galerie, elle apparaîtra ici !"
                    : "Mock videos were removed. As soon as a registered member uploads a short from their gallery, it will appear here!"}
                </p>
              </div>
              <Link
                href="/shorts"
                onClick={() => playSound('click')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 dark:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg hover:bg-emerald-400 transition-colors"
              >
                <Tv className="w-4 h-4" />
                <span>{isFr ? "Publier la 1ère vidéo Short" : "Publish 1st Short Video"}</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {memberShorts.map((short) => (
                <PartnerShortCard
                  key={short.id}
                  short={short}
                  isFr={isFr}
                  playSound={playSound}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 1: REGISTERED MEMBERS DIRECTORY */
        <div className="space-y-8">
          
          {/* Recent Shorts Banner if members have published shorts */}
          {memberShorts.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-gradient-to-r dark:from-emerald-500/15 dark:via-[#0c152d] dark:to-teal-500/10 border border-emerald-500/20 dark:border-emerald-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm dark:shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isFr 
                      ? `${memberShorts.length} Short(s) vidéo publié(s) par les inscrits !` 
                      : `${memberShorts.length} Short video(s) published by members!`}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {isFr 
                      ? "Pratiquez votre écoute en découvrant leurs capsules vidéo en anglais."
                      : "Practice your listening with English capsules published by the community."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setActiveTab('shorts');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 dark:bg-emerald-400 hover:bg-emerald-400 dark:hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-all self-start sm:self-auto shrink-0 shadow-md cursor-pointer"
              >
                <span>{isFr ? "Voir tous les Shorts →" : "View all Shorts →"}</span>
              </button>
            </div>
          )}

          {/* SEARCH AND FILTERS BAR */}
          <div className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              
              {/* Search Input */}
              <div className="md:col-span-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isFr ? "Rechercher par prénom, pays ou intérêt..." : "Search by name, country or interest..."}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Level Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">{isFr ? "Tous les Niveaux CEFR" : "All CEFR Levels"}</option>
                  <option value="A1">A1 - {isFr ? "Débutant" : "Beginner"}</option>
                  <option value="A2">A2 - {isFr ? "Élémentaire" : "Elementary"}</option>
                  <option value="B1">B1 - {isFr ? "Intermédiaire" : "Intermediate"}</option>
                  <option value="B2">B2 - {isFr ? "Intermédiaire Supérieur" : "Upper Intermediate"}</option>
                  <option value="C1">C1 - {isFr ? "Avancé" : "Advanced"}</option>
                  <option value="C2">C2 - {isFr ? "Maîtrise / Bilingue" : "Mastery / Proficient"}</option>
                </select>
              </div>

              {/* Interest Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedInterest}
                  onChange={(e) => setSelectedInterest(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">{isFr ? "Tous les Centres d'Intérêt" : "All Interests"}</option>
                  <option value="Travel">{isFr ? "Voyage & Culture" : "Travel & Culture"}</option>
                  <option value="Tech">{isFr ? "Technologie & IA" : "Tech & AI"}</option>
                  <option value="Business">{isFr ? "Business & Startups" : "Business & Startups"}</option>
                  <option value="Conversation">{isFr ? "Conversation Quotidienne" : "Daily Conversation"}</option>
                </select>
              </div>

            </div>

            {/* Status Filter Pills: Tous | En ligne | Hors ligne */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-white/5 overflow-x-auto scrollbar-none">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                {isFr ? "Statut de présence :" : "Presence Status:"}
              </span>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setStatusFilter('ALL');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{isFr ? "Tous les membres" : "All members"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
                  {availablePartners.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setStatusFilter('ONLINE');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  statusFilter === 'ONLINE'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-100 dark:bg-white/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isFr ? "En ligne (Online)" : "Online"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-[10px]">
                  {onlineCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setStatusFilter('OFFLINE');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  statusFilter === 'OFFLINE'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-100 dark:bg-white/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <span className="w-2 h-2 rounded-full border border-dashed border-amber-400 bg-amber-500/40" />
                <span>{isFr ? "Hors ligne (Offline)" : "Offline"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px]">
                  {offlineCount}
                </span>
              </button>
            </div>
          </div>

          {/* PARTNERS GRID */}
          {loading ? (
            <div className="min-h-[40vh] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : availablePartners.length === 0 ? (
            /* Empty state when no OTHER real users are registered yet */
            <div className="text-center py-16 saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm max-w-2xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <UserPlus className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isFr ? "En attente de nouveaux membres inscrits" : "Waiting for new registered members"}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                  {isFr 
                    ? "Seuls les vrais membres qui s'inscrivent sur cette application apparaissent ici. Dès qu'un nouveau partenaire crée son compte, il sera immédiatement disponible pour échanger !"
                    : "Only real members who register on this application appear here. As soon as a new partner creates their account, they will appear here to connect!"}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setInviteModalOpen(true);
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 hover:opacity-95 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isFr ? "Inviter des Partenaires (WhatsApp, Email, TikTok...)" : "Invite Partners (WhatsApp, Email, TikTok...)"}</span>
                </button>
              </div>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="text-center py-16 saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm">
              <p className="text-slate-600 dark:text-slate-400 text-base">
                {isFr ? "Aucun membre inscrit ne correspond à ces critères." : "No registered member matches these criteria."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLevel('ALL');
                  setSelectedInterest('ALL');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-sm font-semibold transition-colors"
              >
                {isFr ? "Réinitialiser les filtres" : "Reset filters"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPartners.map((partner) => {
                const matchScore = calculateMatch(partner);
                const partnerShortsCount = memberShorts.filter(s => s.author_id === partner.id).length;

                return (
                  <div key={partner.id} className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm hover:border-emerald-500/40 flex flex-col justify-between group">
                    <div>
                      
                      {/* Top Bar with Match Score */}
                      <div className="flex items-center justify-between mb-4">
                        {partner.is_ai ? (
                          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20 border border-violet-500/40 text-violet-700 dark:text-violet-300 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                            <span>🤖 {isFr ? 'AGENT IA COACH • 24/7' : 'AI COACH AGENT • 24/7'}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{matchScore}% {isFr ? 'Match IA' : 'AI Match'}</span>
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {partnerShortsCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                playSound('click');
                                setActiveTab('shorts');
                              }}
                              className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1 hover:bg-rose-500/25 cursor-pointer"
                              title={isFr ? "Voir ses shorts" : "View shorts"}
                            >
                              <Tv className="w-2.5 h-2.5" />
                              <span>{partnerShortsCount} Short{partnerShortsCount > 1 ? 's' : ''}</span>
                            </button>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white font-mono text-xs font-bold">
                            {partner.level}
                          </span>
                        </div>
                      </div>

                      {/* Partner Info */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          <img
                            src={partner.avatar}
                            alt={partner.name}
                            className={`w-16 h-16 rounded-2xl object-cover transition-all shadow-md ${
                              partner.is_ai
                                ? 'ring-2 ring-violet-500/80 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                                : partner.is_online 
                                  ? 'ring-2 ring-emerald-500/80 group-hover:ring-emerald-400' 
                                  : 'ring-2 ring-dashed ring-amber-400/60'
                            }`}
                          />
                          {partner.is_online ? (
                            <span 
                              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#060a14] ${
                                partner.is_ai 
                                  ? 'bg-violet-500 shadow-[0_0_10px_rgba(168,85,247,0.9)]'
                                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                              }`} 
                              title="online" 
                            />
                          ) : (
                            <span 
                              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-dashed border-amber-400 bg-amber-500/40" 
                              title="offline" 
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 truncate">
                              <span>{partner.name}</span>
                              <span>{partner.flag}</span>
                            </h3>
                            {partner.is_ai ? (
                              <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/40 inline-flex items-center gap-1 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                24/7 en direct
                              </span>
                            ) : partner.is_online ? (
                              <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                online
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border border-dashed border-amber-400/80 bg-amber-500/10 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1 uppercase tracking-wider">
                                offline
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{partner.country} • {partner.specialty}</p>
                          
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                            <Flame className={`w-3.5 h-3.5 ${partner.is_ai ? 'fill-violet-500 text-violet-500' : 'fill-emerald-500 text-emerald-500'}`} />
                            <span>{partner.streak || 1} {isFr ? 'j de série' : 'd streak'}</span>
                            <span className="text-slate-400 dark:text-slate-500 text-[10px]">• {partner.is_ai ? 'Coach IA Officiel' : 'Membre Réel'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4 italic">
                        « {partner.bio} »
                      </p>

                      {/* Interest tags */}
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {partner.interests.map((interest, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium ${
                              partner.is_ai
                                ? 'bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-300'
                                : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {interest}
                          </span>
                        ))}
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-3 sm:pt-4 border-t border-slate-200 dark:border-white/10">
                      <Link
                        href={`/chat?partnerId=${partner.id}&partnerName=${encodeURIComponent(partner.name)}`}
                        onClick={() => playSound('click')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          partner.is_ai
                            ? 'bg-violet-500/10 hover:bg-violet-500/20 dark:bg-violet-500/15 dark:hover:bg-violet-500/25 border-violet-500/30 text-violet-700 dark:text-violet-200'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200 dark:border-white/10 text-slate-800 dark:text-white'
                        }`}
                      >
                        <MessageSquare className={`w-3.5 h-3.5 ${partner.is_ai ? 'text-violet-500' : 'text-blue-500 dark:text-blue-400'}`} />
                        <span>{partner.is_ai ? (isFr ? '💬 Dialoguer (IA)' : '💬 Chat (AI)') : (isFr ? 'Écrire' : 'Message')}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => handleCallPartner(e, partner)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                          partner.is_ai
                            ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:opacity-95 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 hover:opacity-95 text-slate-950 shadow-[0_0_15px_rgba(74,222,128,0.25)]'
                        }`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{partner.is_ai ? (isFr ? '🎙️ Parler Oral (IA)' : '🎙️ Oral Voice (AI)') : (isFr ? 'Appeler' : 'Call')}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Invite Modal for WhatsApp, Email, Facebook, TikTok */}
      <InvitePartnerModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

    </div>
  );
}

// Subcomponent to render and play a Member Short Video on the Registered Members page
function PartnerShortCard({
  short,
  isFr,
  playSound
}: {
  short: RegisteredMemberShort;
  isFr: boolean;
  playSound: (sound: any) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playSound('click');
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playSound('click');
    const video = videoRef.current;
    if (video) {
      const nextMuted = !video.muted;
      video.muted = nextMuted;
      video.defaultMuted = nextMuted;
      video.volume = nextMuted ? 0 : 1;
      setIsMuted(nextMuted);
      if (!nextMuted && video.paused) {
        video.play().catch(console.error);
        setIsPlaying(true);
      }
    } else {
      setIsMuted(prev => !prev);
    }
  };

  return (
    <div className="saas-card overflow-hidden flex flex-col justify-between p-0 bg-white dark:bg-[#070d1d] border-slate-200 dark:border-white/10 hover:border-emerald-500/40 transition-all shadow-md group">
      
      {/* Video Box */}
      <div 
        className="relative aspect-[9/13] w-full bg-slate-950 overflow-hidden cursor-pointer"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={short.video_url}
          playsInline
          loop
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onVolumeChange={(e) => {
            setIsMuted(e.currentTarget.muted || e.currentTarget.volume === 0);
          }}
          className="w-full h-full object-cover"
        />

        {/* Gradient shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/40 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px] backdrop-blur-md">
            Level {short.level}
          </span>
          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 rounded-full border backdrop-blur-md transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-500/30 border-rose-500/50 text-rose-300 hover:bg-rose-500/50'
                : 'bg-black/60 hover:bg-black/80 border-emerald-500/40 text-emerald-400'
            }`}
            title={isMuted ? (isFr ? "Activer le son" : "Unmute") : (isFr ? "Couper le son" : "Mute")}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>

        {/* Floating pill if video is playing while muted */}
        {isMuted && isPlaying && (
          <div 
            onClick={toggleMute}
            className="absolute top-12 inset-x-2 z-20 flex justify-center cursor-pointer"
          >
            <span className="px-3 py-1 rounded-full bg-rose-500/90 hover:bg-rose-600 text-white font-bold text-[10px] shadow-lg flex items-center gap-1.5 backdrop-blur-md border border-white/20 animate-pulse transition-all">
              <VolumeX className="w-3 h-3" />
              <span>{isFr ? "Cliquer pour le son" : "Click for sound"}</span>
            </span>
          </div>
        )}

        {/* Center Play Indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/25">
            <div className="w-14 h-14 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-95 transition-transform">
              <Play className="w-7 h-7 fill-slate-950 ml-0.5" />
            </div>
          </div>
        )}

        {/* Title overlay at bottom of video */}
        <div className="absolute bottom-3 inset-x-3 z-10 space-y-1">
          <h4 className="text-sm font-bold text-white drop-shadow-md line-clamp-2 leading-tight">
            {short.title}
          </h4>
          <span className="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm inline-block">
            {short.category}
          </span>
        </div>
      </div>

      {/* Author and Actions */}
      <div className="p-4 space-y-3">
        {/* Author info */}
        <div className="flex items-center gap-2.5">
          {short.author_avatar ? (
            <img
              src={short.author_avatar}
              alt={short.author_name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/30"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
              {short.author_name ? short.author_name.charAt(0).toUpperCase() : 'M'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <span>{short.author_name}</span>
              <span>{short.author_flag}</span>
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {short.author_level ? `Niveau ${short.author_level} • ` : ''}Membre Réel
            </p>
          </div>
        </div>

        {/* Transcript excerpt */}
        {short.transcript && (
          <p className="text-[11px] text-slate-700 dark:text-slate-300 italic line-clamp-2 bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-200 dark:border-white/5 leading-relaxed">
            « {short.transcript} »
          </p>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-white/10">
          <Link
            href={`/chat?partnerId=${short.author_id}&partnerName=${encodeURIComponent(short.author_name)}`}
            onClick={() => playSound('click')}
            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3 h-3 text-blue-500 dark:text-blue-400" />
            <span>{isFr ? 'Écrire' : 'Message'}</span>
          </Link>

          <Link
            href="/shorts"
            onClick={() => playSound('click')}
            className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1 shadow-md hover:opacity-90 transition-opacity"
          >
            <Tv className="w-3 h-3" />
            <span>{isFr ? 'Plein Écran' : 'Full Screen'}</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
