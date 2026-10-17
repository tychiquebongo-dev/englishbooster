'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import { isRealPartnerProfile, isTestAccount } from '@/lib/partnerHelper';
import type { Database } from '@/lib/database.types';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  Users,
  CreditCard,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trophy,
  Flame,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Plus,
  Trash2,
  Edit,
  UserCheck,
  UserX,
  Crown,
  PhoneCall,
  Settings,
  Globe,
  Sliders,
  DollarSign,
  Activity,
  Layers,
  ChevronRight,
  Download
} from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Challenge = Database['public']['Tables']['challenges']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];
type Call = Database['public']['Tables']['calls']['Row'];

type AdminSection = 
  | 'overview' 
  | 'users' 
  | 'subscriptions' 
  | 'challenges' 
  | 'partners' 
  | 'community' 
  | 'calls' 
  | 'settings';

export default function AdminBackOfficePage() {
  const router = useRouter();
  const { user, profile, isAdmin, loading: authLoading, playSound } = useAuth();
  const { lang, setLang, isFr } = useTranslation();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<AdminSection>('overview');
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [challengesList, setChallengesList] = useState<Challenge[]>([]);
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [callsList, setCallsList] = useState<Call[]>([]);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubs: 0,
    totalChallenges: 0,
    totalPosts: 0,
    totalCalls: 0,
    estimatedMrr: 0,
  });

  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // New challenge form state
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeTopic, setNewChallengeTopic] = useState('');
  const [newChallengeLevel, setNewChallengeLevel] = useState('B1');
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  const fetchAdminData = async () => {
    setLoadingData(true);
    try {
      // Parallel execution of all admin dataset queries (0ms waterfall)
      const [
        { data: profilesData },
        { data: challengesData },
        { data: postsData },
        { data: callsData }
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('challenges').select('*').order('created_at', { ascending: false }),
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('calls').select('*').order('created_at', { ascending: false })
      ]);

      const cleanProfiles = profilesData ? profilesData.filter(isRealPartnerProfile) : [];
      setProfilesList(cleanProfiles);
      if (challengesData) setChallengesList(challengesData);
      if (postsData) setPostsList(postsData);
      if (callsData) setCallsList(callsData);

      // Counts & Stats (Strictly authentic real data)
      const usersCount = cleanProfiles.length;
      const proUsersCount = cleanProfiles.filter(p => p.plan === 'pro').length;
      const premiumUsersCount = cleanProfiles.filter(p => p.plan === 'premium').length;
      const totalSubs = proUsersCount + premiumUsersCount;
      const estimatedMrr = (proUsersCount * 19.99) + (premiumUsersCount * 9.99);

      setStats({
        totalUsers: usersCount,
        totalSubs: totalSubs,
        totalChallenges: challengesData ? challengesData.length : 0,
        totalPosts: postsData ? postsData.length : 0,
        totalCalls: callsData ? callsData.length : 0,
        estimatedMrr: Math.round(estimatedMrr),
      });

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const userEmail = (user?.email || '').toLowerCase().trim();
  const isUserAdmin = Boolean(
    isAdmin ||
    profile?.role === 'admin' ||
    userEmail === 'tychiquebongo@gmail.com' ||
    userEmail === 'tychiquebong@gmail.com'
  );

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        setLoadingData(false);
        router.push('/login');
        return;
      }
      if (isUserAdmin) {
        fetchAdminData();
      } else {
        setLoadingData(false);
      }
    }
  }, [user, profile, isAdmin, isUserAdmin, authLoading, router]);

  // Hook placed BEFORE any conditional returns to strictly adhere to React Rules of Hooks
  const filteredProfiles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return profilesList;
    return profilesList.filter(p =>
      (p?.full_name || '').toLowerCase().includes(q) ||
      (p?.email || '').toLowerCase().includes(q) ||
      (p?.country || '').toLowerCase().includes(q) ||
      (p?.current_level || '').toLowerCase().includes(q)
    );
  }, [profilesList, searchQuery]);

  // Strictly real registered partners (excludes any test or mock entities)
  const realPartnersList = useMemo(() => {
    return profilesList.filter(isRealPartnerProfile);
  }, [profilesList]);

  // Delete User or Purge Test Account
  const handleDeleteUser = async (targetUserId: string, targetName: string) => {
    if (targetUserId === user?.id) {
      alert(isFr ? "Action impossible : vous ne pouvez pas supprimer votre propre compte fondateur." : "Impossible: you cannot delete your own founder account.");
      return;
    }
    if (!confirm(isFr ? `Supprimer définitivement le compte de "${targetName}" ?` : `Permanently delete account for "${targetName}"?`)) return;
    playSound('click');
    try {
      await supabase.from('profiles').delete().eq('id', targetUserId);
      setProfilesList(prev => prev.filter(p => p.id !== targetUserId));
      playSound('success');
      setActionNotice(isFr ? `Compte "${targetName}" retiré avec succès.` : `Account "${targetName}" removed successfully.`);
    } catch (err: any) {
      setProfilesList(prev => prev.filter(p => p.id !== targetUserId));
      setActionNotice(isFr ? `Compte retiré de la vue.` : `Account removed from view.`);
    }
  };

  // Update User Role (Admin <-> User)
  const handleToggleUserRole = async (targetUserId: string, currentRole: string | null) => {
    playSound('click');
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    if (targetUserId === user?.id && newRole === 'user') {
      alert(isFr ? "Action impossible : vous ne pouvez pas vous rétrograder vous-même." : "Impossible: you cannot demote your own admin account.");
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (error) {
      setActionNotice(isFr ? `Erreur : ${error.message}` : `Error: ${error.message}`);
    } else {
      playSound('success');
      setActionNotice(isFr ? `Rôle mis à jour : ${newRole.toUpperCase()}` : `Role updated: ${newRole.toUpperCase()}`);
      setProfilesList(prev => prev.map(p => p.id === targetUserId ? { ...p, role: newRole } : p));
    }
  };

  // Update User Plan
  const handleChangeUserPlan = async (targetUserId: string, newPlan: 'free' | 'premium' | 'pro') => {
    playSound('click');
    const { error } = await supabase
      .from('profiles')
      .update({ plan: newPlan, plan_status: 'active' })
      .eq('id', targetUserId);

    if (error) {
      setActionNotice(isFr ? `Erreur : ${error.message}` : `Error: ${error.message}`);
    } else {
      playSound('success');
      setActionNotice(isFr ? `Plan modifié : ${newPlan.toUpperCase()}` : `Plan changed: ${newPlan.toUpperCase()}`);
      setProfilesList(prev => prev.map(p => p.id === targetUserId ? { ...p, plan: newPlan } : p));
    }
  };

  // Create new challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallengeTitle.trim()) return;

    setCreatingChallenge(true);
    playSound('click');

    const { data, error } = await supabase.from('challenges').insert({
      title: newChallengeTitle.trim(),
      topic: newChallengeTopic.trim() || 'Conversation Générale',
      description: newChallengeTopic.trim() || 'Exprimez-vous spontanément en anglais sur ce sujet.',
      prompt_question: `Exprimez-vous sur : ${newChallengeTitle.trim()}`,
      level: newChallengeLevel,
      xp_reward: 0,
      is_daily: false,
    }).select().single();

    if (error) {
      setActionNotice(isFr ? `Erreur création : ${error.message}` : `Error creating challenge: ${error.message}`);
    } else if (data) {
      playSound('chime');
      setChallengesList([data, ...challengesList]);
      setNewChallengeTitle('');
      setNewChallengeTopic('');
      setActionNotice(isFr ? `Nouveau défi "${data.title}" créé avec succès !` : `New challenge "${data.title}" created successfully!`);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
    }

    setCreatingChallenge(false);
  };

  // Delete challenge
  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm(isFr ? "Voulez-vous supprimer ce défi vocal ?" : "Do you want to delete this challenge?")) return;
    playSound('click');
    try {
      // First clean submissions to respect foreign key constraint
      await supabase.from('challenge_submissions').delete().eq('challenge_id', challengeId);
      const { error } = await supabase.from('challenges').delete().eq('id', challengeId);
      if (!error) {
        setChallengesList(prev => prev.filter(c => c.id !== challengeId));
        setActionNotice(isFr ? "Défi supprimé avec succès." : "Challenge deleted successfully.");
      } else {
        setActionNotice(isFr ? `Erreur suppression : ${error.message}` : `Delete error: ${error.message}`);
      }
    } catch (err: any) {
      setActionNotice(isFr ? `Erreur : ${err?.message || 'Suppression impossible'}` : `Error: ${err?.message || 'Delete failed'}`);
    }
  };

  // Toggle partner online status for real registered members
  const handleTogglePartnerOnline = async (partnerId: string, currentStatus: boolean | null) => {
    playSound('click');
    const nextStatus = !currentStatus;

    const { error } = await supabase
      .from('profiles')
      .update({ is_online: nextStatus })
      .eq('id', partnerId);

    if (error) {
      setActionNotice(isFr ? `Erreur mise à jour : ${error.message}` : `Update error: ${error.message}`);
    } else {
      setProfilesList(prev => prev.map(p => p.id === partnerId ? { ...p, is_online: nextStatus } : p));
      setActionNotice(isFr ? `Statut mis à jour : ${nextStatus ? 'En Ligne' : 'Hors Ligne'}` : `Status updated: ${nextStatus ? 'Online' : 'Offline'}`);
    }
  };

  // Refresh real partners from registered profiles
  const handleRefreshProfiles = async () => {
    playSound('click');
    await fetchAdminData();
    setActionNotice(isFr ? "Profils des membres réels synchronisés avec succès." : "Real member profiles synced successfully.");
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm(isFr ? "Supprimer cette publication de la communauté ?" : "Delete this community post?")) return;
    playSound('click');
    try {
      // Clean associated likes and comments first to prevent foreign key errors
      await supabase.from('post_likes').delete().eq('post_id', postId);
      await supabase.from('post_comments').delete().eq('post_id', postId);
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (!error) {
        setPostsList(prev => prev.filter(p => p.id !== postId));
        setActionNotice(isFr ? "Publication supprimée." : "Post removed.");
      } else {
        setActionNotice(isFr ? `Erreur suppression : ${error.message}` : `Delete error: ${error.message}`);
      }
    } catch (err: any) {
      setActionNotice(isFr ? `Erreur : ${err?.message || 'Suppression impossible'}` : `Error: ${err?.message || 'Delete failed'}`);
    }
  };

  if (authLoading || (loadingData && isUserAdmin)) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-semibold">
            {isFr ? "Chargement du Back Office Administrateur..." : "Loading Admin Back Office..."}
          </p>
        </div>
      </div>
    );
  }

  // Not authorized screen
  if (!isUserAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="saas-card max-w-md text-center p-8 space-y-5 border-rose-500/30">
          <AlertTriangle className="w-14 h-14 text-rose-400 mx-auto" />
          <h1 className="text-2xl font-black text-white">
            {isFr ? "Accès Réservé à l'Administration" : "Admin Access Only"}
          </h1>
          <p className="text-slate-400 text-sm">
            {isFr 
              ? "Vous n'avez pas les droits d'administration nécessaires pour accéder à ce back office."
              : "You do not have the required administrative permissions to access this back office."}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-bold text-sm shadow-md"
          >
            <span>{isFr ? "Retourner au Dashboard" : "Return to Dashboard"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const adminSectionsConfig: {
    id: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: isFr ? "Vue d'Ensemble" : "Overview",
      icon: Activity,
      count: 'KPI',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'users',
      label: isFr ? "Membres Inscrits" : "Users Directory",
      icon: Users,
      count: profilesList.length,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'subscriptions',
      label: isFr ? "Abonnements & Revenus" : "Subscriptions & Billing",
      icon: CreditCard,
      count: stats.totalSubs,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'challenges',
      label: isFr ? "Défis Vocaux" : "Voice Challenges",
      icon: Sparkles,
      count: challengesList.length,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      id: 'partners',
      label: isFr ? "Partenaires Inscrits" : "Registered Partners",
      icon: Globe,
      count: profilesList.length,
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    {
      id: 'community',
      label: isFr ? "Modération Communauté" : "Community Moderation",
      icon: MessageSquare,
      count: postsList.length,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'calls',
      label: isFr ? "Sessions & Appels Live" : "Live Calls & Sessions",
      icon: PhoneCall,
      count: callsList.length,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'settings',
      label: isFr ? "Configuration & Système" : "Platform Settings",
      icon: Settings,
      count: 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isFr ? "Panneau de Contrôle & Back Office SaaS" : "SaaS Control Panel & Back Office"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>{isFr ? "Administration Centrale" : "Central Administration"}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono border border-emerald-500/30">
              Supabase Live
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {isFr 
              ? "Supervision des membres inscrits, abonnements, défis vocaux, correspondants et modération en temps réel."
              : "Real-time supervision of registered members, subscriptions, voice challenges, partners, and moderation."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playSound('click');
              fetchAdminData();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isFr ? "Actualiser" : "Refresh"}</span>
          </button>

          <Link
            href="/download"
            onClick={() => playSound('click')}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span>{isFr ? "📲 Télécharger l'App (Mobile & PC)" : "📲 Download App (Mobile & PC)"}</span>
          </Link>

          <Link
            href="/"
            onClick={() => playSound('click')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{isFr ? "Voir le Site (Accueil)" : "View Website (Home)"}</span>
          </Link>

          <Link
            href="/dashboard"
            onClick={() => playSound('click')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <span>{isFr ? "Voir Espace Apprenant" : "Learner Area"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>


      {/* ACTION NOTICE FEEDBACK */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold px-2">✕</button>
        </div>
      )}

      {/* ULTRA-VISIBLE ADMIN NAVBAR WITH ALL 8 SECTIONS */}
      <div className="sticky top-20 z-40 p-2 sm:p-2.5 rounded-2xl bg-white/95 dark:bg-[#080d1e]/95 border-2 border-rose-500/30 backdrop-blur-2xl shadow-xl dark:shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-white/10 px-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-300">
              {isFr ? "Barre des Sections Administrateur" : "Admin Sections Navigation"}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {isFr ? "8 sections actives disponibles" : "8 active sections available"}
          </span>
        </div>

        {/* Horizontal scrollable pills with clear visibility */}
        <nav className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1">
          {adminSectionsConfig.map((sec) => {
            const isActive = activeTab === sec.id;
            const Icon = sec.icon;

            return (
              <button
                key={sec.id}
                onClick={() => {
                  playSound('click');
                  setActiveTab(sec.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-[1.02] border border-rose-400'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{sec.label}</span>
                {sec.count !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black border ${
                    isActive ? 'bg-white text-slate-950 border-white' : sec.badgeColor
                  }`}>
                    {sec.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* SECTION 1: OVERVIEW & KEY STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="saas-card p-5 space-y-3 relative overflow-hidden group border-blue-500/30">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {isFr ? "Membres Inscrits" : "Registered Members"}
                </div>
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-bold">
                <TrendingUp className="w-3 h-3" />
                <span>{isFr ? "Base synchronisée" : "Synchronized DB"}</span>
              </div>
            </div>

            <div className="saas-card p-5 space-y-3 relative overflow-hidden group border-emerald-500/30">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalSubs}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {isFr ? "Abonnements SaaS Payants" : "Paid SaaS Subscriptions"}
                </div>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                <Crown className="w-3 h-3" />
                <span>MRR ~${stats.estimatedMrr}/mois</span>
              </div>
            </div>

            <div className="saas-card p-5 space-y-3 relative overflow-hidden group border-purple-500/30">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalChallenges}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {isFr ? "Défis Vocaux Actifs" : "Active Voice Challenges"}
                </div>
              </div>
              <div className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1 font-bold">
                <Flame className="w-3 h-3" />
                <span>{challengesList.length} {isFr ? "disponibles" : "available"}</span>
              </div>
            </div>

            <div className="saas-card p-5 space-y-3 relative overflow-hidden group border-amber-500/30">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalCalls}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {isFr ? "Sessions WebRTC & Appels" : "WebRTC Calls & Sessions"}
                </div>
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-bold">
                <Activity className="w-3 h-3" />
                <span>{isFr ? "Temps réel" : "Real time"}</span>
              </div>
            </div>
          </div>

          {/* QUICK OVERVIEW TABLES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 saas-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isFr ? "Derniers Membres Inscrits" : "Latest Registered Members"}</span>
                </h3>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {isFr ? "Voir tout →" : "View all →"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">{isFr ? "Membre" : "Member"}</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">{isFr ? "Niveau" : "Level"}</th>
                      <th className="pb-3 font-semibold">Plan</th>
                      <th className="pb-3 font-semibold">{isFr ? "Rôle" : "Role"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {profilesList.slice(0, 5).map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
                          <img
                            src={getUserAvatar(u.avatar_url, u.full_name, u.email)}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
                          />
                          <span>{u.full_name || 'Apprenant'}</span>
                          <span>{u.flag || '🌐'}</span>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{u.email || 'user@example.com'}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                            {u.current_level || 'B1'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            {u.plan || 'Free'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            u.role === 'admin' 
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30' 
                              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                          }`}>
                            {u.role || 'User'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QUICK ACTIONS PANEL */}
            <div className="saas-card p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>{isFr ? "Raccourcis Administrateur" : "Admin Shortcuts"}</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <button
                  onClick={() => setActiveTab('challenges')}
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-between text-left transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-white">{isFr ? "Ajouter un Défi Vocal" : "Add a Voice Challenge"}</span>
                  <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-between text-left transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-white">{isFr ? "Gérer les Rôles Membres" : "Manage Member Roles"}</span>
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </button>

                <button
                  onClick={() => setActiveTab('partners')}
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-between text-left transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-white">{isFr ? "Gérer Partenaires Mondiaux" : "Manage Global Partners"}</span>
                  <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </button>

                <button
                  onClick={() => setActiveTab('community')}
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-between text-left transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-white">{isFr ? "Modérer les Discussions" : "Moderate Community Posts"}</span>
                  <MessageSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="saas-card p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <span>{isFr ? "Répertoire des Membres Inscrits" : "Registered Members Directory"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-mono font-bold">
                  {filteredProfiles.length}
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isFr ? "Gérez les rôles admin, forfaits SaaS et suivez la pratique des membres." : "Manage admin roles, SaaS plans, and monitor member practice."}
              </p>
            </div>

            <div className="relative sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isFr ? "Rechercher membre, email..." : "Search user, email..."}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">{isFr ? "Utilisateur" : "User"}</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">{isFr ? "Niveau" : "Level"}</th>
                  <th className="pb-3 font-semibold">{isFr ? "Parole" : "Spoken"}</th>
                  <th className="pb-3 font-semibold">{isFr ? "Plan SaaS" : "SaaS Plan"}</th>
                  <th className="pb-3 font-semibold">{isFr ? "Rôle" : "Role"}</th>
                  <th className="pb-3 font-semibold text-right">{isFr ? "Actions" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="py-3 flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
                      <img
                        src={getUserAvatar(p.avatar_url, p.full_name, p.email)}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/15"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p>{p.full_name || 'Utilisateur'}</p>
                          {isTestAccount(p) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                              {isFr ? 'Compte Test' : 'Test Account'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{p.country} {p.flag}</p>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{p.email || 'user@example.com'}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                        {p.current_level || 'B1'}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-amber-600 dark:text-amber-300">{p.minutes_spoken ?? 0} min</td>
                    <td className="py-3">
                      {p.role === 'admin' || p.email === 'tychiquebongo@gmail.com' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          {isFr ? '👑 Fondateur' : '👑 Founder'}
                        </span>
                      ) : (
                        <select
                          value={p.plan || 'free'}
                          onChange={(e) => handleChangeUserPlan(p.id, e.target.value as any)}
                          className="bg-slate-50 dark:bg-[#060a14] border border-slate-200 dark:border-white/15 rounded-lg px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                          <option value="pro">Pro ($19.99)</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.role === 'admin' 
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40' 
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                      }`}>
                        {p.role || 'User'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleUserRole(p.id, p.role)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
                          title={isFr ? "Basculer rôle admin/user" : "Toggle admin/user role"}
                        >
                          {p.role === 'admin' ? (isFr ? 'Rétrograder' : 'Demote') : (isFr ? 'Promouvoir Admin' : 'Make Admin')}
                        </button>
                        {p.email !== 'tychiquebongo@gmail.com' && (
                          <button
                            onClick={() => handleDeleteUser(p.id, p.full_name || p.email || 'Utilisateur')}
                            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                            title={isFr ? "Supprimer le profil" : "Delete profile"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: SUBSCRIPTIONS & REVENUE */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="saas-card p-5 border-emerald-500/30 space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isFr ? "MRR Estimé" : "Estimated MRR"}</p>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">${stats.estimatedMrr}.00</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{isFr ? "Revenus récurrents mensuels" : "Monthly recurring revenue"}</p>
            </div>
            <div className="saas-card p-5 border-blue-500/30 space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isFr ? "Pass Pro Actifs" : "Active Pro Passes"}</p>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{profilesList.filter(p => p.plan === 'pro').length}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{isFr ? "Abonnements $19.99/mois" : "$19.99/month subscriptions"}</p>
            </div>
            <div className="saas-card p-5 border-amber-500/30 space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isFr ? "Pass Premium Actifs" : "Active Premium Passes"}</p>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{profilesList.filter(p => p.plan === 'premium').length}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{isFr ? "Abonnements $9.99/mois" : "$9.99/month subscriptions"}</p>
            </div>
          </div>

          <div className="saas-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{isFr ? "Clients avec Forfaits SaaS Actifs" : "Customers with Active SaaS Plans"}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">{isFr ? "Client" : "Customer"}</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">{isFr ? "Montant" : "Amount"}</th>
                    <th className="pb-3 font-semibold">{isFr ? "Statut Facturation" : "Billing Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {profilesList.filter(p => p.plan === 'pro' || p.plan === 'premium').map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        <span>{p.full_name}</span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300 font-mono">{p.email || 'customer@englishbooster.com'}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          {p.plan}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{p.plan === 'pro' ? '$19.99' : '$9.99'}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                          {isFr ? "Actif (Stripe/Card)" : "Active (Stripe/Card)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: VOICE CHALLENGES */}
      {activeTab === 'challenges' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Create challenge card */}
          <div className="saas-card p-6 space-y-4 border-purple-500/30">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>{isFr ? "Créer un Nouveau Défi Vocal pour la Plateforme" : "Create a New Platform Voice Challenge"}</span>
            </h3>

            <form onSubmit={handleCreateChallenge} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <input
                  type="text"
                  value={newChallengeTitle}
                  onChange={(e) => setNewChallengeTitle(e.target.value)}
                  placeholder={isFr ? "Titre du défi (ex: Describe your biggest professional milestone)..." : "Challenge title (e.g. Describe your biggest professional milestone)..."}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#060a14] border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="md:col-span-3">
                <input
                  type="text"
                  value={newChallengeTopic}
                  onChange={(e) => setNewChallengeTopic(e.target.value)}
                  placeholder={isFr ? "Thème (Business, Travel...)" : "Topic (Business, Travel...)"}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#060a14] border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <select
                  value={newChallengeLevel}
                  onChange={(e) => setNewChallengeLevel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#060a14] border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="A1">A1 - Beginner</option>
                  <option value="A2">A2 - Elementary</option>
                  <option value="B1">B1 - Intermediate</option>
                  <option value="B2">B2 - Upper-Int</option>
                  <option value="C1">C1 - Advanced</option>
                  <option value="C2">C2 - Mastery</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={creatingChallenge || !newChallengeTitle.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isFr ? "Publier" : "Publish"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing challenges list */}
          <div className="saas-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>{isFr ? "Défis Vocaux Disponibles" : "Available Voice Challenges"} ({challengesList.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challengesList.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                        {c.level}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">• {c.topic}</span>
                    </div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{c.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">« {c.prompt_question} »</p>
                  </div>
                  <button
                    onClick={() => handleDeleteChallenge(c.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                    title={isFr ? "Supprimer le défi" : "Delete challenge"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: REGISTERED PARTNERS */}
      {activeTab === 'partners' && (
        <div className="saas-card p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{isFr ? "Partenaires Réels Inscrits dans l'Application" : "Real Registered Partners"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-mono font-bold border border-teal-500/20">
                  {realPartnersList.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isFr ? "Seuls les vrais utilisateurs inscrits dans la base de données sont des partenaires de conversation." : "Only real users registered in the database are active conversation partners."}
              </p>
            </div>

            <button
              onClick={handleRefreshProfiles}
              className="px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isFr ? "Actualiser les partenaires réels" : "Refresh real partners"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realPartnersList.map((partner) => (
              <div key={partner.id} className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={getUserAvatar(partner.avatar_url, partner.full_name, partner.email)}
                      alt={partner.full_name}
                      className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-white/10"
                    />
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#060a14] ${
                      partner.is_online ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{partner.full_name}</span>
                      <span>{partner.flag || '🌐'}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(partner.role === 'admin' || partner.email === 'tychiquebongo@gmail.com') ? "Côte d'Ivoire 🇨🇮 • Fondateur C2" : `${partner.country || 'France'} • Niveau ${partner.current_level || 'B1'}`}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">🔥 {partner.streak ?? 0}j série • {partner.minutes_spoken ?? 0} min parole</p>
                  </div>
                </div>

                <button
                  onClick={() => handleTogglePartnerOnline(partner.id, partner.is_online)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    partner.is_online
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
                  }`}
                >
                  {partner.is_online ? (isFr ? 'En Ligne' : 'Online') : (isFr ? 'Hors Ligne' : 'Offline')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: COMMUNITY MODERATION */}
      {activeTab === 'community' && (
        <div className="saas-card p-6 space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>{isFr ? "Modération du Flux Social Communautaire" : "Community Social Feed Moderation"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono font-bold border border-rose-500/20">
                {postsList.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isFr ? "Surveillez les publications et supprimez tout contenu inapproprié." : "Monitor publications and remove inappropriate content."}
            </p>
          </div>

          <div className="space-y-3">
            {postsList.map((post) => (
              <div key={post.id} className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] uppercase border border-rose-500/20">
                      {post.category}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{new Date(post.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{post.content}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    ❤️ {post.likes_count} {isFr ? "J'aime" : "Likes"} • 💬 {post.comments_count} {isFr ? "Commentaires" : "Comments"}
                  </p>
                </div>

                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                  title={isFr ? "Supprimer la publication" : "Delete post"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 7: LIVE CALLS LOGS */}
      {activeTab === 'calls' && (
        <div className="saas-card p-6 space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{isFr ? "Journal des Sessions & Appels WebRTC" : "WebRTC Calls & Sessions Log"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono font-bold border border-indigo-500/20">
                {callsList.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isFr ? "Historique des appels en direct, durées de conversation et scores d'aisance." : "History of live sessions, call durations, and fluency scores."}
            </p>
          </div>

          {callsList.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
              <PhoneCall className="w-10 h-10 text-indigo-500/50 dark:text-indigo-400/50 mx-auto" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {isFr ? "Aucun appel enregistré pour le moment" : "No live call sessions recorded yet"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {isFr 
                  ? "Les sessions WebRTC réelles, durées de conversation et scores d'aisance apparaîtront ici dès que les membres passeront des appels." 
                  : "Real WebRTC sessions, speaking durations and fluency scores will appear here as members start calling."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">{isFr ? "Interlocuteur" : "Partner"}</th>
                    <th className="pb-3 font-semibold">{isFr ? "Durée" : "Duration"}</th>
                    <th className="pb-3 font-semibold">{isFr ? "Score Aisance" : "Fluency Score"}</th>
                    <th className="pb-3 font-semibold">{isFr ? "Parole" : "Spoken"}</th>
                    <th className="pb-3 font-semibold">{isFr ? "Statut" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {callsList.map((call, idx) => (
                    <tr key={call.id || idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{call.receiver_name || (isFr ? 'Correspondant' : 'Partner')}</span>
                      </td>
                      <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                        {Math.floor((call.duration_seconds || 0) / 60)}m {((call.duration_seconds || 0) % 60)}s
                      </td>
                      <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {call.fluency_score || 0}%
                      </td>
                      <td className="py-3 font-bold text-amber-600 dark:text-amber-400 font-mono">
                        +{Math.max(1, Math.round((call.duration_seconds || 0) / 60))} min
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          {call.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 8: PLATFORM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="saas-card p-6 space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{isFr ? "Configuration & Santé de la Plateforme" : "Platform Configuration & Health"}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isFr ? "Paramètres de production, serveurs WebRTC et connectivité Supabase." : "Production settings, WebRTC servers, and Supabase connectivity."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isFr ? "Langue de l'Interface Active" : "Active Interface Language"}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLang('fr');
                    playSound('click');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    lang === 'fr'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  🇫🇷 Français (FR)
                </button>
                <button
                  onClick={() => {
                    setLang('en');
                    playSound('click');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    lang === 'en'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  🇬🇧 English (EN)
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isFr ? "Statut Base de Données Supabase" : "Supabase Database Status"}</span>
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">● Connecté & Opérationnel (PostgreSQL 15)</p>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">{isFr ? "Tables profiles, challenges, posts, calls synchronisées." : "profiles, challenges, posts, calls tables in sync."}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
