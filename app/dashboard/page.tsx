'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import { isRealPartnerProfile } from '@/lib/partnerHelper';
import type { Database } from '@/lib/database.types';
import { 
  Flame, 
  PhoneCall, 
  Sparkles, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Globe, 
  Crown,
  ChevronRight,
  TrendingUp,
  Volume2,
  Camera,
  Upload,
  Radio,
  Download
} from 'lucide-react';
import InvitePartnerModal from '@/components/InvitePartnerModal';
import AvatarUploaderModal from '@/components/AvatarUploaderModal';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Challenge = Database['public']['Tables']['challenges']['Row'];

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, playSound, refreshProfile } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [partners, setPartners] = useState<Profile[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<Challenge | null>(null);
  const [assessmentMetrics, setAssessmentMetrics] = useState<{
    fluency: number;
    vocab: number;
    grammar: number;
    confidence: number;
    hasReal: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);


  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    playSound('click');

    try {
      const { uploadGalleryAvatar } = await import('@/lib/avatarHelper');
      const res = await uploadGalleryAvatar(file, user.id);
      if (res.success) {
        playSound('success');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      // Fetch online real registered members from profiles (excluding fake/test accounts)
      let partnerQuery = supabase
        .from('profiles')
        .select('*');

      if (user?.id) {
        partnerQuery = partnerQuery.neq('id', user.id);
      }

      const { data: partnersData } = await partnerQuery.limit(10);
      if (partnersData) {
        const realPartners = partnersData.filter(isRealPartnerProfile).slice(0, 4);
        setPartners(realPartners);
      }

      // Fetch daily challenge
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_daily', true)
        .limit(1)
        .single();
      if (challengeData) setDailyChallenge(challengeData);

      // Fetch real user challenge submissions for genuine assessment metrics
      if (user?.id) {
        const { data: submissions } = await supabase
          .from('challenge_submissions')
          .select('fluency_score, grammar_score, vocabulary_score, overall_score')
          .eq('user_id', user.id);

        const isFounderUser = profile?.role === 'admin' || user?.email === 'tychiquebongo@gmail.com';

        if (submissions && submissions.length > 0) {
          const count = submissions.length;
          setAssessmentMetrics({
            fluency: Math.round(submissions.reduce((acc, s) => acc + (s.fluency_score || 0), 0) / count),
            vocab: Math.round(submissions.reduce((acc, s) => acc + (s.vocabulary_score || 0), 0) / count),
            grammar: Math.round(submissions.reduce((acc, s) => acc + (s.grammar_score || 0), 0) / count),
            confidence: Math.round(submissions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / count),
            hasReal: true,
          });
        } else if (isFounderUser) {
          setAssessmentMetrics({
            fluency: 98,
            vocab: 96,
            grammar: 99,
            confidence: 98,
            hasReal: true,
          });
        } else {
          setAssessmentMetrics(null);
        }
      }

      setLoading(false);
    };

    if (user) {
      fetchData();
    }
  }, [user, authLoading, router, profile, supabase]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFounder = profile?.role === 'admin' || user?.email === 'tychiquebongo@gmail.com';
  const currentLevel = isFounder ? 'C2' : (profile?.current_level || 'B1');
  const targetLevel = isFounder ? 'C2' : (profile?.target_level || 'C1');
  const streak = profile?.streak ?? 0;
  const minutes = profile?.minutes_spoken ?? 0;

  const cefrScale: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  const curScale = cefrScale[currentLevel] || (isFounder ? 6 : 3);
  const tarScale = cefrScale[targetLevel] || (isFounder ? 6 : 5);
  const levelProgress = Math.min(100, Math.round((curScale / Math.max(curScale, tarScale)) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <img
              src={getUserAvatar(profile?.avatar_url, profile?.full_name, user?.email)}
              alt={profile?.full_name || 'Profil'}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-emerald-500/50 shadow-lg cursor-pointer group-hover:scale-102 transition-transform"
              onClick={() => {
                playSound('click');
                setAvatarModalOpen(true);
              }}
            />
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setAvatarModalOpen(true);
              }}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg transition-transform hover:scale-110 active:scale-95"
              title={isFr ? "Modifier la photo via la galerie" : "Change photo from gallery"}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Hello, {profile?.full_name || (isFounder ? 'Tychique Bongo' : 'Learner')} !
              </h1>
              <span className="text-xl">{isFounder ? '🇨🇮' : (profile?.flag || '🌐')}</span>
              {isFounder && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fondateur & Admin</span>
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {isFounder
                ? (isFr 
                    ? "Tableau de bord Fondateur & Administrateur English Booster. Coach en fluidité et prise de parole en public."
                    : "Founder & Administrator Dashboard for English Booster. Fluency & public speaking coach.")
                : (isFr 
                    ? "Prêt pour votre boost d'anglais aujourd'hui ? Chaque conversation vous rapproche de la fluidité."
                    : "Ready for your English boost today? Every conversation brings you closer to fluency.")}
            </p>
          </div>
        </div>

        {/* Quick Actions (Call, Status, Plan, Download App) */}
        <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Link
            href="/download"
            onClick={() => playSound('click')}
            className="px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>{isFr ? '📲 Installer l\'App' : '📲 Get App'}</span>
          </Link>

          <Link
            href="/status"
            onClick={() => playSound('click')}
            className="px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm"
          >
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>{isFr ? 'Statuts & Stories' : 'Status & Stories'}</span>
          </Link>

          <Link
            href="/call"
            onClick={() => playSound('call')}
            className="flex-1 sm:flex-initial px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 hover:opacity-95 shadow-[0_0_20px_rgba(74,222,128,0.35)] transition-all flex items-center justify-center gap-2 sm:gap-2.5 text-xs sm:text-sm"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{isFr ? 'Lancer un Appel Live' : 'Start Live Call'}</span>
          </Link>

          <Link
            href={isFounder ? "/admin" : "/pricing"}
            onClick={() => playSound('click')}
            className="px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
          >
            <Crown className="w-4 h-4" />
            <span className="capitalize">{isFounder ? (isFr ? 'Accès Fondateur (Illimité)' : 'Founder Access (Unlimited)') : `${profile?.plan || 'Free'} Plan`}</span>
          </Link>
        </div>

      </div>

      {/* Cross-Platform App Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/25 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 shadow-inner">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              {isFr ? "Installez l'Application English Booster sur votre PC et Mobile" : "Install English Booster App on your PC & Mobile"}
            </h3>
            <p className="text-xs text-slate-400">
              {isFr
                ? "Lancement en 1 clic sans passer par le navigateur, sonnerie persistante pour ne rater aucun appel en direct !"
                : "1-Click launch without opening a browser, persistent ringing to never miss a live partner call!"}
            </p>
          </div>
        </div>

        <Link
          href="/download"
          onClick={() => playSound('click')}
          className="py-2.5 px-5 rounded-2xl font-black text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:opacity-95 shadow-md flex items-center gap-2 shrink-0 transition-all hover:scale-102"
        >
          <span>{isFr ? "Télécharger / Installer" : "Download / Install"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Card 1: CEFR Level */}
        <div className="saas-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{isFr ? 'Niveau CEFR' : 'CEFR Level'}</span>
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{currentLevel}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">→ {isFr ? 'Objectif' : 'Target'} {targetLevel}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>

        {/* Card 2: Streak */}
        <div className="saas-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{isFr ? 'Série Active' : 'Active Streak'}</span>
            <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-300">{streak} {isFr ? 'jours' : 'days'}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{isFr ? "Continuez aujourd'hui pour garder le feu !" : "Keep practicing today to maintain your streak!"}</span>
          </p>
        </div>

        {/* Card 3: Speaking Time */}
        <div className="saas-card">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{isFr ? 'Temps de Parole' : 'Speaking Time'}</span>
            <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-600 dark:text-teal-300">{minutes}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">minutes</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
            {isFr ? 'Objectif hebdo : 60 minutes' : 'Weekly target: 60 minutes'}
          </p>
        </div>

      </div>

      {/* MAIN TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Daily Challenge & Fluency Radar */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Live Speaking Practice Card */}
          <div className="saas-card relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-[#0c1630] dark:to-[#0a1124] border-slate-200 dark:border-emerald-500/30 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
                  {isFr ? 'Pratique Orale en Direct' : 'Live Speaking Practice'}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {isFr ? '🎙️ Défi Actif' : '🎙️ Active Challenge'}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {isFr ? 'Salons WebRTC temps réel' : 'Real-time WebRTC rooms'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {dailyChallenge?.title || (isFr ? 'Rejoignez un salon vocal avec un binôme' : 'Join a live voice room with a partner')}
            </h2>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-6 font-medium">
              « {dailyChallenge?.prompt_question || (isFr ? 'Présentez vos objectifs et échangez sur vos centres d\'intérêt avec un partenaire international.' : 'Introduce your goals and chat about common interests with an international partner.')} »
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/live"
                onClick={() => playSound('chime')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 hover:from-emerald-400 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>{isFr ? '🔴 Salons Vidéo en Direct' : '🔴 Live Video Rooms'}</span>
              </Link>
              <Link
                href="/partners"
                onClick={() => playSound('click')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Users className="w-4 h-4 text-emerald-500" />
                <span>{isFr ? 'Trouver un binôme' : 'Find a partner'}</span>
              </Link>
            </div>
          </div>

          {/* Fluency Metrics Analytics */}
          <div className="saas-card">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center justify-between">
              <span>{isFr ? 'Bilan de Fluidité & Progression Orale' : 'Fluency & Speaking Progress Assessment'}</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {isFounder 
                  ? (isFr ? '👑 Évaluation Fondateur C2' : '👑 Founder C2 Evaluation') 
                  : (assessmentMetrics ? (isFr ? 'Basé sur vos évaluations réelles' : 'Based on your real assessments') : (isFr ? 'En attente' : 'Pending'))}
              </span>
            </h3>

            {assessmentMetrics ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 dark:text-slate-300">{isFr ? 'Fluidité & Débit de parole' : 'Fluency & Speaking Rhythm'}</span>
                    <span className="text-emerald-700 dark:text-emerald-400">{assessmentMetrics.fluency}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${assessmentMetrics.fluency}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 dark:text-slate-300">{isFr ? 'Richesse du Vocabulaire' : 'Vocabulary Breadth'}</span>
                    <span className="text-blue-600 dark:text-blue-400">{assessmentMetrics.vocab}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 dark:bg-blue-400 h-full rounded-full transition-all duration-500" style={{ width: `${assessmentMetrics.vocab}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 dark:text-slate-300">{isFr ? 'Précision Grammaticale' : 'Grammar Precision'}</span>
                    <span className="text-teal-600 dark:text-teal-400">{assessmentMetrics.grammar}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 dark:bg-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${assessmentMetrics.grammar}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 dark:text-slate-300">{isFr ? 'Confiance & Aisance en Direct' : 'Confidence & Live Fluency'}</span>
                    <span className="text-amber-600 dark:text-amber-400">{assessmentMetrics.confidence}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 dark:bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${assessmentMetrics.confidence}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {isFr 
                    ? "Participez à vos premiers échanges et appels live pour débloquer votre bilan de compétences orales vérifié."
                    : "Complete your first live conversations and calls to unlock your verified oral skills assessment."}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (4 cols): Recommended Partners & Shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="saas-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isFr ? 'Partenaires Recommandés' : 'Recommended Partners'}</span>
              </h3>
              <Link href="/partners" className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline">
                {isFr ? 'Voir tous →' : 'View all →'}
              </Link>
            </div>

            <div className="space-y-3">
              {partners.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-center space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {isFr 
                      ? "Aucun autre membre inscrit pour l'instant. Invitez un ami pour pratiquer l'anglais ensemble !" 
                      : "No other member registered yet. Invite a friend to practice English together!"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setInviteModalOpen(true);
                    }}
                    className="inline-block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isFr ? "+ Inviter un partenaire" : "+ Invite a partner"}
                  </button>
                </div>
              ) : (
                partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={getUserAvatar(partner.avatar_url, partner.full_name, partner.email)}
                          alt={partner.full_name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border border-white dark:border-[#060a14]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{partner.full_name}</span>
                          <span>{(partner.role === 'admin' || partner.email === 'tychiquebongo@gmail.com') ? '🇨🇮' : (partner.flag || '🌐')}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {(partner.role === 'admin' || partner.email === 'tychiquebongo@gmail.com')
                            ? (isFr ? "Côte d'Ivoire 🇨🇮 • Fondateur C2" : "Côte d'Ivoire 🇨🇮 • Founder C2")
                            : `${isFr ? 'Niveau' : 'Level'} ${partner.current_level || 'B1'} • ${partner.country || 'France'}`}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/chat?partnerId=${partner.id}&partnerName=${encodeURIComponent(partner.full_name)}`}
                      onClick={() => playSound('click')}
                      className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors"
                      title={isFr ? "Démarrer la discussion" : "Start conversation"}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick SaaS Pro Upgrade Card */}
          {!isFounder && profile?.plan === 'free' && (
            <div className="saas-card bg-white dark:bg-gradient-to-br dark:from-emerald-500/10 dark:via-[#0a1124] dark:to-[#0e172e] border-slate-200 dark:border-emerald-400/30 p-6 shadow-md">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Crown className="w-4 h-4" />
                <span>{isFr ? 'Passez à la vitesse supérieure' : 'Level Up Your Fluency'}</span>
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white mb-2">
                {isFr ? 'Débloquez les Appels Illimités avec Pro' : 'Unlock Unlimited Calls with Pro'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                {isFr 
                  ? "Accédez aux simulations d'entretiens et aux salons de conversation illimités 24/7 pour seulement 9.99$/mois."
                  : "Access interview simulations and unlimited 24/7 conversation rooms for just $9.99/month."}
              </p>
              <Link
                href="/pricing"
                onClick={() => playSound('chime')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:opacity-90"
              >
                <span>{isFr ? 'Découvrir les Offres Pro' : 'Explore Pro Offers'}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

        </div>

      </div>

      {/* Invite Partner Modal */}
      <InvitePartnerModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      {/* Avatar Uploader & Preset Gallery Modal */}
      <AvatarUploaderModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onAvatarUpdated={async () => {
          await refreshProfile();
        }}
      />

    </div>
  );
}

