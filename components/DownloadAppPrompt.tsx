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
  ChevronUp,
  FileDown,
  ExternalLink,
  Laptop
} from 'lucide-react';

export default function DownloadAppPrompt() {
  const pathname = usePathname();
  const { isFr } = useTranslation();
  const { playSound } = useAuth();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [activeTab, setActiveTab] = useState<'mobile' | 'pc'>('mobile');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<'mobile' | 'pc'>('mobile');
  const [minimized, setMinimized] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone PWA mode (already installed)
    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(Boolean(standaloneMode));

    // Detect mobile device vs desktop PC
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsMobileDevice(isMobile);
    setActiveTab(isMobile ? 'mobile' : 'pc');
    setGuideTab(isMobile ? 'mobile' : 'pc');

    // Capture beforeinstallprompt event (Chromium Android & Desktop Chrome/Edge)
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

  // 1. Install on Mobile (Android & iOS)
  const handleInstallMobile = async () => {
    playSound('click');

    // If native prompt is available (Android Chrome, Edge, Samsung Internet)
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

    // Otherwise, show step-by-step interactive Mobile Guide (iOS Safari / Android Menu)
    setGuideTab('mobile');
    setShowGuideModal(true);
  };

  // 2. Install on Ce PC (Windows, macOS, Chrome / Edge)
  const handleInstallPC = async () => {
    playSound('click');

    // If native prompt is available on PC (Chrome PC, Edge PC)
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

    // Otherwise show PC Guide & offer Windows Desktop shortcut download
    setGuideTab('pc');
    setShowGuideModal(true);
  };

  // 3. Direct Windows PC Shortcut (.url file) download
  const handleDownloadWindowsShortcut = () => {
    playSound('click');
    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://english-booster.vercel.app';
      const shortcutContent = `[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,11\r\n[InternetShortcut]\r\nIDList=\r\nURL=${currentOrigin}/\r\nIconIndex=0\r\nIconFile=${currentOrigin}/assets/images/icon-192.png\r\nHotKey=0\r\n`;
      
      const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'English Booster - PC.url';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      playSound('success');
      setDownloadSuccessToast(isFr ? 'Raccourci Windows téléchargé ! Glissez-le sur votre Bureau pour lancer en 1 clic.' : 'Windows shortcut downloaded! Drag it to your Desktop for 1-click launch.');
      setTimeout(() => setDownloadSuccessToast(null), 5000);
    } catch (e) {
      console.warn('Download shortcut error:', e);
    }
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
        className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[9970] max-w-[calc(100vw-1.5rem)] sm:max-w-md safe-pb transition-all duration-300"
      >
        {minimized ? (
          /* Sleek Collapsed Floating Badge in the Bottom-Right Corner */
          <button
            type="button"
            onClick={handleRestore}
            className="group flex items-center gap-2.5 py-2.5 px-4 rounded-2xl bg-[#070e24]/95 border-2 border-emerald-400/60 shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-emerald-500/20"
            title={isFr ? "Télécharger l'application sur Mobile ou ce PC" : "Download app on Mobile or this PC"}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors">
              <span>{isFr ? "Télécharger" : "Download"}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 text-emerald-300 font-bold">
                📱 Mobile & 💻 PC
              </span>
            </div>

            <ChevronUp className="w-3.5 h-3.5 text-emerald-400/80 group-hover:translate-y-[-2px] transition-transform" />
          </button>
        ) : (
          /* Full Expanded Bottom-Right Corner Download Notification Card */
          <div className="relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#070e22]/98 border-2 border-emerald-400/60 shadow-[0_20px_55px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-white space-y-3.5 animate-menu-enter ring-1 ring-white/10">
            
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
                    <span className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                      {isFr ? "Télécharger l'Application" : "Download Application"}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                      OFFICIEL
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400/90 font-bold">
                    English Booster • Mobile & Ce PC
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

            {/* Device Tabs: Mobile vs Ce PC */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => { playSound('click'); setActiveTab('mobile'); }}
                className={`py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'mobile'
                    ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/20 border border-emerald-400/50 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>📱 {isFr ? "Mobile" : "Mobile"}</span>
                {isMobileDevice && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => { playSound('click'); setActiveTab('pc'); }}
                className={`py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'pc'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/20 border border-cyan-400/50 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>💻 {isFr ? "Ce PC" : "This PC"}</span>
                {!isMobileDevice && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}
              </button>
            </div>

            {/* Tab 1: Mobile Details & Actions */}
            {activeTab === 'mobile' && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                  {installedSuccess
                    ? (isFr ? "🎉 Application installée ! Retrouvez l'icône sur votre écran d'accueil." : "🎉 App installed! Find the icon on your home screen.")
                    : isStandalone
                    ? (isFr ? "✅ Vous utilisez déjà l'application installée sur votre smartphone." : "✅ You are already using the installed mobile app.")
                    : (isFr 
                        ? "Installez l'application sur votre smartphone ou tablette pour lancer en 1 touche et recevoir vos appels même écran verrouillé."
                        : "Install the app on your smartphone or tablet for 1-tap launch and background calls even when locked.")}
                </p>

                {/* Feature Perks */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-300 bg-white/[0.03] p-2 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Android & iPhone</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{isFr ? "Sonnerie hors-app" : "Phone Ringer"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleInstallMobile}
                    className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(74,222,128,0.4)] hover:scale-102 active:scale-98 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>
                      {installedSuccess 
                        ? (isFr ? "Installée ✓" : "Installed ✓") 
                        : (isFr ? "Installer sur Mobile" : "Install on Mobile")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { playSound('click'); setGuideTab('mobile'); setShowGuideModal(true); }}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-white/10 cursor-pointer"
                    title={isFr ? "Voir le guide d'installation" : "View installation guide"}
                  >
                    {isFr ? "Guide" : "Guide"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Ce PC (Windows / Desktop) Details & Actions */}
            {activeTab === 'pc' && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                  {isFr
                    ? "Installez English Booster sur ce PC en application de bureau autonome (sans barre de navigateur) ou téléchargez le raccourci Bureau 1-clic."
                    : "Install English Booster on this PC as a standalone desktop app or download the 1-click Desktop shortcut."}
                </p>

                {/* Feature Perks */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-300 bg-white/[0.03] p-2 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Windows & Mac</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{isFr ? "Écran Plein Dédié" : "Standalone App"}</span>
                  </div>
                </div>

                {/* Action Buttons: Native Install & Shortcut Download */}
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleInstallPC}
                      className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:scale-102 active:scale-98 cursor-pointer"
                    >
                      <Monitor className="w-4 h-4 shrink-0" />
                      <span>{isFr ? "Installer sur ce PC" : "Install on this PC"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playSound('click'); setGuideTab('pc'); setShowGuideModal(true); }}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-white/10 cursor-pointer"
                    >
                      {isFr ? "Aide" : "Help"}
                    </button>
                  </div>

                  {/* Windows 1-click Desktop Shortcut Downloader */}
                  <button
                    type="button"
                    onClick={handleDownloadWindowsShortcut}
                    className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-cyan-400/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    title={isFr ? "Télécharger le fichier raccourci pour votre bureau Windows" : "Download shortcut file for your Windows desktop"}
                  >
                    <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isFr ? "💾 Télécharger le Raccourci Bureau Windows (.url)" : "💾 Download Windows Desktop Shortcut (.url)"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Feedback Success Toast */}
            {downloadSuccessToast && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold animate-fade-in flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{downloadSuccessToast}</span>
              </div>
            )}

          </div>
        )}
      </div>

      {/* 2. DUAL-TAB STEP-BY-STEP INSTALLATION GUIDE MODAL (MOBILE & CE PC) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
          <div className="relative w-full max-w-md p-5 sm:p-6 rounded-3xl bg-[#091124]/98 border-2 border-emerald-400/60 shadow-[0_0_60px_rgba(74,222,128,0.3)] text-white space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isFr ? "Installation Directe" : "Direct Installation"}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Device Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => { playSound('click'); setGuideTab('mobile'); }}
                className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  guideTab === 'mobile'
                    ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>📱 {isFr ? "Guide Mobile" : "Mobile Guide"}</span>
              </button>

              <button
                type="button"
                onClick={() => { playSound('click'); setGuideTab('pc'); }}
                className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  guideTab === 'pc'
                    ? 'bg-cyan-500/25 border border-cyan-400/50 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>💻 {isFr ? "Guide Ce PC" : "This PC Guide"}</span>
              </button>
            </div>

            {/* Modal Content: Mobile Steps */}
            {guideTab === 'mobile' && (
              <div className="space-y-3 animate-fade-in">
                <div className="text-center space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {isIOS 
                      ? (isFr ? "Installer sur iPhone / iPad (Safari)" : "Install on iPhone / iPad (Safari)")
                      : (isFr ? "Installer sur Android (Chrome / Samsung)" : "Install on Android (Chrome / Samsung)")}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {isFr 
                      ? "Ajoutez l'icône directement sur votre écran d'accueil en 2 étapes rapides :"
                      : "Add the icon to your home screen in 2 quick steps:"}
                  </p>
                </div>

                {isIOS ? (
                  <div className="space-y-2.5 py-1">
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-black text-xs shrink-0">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">1. {isFr ? "Appuyez sur Partager" : "Tap Share"}</p>
                        <p className="text-[11px] text-slate-300">
                          {isFr ? "En bas dans Safari, appuyez sur l'icône de partage ⎋." : "At the bottom of Safari, tap the share icon ⎋."}
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
                          {isFr ? "Faites défiler le menu et touchez 'Sur l'écran d'accueil ➕', puis 'Ajouter'." : "Scroll down and tap 'Add to Home Screen ➕', then tap 'Add'."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 py-1">
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">1. {isFr ? "Bouton d'installation ou Menu ⋮" : "Install button or Menu ⋮"}</p>
                        <p className="text-[11px] text-slate-300">
                          {isFr ? "Appuyez sur les 3 points ⋮ en haut à droite de Google Chrome." : "Tap the 3 dots ⋮ at the top right of Google Chrome."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 font-black text-xs shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">2. {isFr ? "Installer l'application" : "Install Application"}</p>
                        <p className="text-[11px] text-slate-300">
                          {isFr ? "Sélectionnez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'." : "Select 'Install app' or 'Add to Home screen'."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Content: Ce PC Steps */}
            {guideTab === 'pc' && (
              <div className="space-y-3 animate-fade-in">
                <div className="text-center space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {isFr ? "Installer sur ce PC (Windows / Mac)" : "Install on this PC (Windows / Mac)"}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {isFr 
                      ? "Profitez d'une expérience plein écran ultra-fluide sur votre ordinateur :"
                      : "Enjoy a smooth full-screen desktop experience on your computer:"}
                  </p>
                </div>

                <div className="space-y-2.5 py-1">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-black text-xs shrink-0">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        1. {isFr ? "Barre d'adresse de Chrome / Edge" : "Chrome / Edge address bar"}
                      </p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {isFr 
                          ? "Dans la barre d'adresse tout en haut à droite, cliquez sur l'icône ⊕ 'Installer English Booster'." 
                          : "In the address bar at the top right, click the ⊕ 'Install English Booster' icon."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs shrink-0">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">
                        2. {isFr ? "Ou téléchargez le Raccourci Bureau 1-clic" : "Or download 1-click Desktop Shortcut"}
                      </p>
                      <p className="text-[11px] text-slate-300 mb-2">
                        {isFr ? "Glissez ce fichier sur votre bureau Windows pour ouvrir en 1 clic :" : "Place this file on your Windows desktop for 1-click launch:"}
                      </p>
                      <button
                        type="button"
                        onClick={handleDownloadWindowsShortcut}
                        className="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>{isFr ? "Télécharger English Booster.url" : "Download English Booster.url"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom Button */}
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setShowGuideModal(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs sm:text-sm hover:scale-102 transition-transform cursor-pointer shadow-md"
            >
              {isFr ? "Fermer / J'ai compris" : "Close / Got it"}
            </button>

          </div>
        </div>
      )}
    </>
  );
}
