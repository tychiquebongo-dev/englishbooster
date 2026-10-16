'use client';

import React, { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { uploadGalleryAvatar, updateUserAvatarUrl, getInitialsAvatar, getUserAvatar } from '@/lib/avatarHelper';
import { 
  Upload, 
  Camera, 
  Check, 
  X, 
  Sparkles, 
  Image as ImageIcon,
  UserCheck,
  FolderOpen
} from 'lucide-react';

interface AvatarUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdated?: (url: string) => void;
}

export default function AvatarUploaderModal({
  isOpen,
  onClose,
  onAvatarUpdated
}: AvatarUploaderModalProps) {
  const { user, profile, refreshProfile, playSound, lang } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'device' | 'monograms'>('device');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonogramUrl, setSelectedMonogramUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Member';

  // Preset clean monograms with real user initials
  const MONOGRAM_PALETTES = [
    { label: 'Emerald Pro', stop1: '#10b981', stop2: '#047857' },
    { label: 'Royal Blue', stop1: '#3b82f6', stop2: '#1d4ed8' },
    { label: 'Deep Violet', stop1: '#8b5cf6', stop2: '#6d28d9' },
    { label: 'Warm Amber', stop1: '#f59e0b', stop2: '#b45309' },
    { label: 'Coral Rose', stop1: '#f43f5e', stop2: '#be123c' },
    { label: 'Ocean Teal', stop1: '#06b6d4', stop2: '#0e7490' },
  ].map((palette) => {
    const cleanName = (userName || 'EB').trim();
    const parts = cleanName.split(/\s+/);
    const initials = parts.length > 1 
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="g_${palette.label.replace(/\s+/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${palette.stop1}"/><stop offset="100%" stop-color="${palette.stop2}"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g_${palette.label.replace(/\s+/g, '')})"/><text x="60" y="66" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${initials}</text></svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    return {
      label: palette.label,
      url: dataUrl
    };
  });

  // Handle local file selection from phone/PC gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(lang === 'fr' ? 'Veuillez sélectionner un fichier image valide.' : 'Please select a valid image file.');
      return;
    }

    setErrorMsg(null);
    setSelectedMonogramUrl(null);
    setSelectedFile(file);
    playSound('click');

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle monogram selection
  const handleSelectMonogram = (url: string) => {
    playSound('click');
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedMonogramUrl(url);
  };

  // Save changes
  const handleSave = async () => {
    if (!user) return;

    setUploading(true);
    setErrorMsg(null);
    playSound('click');

    let result: { success: boolean; avatarUrl: string; error?: string };

    if (selectedFile) {
      // Real gallery upload
      result = await uploadGalleryAvatar(selectedFile, user.id);
    } else if (selectedMonogramUrl) {
      // Clean monogram chosen
      result = await updateUserAvatarUrl(selectedMonogramUrl, user.id);
    } else {
      setUploading(false);
      return;
    }

    if (result.success) {
      playSound('success');
      setSuccessNotice(true);
      await refreshProfile();
      if (onAvatarUpdated) {
        onAvatarUpdated(result.avatarUrl);
      }
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 900);
    } else {
      setErrorMsg(result.error || (lang === 'fr' ? 'Échec de la mise à jour.' : 'Update failed.'));
    }

    setUploading(false);
  };

  const currentDisplayAvatar = 
    selectedMonogramUrl || 
    previewUrl || 
    getUserAvatar(profile?.avatar_url, userName, profile?.email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6 bg-[#0a1124] border border-white/15 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-center text-white">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
          <Camera className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black text-white">
          {lang === 'fr' ? 'Photo de Profil du Compte' : 'Profile Photo'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {lang === 'fr' 
            ? 'Importez votre véritable photo depuis votre galerie ou personnalisez vos initiales.' 
            : 'Upload your real photo from device gallery or personalize your initials badge.'}
        </p>

        {/* Tab Toggle */}
        <div className="mt-5 grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('device');
              playSound('click');
            }}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'device'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? '📸 Galerie Appareil' : '📸 Device Gallery'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('monograms');
              playSound('click');
            }}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'monograms'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? '🎨 Initiales Couleur' : '🎨 Initials Badge'}</span>
          </button>
        </div>

        {/* Current Preview */}
        <div className="mt-5 flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-emerald-500/40 p-1 bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 shadow-[0_0_25px_rgba(74,222,128,0.25)] flex items-center justify-center">
              <img
                src={currentDisplayAvatar}
                alt="Aperçu du profil"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            {(selectedMonogramUrl || selectedFile) && (
              <span className="absolute -top-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-slate-950 font-black shadow-lg">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-300 mt-2">{userName}</span>
        </div>

        {/* Tab 1: Upload from Device Gallery */}
        {activeTab === 'device' && (
          <div className="mt-4 flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-xs font-extrabold text-emerald-300 transition-all cursor-pointer hover:scale-102 active:scale-98 shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>
                {selectedFile 
                  ? (lang === 'fr' ? 'Changer l\'image sélectionnée' : 'Change selected image') 
                  : (lang === 'fr' ? 'Sélectionner une photo depuis ma Galerie' : 'Select photo from my Gallery')}
              </span>
            </button>

            {selectedFile && (
              <p className="mt-2 text-[11px] text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </p>
            )}

            <p className="text-[11px] text-slate-400 mt-3 max-w-sm">
              {lang === 'fr' 
                ? 'Choisissez une vraie photo depuis votre téléphone ou ordinateur (JPG, PNG, WEBP). Traitement haute définition automatique.' 
                : 'Choose a real picture from your phone or PC (JPG, PNG, WEBP). Automatic HD optimization.'}
            </p>
          </div>
        )}

        {/* Tab 2: Clean Initials / Monograms */}
        {activeTab === 'monograms' && (
          <div className="mt-4">
            <p className="text-[11px] text-slate-400 mb-3">
              {lang === 'fr' 
                ? 'Ou choisissez un badge officiel avec vos initiales :' 
                : 'Or select an official gradient badge with your initials:'}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 p-1">
              {MONOGRAM_PALETTES.map((mono) => {
                const isSelected = selectedMonogramUrl === mono.url;
                return (
                  <button
                    key={mono.label}
                    type="button"
                    onClick={() => handleSelectMonogram(mono.url)}
                    className={`relative p-1.5 rounded-2xl border transition-all text-center group cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-500/40 scale-105'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <img
                      src={mono.url}
                      alt={mono.label}
                      className="w-12 h-12 rounded-full object-cover mx-auto shadow-sm"
                    />
                    <span className="block text-[9px] font-bold text-slate-300 truncate mt-1">
                      {mono.label}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-emerald-400 text-slate-950 font-black shadow-md">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error / Success feedback */}
        {errorMsg && (
          <p className="mt-3 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
            {errorMsg}
          </p>
        )}

        {successNotice && (
          <p className="mt-3 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>{lang === 'fr' ? 'Photo enregistrée avec succès !' : 'Photo saved successfully!'}</span>
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={uploading || (!selectedFile && !selectedMonogramUrl)}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(74,222,128,0.35)] transition-all flex items-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>{lang === 'fr' ? 'Enregistrement...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{lang === 'fr' ? 'Enregistrer mon profil' : 'Save Profile'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
