'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { 
  X, 
  Radio, 
  Video, 
  Users, 
  Sparkles, 
  Crown, 
  Globe, 
  Lock, 
  Layers, 
  Flame, 
  CheckCircle2, 
  ArrowRight,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  LiveRoom, 
  LiveRoomCategory, 
  LiveRoomLevel, 
  saveCustomLiveRoom, 
  generateLiveRoomId 
} from '@/lib/liveRooms';

interface CreateLiveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated?: (room: LiveRoom) => void;
}

const TEMPLATES = [
  {
    title: 'Daily English Fluency & Coffee Chat',
    topic: 'How to build effortless daily English habits and overcome speaking anxiety.',
    category: 'conversation' as LiveRoomCategory,
    level: 'All Levels' as LiveRoomLevel,
    icon: '☕',
    label: 'Coffee & Fluency',
  },
  {
    title: 'Job Interview Simulation & STAR Answers',
    topic: 'Pitch yourself in 2 minutes and practice tough behavioral questions.',
    category: 'business' as LiveRoomCategory,
    level: 'B1-B2' as LiveRoomLevel,
    icon: '💼',
    label: 'Job Interview',
  },
  {
    title: 'AI Revolution & Future of Human Work',
    topic: 'Will generative AI empower builders or displace knowledge workers?',
    category: 'debate' as LiveRoomCategory,
    level: 'B2-C1' as LiveRoomLevel,
    icon: '⚔️',
    label: 'Hot Debate',
  },
  {
    title: 'IELTS Band 8+ Speaking Practice Lab',
    topic: 'Part 2 Cue Card: Describe an unconventional decision that changed your life.',
    category: 'ielts' as LiveRoomCategory,
    level: 'All Levels' as LiveRoomLevel,
    icon: '🎓',
    label: 'IELTS Lab',
  },
  {
    title: 'Tech & Startup Elevator Pitch Session',
    topic: 'Pitch your app or business idea to international partners in 180 seconds.',
    category: 'tech' as LiveRoomCategory,
    level: 'B2-C1' as LiveRoomLevel,
    icon: '🚀',
    label: 'Startup Pitch',
  },
];

export default function CreateLiveRoomModal({
  isOpen,
  onClose,
  onRoomCreated,
}: CreateLiveRoomModalProps) {
  const router = useRouter();
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();

  const [title, setTitle] = useState('Daily English Fluency & Speaking Circle');
  const [topic, setTopic] = useState('Share your daily English routine and get constructive live feedback.');
  const [category, setCategory] = useState<LiveRoomCategory>('conversation');
  const [level, setLevel] = useState<LiveRoomLevel>('All Levels');
  const [maxSeats, setMaxSeats] = useState<number | 'unlimited'>('unlimited');
  const [isPublic, setIsPublic] = useState(true);
  const [aiCoHostEnabled, setAiCoHostEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleApplyTemplate = (tpl: typeof TEMPLATES[0]) => {
    playSound('click');
    setTitle(tpl.title);
    setTopic(tpl.topic);
    setCategory(tpl.category);
    setLevel(tpl.level);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !topic.trim()) return;

    setIsSubmitting(true);
    playSound('call');

    try {
      // Fire confetti celebration
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b'],
        });
      } catch {}

      const userEmail = (user?.email || profile?.email || '').toLowerCase().trim();
      const isFounder = userEmail === 'tychiquebongo@gmail.com' || userEmail === 'tychiquebong@gmail.com' || profile?.role === 'admin';
      const hostName = profile?.full_name || (user?.user_metadata?.full_name as string) || (isFounder ? 'Tychique Bongo' : (userEmail ? userEmail.split('@')[0] : 'Partner Host'));
      const hostAvatar = isFounder
        ? '/assets/images/tychique-bongo.jpg'
        : (profile?.avatar_url || (user?.user_metadata?.avatar_url as string) || '');
      const hostFlag = profile?.flag || '🌐';
      const hostLevel = profile?.current_level || 'B2';

      const newRoom: LiveRoom = {
        id: generateLiveRoomId(),
        title: title.trim(),
        topic: topic.trim(),
        category,
        level,
        hostId: user?.id || 'host-guest',
        hostName,
        hostAvatar,
        hostFlag,
        hostLevel,
        maxSeats,
        isPublic,
        createdAt: new Date().toISOString(),
        activeParticipantsCount: 1, // Host is on stage
        spectatorCount: 1,
        aiCoHostEnabled,
        tags: [category.toUpperCase(), level, 'Live Video'],
        isLive: true,
      };

      saveCustomLiveRoom(newRoom);

      if (onRoomCreated) {
        onRoomCreated(newRoom);
      }

      onClose();
      // Navigate straight into the live stage
      router.push(`/live?room=${encodeURIComponent(newRoom.id)}`);
    } catch (err) {
      console.error('Error creating live room:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl rounded-3xl bg-[#091024] border border-cyan-500/30 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] overflow-hidden text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-amber-500 via-cyan-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-400 p-[2px] shadow-[0_0_20px_rgba(244,63,94,0.35)] shrink-0">
              <div className="w-full h-full bg-[#070d1b] rounded-[14px] flex items-center justify-center text-rose-400">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {isFr ? 'Créer un Salon Vidéo en Direct' : 'Create a Live Video Room'}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isFr 
                  ? 'Lancez votre propre scène vidéo interactive et invitez les partenaires à vous rejoindre en live.' 
                  : 'Host your own live interactive video stage and let partners join you in real time.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title={isFr ? "Fermer" : "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-thin">
          
          {/* Quick Preset Templates */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isFr ? 'Modèles Rapides (1-Clic) :' : 'Quick Presets (1-Click):'}</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {isFr ? 'Remplissage instantané' : 'Instant autofill'}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/40 text-left transition-all group flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-base group-hover:scale-110 transition-transform">{tpl.icon}</span>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                      {tpl.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {tpl.level}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Room Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>{isFr ? 'Titre du Salon Vidéo *' : 'Live Room Title *'}</span>
              <span className="text-[10px] text-slate-400">{title.length}/70</span>
            </label>
            <input
              type="text"
              required
              maxLength={70}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isFr ? "Ex: Table Ronde Anglais Quotidien & Confiance" : "E.g. Daily Fluency Practice & Confidence"}
              className="w-full px-4 py-2.5 rounded-xl bg-[#060b18] border border-white/15 focus:border-cyan-400 focus:outline-none text-white text-xs sm:text-sm font-semibold placeholder-slate-500 transition-colors shadow-inner"
            />
          </div>

          {/* Discussion Topic / Key Question */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>{isFr ? 'Sujet ou Question Clé à Débattre en Anglais *' : 'Discussion Topic or Question (English) *'}</span>
              <span className="text-[10px] text-slate-400">{topic.length}/180</span>
            </label>
            <textarea
              required
              rows={2}
              maxLength={180}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={isFr ? "Posez la question principale qui animera la discussion vidéo..." : "State the primary conversation prompt or question to debate..."}
              className="w-full px-4 py-2.5 rounded-xl bg-[#060b18] border border-white/15 focus:border-cyan-400 focus:outline-none text-white text-xs sm:text-sm placeholder-slate-500 transition-colors resize-none shadow-inner"
            />
          </div>

          {/* Category & Level Dual Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isFr ? 'Catégorie de Thème' : 'Theme Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LiveRoomCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b18] border border-white/15 focus:border-cyan-400 focus:outline-none text-white text-xs font-semibold cursor-pointer"
              >
                <option value="conversation">🗣️ Conversation & Fluency</option>
                <option value="business">💼 Business & Job Interview</option>
                <option value="debate">⚔️ Debates & Current Affairs</option>
                <option value="ielts">🎓 IELTS & TOEFL Speaking</option>
                <option value="tech">🚀 Tech, AI & Startups</option>
                <option value="pronunciation">🎙️ Accent & Pronunciation</option>
              </select>
            </div>

            {/* English Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isFr ? 'Niveau Recommandé' : 'Recommended Level'}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LiveRoomLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b18] border border-white/15 focus:border-cyan-400 focus:outline-none text-white text-xs font-semibold cursor-pointer"
              >
                <option value="All Levels">🌐 All Levels (Tous Niveaux)</option>
                <option value="A1-A2">🌱 A1-A2 (Beginner / Débutant)</option>
                <option value="B1-B2">⚡ B1-B2 (Intermediate / Intermédiaire)</option>
                <option value="C1-C2">🔥 C1-C2 (Advanced / Avancé)</option>
              </select>
            </div>
          </div>

          {/* Stage Capacity & Room Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            
            {/* Stage Capacity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>{isFr ? 'Places sur Scène Vidéo' : 'Stage Video Seats'}</span>
                <span className="text-[10px] text-emerald-400 font-extrabold">
                  {maxSeats === 'unlimited' ? '∞ Illimité' : `${maxSeats} places`}
                </span>
              </label>
              <select
                value={maxSeats.toString()}
                onChange={(e) => setMaxSeats(e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b18] border border-white/15 focus:border-cyan-400 focus:outline-none text-white text-xs font-semibold cursor-pointer"
              >
                <option value="unlimited">∞ Illimité (Open Floor - Recommandé)</option>
                <option value="2">2 Personnes (Face-à-Face 1-on-1)</option>
                <option value="4">4 Personnes (Petit Cercle)</option>
                <option value="8">8 Personnes (Table Ronde)</option>
                <option value="12">12 Personnes (Grand Atelier)</option>
                <option value="16">16 Personnes (Auditorium)</option>
              </select>
            </div>

            {/* Visibility Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isFr ? 'Visibilité du Salon' : 'Room Visibility'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isPublic
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{isFr ? 'Public' : 'Public'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isPublic
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isFr ? 'Lien Privé' : 'Unlisted'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Co-Host Toggle */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Gemini AI Co-Host Assistant</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                    Pro
                  </span>
                </p>
                <p className="text-[11px] text-slate-300">
                  {isFr 
                    ? 'Fournit des questions de relance et du feedback grammatical en temps réel pendant le live.' 
                    : 'Provides live topic prompts and instant grammar coaching during the session.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setAiCoHostEnabled(!aiCoHostEnabled);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                aiCoHostEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  aiCoHostEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isFr ? 'Aperçu du Salon dans l\'Annuaire des Directs :' : 'Preview Card in Directory:'}
            </span>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0d1629] to-[#080d1b] border border-cyan-500/30 shadow-md">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>EN DIRECT</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                    {level}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400">
                  {maxSeats === 'unlimited' ? '∞ Places Illimitées' : `${maxSeats} places`}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">
                {title || 'Titre du Salon Vidéo'}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-1 italic mt-0.5">
                « {topic || 'Sujet de discussion...'} »
              </p>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{profile?.flag || '🌐'}</span>
                  <span className="font-semibold text-slate-200 text-xs">
                    {profile?.full_name || 'Votre Profil'} (Hôte)
                  </span>
                </div>
                <span className="text-[11px] text-cyan-400 font-bold">
                  🎥 Prêt à lancer
                </span>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              {isFr ? 'Annuler' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !topic.trim()}
              className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{isFr ? 'Lancer le Salon en Direct' : 'Launch Live Video Room'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
