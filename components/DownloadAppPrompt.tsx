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
  const [activeTab, setActiveTab] = useState<'mobile' | 'pc'>('pc');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<'mobile' | 'pc'>('pc');
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

  // Helper 1: Real direct download of Windows PC Shortcut (.url file)
  const downloadWindowsPCApp = () => {
    playSound('success');
    try {
      const currentOrigin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
        ? window.location.origin
        : (typeof window !== 'undefined' ? window.location.origin : 'https://english-booster.vercel.app');

      const shortcutContent = `[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,11\r\n[InternetShortcut]\r\nIDList=\r\nURL=${currentOrigin}/\r\nIconIndex=0\r\nIconFile=${currentOrigin}/assets/images/icon-192.png\r\nHotKey=0\r\n`;

      const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'English Booster - PC.url';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch {}
      }, 200);

      setDownloadSuccessToast(isFr 
        ? '🎉 Application PC téléchargée ! Glissez "English Booster - PC.url" sur votre Bureau pour lancer en 1 clic.' 
        : '🎉 PC App downloaded! Drag "English Booster - PC.url" to your Desktop for 1-click launch.');
      setTimeout(() => setDownloadSuccessToast(null), 7000);
    } catch (e) {
      console.warn('Download shortcut error:', e);
    }
  };

  // Helper 2: Real direct download of Mobile Standalone Launcher (.html file)
  const downloadMobileLauncher = () => {
    playSound('success');
    try {
      const currentOrigin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
        ? window.location.origin
        : (typeof window !== 'undefined' ? window.location.origin : 'https://english-booster.vercel.app');

      const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>English Booster</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="manifest" href="${currentOrigin}/manifest.json">
  <link rel="icon" href="${currentOrigin}/assets/images/icon-192.png">
  <meta http-equiv="refresh" content="0; url=${currentOrigin}/">
</head>
<body style="background:#060a14;color:#fff;font-family:sans-serif;text-align:center;padding:40px;">
  <h2>Ouverture d'English Booster...</h2>
  <p><a href="${currentOrigin}/" style="color:#4ade80;">Cliquez ici si la redirection ne démarre pas.</a></p>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'English Booster - Mobile.html';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch {}
      }, 200);

      setDownloadSuccessToast(isFr 
        ? '🎉 Lanceur Mobile téléchargé ! Retrouvez le fichier dans vos Téléchargements.' 
        : '🎉 Mobile launcher downloaded! Check your Downloads folder.');
      setTimeout(() => setDownloadSuccessToast(null), 7000);
    } catch (e) {
      console.warn('Download mobile error:', e);
    }
  };

  // Main Action 1: Install on Ce PC (ALWAYS triggers download + native PWA prompt if available)
  const handleInstallPC = async () => {
    playSound('click');

    // 1. Always execute immediate download of the Windows PC Desktop App package
    downloadWindowsPCApp();

    // 2. If native PWA install is supported by browser (Chrome PC, Edge PC), prompt too!
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          playSound('success');
          setInstalledSuccess(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
  };

  // Main Action 2: Install on Mobile (Android & iOS)
  const handleInstallMobile = async () => {
    playSound('click');

    // 1. If native PWA install prompt is supported (Android Chrome / Samsung / Edge)
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          playSound('success');
          setInstalledSuccess(true);
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }

    // 2. Trigger real download of mobile launcher file
    downloadMobileLauncher();

    // 3. If on iOS Safari, open step-by-step guide
    if (isIOS) {
      setGuideTab('mobile');
      setShowGuideModal(true);
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
          /* Sleek Collapsed Floating Dock in the Bottom-Right Corner */
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#070e24]/95 border-2 border-emerald-400/60 shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl ring-2 ring-emerald-500/20 text-white animate-menu-enter">
            {/* Quick PC Download Button */}
            <button
              type="button"
              onClick={handleInstallPC}
              className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              title={isFr ? "Télécharger pour ce PC maintenant" : "Download for this PC now"}
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>💻 {isFr ? "Télécharger PC" : "Download PC"}</span>
            </button>

            {/* Quick Mobile Download Button */}
            <button
              type="button"
              onClick={handleInstallMobile}
              className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              title={isFr ? "Télécharger / Installer sur Mobile" : "Download / Install Mobile"}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>📱 Mobile</span>
            </button>

            {/* Expand / Details Arrow */}
            <button
              type="button"
              onClick={handleRestore}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isFr ? "Agrandir le panneau" : "Expand panel"}
            >
              <ChevronUp className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
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

            {/* Device Tabs: Ce PC vs Mobile */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold">
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
                <span>💻 {isFr ? "Ce PC (Windows)" : "This PC (Windows)"}</span>
                {!isMobileDevice && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}
              </button>

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
            </div>

            {/* Tab: Ce PC (Windows / Desktop) Details & Actions */}
            {activeTab === 'pc' && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                  {isFr
                    ? "Téléchargez l'application pour ce PC en 1 clic pour lancer English Booster directement depuis votre Bureau Windows."
                    : "Download the application for this PC in 1 click to launch English Booster directly from your Windows Desktop."}
                </p>

                {/* Feature Perks */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-300 bg-white/[0.03] p-2 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Windows 11 / 10 / 8 / 7</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{isFr ? "Lancement 1-Clic" : "1-Click Launch"}</span>
                  </div>
                </div>

                {/* Primary Action Button: Triggers immediate download & install */}
                <div className="space-y-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleInstallPC}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:scale-102 active:scale-98 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 shrink-0" />
                    <span>{isFr ? "💾 Télécharger l'Application PC (.url)" : "💾 Download PC Application (.url)"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {deferredPrompt && (
                      <button
                        type="button"
                        onClick={handleInstallPC}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>{isFr ? "Installer en PWA" : "Install as PWA"}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => { playSound('click'); setGuideTab('pc'); setShowGuideModal(true); }}
                      className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-white/10 cursor-pointer ml-auto"
                    >
                      {isFr ? "Instructions PC" : "PC Instructions"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Mobile Details & Actions */}
            {activeTab === 'mobile' && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                  {installedSuccess
                    ? (isFr ? "🎉 Application installée ! Retrouvez l'icône sur votre écran d'accueil." : "🎉 App installed! Find the icon on your home screen.")
                    : isStandalone
                    ? (isFr ? "✅ Vous utilisez déjà l'application installée sur votre smartphone." : "✅ You are already using the installed mobile app.")
                    : (isFr 
                        ? "Téléchargez et installez l'application sur votre smartphone ou tablette pour lancer en 1 touche et recevoir vos appels même écran verrouillé."
                        : "Download and install the app on your smartphone or tablet for 1-tap launch and background calls even when locked.")}
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
                        : (isFr ? "📱 Télécharger / Installer Mobile" : "📱 Download / Install Mobile")}
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

            {/* Feedback Success Toast Banner */}
            {downloadSuccessToast && (
              <div className="p-3 rounded-xl bg-emerald-500/25 border-2 border-emerald-400/60 text-emerald-200 text-xs font-bold animate-fade-in flex items-start gap-2 shadow-lg">
                <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span className="leading-relaxed">{downloadSuccessToast}</span>
              </div>
            )}

          </div>
        )}
      </div>

      {/* 2. DUAL-TAB STEP-BY-STEP INSTALLATION GUIDE MODAL (CE PC & MOBILE) */}
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
            </div>

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
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs shrink-0">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">
                        1. {isFr ? "Télécharger le Raccourci Bureau 1-clic" : "Download 1-click Desktop Shortcut"}
                      </p>
                      <p className="text-[11px] text-slate-300 mb-2">
                        {isFr ? "Glissez ce fichier sur votre bureau Windows pour ouvrir l'application en 1 clic :" : "Place this file on your Windows desktop for 1-click launch:"}
                      </p>
                      <button
                        type="button"
                        onClick={handleInstallPC}
                        className="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>{isFr ? "Télécharger English Booster - PC.url" : "Download English Booster - PC.url"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-black text-xs shrink-0">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        2. {isFr ? "Barre d'adresse de Chrome / Edge (PWA)" : "Chrome / Edge address bar (PWA)"}
                      </p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {isFr 
                          ? "Dans la barre d'adresse tout en haut à droite, cliquez sur l'icône ⊕ 'Installer English Booster' pour ouvrir en fenêtre dédiée sans navigateur." 
                          : "In the address bar at the top right, click the ⊕ 'Install English Booster' icon to open as a standalone app."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                        <p className="text-xs font-bold text-white">1. {isFr ? "Télécharger le Lanceur ou Menu ⋮" : "Download Launcher or Menu ⋮"}</p>
                        <p className="text-[11px] text-slate-300">
                          {isFr ? "Appuyez sur les 3 points ⋮ en haut à droite de Google Chrome." : "Tap the 3 dots ⋮ at the top right of Google Chrome."}
                        </p>
                        <button
                          type="button"
                          onClick={handleInstallMobile}
                          className="mt-2 py-1 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileDown className="w-3 h-3" />
                          <span>{isFr ? "Télécharger Lanceur Mobile" : "Download Mobile Launcher"}</span>
                        </button>
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
