'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { 
  X, 
  Radio, 
  Video, 
  Link2, 
  Copy, 
  Check, 
  ArrowRight 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  LiveRoom, 
  saveCustomLiveRoom, 
  generateLiveRoomId 
} from '@/lib/liveRooms';

interface CreateLiveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated?: (room: LiveRoom) => void;
}

export default function CreateLiveRoomModal({
  isOpen,
  onClose,
  onRoomCreated,
}: CreateLiveRoomModalProps) {
  const router = useRouter();
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();

  const [roomId, setRoomId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate a clean Room ID whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setRoomId(generateLiveRoomId());
      setCopiedLink(false);
      setTitle('');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://englishbooster.com';
  const joinLink = `${origin}/live?room=${encodeURIComponent(roomId || 'EB-LIVE')}`;

  const handleCopyLink = () => {
    playSound?.('click');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(joinLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim();
    const finalDesc = description.trim();
    if (!finalTitle || !finalDesc) return;

    setIsSubmitting(true);
    playSound?.('call');

    try {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
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
        id: roomId || generateLiveRoomId(),
        title: finalTitle,
        topic: finalDesc,
        category: 'conversation',
        level: 'All Levels',
        hostId: user?.id || 'host-guest',
        hostName,
        hostAvatar,
        hostFlag,
        hostLevel,
        maxSeats: 'unlimited',
        isPublic: true,
        createdAt: new Date().toISOString(),
        activeParticipantsCount: 1,
        spectatorCount: 1,
        aiCoHostEnabled: true,
        tags: ['Live Video', 'English Practice'],
        isLive: true,
      };

      saveCustomLiveRoom(newRoom);

      if (onRoomCreated) {
        onRoomCreated(newRoom);
      }

      onClose();
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
        className="relative w-full max-w-lg rounded-3xl bg-[#091024] border border-cyan-500/30 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] overflow-hidden text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Accent Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-amber-500 via-cyan-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-400 p-[2px] shadow-[0_0_15px_rgba(244,63,94,0.35)] shrink-0">
              <div className="w-full h-full bg-[#070d1b] rounded-[14px] flex items-center justify-center text-rose-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-chat tracking-tight flex items-center gap-2">
                <span>{isFr ? 'Créer un Salon Live' : 'Create Live Room'}</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </h2>
              <p className="text-xs text-slate-400 font-chat">
                {isFr ? 'Remplissez le titre, la description et partagez le lien.' : 'Fill in the title, description, and share the live link.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound?.('click');
              onClose();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isFr ? "Fermer" : "Close"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Just Title, Description, and Join Link */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 font-chat">
          
          {/* 1. Titre du Salon */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between font-chat">
              <span>{isFr ? 'Titre du Salon *' : 'Room Title *'}</span>
              <span className="text-[10px] text-slate-500 font-normal">{title.length}/80</span>
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isFr ? "Ex: Pratique d'anglais orale & débat libre" : "E.g. Spoken English Practice & Free Debate"}
              className="w-full px-4 py-2.5 rounded-xl bg-[#060b18] border border-white/15 focus:border-cyan-400 focus:outline-none text-white text-xs sm:text-sm font-semibold placeholder-slate-500 transition-colors shadow-inner font-chat"
              autoFocus
            />
          </div>

          {/* 2. Description du Salon */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between font-chat">
              <span>{isFr ? 'Description du Salon *' : 'Room Description *'}</span>
              <span className="text-[10px] text-slate-500 font-normal">{description.length}/240</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={240}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isFr ? "Ex: Présentation, échanges spontanés en anglais et feedback bienveillant entre partenaires." : "E.g. Introduce yourself, converse spontaneously in English, and practice speaking together."}
              className="w-full px-4 py-2.5 rounded-xl bg-[#060b18] border border-white/15 focus:border-cyan-400 focus:outline-none text-white text-xs sm:text-sm placeholder-slate-500 transition-colors resize-none shadow-inner font-chat leading-relaxed"
            />
          </div>

          {/* 3. Lien pour joindre le live */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-chat">
              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isFr ? 'Lien pour joindre le live :' : 'Link to join the live room:'}</span>
            </label>
            
            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-[#060b18] border border-cyan-500/30">
              <span className="flex-1 text-[11.5px] sm:text-xs text-slate-300 font-mono truncate select-all">
                {joinLink}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
                }`}
                title={isFr ? "Copier le lien d'invitation" : "Copy invite link"}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? (isFr ? 'Copié !' : 'Copied!') : (isFr ? 'Copier' : 'Copy')}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-chat">
              {isFr 
                ? 'Partagez ce lien à vos partenaires pour qu\'ils rejoignent directement votre salon vidéo.' 
                : 'Share this direct URL with partners so they can jump straight into your live room.'}
            </p>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3 font-chat">
            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              {isFr ? 'Annuler' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(74,222,128,0.4)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>{isFr ? 'Lancer le Live' : 'Launch Live'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
