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
  Trash2
} from 'lucide-react';

export default function StatusSpacePage() {
  const { user, profile, playSound, isAdmin } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [activeFilter, setActiveFilter] = useState<'all' | 'text' | 'video'>('all');
  const [feedStatuses, setFeedStatuses] = useState<EnglishStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('category', 'status')
          .order('created_at', { ascending: false })
          .limit(30);

        if (postsData && postsData.length > 0) {
          // Batch fetch profiles in a single query (0ms N+1 waterfall)
          const userIds = Array.from(new Set(postsData.map(p => p.user_id).filter(Boolean)));
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
          <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
          <span>{isFr ? 'Espace Statuts & Stories Anglais' : 'English Status & Stories Space'}</span>
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

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400">
                    {status.topic_tag}
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
            {isFr ? 'Comment tirer le meilleur parti de vos statuts ?' : 'How to get the most out of your statuses?'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-white/20">
            <span className="font-bold text-emerald-500 block mb-1">1. Format Court & Impactant</span>
            <p>Partagez une citation, une tournure idiomatique ou une phrase que vous venez d'apprendre aujourd'hui.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-white/20">
            <span className="font-bold text-teal-400 block mb-1">2. Osez les Vidéos Stories</span>
            <p>Filmez-vous 15 secondes en parlant anglais. C'est l'exercice n°1 pour briser la timidité et gagner en aisance.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-white/20">
            <span className="font-bold text-blue-400 block mb-1">3. Réagissez aux Autres</span>
            <p>Aimez et répondez aux statuts des autres membres pour trouver vos futurs binômes de conversation vocale !</p>
          </div>
        </div>
      </div>

    </div>
  );
}
