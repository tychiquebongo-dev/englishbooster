'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  Check, 
  Share2, 
  PlusSquare, 
  ChevronUp 
} from 'lucide-react';

export default function DownloadAppPrompt() {
  const pathname = usePathname();
  const { isFr } = useTranslation();
  const { playSound } = useAuth();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone PWA mode (already installed)
    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(Boolean(standaloneMode));

    // Check iOS Safari device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event (Chromium Android & Desktop Chrome/Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-restore card if new prompt is ready
      setMinimized(false);
    };

    // Listen for successful install event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstalledSuccess(true);
      setTimeout(() => {
        setMinimized(true);
      }, 3500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check saved minimization state in session
    try {
      const savedMin = localStorage.getItem('eb_download_minimized');
      if (savedMin === 'true') {
        setMinimized(true);
      }
    } catch {}

    setHasCheckedStatus(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Do not display download prompt on active call screen to keep video stage clean
  if (pathname === '/call') {
    return null;
  }

  // If already running inside standalone app and minimized, keep hidden
  if (isStandalone && minimized) {
    return null;
  }

  // Handle direct install button click
  const handleInstallClick = async () => {
    playSound('click');

    // Case 1: Browser has provided programmatic prompt (Android Chrome, Edge, PC Chrome)
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          playSound('success');
          setInstalledSuccess(true);
          setDeferredPrompt(null);
          setTimeout(() => setMinimized(true), 3500);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      return;
    }

    // Case 2: iOS Safari (guide user to tap Share -> Add to Home Screen)
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // Case 3: Desktop browser without active event (explain address bar install icon)
    setShowIOSGuide(true);
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('click');
    setMinimized(true);
    try {
      localStorage.setItem('eb_download_minimized', 'true');
    } catch {}
  };

  const handleRestore = () => {
    playSound('click');
    setMinimized(false);
    try {
      localStorage.removeItem('eb_download_minimized');
    } catch {}
  };

  return (
    <>
      {/* 1. BOTTOM-RIGHT CORNER DOWNLOAD NOTIFICATION CONTAINER */}
      <div 
        aria-label="Download App Notification"
        className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[9970] max-w-[calc(100vw-1.5rem)] sm:max-w-sm safe-pb transition-all duration-300"
      >
        {minimized ? (
          /* Sleek Collapsed Floating Badge in the Bottom-Right Corner */
          <button
            type="button"
            onClick={handleRestore}
            className="group flex items-center gap-2.5 py-2.5 px-4 rounded-2xl bg-[#070e24]/95 border-2 border-emerald-400/60 shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-emerald-500/20"
            title={isFr ? "Télécharger / Installer l'application" : "Download / Install application"}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <span className="text-xs font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors">
              {isFr ? "Télécharger l'App" : "Download App"}
            </span>

            <ChevronUp className="w-3.5 h-3.5 text-emerald-400/80 group-hover:translate-y-[-2px] transition-transform" />
          </button>
        ) : (
          /* Full Expanded Bottom-Right Corner Download Notification Card */
          <div className="relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#070e22]/98 border-2 border-emerald-400/60 shadow-[0_20px_55px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-white space-y-3.5 animate-menu-enter ring-1 ring-white/10">
            
            {/* Ambient Top Glow */}
            <div className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none" />

            {/* Header: Icon, Title & Dismiss Button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 border border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(74,222,128,0.3)] shrink-0">
                  <Download className="w-5 h-5 text-emerald-400 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white tracking-tight truncate">
                      {isFr ? "Télécharger l'Application" : "Download the Application"}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                      PWA
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400/90 font-bold">
                    English Booster • Mobile & PC
                  </p>
                </div>
              </div>

              {/* Dismiss / Minimize button */}
              <button
                type="button"
                onClick={handleMinimize}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={isFr ? "Réduire dans le coin" : "Minimize to corner"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description Text */}
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              {installedSuccess
                ? (isFr ? "🎉 Application installée avec succès ! Vous pouvez maintenant la lancer depuis votre écran d'accueil." : "🎉 App installed successfully! You can launch it from your home screen.")
                : isStandalone
                ? (isFr ? "✅ Vous utilisez actuellement la version installée d'English Booster." : "✅ You are running the installed version of English Booster.")
                : (isFr 
                    ? "Installez l'application pour un accès direct, une navigation ultra-rapide et recevoir vos appels même écran verrouillé."
                    : "Install the app for instant 1-tap launch, offline support, and background calls even when locked.")}
            </p>

            {/* Feature Perks */}
            {!installedSuccess && !isStandalone && (
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-300 bg-white/[0.03] p-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{isFr ? "Appels en arrière-plan" : "Background Calls"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{isFr ? "Sans Store (0 Mo)" : "No Store Needed"}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(74,222,128,0.4)] hover:scale-102 active:scale-98 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>
                  {installedSuccess 
                    ? (isFr ? "Installée ✓" : "Installed ✓") 
                    : isStandalone 
                    ? (isFr ? "Application Ouverte" : "App Open") 
                    : (isFr ? "Télécharger / Installer" : "Download & Install")}
                </span>
              </button>

              <button
                type="button"
                onClick={handleMinimize}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-white/10 cursor-pointer"
              >
                {isFr ? "Plus tard" : "Later"}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* 2. STEP-BY-STEP INSTALLATION GUIDE MODAL (FOR IOS SAFARI & DESKTOP BROWSERS) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
          <div className="relative w-full max-w-sm p-5 sm:p-6 rounded-3xl bg-[#091124]/98 border-2 border-emerald-400/60 shadow-[0_0_60px_rgba(74,222,128,0.3)] text-white space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isFr ? "Installation Directe" : "Direct Installation"}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-black text-white">
                {isIOS 
                  ? (isFr ? "Installer sur iPhone / iPad" : "Install on iPhone / iPad")
                  : (isFr ? "Installer sur votre appareil" : "Install on your device")}
              </h3>
              <p className="text-xs text-slate-300">
                {isFr 
                  ? "Suivez ces 2 étapes rapides pour ajouter l'icône sur votre écran d'accueil :"
                  : "Follow these 2 quick steps to add the app icon to your home screen:"}
              </p>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-2.5 py-1">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-black text-xs shrink-0">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">1. {isFr ? "Appuyez sur Partager" : "Tap the Share button"}</p>
                      <p className="text-[11px] text-slate-300">
                        {isFr ? "En bas de votre écran dans Safari, appuyez sur l'icône de partage ⎋." : "At the bottom of your screen in Safari, tap the share icon ⎋."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs shrink-0">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">2. {isFr ? "Sur l'écran d'accueil" : "Add to Home Screen"}</p>
                      <p className="text-[11px] text-slate-300">
                        {isFr ? "Faites défiler le menu et sélectionnez 'Sur l'écran d'accueil ➕', puis cliquez sur 'Ajouter'." : "Scroll the menu and tap 'Add to Home Screen ➕', then tap 'Add'."}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs shrink-0">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {isFr ? "Barre d'adresse du navigateur" : "Browser Address Bar"}
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {isFr 
                        ? "Cliquez sur l'icône d'installation ⊕ ou 'Installer English Booster' située dans la barre d'adresse de Chrome ou Edge." 
                        : "Click the Install icon ⊕ or 'Install English Booster' in the address bar of Chrome or Edge."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setShowIOSGuide(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs sm:text-sm hover:scale-102 transition-transform cursor-pointer shadow-md"
            >
              {isFr ? "J'ai compris !" : "Got it!"}
            </button>

          </div>
        </div>
      )}
    </>
  );
}
