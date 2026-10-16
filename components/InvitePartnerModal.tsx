'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { 
  X, 
  Copy, 
  Check, 
  Mail, 
  Send, 
  Share2, 
  Sparkles, 
  Users,
  MessageCircle
} from 'lucide-react';

interface InvitePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InvitePartnerModal({ isOpen, onClose }: InvitePartnerModalProps) {
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();

  const [copied, setCopied] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSentNotice, setEmailSentNotice] = useState(false);
  const [tikTokCopied, setTikTokCopied] = useState(false);

  if (!isOpen) return null;

  // Deriving the base invite URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://english-booster.com';
  const inviteUrl = `${origin}/register?ref=${user?.id ? encodeURIComponent(user.id) : 'invite'}`;

  const inviteMessage = isFr
    ? `Salut ! Rejoins-moi sur English Booster pour pratiquer l'anglais à l'oral en direct avec des personnes du monde entier. Inscris-toi ici gratuitement : ${inviteUrl}`
    : `Hey! Join me on English Booster to practice real spoken English live with people from around the world. Register here for free: ${inviteUrl}`;

  // Copy Link to Clipboard
  const handleCopyLink = () => {
    playSound('click');
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    playSound('click');
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteMessage)}`;
    window.open(waUrl, '_blank');
  };

  // Facebook Share
  const handleShareFacebook = () => {
    playSound('click');
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(inviteMessage)}`;
    window.open(fbUrl, '_blank');
  };

  // Email Direct Mailto Share
  const handleShareEmail = () => {
    playSound('click');
    const subject = isFr
      ? "Rejoins-moi sur English Booster pour pratiquer l'anglais !"
      : "Join me on English Booster to practice spoken English!";
    const body = `${inviteMessage}\n\n— ${profile?.full_name || 'Ton ami'}`;
    const mailtoUrl = `mailto:${recipientEmail ? encodeURIComponent(recipientEmail) : ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    if (recipientEmail) {
      setEmailSentNotice(true);
      setTimeout(() => setEmailSentNotice(false), 3000);
      setRecipientEmail('');
    }
  };

  // TikTok Share
  const handleShareTikTok = () => {
    playSound('click');
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(inviteMessage);
      setTikTokCopied(true);
      setTimeout(() => setTikTokCopied(false), 3000);
    }
    // Open TikTok web
    window.open('https://www.tiktok.com', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#0a1124] border border-slate-200 dark:border-white/15 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-1">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {isFr ? 'Inviter des Partenaires à s\'inscrire' : 'Invite Partners to Register'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {isFr 
              ? 'Partagez votre lien d\'invitation sur WhatsApp, Facebook, TikTok ou par Email pour trouver de nouveaux partenaires de conversation !'
              : 'Share your invitation link via WhatsApp, Facebook, TikTok or Email to invite new English speaking partners!'}
          </p>
        </div>

        {/* 4 Social Direct Share Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* WhatsApp Button */}
          <button
            onClick={handleShareWhatsApp}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-slate-900 dark:text-white transition-all hover:scale-105 active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-lg mb-2 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-[#25D366]">WhatsApp</span>
          </button>

          {/* Email Button */}
          <button
            onClick={handleShareEmail}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-slate-900 dark:text-white transition-all hover:scale-105 active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg mb-2 group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Email</span>
          </button>

          {/* Facebook Button */}
          <button
            onClick={handleShareFacebook}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 text-slate-900 dark:text-white transition-all hover:scale-105 active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-lg mb-2 font-black text-lg group-hover:scale-110 transition-transform">
              f
            </div>
            <span className="text-xs font-bold text-[#1877F2]">Facebook</span>
          </button>

          {/* TikTok Button */}
          <button
            onClick={handleShareTikTok}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white transition-all hover:scale-105 active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-black text-cyan-400 flex items-center justify-center shadow-lg mb-2 font-black text-sm border border-pink-500 group-hover:scale-110 transition-transform">
              ♫
            </div>
            <span className="text-xs font-bold text-pink-600 dark:text-pink-400">TikTok</span>
          </button>

        </div>

        {/* TikTok Copied Notice */}
        {tikTokCopied && (
          <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-700 dark:text-pink-300 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-pink-500 dark:text-pink-400" />
            <span>
              {isFr 
                ? 'Lien copié dans le presse-papier ! Prêt à coller sur TikTok (bio ou message direct).'
                : 'Link copied to clipboard! Ready to paste into TikTok bio or direct message.'}
            </span>
          </div>
        )}

        {/* Direct Email Sender Form */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {isFr ? 'Envoyer directement à une adresse Email :' : 'Send directly to an Email address:'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="partenaire@example.com"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#060a14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={handleShareEmail}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 dark:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-emerald-400 dark:hover:bg-emerald-300 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isFr ? 'Envoyer' : 'Send'}</span>
            </button>
          </div>

          {emailSentNotice && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold pt-1 flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>{isFr ? 'Invitation prête dans votre application email !' : 'Invite ready in your email app!'}</span>
            </p>
          )}
        </div>

        {/* Copy Direct Link Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-400 block">
            {isFr ? 'Ou copiez votre lien d\'inscription unique :' : 'Or copy your unique registration link:'}
          </label>
          <div className="flex items-center gap-2 p-1.5 pl-3.5 rounded-xl bg-slate-50 dark:bg-[#060a14] border border-slate-200 dark:border-white/10">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-300 outline-none truncate font-mono"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isFr ? 'Copié !' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isFr ? 'Copier' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
