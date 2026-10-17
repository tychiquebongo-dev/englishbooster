'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Smartphone, 
  Monitor, 
  Check, 
  Sparkles, 
  Share2, 
  PlusSquare, 
  FileDown, 
  QrCode,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { 
  triggerNativePwaInstall, 
  isNativePwaInstallAvailable, 
  downloadWindowsUrlShortcut, 
  downloadWindowsCmdInstaller, 
  downloadMobileLauncher 
} from '@/lib/appInstaller';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'pc' | 'mobile';
}

export default function DownloadAppModal({
  isOpen,
  onClose,
  defaultTab = 'pc'
}: DownloadAppModalProps) {
  const { isFr } = useTranslation();
  const { playSound } = useAuth();

  const [activeTab, setActiveTab] = useState<'pc' | 'mobile'>(defaultTab);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDevice = () => {
      const ua = navigator.userAgent || '';
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
      const ios = /iPhone|iPad|iPod/i.test(ua);
      setIsMobileDevice(mobile);
      setIsIOS(ios);
      setHasNativePrompt(isNativePwaInstallAvailable());
      if (mobile) setActiveTab('mobile');
    };

    checkDevice();

    const handlePromptReady = () => setHasNativePrompt(true);
    window.addEventListener('eb_install_prompt_ready', handlePromptReady);

    return () => {
      window.removeEventListener('eb_install_prompt_ready', handlePromptReady);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    playSound?.('click');
    const result = await triggerNativePwaInstall();
    if (result === 'accepted') {
      playSound?.('success');
      setInstalledSuccess(true);
      setTimeout(() => {
        onClose();
        setInstalledSuccess(false);
      }, 2500);
    }
  };

  const handleDownloadUrl = () => {
    playSound?.('click');
    downloadWindowsUrlShortcut();
  };

  const handleDownloadCmd = () => {
    playSound?.('click');
    downloadWindowsCmdInstaller();
  };

  const handleDownloadMobile = () => {
    playSound?.('click');
    downloadMobileLauncher();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-xl rounded-3xl bg-[#070d1b] border border-cyan-500/30 shadow-[0_25px_60px_-15px_rgba(6,182,212,0.35)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient header */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-cyan-500/15 via-blue-500/5 to-transparent pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="relative z-10 flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 p-[1.5px] shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full bg-[#070d1b] rounded-[14px] flex items-center justify-center font-black text-cyan-400">
                EB
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isFr ? "Installer l'Application" : "Install the Application"}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PC & Mobile
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isFr ? "Accès direct sans navigateur, sonnerie et appels HD" : "Direct access without browser, ringing & HD calls"}
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
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Tabs Switcher */}
        <div className="relative z-10 px-4 sm:px-6 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                setActiveTab('pc');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'pc'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>{isFr ? "Ordinateur (PC & Mac)" : "Computer (PC & Mac)"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                setActiveTab('mobile');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'mobile'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{isFr ? "Mobile (Android & iOS)" : "Mobile (Android & iOS)"}</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* TAB 1: PC & MAC */}
          {activeTab === 'pc' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Primary 1-Click Native Install Button (if browser supports PWA) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-blue-950/40 border border-cyan-500/40 shadow-inner space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                      {isFr ? "Méthode Recommandée (1-Clic)" : "Recommended 1-Click Method"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200">
                    Chrome, Edge, Brave
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {isFr
                    ? "Installe directement English Booster comme application autonome dans la barre des tâches Windows / Dock Mac."
                    : "Installs English Booster as a standalone app in your Windows taskbar / Mac dock."}
                </p>

                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 hover:opacity-95 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {installedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>{isFr ? "Application Installée avec Succès !" : "Application Installed Successfully!"}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>{isFr ? "Installer sur mon Ordinateur (PWA 1-Clic)" : "Install on Computer (1-Click PWA)"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct Download Files for Windows PC */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  {isFr ? "Téléchargement Direct de Fichiers PC :" : "Direct PC File Downloads:"}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* File 1: Windows .url Shortcut */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-400 mb-1">
                        <FileDown className="w-4 h-4" />
                        <span className="text-xs font-bold text-white">English Booster - PC.url</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isFr
                          ? "Raccourci 1-clic pour votre Bureau Windows."
                          : "1-click shortcut for your Windows Desktop."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadUrl}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isFr ? "Télécharger (.url)" : "Download (.url)"}</span>
                    </button>
                  </div>

                  {/* File 2: Windows .cmd Setup */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <Monitor className="w-4 h-4" />
                        <span className="text-xs font-bold text-white">EnglishBooster-Setup.cmd</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isFr
                          ? "Installateur automatique de raccourci Windows."
                          : "Automated Windows shortcut desktop installer."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadCmd}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isFr ? "Télécharger (.cmd)" : "Download (.cmd)"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Browser Address Bar Tip */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  {isFr
                    ? "Astuce : Vous pouvez aussi cliquer sur l'icône ⊕ dans la barre d'adresse de votre navigateur en haut à droite pour installer l'application en mode fenêtre dédiée."
                    : "Tip: You can also click the ⊕ icon in your browser's address bar at the top right to install as a standalone dedicated window."}
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: MOBILE (ANDROID & IOS) */}
          {activeTab === 'mobile' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Native Prompt if on Android device */}
              {isMobileDevice && !isIOS && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-cyan-950/40 border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      {isFr ? "Installation Immédiate sur cet Appareil" : "Direct Installation on this Device"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:opacity-95 shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>{isFr ? "Installer sur mon Téléphone" : "Install on my Phone"}</span>
                  </button>
                </div>
              )}

              {/* Step-by-Step Mobile Instructions */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  {isIOS 
                    ? (isFr ? "Guide d'installation iPhone / iPad (Safari) :" : "iPhone / iPad (Safari) Installation Guide:") 
                    : (isFr ? "Guide d'installation Android (Chrome / Samsung) :" : "Android (Chrome / Samsung) Installation Guide:")}
                </p>

                {isIOS ? (
                  /* iOS Safari steps */
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black text-xs shrink-0">
                        1
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-white mb-0.5">
                          {isFr ? "Touchez l'icône Partager ⎋" : "Tap the Share Icon ⎋"}
                        </p>
                        <p className="text-slate-400">
                          {isFr ? "En bas de l'écran dans le navigateur Safari, appuyez sur le bouton Partager." : "At the bottom of Safari, tap the Share button."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-xs shrink-0">
                        2
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-white mb-0.5">
                          {isFr ? "Touchez 'Sur l'écran d'accueil' ➕" : "Tap 'Add to Home Screen' ➕"}
                        </p>
                        <p className="text-slate-400">
                          {isFr ? "Faites défiler le menu et sélectionnez 'Sur l'écran d'accueil', puis confirmez." : "Scroll down and select 'Add to Home Screen', then confirm."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Android Chrome steps */
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black text-xs shrink-0">
                        1
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-white mb-0.5">
                          {isFr ? "Menu des 3 points ⋮ dans Chrome" : "3 Dots Menu ⋮ in Chrome"}
                        </p>
                        <p className="text-slate-400">
                          {isFr ? "Appuyez sur les 3 points verticaux ⋮ tout en haut à droite de Google Chrome." : "Tap the 3 vertical dots ⋮ in the top right corner of Google Chrome."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-xs shrink-0">
                        2
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-white mb-0.5">
                          {isFr ? "Sélectionnez 'Installer l'application'" : "Select 'Install Application'"}
                        </p>
                        <p className="text-slate-400">
                          {isFr ? "Ou 'Ajouter à l'écran d'accueil'. L'icône English Booster apparaîtra parmi vos applications avec support des sonneries hors ligne !" : "Or 'Add to Home screen'. English Booster will appear on your phone with background ringing support!"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Mobile HTML launcher download */}
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <p className="font-bold text-white">EnglishBooster-Mobile.html</p>
                    <p className="text-slate-400 text-[11px]">
                      {isFr ? "Lanceur web direct pour mobile" : "Direct web app mobile launcher"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadMobile}
                    className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isFr ? "Télécharger" : "Download"}</span>
                  </button>
                </div>

              </div>

              {/* QR Code if viewing from PC */}
              {!isMobileDevice && (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
                    {/* Visual QR Code Representation pointing to download */}
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://englishbooster.vercel.app/download" 
                      alt="QR Code English Booster"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-white mb-0.5">
                      {isFr ? "Vous êtes sur PC ? Scannez avec votre mobile" : "Viewing on PC? Scan with your phone"}
                    </p>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      {isFr
                        ? "Pointez l'appareil photo de votre smartphone pour ouvrir la page d'installation directement sur votre téléphone."
                        : "Point your phone camera to open the install page directly on your mobile device."}
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Benefits summary row */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <p className="text-xs font-bold text-cyan-300">100% Gratuit</p>
              <p className="text-[10px] text-slate-500">Aucun frais d'installation</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <p className="text-xs font-bold text-emerald-300">Sonnerie Live</p>
              <p className="text-[10px] text-slate-500">Même écran verrouillé</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <p className="text-xs font-bold text-teal-300">Zéro Latence</p>
              <p className="text-[10px] text-slate-500">Cache PWA haute vitesse</p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="relative z-10 p-3 sm:p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            English Booster PWA v7 • Multi-platform
          </span>
          <button
            type="button"
            onClick={() => {
              playSound?.('click');
              onClose();
            }}
            className="py-1.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {isFr ? "Fermer" : "Close"}
          </button>
        </div>

      </div>
    </div>
  );
}
