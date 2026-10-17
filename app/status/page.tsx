'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import EnglishStatusTray, { EnglishStatus } from '@/components/EnglishStatusTray';
import { 
  Plus, 
  Video, 
  FileText, 
  Sparkles, 
  Heart, 
  Flame, 
  Globe, 
  MessageSquare, 
  Users, 
  Share2, 
  Filter,
  CheckCircle2,
  AlertCircle,
  Radio,
  Play,
  Volume2,
  Trash2,
  Send,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { verifyTextLinguisticEnglish } from '@/lib/aiVideoModeration';

function getStatusRemainingTime(createdAt: string, isFr: boolean): string {
  try {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const remainingMs = Math.max(0, 24 * 60 * 60 * 1000 - elapsed);
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) {
      return isFr ? `${hours}h rest.` : `${hours}h left`;
    }
    return isFr ? `${mins}m rest.` : `${mins}m left`;
  } catch {
    return isFr ? '24h' : '24h';
  }
}

export default function StatusSpacePage() {
  const { user, profile, playSound, isAdmin } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [activeFilter, setActiveFilter] = useState<'all' | 'text' | 'video'>('all');
  const [feedStatuses, setFeedStatuses] = useState<EnglishStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  // Quick Composer
  const [quickText, setQuickText] = useState('');
  const [quickTag, setQuickTag] = useState('#DailyThought');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('category', 'status')
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(50);

        // Strict 24h safety filter client-side
        const now = Date.now();
        const validPosts = (postsData || []).filter(p => {
          if (!p.created_at) return true;
          return (now - new Date(p.created_at).getTime()) <= 24 * 60 * 60 * 1000;
        });

        if (validPosts && validPosts.length > 0) {
          // Batch fetch profiles in a single query (0ms N+1 waterfall)
          const userIds = Array.from(new Set(validPosts.map(p => p.user_id).filter(Boolean)));
          let authorsMap: Record<string, any> = {};
          if (userIds.length > 0) {
            const { data: authors } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, flag, current_level')
              .in('id', userIds);
            if (authors) {
              for (const a of authors) authorsMap[a.id] = a;
            }
          }

          const enriched: EnglishStatus[] = postsData.map((p, idx) => {
            const author = authorsMap[p.user_id];
            const parts = p.content.split(':::');
            const text = parts[0] || p.content;
            const tag = parts[1] || '#DailyThought';
            const grad = parts[2] || 'from-emerald-600 via-teal-700 to-slate-900';

            const resolvedMediaUrl = p.media_url || null;

            return {
              id: p.id,
              user_id: p.user_id,
              author_name: author?.full_name || 'English Learner',
              author_avatar: getUserAvatar(author?.avatar_url, author?.full_name),
              author_flag: author?.flag || '🌐',
              author_level: author?.current_level || 'B2',
              media_type: (p.media_type === 'video' ? 'video' : 'text'),
              media_url: resolvedMediaUrl,
              content: text,
              topic_tag: tag,
              bg_gradient: grad,
              created_at: p.created_at,
              likes_count: p.likes_count ?? 0,
            };
          });
          setFeedStatuses(enriched);
        } else {
          setFeedStatuses([]);
        }
      } catch (err) {
        console.error('Error fetching statuses:', err);
      } finally {
        setLoading(false);
      }

    };

    fetchStatuses();
  }, [supabase]);

  const handleLike = (statusId: string) => {
    playSound('chime');
    const isLiked = likedMap[statusId];
    setLikedMap(prev => ({ ...prev, [statusId]: !isLiked }));
    setFeedStatuses(prev => prev.map(s => {
      if (s.id === statusId) {
        return { ...s, likes_count: isLiked ? s.likes_count - 1 : s.likes_count + 1 };
      }
      return s;
    }));
  };

  // Delete Status Handler - Optimistic & Instant
  const handleDeleteStatus = async (statusId: string) => {
    const confirmMsg = isFr 
      ? 'Voulez-vous vraiment supprimer ce statut ?' 
      : 'Are you sure you want to delete this status?';
    if (!window.confirm(confirmMsg)) return;

    playSound('click');

    // Instantly remove from feed UI
    setFeedStatuses(prev => prev.filter(s => s.id !== statusId));

    // Delete in background from Supabase
    try {
      if (!statusId.startsWith('status-founder-') && !statusId.startsWith('seed-') && !statusId.startsWith('init-')) {
        await supabase
          .from('posts')
          .delete()
          .eq('id', statusId);
      }
    } catch (e) {
      console.warn('Status delete warning:', e);
    }
  };

  const handleQuickPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      playSound('click');
      alert(isFr ? 'Veuillez vous connecter pour publier un statut.' : 'Please sign in to publish a status.');
      return;
    }
    if (!quickText.trim()) return;

    // Strict English Sentinel AI Moderation
    const verification = verifyTextLinguisticEnglish(quickText.trim());
    if (!verification.isEnglish) {
      playSound('click');
      alert(isFr 
        ? `🛡️ Agent IA English Sentinel : Publication refusée !\n\n${verification.reasonFr}\n\nEnglish Booster requiert que tous les statuts soient strictement rédigés en anglais.`
        : `🛡️ English Sentinel AI : Publication blocked!\n\n${verification.reason}\n\nEnglish Booster requires all statuses to be 100% in English.`);
      return;
    }

    setQuickSubmitting(true);
    playSound('click');

    try {
      const storedContent = `${quickText.trim()}:::${quickTag}:::from-emerald-600 via-teal-700 to-slate-900`;
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          category: 'status',
          content: storedContent,
          media_type: 'text',
          likes_count: 0,
          comments_count: 0,
        })
        .select()
        .single();

      const newId = newPost?.id || `st-quick-${Date.now()}`;
      const newStatusObj: EnglishStatus = {
        id: newId,
        user_id: user.id,
        author_name: profile.full_name,
        author_avatar: getUserAvatar(profile.avatar_url, profile.full_name, profile.email),
        author_flag: profile.flag || '🌐',
        author_level: profile.current_level || 'B2',
        media_type: 'text',
        content: quickText.trim(),
        topic_tag: quickTag,
        bg_gradient: 'from-emerald-600 via-teal-700 to-slate-900',
        created_at: new Date().toISOString(),
        likes_count: 0,
      };

      setFeedStatuses(prev => [newStatusObj, ...prev]);
      playSound('success');
      setQuickText('');
    } catch (err) {
      console.error(err);
    } finally {
      setQuickSubmitting(false);
    }
  };



  const filteredStatuses = useMemo(() => {
    return feedStatuses.filter(s => {
      if (activeFilter === 'text') return s.media_type === 'text';
      if (activeFilter === 'video') return s.media_type === 'video';
      return true;
    });
  }, [feedStatuses, activeFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-10">
      
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <span>{isFr ? 'Statuts & Stories Éphémères (24 Heures)' : '24-Hour Ephemeral Stories & Statuses'}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {isFr ? 'Statuts Quotidiens : Écrits & Vidéos' : 'Daily Statuses: Text & Video Stories'}
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          {isFr 
            ? 'Exprimez-vous en anglais ! Publiez vos pensées du jour, vos vidéos d’élocution, et écoutez les conseils et expressions partagés par la communauté mondiale.'
            : 'Speak up in English! Post daily thoughts, speaking videos, and explore idioms and pronunciation tips from learners worldwide.'}
        </p>
      </div>

      {/* TOP STORIES CAROUSEL (Interactive Tray with Fullscreen Viewer) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/10 shadow-xl">
        <EnglishStatusTray />
      </div>

      {/* QUICK STATUS COMPOSER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#080d1a] border border-emerald-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.4)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isFr ? 'Statut Rapide' : 'Quick Status'}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  English Only
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFr 
                  ? 'Partagez une pensée, une astuce de prononciation ou une expression en anglais.' 
                  : 'Share a thought, pronunciation tip or idiom in English.'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Composer Form */}
        <form onSubmit={handleQuickPublish} className="space-y-3">
          <div className="flex gap-3 items-start">
            <img
              src={getUserAvatar(profile?.avatar_url, profile?.full_name, profile?.email)}
              alt="My Profile"
              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/30 shrink-0 hidden xs:block"
            />
            <div className="flex-1 space-y-2">
              <textarea
                lang="en"
                spellCheck={true}
                autoCorrect="on"
                autoCapitalize="sentences"
                inputMode="text"
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder={isFr ? "Écrivez votre pensée ou astuce du jour en anglais (ex: Today I learned 'Under the weather'...)" : "Share an English thought, tip or idiom today..."}
                rows={2}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                required
              />

              {/* Tag selector chips */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {['#DailyThought', '#PronunciationTip', '#IdiomOfTheDay', '#EnglishChallenge', '#VocabularyBoost'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuickTag(tag)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                        quickTag === tag
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-white border border-slate-200 dark:border-transparent'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={quickSubmitting || !quickText.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-[0_0_15px_rgba(74,222,128,0.3)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  {quickSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{isFr ? 'Publier Statut' : 'Post Status'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </form>
      </div>

      {/* FILTERS & CATEGORIES BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isFr ? 'Filtrer les statuts :' : 'Filter statuses:'}
          </span>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              {isFr ? '🌟 Tous' : '🌟 All'} ({feedStatuses.length})
            </button>
            <button
              onClick={() => setActiveFilter('text')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeFilter === 'text'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isFr ? '📝 Écrits' : '📝 Text'}</span>
            </button>
            <button
              onClick={() => setActiveFilter('video')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeFilter === 'video'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isFr ? '🎥 Vidéos' : '🎥 Videos'}</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{isFr ? '100% Pratique en Anglais' : '100% English Practice'}</span>
        </div>
      </div>

      {/* FEED GRID OR PRODUCTIVE EMPTY STATE */}
      {!loading && filteredStatuses.length === 0 ? (
        <div className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Radio className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {isFr ? "Aucun statut pour le moment" : "No statuses published yet"}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isFr 
              ? "Soyez le premier à partager une astuce de prononciation, une citation ou une courte vidéo pour inspirer la communauté !"
              : "Be the first to share a pronunciation tip, quote, or short video to inspire the community!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStatuses.map((status) => {
            const isLiked = likedMap[status.id];
            const isVideo = status.media_type === 'video';

            return (
              <div
                key={status.id}
                className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-lg flex flex-col justify-between hover:border-emerald-500/40 transition-all group"
              >
              {/* Author Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={status.author_avatar}
                      alt={status.author_name}
                      className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/30 group-hover:ring-emerald-400 transition-all"
                    />
                    <span className="absolute -bottom-1 -right-1 text-xs">
                      {status.author_flag}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {status.author_name}
                    </h3>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {status.author_level}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400">
                    {status.topic_tag}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {getStatusRemainingTime(status.created_at, isFr)}
                  </span>
                  {(user?.id === status.user_id || isAdmin) && (
                    <button
                      onClick={() => handleDeleteStatus(status.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title={isFr ? "Supprimer ce statut" : "Delete this status"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Visual Content */}
              {isVideo ? (
                /* Video Status Card */
                <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-black mb-4 flex items-center justify-center group/video">
                  {status.media_url ? (
                    <video
                      src={status.media_url}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-emerald-950/40 to-slate-900 opacity-90" />
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg mb-2">
                          <Video className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-white mb-1">
                          {isFr ? 'Statut Vidéo' : 'Video Status'}
                        </span>
                        <p className="text-xs text-slate-300 max-w-[220px] font-medium italic">
                          "{status.content}"
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-[10px] text-emerald-300 font-bold flex items-center gap-1.5 shadow-md">
                    <Video className="w-3.5 h-3.5" />
                    <span>{isFr ? 'Vidéo' : 'Video'}</span>
                  </div>
                </div>
              ) : (
                /* Written Status Card */
                <div className={`w-full min-h-[180px] p-5 rounded-2xl bg-gradient-to-tr ${status.bg_gradient || 'from-emerald-600 via-teal-700 to-slate-900'} text-white shadow-inner mb-4 flex flex-col justify-between relative overflow-hidden`}>
                  <div className="absolute top-2 right-2 text-white/20 text-3xl font-serif">
                    “
                  </div>
                  <p className="text-sm sm:text-base font-extrabold leading-relaxed tracking-wide text-white drop-shadow-md">
                    {status.content}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-white/20 text-[11px] text-white/80 font-semibold">
                    <span>{status.topic_tag}</span>
                    <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">English Story</span>
                  </div>
                </div>
              )}

              {/* Status Footer Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleLike(status.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isLiked
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 font-bold'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500 animate-bounce' : ''}`} />
                  <span>{status.likes_count}</span>
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/chat`}
                    onClick={() => playSound('click')}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-400 transition-colors"
                    title={isFr ? "Discuter avec l'auteur" : "Chat with author"}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </div>
          );
        })}
      </div>
      )}

      {/* Guide & English Practice Tips */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {isFr ? 'Comment tirer le meilleur parti de vos statuts ?' : 'How to get the most out of your status?'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-white/20">
            <span className="font-bold text-emerald-500 block mb-1">
              {isFr ? '1. Format Court & Impactant' : '1. Short & Impactful Format'}
            </span>
            <p>
              {isFr 
                ? "Partagez une citation, une tournure idiomatique ou une phrase que vous venez d'apprendre aujourd'hui."
                : "Share a quote, an idiom, or a useful phrase you learned today."}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-white/20">
            <span className="font-bold text-teal-400 block mb-1">
              {isFr ? '2. Osez les Vidéos Stories' : '2. Try Video Stories'}
            </span>
            <p>
              {isFr 
                ? "Filmez-vous 15 secondes en parlant anglais. C'est l'exercice n°1 pour briser la timidité et gagner en aisance."
                : "Record yourself speaking English for 15 seconds. It's the #1 exercise to overcome shyness and build fluency."}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-white/20">
            <span className="font-bold text-blue-400 block mb-1">
              {isFr ? '3. Réagissez aux Autres' : '3. Engage with Others'}
            </span>
            <p>
              {isFr 
                ? "Aimez et répondez aux statuts des autres membres pour trouver vos futurs binômes de conversation vocale !"
                : "Like and comment on fellow members' statuses to find your future speaking practice partners!"}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
