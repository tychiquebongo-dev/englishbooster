'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import type { Database } from '@/lib/database.types';
import { 
  Plus, 
  Video, 
  FileText, 
  Sparkles, 
  X, 
  Upload, 
  Flame, 
  Heart, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Keyboard as KeyboardIcon
} from 'lucide-react';
import EnglishVirtualKeyboard from '@/components/EnglishVirtualKeyboard';

export interface EnglishStatus {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string;
  author_flag: string;
  author_level: string;
  media_type: 'text' | 'video';
  media_url?: string | null;
  content: string;
  topic_tag: string;
  bg_gradient?: string;
  created_at: string;
  likes_count: number;
}

const GRADIENTS = [
  { name: 'Aurora', class: 'from-emerald-600 via-teal-700 to-slate-900' },
  { name: 'Sunset', class: 'from-rose-600 via-purple-700 to-slate-950' },
  { name: 'Cyberpunk', class: 'from-blue-600 via-indigo-700 to-slate-950' },
  { name: 'Amber Glow', class: 'from-amber-600 via-rose-700 to-slate-950' },
  { name: 'Midnight', class: 'from-slate-800 via-indigo-950 to-black' },
];

const TOPIC_TAGS = [
  '#DailyThought',
  '#PronunciationTip',
  '#IdiomOfTheDay',
  '#EnglishChallenge',
  '#AccentPractice',
  '#VocabularyBoost'
];

export default function EnglishStatusTray() {
  const { user, profile, playSound, isAdmin } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [statuses, setStatuses] = useState<EnglishStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Status Creation Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [statusType, setStatusType] = useState<'text' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].class);
  const [selectedTag, setSelectedTag] = useState(TOPIC_TAGS[0]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [englishConfirmed, setEnglishConfirmed] = useState(true);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(true);

  // Fullscreen Viewer Modal
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState('');
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Fetch statuses from Supabase posts table
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('category', 'status')
          .order('created_at', { ascending: false })
          .limit(20);

        if (postsData && postsData.length > 0) {
          const authorIds = Array.from(new Set(postsData.map(p => p.user_id).filter(Boolean)));
          let authorsMap: Record<string, any> = {};
          if (authorIds.length > 0) {
            const { data: authors } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, flag, current_level')
              .in('id', authorIds);
            if (authors) {
              for (const a of authors) authorsMap[a.id] = a;
            }
          }

          const enriched: EnglishStatus[] = postsData.map((p, idx) => {
            const author = authorsMap[p.user_id];
            const parts = p.content.split(':::');
            const text = parts[0] || p.content;
            const tag = parts[1] || TOPIC_TAGS[idx % TOPIC_TAGS.length];
            const grad = parts[2] || GRADIENTS[idx % GRADIENTS.length].class;

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
          setStatuses(enriched);
        } else {
          setStatuses([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, [supabase]);

  // Video File Selection from gallery
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert(isFr ? 'Veuillez sélectionner un fichier vidéo valide depuis votre galerie.' : 'Please select a valid video file from your gallery.');
      return;
    }

    setVideoFile(file);
    setStatusType('video');
    playSound('click');

    // Generate immediate object URL for zero-lag instant preview (zero RAM copy, zero CPU overhead)
    try {
      const objUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(objUrl);
    } catch {}
  };

  // Submit New Status
  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      playSound('click');
      alert(isFr ? 'Veuillez vous connecter pour publier un statut.' : 'Please sign in to publish a status.');
      return;
    }

    if (!textContent.trim() && !videoFile) {
      alert(isFr ? 'Veuillez ajouter un texte ou une vidéo.' : 'Please add text or video.');
      return;
    }

    setSubmitting(true);
    playSound('click');

    try {
      let finalMediaUrl: string | null = null;
      const finalMediaType: 'text' | 'video' = statusType;

      if (statusType === 'video' && (videoFile || videoPreviewUrl)) {
        // Priority 1: Cloud Storage in 'videos' or 'avatars' bucket
        if (videoFile) {
          const fileExt = videoFile.name.split('.').pop() || 'mp4';
          const filePath = `statuses/${user.id}/${Date.now()}.${fileExt}`;

          // Try 'videos' bucket first
          try {
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('videos')
              .upload(filePath, videoFile, { upsert: true });

            if (!uploadErr && uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath);
              if (publicUrl) finalMediaUrl = publicUrl;
            }
          } catch {}

          // Try 'avatars' bucket if 'videos' is unavailable
          if (!finalMediaUrl) {
            try {
              const { data: uploadData2, error: uploadErr2 } = await supabase.storage
                .from('avatars')
                .upload(`statuses/${filePath}`, videoFile, { upsert: true });

              if (!uploadErr2 && uploadData2) {
                const { data: { publicUrl } } = supabase.storage
                  .from('avatars')
                  .getPublicUrl(`statuses/${filePath}`);
                if (publicUrl) finalMediaUrl = publicUrl;
              }
            } catch {}
          }
        }

        // Priority 2: Use fast local object URL preview for current session
        if (!finalMediaUrl && videoPreviewUrl) {
          finalMediaUrl = videoPreviewUrl;
        }
      }

      // Encode content + tag + gradient
      const storedContent = `${textContent.trim()}:::${selectedTag}:::${selectedGradient}`;

      // Insert into posts table
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          category: 'status',
          content: storedContent,
          media_type: finalMediaType,
          media_url: finalMediaUrl,
          likes_count: 0,
          comments_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.warn('Status post warning:', error);
      }

      const newStatusId = newPost?.id || `st-${Date.now()}`;
      const activeVideoUrl = finalMediaUrl || videoPreviewUrl;

      const newStatusObj: EnglishStatus = {
        id: newStatusId,
        user_id: user.id,
        author_name: profile.full_name,
        author_avatar: getUserAvatar(profile.avatar_url, profile.full_name, profile.email),
        author_flag: profile.flag || '🌐',
        author_level: profile.current_level || 'B2',
        media_type: finalMediaType,
        media_url: activeVideoUrl,
        content: textContent.trim(),
        topic_tag: selectedTag,
        bg_gradient: selectedGradient,
        created_at: new Date().toISOString(),
        likes_count: 0,
      };

      setStatuses(prev => [newStatusObj, ...prev]);
      playSound('success');

      // Reset
      setTextContent('');
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setCreateModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Fullscreen Viewer
  const handleOpenViewer = (index: number) => {
    playSound('click');
    setActiveStatusIndex(index);
    setProgress(0);
    setViewerOpen(true);
  };

  // Auto-progress bar for Fullscreen viewer
  useEffect(() => {
    if (!viewerOpen) return;

    setProgress(0);
    const duration = statuses[activeStatusIndex]?.media_type === 'video' ? 12000 : 5500;
    const interval = 100;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Go to next status
          if (activeStatusIndex < statuses.length - 1) {
            setActiveStatusIndex(i => i + 1);
            return 0;
          } else {
            setViewerOpen(false);
            return 0;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [viewerOpen, activeStatusIndex, statuses.length]);

  // Delete Status Handler - Optimistic & Instant
  const handleDeleteStatus = async (statusId: string) => {
    const confirmMsg = isFr 
      ? 'Voulez-vous vraiment supprimer ce statut ?' 
      : 'Are you sure you want to delete this status?';
    if (!window.confirm(confirmMsg)) return;

    playSound('click');

    // Instantly remove from UI
    setStatuses(prev => {
      const next = prev.filter(s => s.id !== statusId);
      if (next.length === 0) {
        setViewerOpen(false);
      } else if (activeStatusIndex >= next.length) {
        setActiveStatusIndex(Math.max(0, next.length - 1));
      }
      return next;
    });

    // Delete in background from Supabase
    try {
      if (!statusId.startsWith('init-') && !statusId.startsWith('seed-')) {
        await supabase
          .from('posts')
          .delete()
          .eq('id', statusId);
      }
    } catch (e) {
      console.warn('Status delete warning:', e);
    }
  };


  const activeStatus = statuses[activeStatusIndex];

  // Like reaction
  const handleLikeCurrent = () => {
    if (!activeStatus) return;
    playSound('chime');
    const isLiked = likedMap[activeStatus.id];
    setLikedMap({ ...likedMap, [activeStatus.id]: !isLiked });

    setStatuses(prev => prev.map(s => {
      if (s.id === activeStatus.id) {
        return { ...s, likes_count: isLiked ? s.likes_count - 1 : s.likes_count + 1 };
      }
      return s;
    }));

    setFloatingHearts(prev => [...prev, Date.now()]);
  };

  return (
    <div className="w-full space-y-3">
      
      {/* Top Banner: English Only Badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>{isFr ? 'Statuts & Stories (Uniquement en Anglais)' : 'Statuses & Stories (English Only)'}</span>
            <span className="text-base">🇬🇧</span>
          </h2>
        </div>
        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          24h Ephemeral
        </span>
      </div>

      {/* Stories Horizontal Tray */}
      <div className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none">
        
        {/* Card 1: Add My Status */}
        <button
          onClick={() => {
            playSound('click');
            setCreateModalOpen(true);
          }}
          className="flex flex-col items-center gap-1.5 shrink-0 group"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-[2px] bg-gradient-to-tr from-emerald-400 to-teal-300 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(74,222,128,0.25)]">
            <div className="w-full h-full rounded-[14px] bg-slate-100 dark:bg-[#060a14] flex flex-col items-center justify-center p-1 overflow-hidden relative">
              <img
                src={getUserAvatar(profile?.avatar_url, profile?.full_name, profile?.email)}
                alt="My profile"
                className="w-full h-full object-cover rounded-[12px] opacity-70 group-hover:opacity-40 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-7 h-7 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {isFr ? '+ Mon Statut' : '+ My Status'}
          </span>
        </button>

        {/* Stories from Registered Users */}
        {statuses.map((status, index) => {
          return (
            <button
              key={status.id}
              onClick={() => handleOpenViewer(index)}
              className="flex flex-col items-center gap-1.5 shrink-0 group text-center"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-[2.5px] bg-gradient-to-tr from-rose-500 via-purple-500 to-emerald-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-[13px] bg-slate-100 dark:bg-[#060a14] overflow-hidden relative">
                  <img
                    src={status.author_avatar}
                    alt={status.author_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {/* Status media type pill */}
                  <div className="absolute bottom-1 right-1 p-1 rounded-md bg-black/75 backdrop-blur-md text-white text-[9px]">
                    {status.media_type === 'video' ? (
                      <Video className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <FileText className="w-3 h-3 text-amber-300" />
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 max-w-[70px] truncate group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                {status.author_name.split(' ')[0]}
              </span>
            </button>
          );
        })}

      </div>

      {/* CREATE STATUS MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/15 shadow-2xl space-y-4 scrollbar-thin">
            {/* Close Button */}
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title & Warning */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🇬🇧</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {isFr ? 'Publier un Statut en Anglais' : 'Post an English Status'}
                </h3>
              </div>
              <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  {isFr 
                    ? 'Important : Ce statut doit être rédigé ou exprimé exclusivement en Anglais pour aider la communauté.'
                    : 'Important: This status must be spoken or written exclusively in English to benefit learners!'}
                </span>
              </div>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setStatusType('text')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  statusType === 'text'
                    ? 'bg-emerald-500 dark:bg-emerald-400 text-slate-950 shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{isFr ? 'Message Texte Anglais' : 'English Text Message'}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusType('video')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  statusType === 'video'
                    ? 'bg-emerald-500 dark:bg-emerald-400 text-slate-950 shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>{isFr ? 'Vidéo depuis Galerie' : 'Video from Gallery'}</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateStatus} className="space-y-4">
              {/* Category / Topic Tag */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-1.5">
                  {isFr ? 'Thème du Statut :' : 'Topic Tag:'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        selectedTag === tag
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Status Mode */}
              {statusType === 'text' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-400">
                        {isFr ? 'Votre Message (en anglais) :' : 'Your Message (in English):'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          showVirtualKeyboard 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm'
                            : 'bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-400'
                        }`}
                      >
                        <KeyboardIcon className="w-3.5 h-3.5" />
                        <span>{showVirtualKeyboard ? 'Masquer Clavier EN' : '🇬🇧 Clavier Anglais QWERTY'}</span>
                      </button>
                    </div>

                    <textarea
                      lang="en"
                      spellCheck={true}
                      autoCorrect="on"
                      autoCapitalize="sentences"
                      inputMode="text"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="e.g. A quick English idiom I learned today is 'Break a leg', which means good luck!"
                      rows={3}
                      className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                      required
                    />
                  </div>

                  {/* Virtual English QWERTY Keyboard with Contractions and Idioms */}
                  <EnglishVirtualKeyboard
                    isOpen={showVirtualKeyboard}
                    onToggle={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
                    onInsertText={(text) => setTextContent(prev => prev + text)}
                    onDeleteChar={() => setTextContent(prev => prev.slice(0, -1))}
                    onClear={() => setTextContent('')}
                  />

                  {/* Gradient Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-1.5">
                      {isFr ? 'Style visuel de la carte :' : 'Visual Card Gradient:'}
                    </label>
                    <div className="flex gap-2">
                      {GRADIENTS.map(grad => (
                        <button
                          key={grad.name}
                          type="button"
                          onClick={() => setSelectedGradient(grad.class)}
                          className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${grad.class} ring-2 transition-all ${
                            selectedGradient === grad.class ? 'ring-emerald-500 dark:ring-emerald-400 scale-110 shadow-lg' : 'ring-transparent opacity-70'
                          }`}
                          title={grad.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Video Status Mode (From Device Gallery) */}
              {statusType === 'video' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-1">
                      {isFr ? 'Vidéo sélectionnée depuis votre galerie :' : 'Video from your gallery:'}
                    </label>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />

                    {videoPreviewUrl ? (
                      <div className="relative aspect-[9/16] max-h-52 mx-auto rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-white/20">
                        <video
                          src={videoPreviewUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setVideoFile(null);
                            setVideoPreviewUrl(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-400/50 flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-white/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">
                          {isFr ? 'Parcourir la galerie vidéo (MP4, MOV, WebM)' : 'Select video from gallery (MP4, MOV, WebM)'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {isFr ? 'Max 60 secondes • Uniquement en anglais' : 'Max 60 seconds • English spoken only'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-400">
                        {isFr ? 'Légende (en anglais) :' : 'Caption (in English):'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          showVirtualKeyboard 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm'
                            : 'bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-400'
                        }`}
                      >
                        <KeyboardIcon className="w-3.5 h-3.5" />
                        <span>{showVirtualKeyboard ? 'Masquer Clavier EN' : '🇬🇧 Clavier EN'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      lang="en"
                      spellCheck={true}
                      autoCorrect="on"
                      autoCapitalize="sentences"
                      inputMode="text"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="e.g. Practicing my British pronunciation today!"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 mb-2"
                    />

                    {/* Virtual English Keyboard for caption */}
                    {showVirtualKeyboard && (
                      <EnglishVirtualKeyboard
                        isOpen={showVirtualKeyboard}
                        onToggle={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
                        onInsertText={(text) => setTextContent(prev => prev + text)}
                        onDeleteChar={() => setTextContent(prev => prev.slice(0, -1))}
                        onClear={() => setTextContent('')}
                      />
                    )}
                  </div>

                </div>
              )}

              {/* English pledge checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={englishConfirmed}
                  onChange={(e) => setEnglishConfirmed(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/20 text-emerald-500 focus:ring-emerald-400"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  {isFr ? 'Je confirme que mon statut est 100% en langue anglaise.' : 'I confirm this status is 100% in English.'}
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !englishConfirmed || (statusType === 'text' && !textContent.trim()) || (statusType === 'video' && !videoFile)}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{isFr ? 'Publication...' : 'Posting...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{isFr ? 'Publier mon Statut' : 'Publish Status'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN STORIES VIEWER MODAL */}
      {viewerOpen && activeStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
          
          {/* Main Story Card */}
          <div className="relative w-full sm:max-w-md h-full sm:h-[680px] sm:rounded-3xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl flex flex-col justify-between">
            
            {/* Top Progress Bars */}
            <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
              {statuses.map((_, i) => (
                <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{
                      width: i === activeStatusIndex ? `${progress}%` : i < activeStatusIndex ? '100%' : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header: Author & Close */}
            <div className="relative z-30 pt-6 px-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeStatus.author_avatar}
                  alt={activeStatus.author_name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-400"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black">{activeStatus.author_name}</span>
                    <span className="text-xs">{activeStatus.author_flag}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-400">{activeStatus.topic_tag}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{activeStatus.author_level}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeStatus.media_type === 'video' && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}
                {/* Delete button for status author or admin */}
                {(user?.id === activeStatus.user_id || isAdmin) && (
                  <button
                    onClick={() => handleDeleteStatus(activeStatus.id)}
                    className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white backdrop-blur-md transition-colors"
                    title={isFr ? "Supprimer mon statut" : "Delete status"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setViewerOpen(false)}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Story Content: Text or Video */}
            <div className="relative flex-1 flex items-center justify-center p-6 text-center overflow-hidden">
              {activeStatus.media_type === 'video' && activeStatus.media_url ? (
                <div className="absolute inset-0 w-full h-full">
                  <video
                    ref={videoPlayerRef}
                    src={activeStatus.media_url}
                    autoPlay
                    playsInline
                    loop
                    muted={isMuted}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                  {activeStatus.content && (
                    <div className="absolute bottom-6 inset-x-6 p-3 rounded-2xl bg-black/75 border border-white/20 backdrop-blur-md text-white text-xs text-left">
                      {activeStatus.content}
                    </div>
                  )}
                </div>
              ) : (
                /* Text Status Card */
                <div className={`w-full h-full rounded-2xl p-8 bg-gradient-to-br ${activeStatus.bg_gradient || GRADIENTS[0].class} flex flex-col items-center justify-center shadow-2xl relative`}>
                  <div className="text-emerald-300 font-serif text-5xl mb-2 opacity-60">“</div>
                  <p className="text-xl sm:text-2xl font-black text-white leading-relaxed drop-shadow-md">
                    {activeStatus.content}
                  </p>
                  <span className="mt-6 px-3 py-1 rounded-full text-xs font-bold bg-white/15 border border-white/20 text-emerald-200">
                    🇬🇧 Practice English
                  </span>
                </div>
              )}
            </div>

            {/* Next / Previous tap zones */}
            <button
              onClick={() => {
                if (activeStatusIndex > 0) setActiveStatusIndex(i => i - 1);
              }}
              className="absolute left-2 inset-y-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white/80 hover:text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                if (activeStatusIndex < statuses.length - 1) setActiveStatusIndex(i => i + 1);
                else setViewerOpen(false);
              }}
              className="absolute right-2 inset-y-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white/80 hover:text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Bottom Actions & Reactions */}
            <div className="relative z-30 p-4 border-t border-white/10 bg-black/70 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                {/* Like Button */}
                <button
                  onClick={handleLikeCurrent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                >
                  <Heart className={`w-4 h-4 ${likedMap[activeStatus.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{activeStatus.likes_count}</span>
                </button>

                {/* Quick Feedback Chips in English */}
                <div className="flex items-center gap-1">
                  {['🔥 Great English!', '👏 Good job!', '💯 Well said!'].map(reaction => (
                    <button
                      key={reaction}
                      onClick={() => {
                        playSound('click');
                        alert(isFr ? `Réaction envoyée: ${reaction}` : `Reaction sent: ${reaction}`);
                      }}
                      className="px-2 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-slate-200 transition-colors"
                    >
                      {reaction}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Hearts Animation */}
            {floatingHearts.map(id => (
              <div
                key={id}
                className="absolute bottom-20 left-1/2 text-2xl animate-float-up pointer-events-none"
              >
                ❤️
              </div>
            ))}

          </div>
        </div>
      )}

    </div>
  );
}
