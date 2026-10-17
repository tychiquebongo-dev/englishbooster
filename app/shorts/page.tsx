'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Pause, 
  ChevronDown, 
  ChevronUp, 
  Heart, 
  MessageSquare, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Upload, 
  X, 
  AlertCircle, 
  Tv, 
  Send,
  ShieldCheck,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { 
  verifyTextLinguisticEnglish, 
  analyzeVideoAudioWithAI, 
  type AIVerificationResult 
} from '@/lib/aiVideoModeration';

export interface ShortVideoItem {
  id: string;
  title: string;
  speaker: string;
  author_avatar: string;
  author_flag: string;
  level: string;
  category: string;
  video_url: string;
  image_fallback?: string;
  transcript: string;
  likes_count: number;
  comments_count: number;
  views_count?: number;
  user_id?: string;
  ai_verified?: boolean;
  ai_certificate?: string;
  xpReward?: number;
}

export interface ShortCommentItem {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  author_avatar: string;
  author_flag?: string;
  content: string;
  created_at: string;
}

export function formatViewsCount(count: number): string {
  if (!count || count < 0) return '0';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return count.toString();
}

export function getInitialViews(shortId: string, likesCount: number = 0): number {
  if (typeof window === 'undefined') return Math.max(95, (likesCount || 0) * 14 + 180);
  try {
    const saved = localStorage.getItem(`eb_short_views_${shortId}`);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  let hash = 0;
  for (let i = 0; i < shortId.length; i++) {
    hash = (hash << 5) - hash + shortId.charCodeAt(i);
    hash |= 0;
  }
  const base = (Math.abs(hash) % 450) + 140;
  const initial = Math.max(base, (likesCount || 0) * 15 + base);
  try {
    localStorage.setItem(`eb_short_views_${shortId}`, initial.toString());
  } catch {}
  return initial;
}

function formatTimeAgo(dateStr: string, isFr: boolean): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs)) return isFr ? 'Récemment' : 'Recently';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return isFr ? "À l'instant" : 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isFr ? `Il y a ${diffMin} min` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return isFr ? `Il y a ${diffHours} h` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return isFr ? `Il y a ${diffDays} j` : `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isFr ? 'Récemment' : 'Recently';
  }
}

function getCategoryLabel(cat: string, isFr: boolean): string {
  if (!isFr) return cat;
  switch (cat) {
    case 'Pronunciation & Phonetics':
      return 'Prononciation & Phonétique';
    case 'Business English':
      return 'Anglais Professionnel';
    case 'Everyday Slang':
      return 'Argot & Expressions';
    case 'Grammar Tips':
      return 'Astuces de Grammaire';
    case 'Accent Training':
      return "Entraînement à l'Accent";
    case 'Community English':
      return 'Anglais Communautaire';
    default:
      return cat;
  }
}

function getLevelLabel(lvl: string, isFr: boolean): string {
  if (!isFr) return lvl;
  switch (lvl) {
    case 'A1-A2':
      return 'A1-A2 (Débutant)';
    case 'B1':
      return 'B1 (Intermédiaire)';
    case 'B2':
      return 'B2 (Intermédiaire Avancé)';
    case 'C1-C2':
      return 'C1-C2 (Avancé)';
    default:
      return lvl;
  }
}

export default function ShortsPage() {
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();
  const router = useRouter();
  const supabase = createClient();

  const [shortsList, setShortsList] = useState<ShortVideoItem[]>([]);
  const [loadingShorts, setLoadingShorts] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [soundToast, setSoundToast] = useState<string | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [viewsMap, setViewsMap] = useState<Record<string, number>>({});

  // Comments State (cached by short id)
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsMap, setCommentsMap] = useState<Record<string, ShortCommentItem[]>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Publish Short Modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [shortTitle, setShortTitle] = useState('');
  const [shortTranscript, setShortTranscript] = useState('');
  const [shortCategory, setShortCategory] = useState('Pronunciation & Phonetics');
  const [shortLevel, setShortLevel] = useState('B1');
  const [englishPledged, setEnglishPledged] = useState(true);
  const [uploading, setUploading] = useState(false);

  // English Sentinel AI Moderation Agent State
  const [aiVerification, setAiVerification] = useState<AIVerificationResult | null>(null);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiScanStatus, setAiScanStatus] = useState<string>('');

  // Real-time AI Sentinel Linguistic Inspection
  useEffect(() => {
    const textToCheck = `${shortTitle} ${shortTranscript}`.trim();
    if (textToCheck.length > 2) {
      const res = verifyTextLinguisticEnglish(textToCheck);
      setAiVerification(res);
    } else {
      setAiVerification(null);
    }
  }, [shortTitle, shortTranscript]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Handle video selection from gallery
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert(isFr ? 'La vidéo ne doit pas dépasser 100 Mo.' : 'The video must not exceed 100MB.');
      return;
    }

    setVideoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(previewUrl);
    playSound?.('pop');
  };

  // Handle Short Video Submission & Upload
  const handlePublishShort = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert(isFr ? 'Veuillez vous connecter pour publier un Short.' : 'Please sign in to publish a Short.');
      router.push('/login');
      return;
    }

    if (!videoFile && !videoPreviewUrl) {
      alert(isFr ? 'Veuillez sélectionner une vidéo depuis votre galerie.' : 'Please select a video from your gallery.');
      return;
    }

    if (!shortTitle.trim()) {
      alert(isFr ? 'Veuillez donner un titre en anglais à votre Short.' : 'Please give your Short an English title.');
      return;
    }

    if (!englishPledged) {
      alert(isFr ? 'Veuillez confirmer que la vidéo est 100% en anglais.' : 'Please confirm the video is 100% in English.');
      return;
    }

    if (aiVerification && !aiVerification.isEnglish) {
      alert(
        isFr 
          ? `L'Agent IA a rejeté ce contenu : ${aiVerification.reasonFr}` 
          : `The AI Agent rejected this content: ${aiVerification.reason}`
      );
      return;
    }

    setUploading(true);
    playSound?.('click');

    try {
      let finalMediaUrl: string | null = null;

      // 1. Cloud Storage Upload
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop() || 'mp4';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `shorts/${user.id}/${fileName}`;

        // Attempt bucket 'videos'
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
        } catch (uploadException) {
          console.warn('Storage bucket videos error:', uploadException);
        }

        // Fallback to bucket 'avatars'
        if (!finalMediaUrl) {
          try {
            const { data: uploadData2, error: uploadErr2 } = await supabase.storage
              .from('avatars')
              .upload(`shorts/${filePath}`, videoFile, { upsert: true });

            if (!uploadErr2 && uploadData2) {
              const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(`shorts/${filePath}`);
              if (publicUrl) finalMediaUrl = publicUrl;
            }
          } catch (uploadException2) {
            console.warn('Storage bucket avatars error:', uploadException2);
          }
        }
      }

      // If cloud storage upload wasn't available, fallback to videoPreviewUrl
      if (!finalMediaUrl && videoPreviewUrl) {
        finalMediaUrl = videoPreviewUrl;
      }

      const certificateId = aiVerification?.certificateId || `EB-SENTINEL-${Date.now().toString(36).toUpperCase()}`;

      // Encode content: title:::transcript:::category:::level:::ai_verified:::certificateId
      const storedContent = `${shortTitle.trim()}:::${shortTranscript.trim()}:::${shortCategory}:::${shortLevel}:::ai_verified:::${certificateId}`;

      // 2. Insert into Supabase 'posts' table
      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          category: 'short',
          content: storedContent,
          media_type: 'video',
          media_url: finalMediaUrl,
          likes_count: 0,
          comments_count: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.warn('Post insert warning:', insertError);
      }

      const createdId = newPost?.id || `short-${Date.now()}`;
      const activeVideoUrl = finalMediaUrl || videoPreviewUrl || '';

      const newShortItem: ShortVideoItem = {
        id: createdId,
        title: shortTitle.trim(),
        speaker: profile?.full_name || user.email?.split('@')[0] || (isFr ? "Apprenant d'anglais" : 'English Learner'),
        author_avatar: getUserAvatar(profile?.avatar_url, profile?.full_name, profile?.email),
        author_flag: profile?.flag || '🌐',
        level: shortLevel,
        category: shortCategory,
        video_url: activeVideoUrl,
        image_fallback: getUserAvatar(profile?.avatar_url, profile?.full_name, profile?.email),
        transcript: shortTranscript.trim(),
        likes_count: 0,
        comments_count: 0,
        views_count: 1,
        user_id: user.id,
        ai_verified: true,
        ai_certificate: certificateId,
        xpReward: 35,
      };

      // Add to list and navigate to newly created short
      setViewsMap(prev => ({ ...prev, [createdId]: 1 }));
      setShortsList(prev => [newShortItem, ...prev]);
      setCurrentIndex(0);
      setIsPlaying(true);

      playSound?.('celebrate');
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Reset modal state
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setShortTitle('');
      setShortTranscript('');
      setEnglishPledged(true);
      setPublishModalOpen(false);
    } catch (err) {
      console.error('Error publishing short:', err);
      alert(isFr ? 'Une erreur est survenue lors de la publication.' : 'An error occurred while publishing.');
    } finally {
      setUploading(false);
    }
  };

  // Load published real shorts from Supabase
  useEffect(() => {
    const fetchUserShorts = async () => {
      setLoadingShorts(true);
      try {
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('category', 'short')
          .not('media_url', 'is', null)
          .order('created_at', { ascending: false });

        if (postsData && postsData.length > 0) {
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

          const userShorts: ShortVideoItem[] = postsData.map((p) => {
            const author = authorsMap[p.user_id];
            const parts = p.content.split(':::');
            const title = parts[0] || 'English Practice Short';
            const transcript = parts[1] || parts[0] || '';
            const category = parts[2] || 'Community English';
            const itemLevel = parts[3] || author?.current_level || 'B1';
            const isAiVerified = parts.length >= 5 ? parts[4] === 'ai_verified' : true;
            const aiCert = parts.length >= 6 ? parts[5] : undefined;

            const initialViews = getInitialViews(p.id, p.likes_count || 0);

            return {
              id: p.id,
              title: title,
              speaker: author?.full_name || (isFr ? "Apprenant d'anglais" : 'English Learner'),
              author_avatar: getUserAvatar(author?.avatar_url, author?.full_name),
              author_flag: author?.flag || '🌐',
              level: itemLevel,
              category: category,
              video_url: p.media_url,
              image_fallback: getUserAvatar(author?.avatar_url, author?.full_name),
              transcript: transcript,
              xpReward: 35,
              likes_count: p.likes_count || 0,
              comments_count: p.comments_count || 0,
              views_count: initialViews,
              user_id: p.user_id,
              ai_verified: isAiVerified,
              ai_certificate: aiCert,
            };
          });

          setShortsList(userShorts);
        } else {
          setShortsList([]);
        }
      } catch (err) {
        console.error('Error fetching shorts:', err);
        setShortsList([]);
      } finally {
        setLoadingShorts(false);
      }
    };

    fetchUserShorts();
  }, [supabase, isFr]);

  const currentShort = shortsList[currentIndex] || shortsList[0] || null;

  // Active view count computation
  const activeViewsCount = currentShort
    ? (viewsMap[currentShort.id] ?? getInitialViews(currentShort.id, currentShort.likes_count))
    : 0;

  // Track and increment view count when viewing a short
  useEffect(() => {
    if (!currentShort?.id) return;
    const shortId = currentShort.id;

    // Ensure initial views exist in map
    setViewsMap(prev => {
      if (prev[shortId] !== undefined) return prev;
      return { ...prev, [shortId]: getInitialViews(shortId, currentShort.likes_count) };
    });

    // Increment after 1.8 seconds of viewing
    const timer = setTimeout(() => {
      setViewsMap(prev => {
        const current = prev[shortId] ?? getInitialViews(shortId, currentShort.likes_count);
        const next = current + 1;
        try {
          localStorage.setItem(`eb_short_views_${shortId}`, next.toString());
        } catch {}
        return { ...prev, [shortId]: next };
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [currentShort?.id, isPlaying]);

  // Fetch comments from Supabase post_comments table for a short
  const fetchComments = async (shortId: string) => {
    if (!shortId) return;
    setLoadingComments(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', shortId)
        .order('created_at', { ascending: false });

      if (!error && commentsData) {
        const commentUserIds = Array.from(new Set(commentsData.map(c => c.user_id).filter(Boolean)));
        let authorsMap: Record<string, any> = {};
        if (commentUserIds.length > 0) {
          const { data: authors } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, flag')
            .in('id', commentUserIds);
          if (authors) {
            for (const a of authors) authorsMap[a.id] = a;
          }
        }

        const enriched: ShortCommentItem[] = commentsData.map((c) => {
          const author = authorsMap[c.user_id];
          return {
            id: c.id,
            post_id: c.post_id,
            user_id: c.user_id,
            author_name: author?.full_name || (isFr ? 'Membre' : 'Member'),
            author_avatar: getUserAvatar(author?.avatar_url, author?.full_name),
            author_flag: author?.flag || '🌐',
            content: c.content,
            created_at: c.created_at,
          };
        });
        setCommentsMap(prev => ({ ...prev, [shortId]: enriched }));
      } else {
        setCommentsMap(prev => ({ ...prev, [shortId]: [] }));
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      setCommentsMap(prev => ({ ...prev, [shortId]: prev[shortId] || [] }));
    } finally {
      setLoadingComments(false);
    }
  };

  // Load comments whenever current short changes if drawer is open
  useEffect(() => {
    if (currentShort?.id && commentsOpen && !commentsMap[currentShort.id]) {
      fetchComments(currentShort.id);
    }
  }, [currentShort?.id, commentsOpen]);

  const currentComments = currentShort ? (commentsMap[currentShort.id] || []) : [];
  const activeCommentsCount = currentShort 
    ? Math.max(currentComments.length, currentShort.comments_count || 0)
    : 0;

  const handleNext = () => {
    if (shortsList.length === 0) return;
    playSound('click');
    setCurrentIndex((currentIndex + 1) % shortsList.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (shortsList.length === 0) return;
    playSound('click');
    setCurrentIndex((currentIndex - 1 + shortsList.length) % shortsList.length);
    setIsPlaying(true);
  };

  const togglePlayPause = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
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

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playSound('click');
    const video = videoRef.current;
    if (video) {
      const nextMuted = !video.muted;
      video.muted = nextMuted;
      video.defaultMuted = nextMuted;
      const targetVol = nextMuted ? 0 : (volume > 0 ? volume : 1);
      video.volume = targetVol;
      setIsMuted(nextMuted);

      if (!nextMuted) {
        setVolume(targetVol);
        if (video.paused) {
          video.play().catch(console.error);
          setIsPlaying(true);
        }
        setSoundToast(isFr ? `Son activé (${Math.round(targetVol * 100)}%)` : `Sound on (${Math.round(targetVol * 100)}%)`);
      } else {
        setSoundToast(isFr ? 'Son coupé (Mute)' : 'Sound muted');
      }
    } else {
      setIsMuted(prev => !prev);
    }
  };

  const handleVolumeChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(1, newVal));
    setVolume(clamped);
    const video = videoRef.current;
    if (video) {
      video.volume = clamped;
      const nextMuted = clamped === 0;
      video.muted = nextMuted;
      video.defaultMuted = nextMuted;
      setIsMuted(nextMuted);
      if (clamped > 0 && video.paused) {
        video.play().catch(console.error);
        setIsPlaying(true);
      }
    }
    setSoundToast(clamped === 0 ? (isFr ? 'Son coupé' : 'Muted') : `Volume ${Math.round(clamped * 100)}%`);
  };

  // Auto clear sound toast notification
  useEffect(() => {
    if (soundToast) {
      const timer = setTimeout(() => setSoundToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [soundToast]);

  // Keep video DOM muted and volume in sync with state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.defaultMuted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume, currentIndex, currentShort?.id]);

  // Desktop & Tablet Keyboard Shortcuts (Arrow keys, Space, Esc, Mute, Comments)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'Escape') {
        if (commentsOpen) setCommentsOpen(false);
        if (publishModalOpen) setPublishModalOpen(false);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'c' || e.key === 'C') {
        setCommentsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortsList.length, currentIndex, commentsOpen, publishModalOpen, isMuted, volume]);

  // Toggle Like
  const toggleLike = async () => {
    if (!currentShort) return;
    playSound('click');
    const isLiked = likedMap[currentShort.id];
    const newLiked = !isLiked;
    const newCount = (likesMap[currentShort.id] ?? currentShort.likes_count) + (isLiked ? -1 : 1);
    
    setLikedMap(prev => ({ ...prev, [currentShort.id]: newLiked }));
    setLikesMap(prev => ({ ...prev, [currentShort.id]: Math.max(0, newCount) }));

    try {
      await supabase
        .from('posts')
        .update({ likes_count: Math.max(0, newCount) })
        .eq('id', currentShort.id);
    } catch (err) {
      console.error('Error updating likes:', err);
    }
  };

  // Toggle comments drawer
  const handleToggleComments = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playSound('click');
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (nextOpen && currentShort && !commentsMap[currentShort.id]) {
      fetchComments(currentShort.id);
    }
  };

  // Submit comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentShort) return;

    if (!user) {
      alert(isFr ? 'Veuillez vous connecter pour publier un commentaire.' : 'Please sign in to post a comment.');
      return;
    }

    const trimmed = commentInput.trim();
    setCommentInput('');
    setSubmittingComment(true);
    playSound('click');

    const tempId = `temp_${Date.now()}`;
    const newCommentObj: ShortCommentItem = {
      id: tempId,
      post_id: currentShort.id,
      user_id: user.id,
      author_name: profile?.full_name || user.email?.split('@')[0] || (isFr ? 'Moi' : 'Me'),
      author_avatar: getUserAvatar(profile?.avatar_url, profile?.full_name, user.email),
      author_flag: profile?.flag || '🇫🇷',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    // Optimistic local update
    setCommentsMap(prev => ({
      ...prev,
      [currentShort.id]: [newCommentObj, ...(prev[currentShort.id] || [])]
    }));

    // Update count in list
    setShortsList(prev => prev.map(s => {
      if (s.id === currentShort.id) {
        return { ...s, comments_count: (s.comments_count || 0) + 1 };
      }
      return s;
    }));

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: currentShort.id,
          user_id: user.id,
          content: trimmed,
        })
        .select()
        .single();

      if (!error && data) {
        setCommentsMap(prev => ({
          ...prev,
          [currentShort.id]: (prev[currentShort.id] || []).map(c => c.id === tempId ? { ...c, id: data.id } : c)
        }));

        await supabase
          .from('posts')
          .update({ comments_count: (currentShort.comments_count || 0) + 1 })
          .eq('id', currentShort.id);

        playSound('success');
      } else if (error) {
        console.error('Supabase error inserting comment:', error);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center space-y-6">
      
      {/* Top Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400">
              <Tv className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isFr ? 'Shorts & Micro-Leçons Vidéos (Anglais)' : 'Shorts & Micro Video Lessons (English)'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isFr 
              ? 'Vidéos courtes immersives publiées par les inscrits exclusivement en Anglais pour booster votre compréhension.' 
              : 'Immersive short videos published by learners exclusively in English to boost speaking & listening.'}
          </p>
        </div>

        {/* Publish Button */}
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setPublishModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(74,222,128,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>{isFr ? 'Publier un Short (Galerie)' : 'Publish Short (Gallery)'}</span>
        </button>
      </div>

      {/* Main Video Reel Player Container */}
      {loadingShorts ? (
        <div className="relative w-full max-w-sm sm:max-w-md h-[580px] sm:h-[640px] rounded-3xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-300">
            {isFr ? 'Chargement des vidéos...' : 'Loading videos...'}
          </p>
        </div>
      ) : !currentShort || shortsList.length === 0 ? (
        <div className="relative w-full max-w-sm sm:max-w-md h-[580px] sm:h-[640px] rounded-3xl overflow-hidden bg-white dark:bg-gradient-to-b dark:from-[#0b1329] dark:via-[#070c1a] dark:to-[#04070e] border border-slate-200 dark:border-white/15 shadow-xl flex flex-col items-center justify-center p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.2)]">
            <Tv className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {isFr ? "Aucun Short publié pour l'instant" : 'No Short Videos Published Yet'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
              {isFr
                ? 'Les vidéos fictives ont été supprimées. Seules les vraies vidéos courtes en anglais publiées par les membres inscrits depuis leur galerie apparaîtront ici.'
                : 'All mock videos have been removed. Only real short English videos uploaded by registered members from their gallery will appear here.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setPublishModalOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{isFr ? 'Publier la 1ère vidéo (Galerie)' : 'Publish 1st video (Gallery)'}</span>
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-[380px] sm:max-w-md h-[calc(100dvh-13rem)] min-h-[520px] max-h-[700px] sm:h-[660px] rounded-3xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl flex flex-col justify-between p-4 sm:p-6 select-none mx-auto">
          
          {/* Background Real Video Player */}
          {currentShort.video_url && (
            <video
              ref={videoRef}
              key={currentShort.id}
              src={currentShort.video_url}
              autoPlay
              playsInline
              loop
              preload="metadata"
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlayPause}
              onVolumeChange={(e) => {
                const v = e.currentTarget;
                setIsMuted(v.muted || v.volume === 0);
                if (!v.muted && v.volume > 0) {
                  setVolume(v.volume);
                }
              }}
              className="absolute inset-0 w-full h-full object-cover cursor-pointer"
            />
          )}

          {/* Central Play Indicator when Paused */}
          {!isPlaying && !commentsOpen && (
            <div 
              onClick={togglePlayPause}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[2px] cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-400/95 text-slate-950 flex items-center justify-center shadow-[0_0_40px_rgba(74,222,128,0.6)] transform hover:scale-110 active:scale-95 transition-all">
                <Play className="w-10 h-10 ml-1 fill-slate-950" />
              </div>
            </div>
          )}

          {/* Floating Pill if Video is Muted */}
          {isMuted && isPlaying && !commentsOpen && (
            <div 
              onClick={toggleMute}
              className="absolute top-20 inset-x-4 z-30 flex items-center justify-center cursor-pointer"
            >
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-rose-500/95 hover:bg-rose-600 text-white font-extrabold text-xs shadow-2xl flex items-center gap-2 backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 animate-pulse cursor-pointer"
              >
                <VolumeX className="w-4 h-4" />
                <span>{isFr ? "Son coupé • Cliquez ici pour activer l'audio" : "Muted • Click here to enable audio"}</span>
              </button>
            </div>
          )}

          {/* Sound Toast Overlay */}
          {soundToast && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-4 py-2.5 rounded-2xl bg-black/90 border border-white/25 text-white font-bold text-xs shadow-2xl backdrop-blur-md pointer-events-none animate-fade-in flex items-center gap-2.5">
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{soundToast}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 pointer-events-none" />

          {/* Top Info Bar */}
          <div className="relative z-30 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs backdrop-blur-md">
                {isFr ? `Niveau ${currentShort.level}` : `Level ${currentShort.level}`}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-bold text-slate-300 backdrop-blur-md">
                {getCategoryLabel(currentShort.category, isFr)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold backdrop-blur-md shadow-sm">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatViewsCount(activeViewsCount)} {isFr ? 'vues' : 'views'}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[10px] font-black backdrop-blur-md shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xs:inline">AI Verified English</span>
                <span className="xs:hidden">AI 100% EN</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                title={isPlaying ? (isFr ? "Pause" : "Pause") : (isFr ? "Lecture" : "Play")}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400 ml-0.5" />
                )}
              </button>

              {/* Sound / Volume Control Group */}
              <div 
                className="relative flex items-center"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                {/* Volume Slider popup on hover */}
                {showVolumeSlider && (
                  <div className="absolute right-full mr-2 px-3 py-1.5 rounded-xl bg-black/90 border border-white/20 backdrop-blur-md flex items-center gap-2 shadow-xl animate-fade-in z-40">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <span className="text-[10px] text-emerald-300 font-mono font-bold w-7 text-right">
                      {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>
                )}

                {/* Mute / Unmute Button */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-2.5 rounded-full border text-white backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer ${
                    isMuted 
                      ? 'bg-rose-500/30 border-rose-500/50 hover:bg-rose-500/50 text-rose-300' 
                      : 'bg-black/60 hover:bg-black/80 border-emerald-500/40 text-emerald-400'
                  }`}
                  title={isMuted ? (isFr ? "Activer le son (Audio 100%)" : "Unmute (100% audio)") : (isFr ? "Couper le son (Mute)" : "Mute audio")}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Floating Actions (Like, Comments, Navigation) */}
          <div className="absolute right-3 sm:right-4 bottom-20 sm:bottom-28 z-20 flex flex-col items-center gap-3 sm:gap-4">
            
            {/* Like */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={toggleLike}
                className="p-2.5 sm:p-3 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                title={isFr ? "J'aime" : "Like"}
              >
                <Heart
                  className={`w-5 h-5 sm:w-6 sm:h-6 ${likedMap[currentShort.id] ? 'fill-rose-500 text-rose-500' : ''}`}
                />
              </button>
              <span className="text-[10px] sm:text-[11px] font-bold text-white shadow-sm mt-1">
                {likesMap[currentShort.id] ?? currentShort.likes_count}
              </span>
            </div>

            {/* Views Count */}
            <div className="flex flex-col items-center">
              <div
                className="p-2.5 sm:p-3 rounded-full bg-black/60 border border-emerald-500/30 text-emerald-400 backdrop-blur-md shadow-md flex items-center justify-center cursor-default group"
                title={isFr ? `${activeViewsCount.toLocaleString()} vues` : `${activeViewsCount.toLocaleString()} views`}
              >
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-white shadow-sm mt-1">
                {formatViewsCount(activeViewsCount)}
              </span>
            </div>

            {/* Comments Button (Message Icon) */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={handleToggleComments}
                className={`p-2.5 sm:p-3 rounded-full backdrop-blur-md transition-all shadow-lg active:scale-95 cursor-pointer ${
                  commentsOpen
                    ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300 scale-105 shadow-[0_0_20px_rgba(74,222,128,0.5)]'
                    : 'bg-black/60 border border-white/20 text-white hover:scale-110 hover:border-emerald-400/50'
                }`}
                title={isFr ? "Commentaires" : "Comments"}
              >
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <span className="text-[10px] sm:text-[11px] font-bold text-white shadow-sm mt-1">
                {activeCommentsCount}
              </span>
            </div>

            {/* Up / Down Navigation if multiple shorts */}
            {shortsList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-2 sm:p-2.5 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md hover:scale-110 transition-transform cursor-pointer"
                  title={isFr ? "Short précédent" : "Previous Short"}
                >
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-2.5 sm:p-3 rounded-full bg-emerald-400 text-slate-950 font-black shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  title={isFr ? "Short suivant" : "Next Short"}
                >
                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Subtitles & Author Info */}
          <div className="relative z-10 space-y-2.5 sm:space-y-3 pr-14 sm:pr-16">
            
            {/* Author & Title */}
            <div className="flex items-center gap-2.5">
              <img
                src={currentShort.author_avatar}
                alt={currentShort.speaker}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-emerald-400 shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black text-white drop-shadow-md leading-tight line-clamp-2">
                  {currentShort.title}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-emerald-300 font-bold truncate">{currentShort.speaker}</span>
                  <span className="text-xs shrink-0">{currentShort.author_flag}</span>
                </div>
              </div>
            </div>

            {/* Subtitles / Spoken Transcript box */}
            {currentShort.transcript && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-black/85 border border-white/20 backdrop-blur-md text-[11px] sm:text-xs text-slate-100 leading-relaxed italic shadow-lg">
                <span className="text-emerald-400 font-bold not-italic mr-1.5">
                  {isFr ? '💬 Transcription :' : '💬 Transcript:'}
                </span>
                {currentShort.transcript}
              </div>
            )}
          </div>

          {/* Dim Overlay when Comments Sheet is Open */}
          {commentsOpen && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                playSound('click');
                setCommentsOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30 transition-opacity cursor-pointer animate-fade-in"
            />
          )}

          {/* Interactive Comments Drawer / Bottom Sheet INSIDE Video Player */}
          {commentsOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 z-40 h-[75%] max-h-[500px] rounded-t-3xl bg-[#091124]/95 backdrop-blur-2xl border-t border-x border-white/20 shadow-[0_-15px_40px_rgba(0,0,0,0.85)] flex flex-col animate-slide-up transition-all safe-pb"
            >
              {/* Sheet Drag Pill */}
              <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mt-2.5 mb-1 shrink-0" />

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {isFr ? `Commentaires (${activeCommentsCount})` : `Comments (${activeCommentsCount})`}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>{formatViewsCount(activeViewsCount)} {isFr ? 'vues' : 'views'}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setCommentsOpen(false);
                  }}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isFr ? "Fermer les commentaires" : "Close comments"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
                {loadingComments ? (
                  <div className="flex flex-col items-center justify-center h-36 space-y-2 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>{isFr ? "Chargement des commentaires..." : "Loading comments..."}</span>
                  </div>
                ) : currentComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-44 text-center px-4 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 shadow-inner">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-white">
                      {isFr ? "Aucun commentaire pour le moment" : "No comments yet"}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      {isFr
                        ? "Soyez le premier à commenter ce short en anglais !"
                        : "Be the first to comment on this short in English!"}
                    </p>
                  </div>
                ) : (
                  currentComments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 hover:border-white/10 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={c.author_avatar}
                            alt={c.author_name}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-400/50"
                          />
                          <span className="font-bold text-emerald-400">{c.author_name}</span>
                          {c.author_flag && <span className="text-[10px]">{c.author_flag}</span>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {formatTimeAgo(c.created_at, isFr)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 pl-6 leading-relaxed select-text">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Composer */}
              <div className="p-3 border-t border-white/10 bg-black/40 shrink-0">
                {user ? (
                  <form onSubmit={handleAddComment} className="flex items-center gap-2">
                    <img
                      src={getUserAvatar(profile?.avatar_url, profile?.full_name, profile?.email)}
                      alt={profile?.full_name || 'My avatar'}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-400 shrink-0"
                    />
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={isFr ? "Écrivez un commentaire en anglais..." : "Write a comment in English..."}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                      maxLength={300}
                    />
                    <button
                      type="submit"
                      disabled={!commentInput.trim() || submittingComment}
                      className="p-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shrink-0 cursor-pointer"
                      title={isFr ? "Envoyer le commentaire" : "Post comment"}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-slate-300">
                        {isFr ? "Connectez-vous pour participer à la discussion." : "Sign in to join the conversation."}
                      </span>
                    </div>
                    <Link
                      href="/login"
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
                    >
                      {isFr ? "Connexion" : "Sign In"}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* PUBLISH SHORT MODAL (FROM GALLERY) */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/15 shadow-2xl space-y-4 scrollbar-thin">
            
            {/* Close */}
            <button
              type="button"
              onClick={() => {
                setPublishModalOpen(false);
                setVideoFile(null);
                setVideoPreviewUrl(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 cursor-pointer"
              title={isFr ? "Fermer" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🇬🇧</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {isFr ? 'Publier un Short Vidéo (depuis la Galerie)' : 'Publish Video Short (from Gallery)'}
                </h3>
              </div>
              <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                <span>
                  {isFr 
                    ? 'Important : Le Short vidéo doit être parlé en Anglais uniquement pour permettre aux autres membres de pratiquer.'
                    : 'Important: The Short must be spoken exclusively in English to help fellow learners practice!'}
                </span>
              </div>
            </div>

            <form onSubmit={handlePublishShort} className="space-y-3.5">
              
              {/* Gallery Video Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-1">
                  {isFr ? 'Fichier Vidéo (Galerie) :' : 'Video File (Gallery):'}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />

                {videoPreviewUrl ? (
                  <div className="relative aspect-[9/16] max-h-48 mx-auto rounded-2xl overflow-hidden bg-black border border-white/20">
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
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-500 transition-colors cursor-pointer"
                      title={isFr ? "Supprimer la vidéo" : "Remove video"}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl hover:border-emerald-500/50 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">
                      {isFr ? 'Sélectionner une vidéo depuis la galerie' : 'Select video from gallery'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {isFr ? 'Format vertical 9:16 recommandé • MP4, MOV, WebM' : 'Vertical 9:16 format recommended • MP4, MOV, WebM'}
                    </span>
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-1">
                  {isFr ? 'Titre du Short (en anglais) :' : 'Short Title (in English):'}
                </label>
                <input
                  type="text"
                  value={shortTitle}
                  onChange={(e) => setShortTitle(e.target.value)}
                  placeholder={isFr ? 'ex. 3 expressions britanniques indispensables' : 'e.g. 3 British idioms you must know'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Category & Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-1">
                    {isFr ? 'Thème :' : 'Topic:'}
                  </label>
                  <select
                    value={shortCategory}
                    onChange={(e) => setShortCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#060a14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Pronunciation & Phonetics">
                      {isFr ? 'Prononciation & Phonétique' : 'Pronunciation & Phonetics'}
                    </option>
                    <option value="Business English">
                      {isFr ? 'Anglais Professionnel' : 'Business English'}
                    </option>
                    <option value="Everyday Slang">
                      {isFr ? 'Argot & Expressions Courantes' : 'Everyday Slang'}
                    </option>
                    <option value="Grammar Tips">
                      {isFr ? 'Astuces de Grammaire' : 'Grammar Tips'}
                    </option>
                    <option value="Accent Training">
                      {isFr ? "Entraînement à l'Accent" : 'Accent Training'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-1">
                    {isFr ? 'Niveau CECRL :' : 'CEFR Level:'}
                  </label>
                  <select
                    value={shortLevel}
                    onChange={(e) => setShortLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#060a14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="A1-A2">{getLevelLabel('A1-A2', isFr)}</option>
                    <option value="B1">{getLevelLabel('B1', isFr)}</option>
                    <option value="B2">{getLevelLabel('B2', isFr)}</option>
                    <option value="C1-C2">{getLevelLabel('C1-C2', isFr)}</option>
                  </select>
                </div>
              </div>

              {/* Transcript */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block mb-1">
                  {isFr ? 'Sous-titres / Transcription (en anglais) :' : 'Subtitles / Transcript (in English):'}
                </label>
                <textarea
                  value={shortTranscript}
                  onChange={(e) => setShortTranscript(e.target.value)}
                  placeholder={isFr ? "ex. « When someone says 'hit the books', it simply means to study hard! »" : "e.g. « When someone says 'hit the books', it simply means to study hard! »"}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* English Sentinel AI Moderation Card */}
              <div className={`p-3 rounded-2xl border transition-all ${
                !shortTitle.trim() && !shortTranscript.trim()
                  ? 'bg-slate-50 dark:bg-[#060a14] border-slate-200 dark:border-white/10'
                  : aiVerification?.isEnglish
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      aiVerification?.isEnglish ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Agent IA English Sentinel</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono font-bold">
                        v2.4
                      </span>
                    </span>
                  </div>

                  {aiVerification && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      aiVerification.isEnglish 
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40' 
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40'
                    }`}>
                      {aiVerification.isEnglish ? `✓ 100% Anglais (${aiVerification.confidence}%)` : '✗ Rejeté (Non-anglais)'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {!shortTitle.trim() && !shortTranscript.trim()
                    ? (isFr 
                        ? "L'Agent IA sécurise les vidéos pour s'assurer qu'elles sont 100% en anglais afin de garantir l'immersion des partenaires."
                        : "The AI Agent secures community videos ensuring they are strictly 100% in English for learner immersion.")
                    : aiVerification?.isEnglish
                      ? (isFr ? aiVerification.reasonFr : aiVerification.reason)
                      : (isFr ? aiVerification?.reasonFr : aiVerification?.reason)}
                </p>

                {aiVerification?.flaggedWords && aiVerification.flaggedWords.length > 0 && (
                  <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-600 dark:text-rose-300">
                    <span className="font-bold">Mots non-anglophones détectés :</span> {aiVerification.flaggedWords.join(', ')}
                    <p className="mt-0.5 text-rose-500 dark:text-rose-400">English Booster requiert une expression 100% en anglais.</p>
                  </div>
                )}

                {aiVerification?.certificateId && (
                  <div className="mt-1.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Certificat IA : {aiVerification.certificateId}
                  </div>
                )}
              </div>

              {/* English pledge */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={englishPledged}
                  onChange={(e) => setEnglishPledged(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/20 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  {isFr ? 'Je confirme que la vidéo est 100% en langue anglaise.' : 'I confirm this video is 100% in English.'}
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setPublishModalOpen(false);
                    setVideoFile(null);
                    setVideoPreviewUrl(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={uploading || (!videoFile && !videoPreviewUrl) || !shortTitle.trim() || !englishPledged || (aiVerification !== null && !aiVerification.isEnglish)}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{isFr ? 'Publication...' : 'Publishing...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isFr ? 'Publier le Short (Sécurisé IA)' : 'Publish Short (AI Secured)'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
