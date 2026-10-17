'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Check, 
  Sparkles, 
  Share2, 
  PlusSquare, 
  FileDown, 
  ShieldCheck, 
  Zap, 
  Bell, 
  Video, 
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { 
  triggerNativePwaInstall, 
  isNativePwaInstallAvailable, 
  downloadWindowsUrlShortcut, 
  downloadWindowsCmdInstaller, 
  downloadMobileLauncher,
  openAndroidChromeIntent
} from '@/lib/appInstaller';
import AndroidInstallGuideModal from '@/components/AndroidInstallGuideModal';

export default function DownloadAppPage() {
  const { isFr } = useTranslation();
  const { user, profile, playSound } = useAuth();

  const [activePlatform, setActivePlatform] = useState<'windows' | 'android' | 'ios' | 'mac'>('windows');
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [detectedOs, setDetectedOs] = useState<string>('PC Windows');
  const [showAndroidGuideModal, setShowAndroidGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) {
      setActivePlatform('android');
      setDetectedOs('Android');
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      setActivePlatform('ios');
      setDetectedOs('iOS (iPhone/iPad)');
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      setActivePlatform('mac');
      setDetectedOs('macOS');
    } else {
      setActivePlatform('windows');
      setDetectedOs('Windows PC');
    }

    setHasNativePrompt(isNativePwaInstallAvailable());

    const handlePromptReady = () => setHasNativePrompt(true);
    const handleShowGuide = () => setShowAndroidGuideModal(true);

    window.addEventListener('eb_install_prompt_ready', handlePromptReady);
    window.addEventListener('eb_show_android_guide', handleShowGuide);

    return () => {
      window.removeEventListener('eb_install_prompt_ready', handlePromptReady);
      window.removeEventListener('eb_show_android_guide', handleShowGuide);
    };
  }, []);

  const handleNativeInstall = async () => {
    playSound?.('click');
    const res = await triggerNativePwaInstall();
    if (res === 'accepted') {
      playSound?.('success');
      setInstalledSuccess(true);
    } else if (activePlatform === 'android' || detectedOs.toLowerCase().includes('android')) {
      setShowAndroidGuideModal(true);
      playSound?.('chime');
    } else {
      downloadWindowsUrlShortcut();
      playSound?.('success');
      setInstalledSuccess(true);
      setTimeout(() => {
        setInstalledSuccess(false);
      }, 3500);
    }
  };

  return (
    <div className="min-h-screen bg-[#04070e] text-slate-100 relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background neon ambient gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -top-40 right-10 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        
        {/* Top Breadcrumb & Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link 
            href="/"
            onClick={() => playSound?.('click')}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <span>← {isFr ? "Retour à l'accueil" : "Back to Home"}</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFr ? `Appareil détecté : ${detectedOs}` : `Detected Device: ${detectedOs}`}</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-emerald-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-bold uppercase tracking-widest shadow-sm">
            <span>{isFr ? "Application Officielle English Booster" : "Official English Booster App"}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            {isFr ? "Installez l'Application sur" : "Install the App on"}{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Mobile & PC
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            {isFr
              ? "Accédez à English Booster en 1 clic depuis votre bureau d'ordinateur ou votre écran d'accueil mobile. Recevez les appels entrants en direct avec sonnerie et vibreur persistant même hors ligne."
              : "Launch English Booster in 1-click from your computer desktop or mobile home screen. Receive live partner calls with persistent ringing and vibration even offline."}
          </p>

          {/* Quick 1-Click Install CTA if supported */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleNativeInstall}
              className="py-3 px-6 sm:px-8 rounded-full font-black text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(6,182,212,0.45)] transition-all flex items-center gap-2.5 cursor-pointer"
            >
              {installedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>{isFr ? "Application Installée !" : "App Installed!"}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>{isFr ? "Installer Directement (1-Clic)" : "Install Directly (1-Click)"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                downloadWindowsUrlShortcut();
              }}
              className="py-3 px-6 rounded-full font-bold text-sm text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-cyan-400" />
              <span>{isFr ? "Télécharger pour Windows (.url)" : "Download for Windows (.url)"}</span>
            </button>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                setActivePlatform('windows');
              }}
              className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activePlatform === 'windows'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Windows PC</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                setActivePlatform('android');
              }}
              className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activePlatform === 'android'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                setActivePlatform('ios');
              }}
              className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activePlatform === 'ios'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>iPhone / iOS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound?.('click');
                setActivePlatform('mac');
              }}
              className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activePlatform === 'mac'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Mac OS</span>
            </button>
          </div>

          {/* Active Platform Card Showcase */}
          <div className="p-6 sm:p-10 rounded-3xl bg-[#070d1b] border border-cyan-500/25 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* PLATFORM 1: WINDOWS PC */}
            {activePlatform === 'windows' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                      <Monitor className="w-4 h-4" />
                      <span>{isFr ? "Installation Windows 10, 11 & Desktop" : "Windows 10, 11 & Desktop Install"}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      {isFr ? "English Booster sur votre Bureau Windows" : "English Booster on your Windows Desktop"}
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {isFr
                        ? "Ouvrez l'application en plein écran comme un logiciel natif. Fini les onglets perdus : vous disposez d'une icône dédiée dans votre barre des tâches et sur votre bureau."
                        : "Open the app in standalone fullscreen like native software. Enjoy a dedicated desktop icon and taskbar shortcut."}
                    </p>
                  </div>

                  {/* Windows Action Buttons */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleNativeInstall}
                        className="py-3 px-5 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:opacity-95 shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                        <span>{isFr ? "1. Installer en 1 Clic (PWA)" : "1. 1-Click Install (PWA)"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playSound?.('click');
                          downloadWindowsUrlShortcut();
                        }}
                        className="py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-white/10 hover:bg-cyan-500/20 border border-white/15 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileDown className="w-4 h-4 text-cyan-400" />
                        <span>{isFr ? "2. Télécharger Raccourci .url" : "2. Download .url Shortcut"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playSound?.('click');
                          downloadWindowsCmdInstaller();
                        }}
                        className="py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-white/10 hover:bg-emerald-500/20 border border-white/15 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>{isFr ? "3. Télécharger Setup.cmd" : "3. Download Setup.cmd"}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{isFr ? "Compatible Google Chrome, Microsoft Edge, Brave et Opera." : "Compatible with Google Chrome, Microsoft Edge, Brave, and Opera."}</span>
                    </p>
                  </div>
                </div>

                {/* Windows Preview Card */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 p-0.5 shadow-md">
                      <div className="w-full h-full bg-[#070d1b] rounded-[14px] flex items-center justify-center font-black text-cyan-400 text-lg">
                        EB
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">English Booster Desktop</p>
                      <p className="text-xs text-slate-400">Windows Standalone App</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{isFr ? "Lancement direct sans barre d'URL" : "Direct launch with zero URL bar clutter"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{isFr ? "Notification et sonnerie d'appel en arrière-plan" : "Background call ringing & notifications"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{isFr ? "Performances WebRTC & audio haute fidélité" : "High-fidelity WebRTC & audio performance"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PLATFORM 2: ANDROID */}
            {activePlatform === 'android' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <Smartphone className="w-4 h-4" />
                      <span>{isFr ? "Installation Android (Samsung, Xiaomi, Pixel...)" : "Android Installation"}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      {isFr ? "Installer l'App sur votre Téléphone Android" : "Install App on your Android Phone"}
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {isFr
                        ? "Bénéficiez du système complet de sonnerie et vibreur persistant, même lorsque le téléphone est en veille ou l'application fermée."
                        : "Enjoy persistent ringing and vibration even when the screen is locked or the app is closed."}
                    </p>
                  </div>

                  {/* Android Steps */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black text-xs shrink-0">
                        1
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-white mb-0.5">
                          {isFr ? "Appuyez sur 'Installer' ou le Menu 3 points ⋮" : "Tap 'Install' or the 3-dots Menu ⋮"}
                        </p>
                        <p className="text-slate-400">
                          {isFr
                            ? "Dans Google Chrome ou Samsung Internet, touchez 'Installer l'application' ou les 3 points en haut à droite."
                            : "In Google Chrome or Samsung Internet, tap 'Install application' or the 3 dots in the top right."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-xs shrink-0">
                        2
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-white mb-0.5">
                          {isFr ? "Validez 'Ajouter à l'écran d'accueil'" : "Confirm 'Add to Home Screen'"}
                        </p>
                        <p className="text-slate-400">
                          {isFr
                            ? "L'icône English Booster apparaîtra instantanément sur votre écran d'accueil parmi vos applications !"
                            : "English Booster will immediately appear on your home screen ready for instant calls!"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleNativeInstall}
                        className="py-3 px-6 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:opacity-95 shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-slate-950" />
                        <span>{isFr ? "Installer sur Android (1-Clic)" : "Install on Android (1-Click)"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playSound?.('click');
                          openAndroidChromeIntent();
                        }}
                        className="py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-white/10 hover:bg-white/15 border border-white/15 flex items-center gap-2 transition-colors cursor-pointer"
                        title={isFr ? "Ouvrir directement dans Google Chrome pour installer" : "Open in Google Chrome to install"}
                      >
                        <ExternalLink className="w-4 h-4 text-cyan-400" />
                        <span>{isFr ? "Ouvrir dans Chrome" : "Open in Chrome"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playSound?.('click');
                          downloadMobileLauncher();
                        }}
                        className="py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-white/10 hover:bg-white/15 border border-white/15 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileDown className="w-4 h-4 text-emerald-400" />
                        <span>{isFr ? "Télécharger Lanceur Web" : "Download Web Launcher"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* QR Code / Mobile Showcase */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center text-center space-y-4">
                  <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-xl flex items-center justify-center">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://englishbooster.vercel.app/download"
                      alt="QR Code English Booster Download"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">
                      {isFr ? "Scannez avec votre téléphone" : "Scan with your phone camera"}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      {isFr ? "Ouvrez instantanément la page d'installation sur votre mobile pour l'installer en 5 secondes." : "Open the install page directly on your phone to install in 5 seconds."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PLATFORM 3: IPHONE / IOS */}
            {activePlatform === 'ios' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                      <Smartphone className="w-4 h-4" />
                      <span>{isFr ? "Installation iPhone & iPad (Safari)" : "iPhone & iPad Safari Install"}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      {isFr ? "Ajouter English Booster sur iPhone" : "Add English Booster to your iPhone"}
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {isFr
                        ? "Sur iOS, Apple permet l'installation en 2 étapes très simples via le navigateur Safari."
                        : "On iOS, Apple enables 2-step installation through the native Safari browser."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 shrink-0">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-white mb-0.5">
                          1. {isFr ? "Appuyez sur le bouton Partager ⎋" : "Tap the Share button ⎋"}
                        </p>
                        <p className="text-slate-400">
                          {isFr ? "En bas au centre dans Safari, appuyez sur l'icône carrée avec la flèche vers le haut." : "At the bottom of Safari, tap the square icon with an upward arrow."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-white mb-0.5">
                          2. {isFr ? "Sélectionnez 'Sur l'écran d'accueil' ➕" : "Select 'Add to Home Screen' ➕"}
                        </p>
                        <p className="text-slate-400">
                          {isFr ? "Faites défiler le menu d'actions, touchez 'Sur l'écran d'accueil' puis cliquez sur 'Ajouter'." : "Scroll through the menu options, tap 'Add to Home Screen', then tap 'Add'."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center text-center space-y-4">
                  <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-xl flex items-center justify-center">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://englishbooster.vercel.app/download"
                      alt="QR Code English Booster iOS"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">
                      {isFr ? "Scannez avec l'appareil photo iPhone" : "Scan with iPhone Camera"}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      {isFr ? "Ouvrez directement dans Safari pour l'ajouter sur votre écran d'accueil." : "Open directly in Safari to add to your Home Screen."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PLATFORM 4: MAC OS */}
            {activePlatform === 'mac' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <Monitor className="w-4 h-4" />
                    <span>macOS Desktop Installation</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {isFr ? "English Booster sur Mac (Safari & Chrome)" : "English Booster on Mac (Safari & Chrome)"}
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    {isFr
                      ? "Dans Safari sur macOS Sonoma / Sequoia, cliquez sur Fichier > 'Ajouter au Dock'. Dans Chrome, cliquez sur l'icône d'installation dans la barre d'adresse."
                      : "In Safari on macOS Sonoma / Sequoia, click File > 'Add to Dock'. In Chrome, click the install icon in the URL bar."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="py-3 px-6 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:opacity-95 shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>{isFr ? "Installer sur Mac (PWA)" : "Install on Mac (PWA)"}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isFr ? "1-Clic depuis le Bureau" : "1-Click from Desktop"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isFr ? "Accès direct sans avoir besoin d'ouvrir votre navigateur internet." : "Direct instant access without having to open an internet browser."}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isFr ? "Sonnerie & Vibreur Appel" : "Persistent Call Ringer"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isFr ? "Votre téléphone sonne et vibre même écran verrouillé et application fermée." : "Your phone rings and vibrates even with screen locked and app closed."}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isFr ? "Appels HD Plein Écran" : "Fullscreen HD Calls"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isFr ? "Expérience d'appel vidéo et audio immersive sans barres d'onglets." : "Immersive voice and video calling experience with zero browser bars."}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-black">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isFr ? "100% Sécurisé & Léger" : "100% Secure & Lightweight"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isFr ? "Pèse moins de 5 Mo et se met à jour automatiquement en temps réel." : "Weighs less than 5 MB and automatically updates in real-time."}
            </p>
          </div>
        </div>

        {/* Admin & Partner Callout Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              {isFr ? "Pour tous les Partenaires & Administrateurs" : "For all Partners & Administrators"}
            </p>
            <h4 className="text-lg sm:text-xl font-black text-white">
              {isFr ? "Prêt à pratiquer avec vos partenaires mondiaux ?" : "Ready to practice with international partners?"}
            </h4>
            <p className="text-xs text-slate-300">
              {isFr ? "Connectez-vous à la communauté pour démarrer vos conversations orales." : "Log in to join live conversations with fluent speakers worldwide."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/partners"
              onClick={() => playSound?.('click')}
              className="py-2.5 px-5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition-colors shadow-md flex items-center gap-1.5"
            >
              <span>{isFr ? "Voir les Partenaires" : "Browse Partners"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Android Installation Interactive Guide Modal */}
        <AndroidInstallGuideModal
          isOpen={showAndroidGuideModal}
          onClose={() => setShowAndroidGuideModal(false)}
          playSound={playSound}
          onInstalledSuccess={() => setInstalledSuccess(true)}
        />

      </div>
    </div>
  );
}
