'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import { isRealPartnerProfile } from '@/lib/partnerHelper';
import { 
  Radio, 
  Sparkles, 
  Volume2, 
  Shuffle, 
  Flame, 
  Users, 
  ArrowRight, 
  Heart, 
  CheckCircle2, 
  Plus
} from 'lucide-react';

interface TopicPrompt {
  id: string;
  level: 'A2' | 'B1' | 'B2' | 'C1';
  levelLabel: string;
  category: string;
  promptEn: string;
  promptFr: string;
  vocabulary: { word: string; phonetic: string; hint: string }[];
}

const TOPIC_PROMPTS: TopicPrompt[] = [
  {
    id: 'topic-1',
    level: 'B1',
    levelLabel: 'Intermédiaire',
    category: 'Daily Life & Travel',
    promptEn: 'If you could move to any English-speaking country tomorrow, which one would you choose and why?',
    promptFr: 'Si vous pouviez déménager dans un pays anglophone demain, lequel choisiriez-vous et pourquoi ?',
    vocabulary: [
      { word: 'Lifestyle', phonetic: '[ˈlaɪfstaɪl]', hint: 'Mode de vie' },
      { word: 'Opportunity', phonetic: '[ˌɒpəˈtjuːnəti]', hint: 'Opportunité' }
    ]
  },
  {
    id: 'topic-2',
    level: 'B2',
    levelLabel: 'Conversation Avancée',
    category: 'Technology & Future',
    promptEn: 'Do you think technology makes learning languages easier or more challenging for daily fluency?',
    promptFr: 'Pensez-vous que la technologie rend l\'apprentissage des langues plus facile ou plus exigeant pour la fluidité ?',
    vocabulary: [
      { word: 'Fluency', phonetic: '[ˈfluːənsi]', hint: 'Aisance / Fluidité' },
      { word: 'Confidence', phonetic: '[ˈkɒnfɪdəns]', hint: 'Confiance en soi' }
    ]
  },
  {
    id: 'topic-3',
    level: 'A2',
    levelLabel: 'Débutant Confiant',
    category: 'Personal Interests',
    promptEn: 'What is your favorite morning routine and what habits help you start the day with energy?',
    promptFr: 'Quelle est votre routine matinale préférée et quelles habitudes vous donnent de l\'énergie ?',
    vocabulary: [
      { word: 'Routine', phonetic: '[ruːˈtiːn]', hint: 'Habitude régulière' },
      { word: 'Productive', phonetic: '[prəˈdʌktɪv]', hint: 'Productif' }
    ]
  },
  {
    id: 'topic-4',
    level: 'C1',
    levelLabel: 'Courant & Débat',
    category: 'Culture & Mindset',
    promptEn: 'What is a cultural difference you have experienced that made you view the world differently?',
    promptFr: 'Quelle différence culturelle avez-vous vécue qui a changé votre perception du monde ?',
    vocabulary: [
      { word: 'Perspective', phonetic: '[pəˈspektɪv]', hint: 'Point de vue' },
      { word: 'Culture shock', phonetic: '[ˈkʌltʃə ʃɒk]', hint: 'Choc culturel' }
    ]
  },
  {
    id: 'topic-5',
    level: 'B2',
    levelLabel: 'Parcours Professionnel',
    category: 'Career & Motivation',
    promptEn: 'How has learning English opened doors for your career, friendships, or personal projects?',
    promptFr: 'Comment l\'anglais a-t-il ouvert des portes pour votre carrière, amitiés ou projets personnels ?',
    vocabulary: [
      { word: 'Milestone', phonetic: '[ˈmaɪlstəʊn]', hint: 'Étape clé' },
      { word: 'Progress', phonetic: '[ˈprəʊɡres]', hint: 'Progression' }
    ]
  }
];

interface RealMemberPreview {
  id: string;
  name: string;
  avatar: string;
  flag: string;
  level: string;
  interests: string;
}

interface RealStatusPreview {
  id: string;
  author_name: string;
  author_avatar: string;
  author_flag: string;
  author_level: string;
  content: string;
  tag: string;
  likes: number;
}

export default function HeroInteractiveHub() {
  const { playSound, user } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'rooms' | 'status' | 'partners'>('rooms');
  const [topicIndex, setTopicIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Real registered data fetched strictly from database
  const [realMembers, setRealMembers] = useState<RealMemberPreview[]>([]);
  const [realCommunityStatus, setRealCommunityStatus] = useState<RealStatusPreview | null>(null);
  const [founderLikes, setFounderLikes] = useState(1);
  const [hasLikedFounder, setHasLikedFounder] = useState(false);

  const currentTopic = TOPIC_PROMPTS[topicIndex];

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Fetch strictly REAL registered members & real status from Supabase
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        // Query real registered members from profiles
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, flag, current_level, interests, country, email, role')
          .order('created_at', { ascending: false })
          .limit(15);

        if (profs && profs.length > 0) {
          const realProfs = profs.filter(isRealPartnerProfile).slice(0, 6);
          setRealMembers(
            realProfs.map((p) => {
              const isFounder = p.email === 'tychiquebongo@gmail.com' || p.role === 'admin' || p.full_name?.toLowerCase().includes('tychique');
              return {
                id: p.id,
                name: p.full_name || (isFounder ? 'Tychique Bongo' : (isFr ? 'Membre Inscrit' : 'Registered Member')),
                avatar: getUserAvatar(p.avatar_url, p.full_name, p.email),
                flag: isFounder ? '🇨🇮' : (p.flag || '🌐'),
                level: isFounder ? 'C2' : (p.current_level || 'B2'),
                interests: p.interests && p.interests.length > 0 
                  ? p.interests.slice(0, 2).join(' & ') 
                  : (isFr ? 'Pratique Orale' : 'Oral Practice'),
              };
            })
          );
        }

        // Query real member posts for status space within last 24h
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, created_at, user_id, likes_count')
          .eq('category', 'status')
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (posts && posts.length > 0) {
          const post = posts[0];
          const { data: author } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, flag, current_level')
            .eq('id', post.user_id)
            .single();

          const parts = (post.content || '').split(':::');
          setRealCommunityStatus({
            id: post.id,
            author_name: author?.full_name || (isFr ? 'Membre Actif' : 'Active Member'),
            author_avatar: getUserAvatar(author?.avatar_url, author?.full_name),
            author_flag: author?.flag || '🌐',
            author_level: author?.current_level || 'B2',
            content: parts[0] || post.content,
            tag: parts[1] || '#DailyEnglish',
            likes: post.likes_count ?? 0,
          });
        }
      } catch (err) {
        console.error('Error fetching real preview data:', err);
      }
    };

    fetchRealData();
  }, [supabase, isFr]);

  const handleNextTopic = () => {
    playSound('click');
    setTopicIndex((prev) => (prev + 1) % TOPIC_PROMPTS.length);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSpeakTopic = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      playSound('chime');
      const utterance = new SpeechSynthesisUtterance(currentTopic.promptEn);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      playSound('chime');
    }
  };

  const handleToggleFounderLike = () => {
    playSound('chime');
    if (hasLikedFounder) {
      setHasLikedFounder(false);
      setFounderLikes((prev) => Math.max(0, prev - 1));
    } else {
      setHasLikedFounder(true);
      setFounderLikes((prev) => prev + 1);
    }
  };

  return (
    <div className="mt-12 max-w-5xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-white/20 via-emerald-500/25 to-transparent shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
      <div className="rounded-[22px] overflow-hidden bg-[#091124] border border-white/10 relative shadow-2xl">
        
        {/* Dynamic Top Bar with Live Indicator & Interactive Tabs */}
        <div className="p-4 sm:p-5 bg-[#0b162e]/90 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs text-slate-300 font-mono flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <strong className="text-white">English Booster LIVE</strong> • {isFr ? 'Plateforme Réelle' : 'Real Platform'}
            </span>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setActiveTab('rooms');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rooms'
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>{isFr ? 'Salons' : 'Rooms'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setActiveTab('status');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'status'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>{isFr ? 'Statuts' : 'Status'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setActiveTab('partners');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'partners'
                  ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>{isFr ? 'Partenaires' : 'Partners'}</span>
            </button>
          </div>

        </div>

        {/* Tab 1: Live Voice Rooms & Real Interactive Prompts */}
        {activeTab === 'rooms' && (
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            
            {/* Live Audio Room Card & Real Waveform */}
            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#0c1733] to-[#080e1f] border border-white/10 p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>{isFr ? 'Salon Vocal 1-on-1' : 'Live Voice Room'}</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono font-bold">WebRTC HD</span>
                </div>

                <div className="text-center py-5 space-y-3">
                  <p className="text-xs font-medium text-slate-400">
                    {isFr ? 'Membres réels inscrits sur la plateforme :' : 'Real registered members on the platform:'}
                  </p>
                  
                  {/* Real Registered Members Avatars (Zero fake stock photos) */}
                  <div className="flex items-center justify-center -space-x-2.5">
                    {realMembers.length > 0 ? (
                      realMembers.slice(0, 4).map((member) => (
                        <img 
                          key={member.id}
                          src={member.avatar} 
                          alt={member.name}
                          title={member.name}
                          className="w-10 h-10 rounded-full ring-2 ring-emerald-400 shadow-md object-cover"
                        />
                      ))
                    ) : (
                      <img 
                        src="/assets/images/tychique-bongo.jpg" 
                        alt="Tychique Bongo - Fondateur" 
                        className="w-10 h-10 rounded-full ring-2 ring-emerald-400 shadow-md object-cover"
                      />
                    )}
                  </div>

                  <p className="text-xs text-emerald-400 font-bold">
                    {isFr ? 'Salons ouverts sans réservation (6 max)' : 'Instant walk-in sessions (max 6)'}
                  </p>
                </div>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-center gap-1.5 py-2">
                  <div className={`waveform-bar ${isSpeaking ? 'h-8 bg-emerald-400' : 'h-3'}`} style={{ animationDuration: '0.4s' }} />
                  <div className={`waveform-bar ${isSpeaking ? 'h-11 bg-teal-400' : 'h-5'}`} style={{ animationDuration: '0.6s' }} />
                  <div className={`waveform-bar ${isSpeaking ? 'h-7 bg-emerald-300' : 'h-4'}`} style={{ animationDuration: '0.3s' }} />
                  <div className={`waveform-bar ${isSpeaking ? 'h-12 bg-emerald-400' : 'h-6'}`} style={{ animationDuration: '0.5s' }} />
                  <div className={`waveform-bar ${isSpeaking ? 'h-9 bg-teal-300' : 'h-4'}`} style={{ animationDuration: '0.7s' }} />
                  <div className={`waveform-bar ${isSpeaking ? 'h-6 bg-emerald-400' : 'h-3'}`} style={{ animationDuration: '0.4s' }} />
                </div>

                <Link
                  href="/live"
                  onClick={() => playSound('chime')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.3)] transition-all cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>{isFr ? 'Rejoindre les Salons Vocaux →' : 'Enter Live Rooms →'}</span>
                </Link>
              </div>

            </div>

            {/* Real CEFR Topic Generator */}
            <div className="lg:col-span-7 rounded-2xl bg-white/[0.03] border border-white/10 p-5 flex flex-col justify-between space-y-4">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                      {currentTopic.level}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {currentTopic.category}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextTopic}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                    title={isFr ? 'Changer de sujet' : 'Next Topic'}
                  >
                    <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isFr ? 'Sujet Aléatoire' : 'Random Topic'}</span>
                  </button>
                </div>

                {/* Prompt in English */}
                <div className="p-4 rounded-xl bg-[#0d162d] border border-white/10 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base sm:text-lg font-bold text-white leading-snug">
                      "{currentTopic.promptEn}"
                    </p>
                    <button
                      type="button"
                      onClick={handleSpeakTopic}
                      className={`p-2 rounded-xl transition-all cursor-pointer flex-shrink-0 ${
                        isSpeaking 
                          ? 'bg-emerald-500 text-slate-950 animate-pulse' 
                          : 'bg-white/10 hover:bg-white/20 text-emerald-400'
                      }`}
                      title={isFr ? 'Écouter la prononciation' : 'Listen pronunciation'}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 italic">
                    {currentTopic.promptFr}
                  </p>
                </div>

                {/* Vocabulary hints */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {isFr ? 'Mots clés recommandés pour votre réponse :' : 'Key vocabulary to use:'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentTopic.vocabulary.map((vocab, vIdx) => (
                      <div 
                        key={vIdx}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center gap-1.5 text-slate-200"
                      >
                        <strong className="text-emerald-400">{vocab.word}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{vocab.phonetic}</span>
                        <span className="text-[10px] text-slate-400">— {vocab.hint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Quick Links */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {isFr ? 'Pratique orale 100% humaine' : '100% human speaking practice'}
                </span>
                <Link
                  href="/partners"
                  onClick={() => playSound('click')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline"
                >
                  <span>{isFr ? 'Pratiquer avec un partenaire' : 'Practice with a partner'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Status Space (Real Founder & Real Member Statuses) */}
        {activeTab === 'status' && (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            
            {/* Real Status 1: Founder Coaching Tip */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#0a152e] to-[#070e1f] border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="https://bolmrscavaeiqzytfzej.supabase.co/storage/v1/object/public/avatars/30c6222c-7d9e-4086-a289-19ca5b81262c/1791825017392.jpeg"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/images/tychique-bongo.jpg'; }}
                    alt="Tychique Bongo"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-400"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1">
                      Tychique Bongo <span className="text-[10px]">🇨🇮</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-bold">Fondateur & Coach</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  #PronunciationTip
                </span>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                « Never say <span className="line-through text-rose-400">"I will explain you"</span>. Always say <span className="text-emerald-400 font-bold">"I will explain TO you"</span> or "I will explain this to you" ! Keep practicing out loud ! »
              </p>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleFounderLike}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    hasLikedFounder
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${hasLikedFounder ? 'fill-white' : ''}`} />
                  <span>{founderLikes}</span>
                </button>

                <Link
                  href="/status"
                  onClick={() => playSound('click')}
                  className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>{isFr ? 'Voir tous les statuts →' : 'View all statuses →'}</span>
                </Link>
              </div>
            </div>

            {/* Real Status 2: Real Member Status or Invitation to Post */}
            {realCommunityStatus ? (
              <div className="p-5 rounded-2xl bg-[#0c1630] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={realCommunityStatus.author_avatar}
                      alt={realCommunityStatus.author_name}
                      className="w-10 h-10 rounded-full ring-2 ring-blue-400 object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1">
                        {realCommunityStatus.author_name} <span className="text-[10px]">{realCommunityStatus.author_flag}</span>
                      </h4>
                      <span className="text-[10px] text-blue-400 font-bold">{realCommunityStatus.author_level} • Membre Inscrit</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                    {realCommunityStatus.tag}
                  </span>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  « {realCommunityStatus.content} »
                </p>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>{realCommunityStatus.likes}</span>
                  </span>

                  <Link
                    href="/status"
                    onClick={() => playSound('click')}
                    className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>{isFr ? 'Explorer l\'espace →' : 'Explore space →'}</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#0c1630] border border-white/10 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>{isFr ? 'Espace Statuts en Direct' : 'Live Status Space'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {isFr ? 'Partagez votre première pensée ou vidéo' : 'Share your daily thought or short video'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isFr 
                      ? 'Aucun contenu fictif. Les statuts sont publiés directement par les membres inscrits depuis leur galerie ou leur clavier.'
                      : 'No simulated content. Statuses are posted by registered members from their gallery or keyboard.'}
                  </p>
                </div>

                <Link
                  href="/status"
                  onClick={() => playSound('chime')}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isFr ? 'Publier mon statut aujourd\'hui' : 'Post my status today'}</span>
                </Link>
              </div>
            )}

          </div>
        )}

        {/* Tab 3: Real Online Partners (from Database) */}
        {activeTab === 'partners' && (
          <div className="p-4 sm:p-6 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  {isFr ? 'Véritables Partenaires Inscrits' : 'Real Registered Partners'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isFr ? 'Aucun profil fictif. Membres réels de la communauté English Booster.' : 'Zero fake profiles. Genuine members of the English Booster community.'}
                </p>
              </div>

              <Link
                href="/partners"
                onClick={() => playSound('chime')}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>{isFr ? 'Ouvrir l\'Annuaire Complet' : 'Open Directory'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {realMembers.length > 0 ? (
                realMembers.slice(0, 3).map((p) => (
                  <div 
                    key={p.id}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={p.avatar} 
                        alt={p.name} 
                        className="w-9 h-9 rounded-full ring-2 ring-emerald-500/50 object-cover"
                      />
                      <div>
                        <h5 className="text-xs font-bold text-white flex items-center gap-1">
                          {p.name} <span>{p.flag}</span>
                        </h5>
                        <span className="text-[10px] text-slate-400">{p.interests}</span>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black">
                      {p.level}
                    </span>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-3 text-center py-6 text-xs text-slate-400">
                  <p>{isFr ? 'Rejoignez le répertoire pour être parmi les premiers profils visibles !' : 'Join the directory to be among the first visible partners!'}</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
