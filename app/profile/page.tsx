'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import type { Database } from '@/lib/database.types';
import { 
  User, 
  Mail, 
  Globe, 
  Target, 
  Upload, 
  Trophy, 
  Flame, 
  Save, 
  Crown, 
  CheckCircle2, 
  LogOut,
  Sparkles,
  Camera,
  Radio,
  ArrowRight
} from 'lucide-react';
import AvatarUploaderModal from '@/components/AvatarUploaderModal';

type Badge = Database['public']['Tables']['badges']['Row'];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile, signOut, playSound } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [currentLevel, setCurrentLevel] = useState('B1');
  const [targetLevel, setTargetLevel] = useState('C1');
  const [bio, setBio] = useState('');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);


  const isFounder = profile?.role === 'admin' || user?.email === 'tychiquebongo@gmail.com';

  useEffect(() => {
    if (profile) {
      const isFounderUser = profile.role === 'admin' || user?.email === 'tychiquebongo@gmail.com';
      setFullName(profile.full_name || (isFounderUser ? 'Tychique Bongo' : ''));
      setCountry(profile.country && profile.country !== 'France' ? profile.country : (isFounderUser ? "Côte d'Ivoire" : profile.country || 'France'));
      setNativeLanguage(profile.native_language || 'Français');
      setCurrentLevel(profile.current_level && profile.current_level !== 'B1' ? profile.current_level : (isFounderUser ? 'C2' : 'B1'));
      setTargetLevel(isFounderUser ? 'C2' : (profile.target_level || 'C1'));
      setBio(profile.bio && !profile.bio.includes('Learning English to communicate') 
        ? profile.bio 
        : (isFounderUser ? "Fondateur & CEO d'English Booster. Coach en fluidité et prise de parole en public." : ''));
      setAvatarUrl(getUserAvatar(profile.avatar_url, profile.full_name || 'Member', user?.email));
    }

    const fetchBadges = async () => {
      const { data } = await supabase.from('badges').select('*');
      if (data) setBadges(data);
    };

    fetchBadges();
  }, [profile, user, supabase]);

  // Real Badge Unlock criteria - zero fake/unreal claims
  const isBadgeUnlocked = (badgeId: string) => {
    const minutes = profile?.minutes_spoken ?? 0;
    const streak = profile?.streak ?? 0;

    switch (badgeId) {
      case 'first_call':
        return minutes > 0;
      case 'conversation_master':
        return minutes >= 60;
      case 'streak_7':
        return streak >= 7;
      case 'champion_league':
        return minutes >= 120;
      case 'grammar_pro':
        return streak >= 14;
      case 'global_speaker':
        return minutes >= 30;
      default:
        return false;
    }
  };

  const getBadgeRequirement = (badgeId: string) => {
    const minutes = profile?.minutes_spoken ?? 0;
    const streak = profile?.streak ?? 0;

    switch (badgeId) {
      case 'first_call':
        return minutes > 0 ? (isFr ? '✓ Validé' : '✓ Completed') : (isFr ? '1 appel requis' : '1 call required');
      case 'conversation_master':
        return `${minutes} / 60 min`;
      case 'streak_7':
        return `${streak} / 7 ${isFr ? 'j' : 'd'}`;
      case 'champion_league':
        return `${minutes} / 120 min`;
      case 'grammar_pro':
        return `${streak} / 14 ${isFr ? 'j' : 'd'}`;
      case 'global_speaker':
        return `${minutes} / 30 min`;
      default:
        return '';
    }
  };

  // Handle Avatar Image File Upload from device gallery
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    playSound('click');

    try {
      const { uploadGalleryAvatar } = await import('@/lib/avatarHelper');
      const result = await uploadGalleryAvatar(file, user.id);

      if (result.success && result.avatarUrl) {
        setAvatarUrl(result.avatarUrl);
        await refreshProfile();
        playSound('success');
      } else {
        console.error("Gallery avatar upload error:", result.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Profile Form Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    playSound('click');

    try {
      const detectedFlag = country.toLowerCase().includes('ivoire') || country.toLowerCase().includes('ivory')
        ? '🇨🇮'
        : country.toLowerCase().includes('france')
        ? '🇫🇷'
        : (profile?.flag || '🌐');

      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          country: country,
          flag: detectedFlag,
          native_language: nativeLanguage,
          current_level: currentLevel,
          target_level: targetLevel,
          bio: bio,
        })
        .eq('id', user.id);

      await refreshProfile();
      playSound('chime');
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {isFr ? "Mon Profil & Préférences" : "My Profile & Preferences"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {isFr 
            ? "Gérez votre profil public, votre niveau d'anglais et vos récompenses."
            : "Manage your public profile, English proficiency level, and achievements."}
        </p>
      </div>

      {savedNotice && (
        <div className="max-w-md mx-auto p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm text-center font-bold flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>{isFr ? "Profil mis à jour avec succès !" : "Profile updated successfully!"}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (4 cols): User Card & Badges */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card */}
          <div className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm text-center p-6 space-y-4">
            <div className="relative inline-block group">
              <img
                src={getUserAvatar(avatarUrl, fullName, user?.email)}
                alt={fullName}
                className="w-28 h-28 rounded-3xl object-cover ring-4 ring-emerald-500/30 dark:ring-emerald-400/40 shadow-2xl mx-auto cursor-pointer group-hover:scale-102 transition-transform"
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
                className="absolute -bottom-2 -right-2 p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg transition-transform hover:scale-110 active:scale-95"
                title={isFr ? "Modifier la photo via la galerie" : "Change photo from gallery"}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setAvatarModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer transition-all hover:scale-102 active:scale-98"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>
                  {isFr ? 'Modifier la photo (Galerie)' : 'Change photo (Gallery)'}
                </span>
              </button>
            </div>


            <div>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {fullName || (isFounder ? 'Tychique Bongo' : (isFr ? 'Apprenant' : 'Learner'))}
                </h2>
                {isFounder && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3 text-emerald-400" />
                    <span>Fondateur</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{profile?.email}</p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                {isFr ? 'Niveau' : 'Level'} {currentLevel} {isFounder ? '• Expert' : ''}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{profile?.streak ?? 0} {isFr ? 'j de série' : 'd streak'}</span>
              </span>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {isFr ? 'Abonnement :' : 'Subscription:'}{' '}
                <strong className="text-slate-900 dark:text-white font-bold">
                  {isFounder 
                    ? (isFr ? '👑 Fondateur (Accès Total)' : '👑 Founder (Full Access)')
                    : (profile?.plan ? profile.plan.toUpperCase() : 'FREE')}
                </strong>
              </span>
              <button
                onClick={signOut}
                className="text-rose-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isFr ? 'Déconnexion' : 'Sign out'}</span>
              </button>
            </div>
          </div>

          {/* Quick Status & Stories Space Card */}
          <a
            href="/status"
            className="saas-card bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between group hover:border-emerald-400 transition-all shadow-md block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-400 transition-colors">
                  {isFr ? 'Espace Statuts (Écrit & Vidéo)' : 'Status Space (Text & Video)'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isFr ? 'Publier et regarder des stories' : 'Post & watch English stories'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Badges Showcase - Real Achievements Only */}
          <div className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm p-6 space-y-4">

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>{isFr ? 'Badges & Succès' : 'Badges & Achievements'}</span>
              </h3>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {badges.filter(b => isBadgeUnlocked(b.id)).length} / {badges.length} {isFr ? 'débloqués' : 'unlocked'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {badges.map((b) => {
                const unlocked = isBadgeUnlocked(b.id);
                const req = getBadgeRequirement(b.id);
                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                      unlocked
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 opacity-40 grayscale'
                    }`}
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{b.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      unlocked 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                    }`}>
                      {unlocked ? (isFr ? '✓ Obtenu' : '✓ Unlocked') : `🔒 ${req}`}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{b.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column (8 cols): Edit Profile Form */}
        <div className="lg:col-span-8">
          <div className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              {isFr ? 'Informations Personnelles' : 'Personal Information'}
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    {isFr ? 'Nom Complet' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    {isFr ? 'Pays de Résidence' : 'Country of Residence'}
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    {isFr ? 'Langue Maternelle' : 'Native Language'}
                  </label>
                  <input
                    type="text"
                    value={nativeLanguage}
                    onChange={(e) => setNativeLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    {isFr ? 'Niveau CEFR Actuel' : 'Current CEFR Level'}
                  </label>
                  <select
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="A1">A1 - {isFr ? 'Débutant' : 'Beginner'}</option>
                    <option value="A2">A2 - {isFr ? 'Élémentaire' : 'Elementary'}</option>
                    <option value="B1">B1 - {isFr ? 'Intermédiaire' : 'Intermediate'}</option>
                    <option value="B2">B2 - {isFr ? 'Intermédiaire Supérieur' : 'Upper-Intermediate'}</option>
                    <option value="C1">C1 - {isFr ? 'Avancé' : 'Advanced'}</option>
                    <option value="C2">C2 - {isFr ? 'Maîtrise' : 'Fluent / Mastery'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    {isFr ? 'Niveau Visé (Objectif)' : 'Target Level (Goal)'}
                  </label>
                  <select
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  {isFr ? 'Bio & Objectifs de Pratique' : 'Bio & Practice Goals'}
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={isFr 
                    ? "Présentez-vous brièvement à vos partenaires de conversation..."
                    : "Briefly introduce yourself to conversation partners..."}
                  className="w-full p-4 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isFr ? 'Enregistrer les modifications' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>

      {/* Avatar Uploader & Preset Gallery Modal */}
      <AvatarUploaderModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onAvatarUpdated={(url) => setAvatarUrl(url)}
      />

    </div>
  );
}

