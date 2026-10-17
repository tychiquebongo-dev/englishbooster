'use client';

import React from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  MoreVertical, 
  PlusSquare,
  ArrowRight,
  FileDown
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { 
  triggerNativePwaInstall, 
  openAndroidChromeIntent, 
  downloadMobileLauncher 
} from '@/lib/appInstaller';

interface AndroidInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  playSound?: (sound: any) => void;
  onInstalledSuccess?: () => void;
}

export default function AndroidInstallGuideModal({
  isOpen,
  onClose,
  playSound,
  onInstalledSuccess,
}: AndroidInstallGuideModalProps) {
  const { isFr } = useTranslation();

  if (!isOpen) return null;

  const handleRetryInstall = async () => {
    playSound?.('click');
    const res = await triggerNativePwaInstall();
    if (res === 'accepted') {
      playSound?.('success');
      onInstalledSuccess?.();
      onClose();
    }
  };

  const handleOpenChromeIntent = () => {
    playSound?.('click');
    openAndroidChromeIntent();
  };

  const handleDownloadLauncher = () => {
    playSound?.('click');
    downloadMobileLauncher();
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#070e1c] border border-emerald-500/35 shadow-[0_25px_65px_-15px_rgba(16,185,129,0.35)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient header */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/20 via-teal-500/5 to-transparent pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="relative z-10 flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 p-[1.5px] shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <div className="w-full h-full bg-[#070e1c] rounded-[14px] flex items-center justify-center font-black text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isFr ? "Installer sur Android" : "Install on Android"}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Application PWA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isFr ? "Guide d'installation rapide en 3 étapes simples" : "Quick 3-step installation guide"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound?.('click');
              onClose();
            }}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Quick Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-200 leading-relaxed">
              {isFr 
                ? "English Booster s'installe comme une véritable application Android sur votre écran d'accueil avec sonnerie et appels vidéo HD sans passer par le Play Store."
                : "English Booster installs as a native Android app directly onto your home screen with ringing notifications & HD video calls."}
            </p>
          </div>

          {/* 3 Step-by-Step Instructions */}
          <div className="space-y-3">
            
            {/* Step 1 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black text-sm shrink-0 border border-cyan-500/30">
                1
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>{isFr ? "Appuyez sur le menu du navigateur" : "Tap the browser menu"}</span>
                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-emerald-300 font-mono font-bold flex items-center">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </span>
                </p>
                <p className="text-slate-400">
                  {isFr
                    ? "En haut à droite de Google Chrome ou Samsung Internet, touchez les 3 points verticaux (⋮)."
                    : "At the top right of Google Chrome or Samsung Internet, tap the 3 vertical dots (⋮)."}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-500/30">
                2
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>{isFr ? "Sélectionnez 'Installer l'application'" : "Select 'Install Application'"}</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    <Download className="w-3 h-3 inline mr-1" />
                    {isFr ? "Installer" : "Install"}
                  </span>
                </p>
                <p className="text-slate-400">
                  {isFr
                    ? "Dans la liste du menu, appuyez sur 'Installer l'application' ou 'Ajouter à l'écran d'accueil'."
                    : "In the menu list, tap 'Install app' or 'Add to Home screen'."}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black text-sm shrink-0 border border-teal-500/30">
                3
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>{isFr ? "Confirmez l'installation" : "Confirm the installation"}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </p>
                <p className="text-slate-400">
                  {isFr
                    ? "Appuyez sur 'Installer'. L'icône English Booster apparaîtra instantanément sur votre téléphone !"
                    : "Tap 'Install'. The English Booster icon will immediately appear on your phone's home screen!"}
                </p>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              onClick={handleRetryInstall}
              className="w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:opacity-95 shadow-[0_0_25px_rgba(52,211,153,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>{isFr ? "Déclencher l'Installation (1-Clic)" : "Trigger 1-Click Install"}</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenChromeIntent}
                className="py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title={isFr ? "Ouvrir directement dans Google Chrome" : "Open in Google Chrome"}
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isFr ? "Ouvrir dans Chrome" : "Open in Chrome"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadLauncher}
                className="py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title={isFr ? "Télécharger le lanceur mobile autonome" : "Download mobile launcher"}
              >
                <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isFr ? "Télécharger Raccourci" : "Download Shortcut"}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
