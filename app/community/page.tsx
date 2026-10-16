'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import type { Database } from '@/lib/database.types';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  Send, 
  Sparkles, 
  PlusCircle, 
  Filter, 
  Bookmark,
  CheckCircle2
} from 'lucide-react';
import EnglishStatusTray from '@/components/EnglishStatusTray';

interface CommunityPost {
  id: string;
  user_id: string;
  category: string;
  content: string;
  media_url?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  author_flag?: string;
  author_level?: string;
  is_liked?: boolean;
}

interface CommentItem {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export default function CommunityPage() {
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('question');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [commentInput, setCommentInput] = useState('');

  // Initial seed and load
  useEffect(() => {
    const fetchPosts = async () => {
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsData && postsData.length > 0) {
        let userLikedPostIds = new Set<string>();
        if (user?.id) {
          try {
            const { data: userLikes } = await supabase
              .from('post_likes')
              .select('post_id')
              .eq('user_id', user.id);
            if (userLikes) {
              userLikedPostIds = new Set(userLikes.map((l: any) => l.post_id));
            }
          } catch {}
        }

        // Batch enrich with profiles in a single query
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

        const enriched: CommunityPost[] = postsData.map(p => {
          const author = authorsMap[p.user_id];
          return {
            ...p,
            author_name: author?.full_name || (isFr ? 'Membre de la Communauté' : 'Community Member'),
            author_avatar: getUserAvatar(author?.avatar_url, author?.full_name),
            author_flag: author?.flag || '🌐',
            author_level: author?.current_level || 'B2',
            is_liked: userLikedPostIds.has(p.id),
          };
        });
        setPosts(enriched);
      }

      setLoading(false);
    };

    fetchPosts();
  }, []);

  // Handle Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    if (!user?.id) {
      alert(isFr ? "Veuillez vous connecter pour publier dans la communauté." : "Please sign in to publish in the community.");
      return;
    }

    setSubmitting(true);
    playSound('click');

    try {
      const { data, error } = await supabase.from('posts').insert({
        user_id: user.id,
        category: newCategory,
        content: newContent.trim(),
      }).select().single();

      if (error) {
        console.error("Error creating post:", error);
      } else if (data) {
        const newPostItem: CommunityPost = {
          id: data.id,
          user_id: user.id,
          category: data.category || newCategory,
          content: data.content,
          likes_count: 0,
          comments_count: 0,
          created_at: data.created_at,
          author_name: profile?.full_name || (isFr ? 'Utilisateur' : 'User'),
          author_avatar: getUserAvatar(profile?.avatar_url, profile?.full_name, profile?.email),
          author_flag: profile?.flag || '🇫🇷',
          author_level: profile?.current_level || 'B1',
          is_liked: false,
        };
        setPosts([newPostItem, ...posts]);
        setNewContent('');
        playSound('chime');
      }
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Like with Supabase persistence
  const handleToggleLike = async (postId: string) => {
    playSound('click');
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const nextLiked = !post.is_liked;
    const nextCount = nextLiked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1);

    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, is_liked: nextLiked, likes_count: nextCount }
          : p
      )
    );

    if (user?.id) {
      try {
        if (nextLiked) {
          await supabase.from('post_likes').insert({
            post_id: postId,
            user_id: user.id,
          });
        } else {
          await supabase.from('post_likes').delete().match({
            post_id: postId,
            user_id: user.id,
          });
        }
        await supabase.from('posts').update({ likes_count: nextCount }).eq('id', postId);
      } catch (err) {
        console.error('Error toggling like in Supabase:', err);
      }
    }
  };

  // Toggle comments expand
  const handleToggleComments = async (postId: string) => {
    playSound('click');
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
    } else {
      setOpenCommentsPostId(postId);
      if (!commentsMap[postId]) {
        // Load real comments from Supabase
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (commentsData && commentsData.length > 0) {
          const commentUserIds = Array.from(new Set(commentsData.map(c => c.user_id).filter(Boolean)));
          let commentAuthorsMap: Record<string, any> = {};
          if (commentUserIds.length > 0) {
            const { data: authors } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', commentUserIds);
            if (authors) {
              for (const a of authors) commentAuthorsMap[a.id] = a;
            }
          }

          const enrichedComments: CommentItem[] = commentsData.map(c => ({
            ...c,
            author_name: commentAuthorsMap[c.user_id]?.full_name || (isFr ? 'Membre' : 'Member'),
          }));
          setCommentsMap(prev => ({
            ...prev,
            [postId]: enrichedComments,
          }));
        } else {
          setCommentsMap(prev => ({
            ...prev,
            [postId]: [],
          }));
        }
      }
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    if (!commentInput.trim() || !user?.id) return;

    playSound('click');
    const newComment: CommentItem = {
      id: `c_${Date.now()}`,
      user_id: user.id,
      author_name: profile?.full_name || (isFr ? 'Moi' : 'Me'),
      content: commentInput.trim(),
      created_at: new Date().toISOString(),
    };

    setCommentsMap(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));

    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
    );

    // Persist in Supabase
    try {
      await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: commentInput.trim(),
      });
      await supabase
        .from('posts')
        .update({ comments_count: (posts.find(p => p.id === postId)?.comments_count || 0) + 1 })
        .eq('id', postId);
    } catch (err) {
      console.error("Error saving comment:", err);
    }

    setCommentInput('');
  };

  const filteredPosts = useMemo(() => {
    return posts.filter(
      p => selectedCategory === 'ALL' || p.category === selectedCategory
    );
  }, [posts, selectedCategory]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Users className="w-3.5 h-3.5" />
          <span>{isFr ? "Espace d'Échange Mondial" : "Global Community Hub"}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {isFr ? "Le Fil de la Communauté" : "Community Feed"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          {isFr 
            ? "Posez vos questions de grammaire, partagez de nouvelles expressions idiomatiques et célébrez vos progrès avec les membres du monde entier."
            : "Ask grammar questions, share new idioms, and celebrate milestones with learners worldwide."}
        </p>
      </div>

      {/* ENGLISH-ONLY STATUSES SECTION (Stories) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/10 shadow-md dark:shadow-xl">
        <EnglishStatusTray />
      </div>

      {/* CREATE POST CARD */}
      <div className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-md p-6">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={getUserAvatar(profile?.avatar_url, profile?.full_name, profile?.email)}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/40"
            />
            <div className="flex-1">
              <input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={isFr ? "Une question d'anglais, une expression à partager ou un jalon franchi ?" : "An English question, idiom to share, or recent milestone?"}
                className="w-full py-2.5 px-4 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{isFr ? "Catégorie :" : "Category:"}</span>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="question">❓ {isFr ? "Question linguistique" : "Language Question"}</option>
                <option value="idiom">💡 {isFr ? "Expression / Idiome" : "Expression / Idiom"}</option>
                <option value="milestone">🎉 {isFr ? "Succès & Progrès" : "Win & Milestone"}</option>
                <option value="general">💬 {isFr ? "Discussion générale" : "General Discussion"}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !newContent.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isFr ? "Publier" : "Publish"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {[
          { id: 'ALL', label: isFr ? 'Tous les posts' : 'All posts' },
          { id: 'question', label: isFr ? '❓ Questions' : '❓ Questions' },
          { id: 'idiom', label: isFr ? '💡 Expressions' : '💡 Idioms' },
          { id: 'milestone', label: isFr ? '🎉 Succès' : '🎉 Milestones' },
          { id: 'general', label: isFr ? '💬 Général' : '💬 General' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCategory(tab.id);
              playSound('click');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === tab.id
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* POSTS LIST */}
      <div className="space-y-6">
        {filteredPosts.map((post) => (
          <div key={post.id} className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            
            {/* Author Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getUserAvatar(post.author_avatar, post.author_name)}
                  alt={post.author_name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-white/15"
                />
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{post.author_name}</span>
                    <span>{post.author_flag}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFr ? 'Niveau' : 'Level'} {post.author_level} • {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-emerald-700 dark:text-emerald-400">
                {post.category}
              </span>
            </div>

            {/* Post Content */}
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {post.content}
            </p>

            {/* Actions: Likes & Comments */}
            <div className="flex items-center gap-4 pt-3 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
              <button
                onClick={() => handleToggleLike(post.id)}
                className={`flex items-center gap-1.5 transition-colors ${
                  post.is_liked ? 'text-rose-500 font-bold' : 'hover:text-rose-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{post.likes_count} {isFr ? "J'aime" : "Likes"}</span>
              </button>

              <button
                onClick={() => handleToggleComments(post.id)}
                className="flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{post.comments_count} {isFr ? "Commentaires" : "Comments"}</span>
              </button>
            </div>

            {/* Comments Thread Section */}
            {openCommentsPostId === post.id && (
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3 animate-fadeIn">
                <div className="space-y-2">
                  {(commentsMap[post.id] || []).map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs">
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">{c.author_name}</p>
                      <p className="text-slate-700 dark:text-slate-300">{c.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={isFr ? "Ajoutez votre réponse ou avis..." : "Write your comment or answer..."}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    className="px-3.5 py-2 bg-emerald-500 dark:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400"
                  >
                    {isFr ? "Envoyer" : "Reply"}
                  </button>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
}
