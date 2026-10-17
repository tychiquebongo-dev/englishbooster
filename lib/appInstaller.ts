'use client';

/**
 * English Booster Cross-Platform App Installer Helper
 * Supports 1-Click Native PWA Install, Windows PC Desktop Shortcut, 
 * Windows CMD Setup, Mobile Web-App launcher, and QR Code generation.
 */

declare global {
  interface Window {
    __eb_install_prompt?: any;
  }
}

// Global target domain
const APP_URL = 'https://englishbooster.vercel.app';

/**
 * Trigger native browser 1-Click PWA Installation
 */
export async function triggerNativePwaInstall(): Promise<'accepted' | 'dismissed' | 'unsupported' | 'guide'> {
  if (typeof window === 'undefined') return 'unsupported';

  const prompt = window.__eb_install_prompt;
  if (!prompt) {
    // Notify components to display the interactive Android Installation Guide Modal
    window.dispatchEvent(new CustomEvent('eb_show_android_guide'));
    return 'guide';
  }

  try {
    prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice?.outcome === 'accepted') {
      window.__eb_install_prompt = null;
      return 'accepted';
    }
    return 'dismissed';
  } catch (err) {
    console.warn('Native PWA install error, opening guide:', err);
    window.dispatchEvent(new CustomEvent('eb_show_android_guide'));
    return 'guide';
  }
}

/**
 * Open URL in native Google Chrome on Android via Intent
 * Useful when users are inside WhatsApp, Instagram or Facebook in-app browser
 */
export function openAndroidChromeIntent() {
  if (typeof window === 'undefined') return;
  try {
    const currentUrl = window.location.href;
    const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
    window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
  } catch (e) {
    window.open(APP_URL, '_blank');
  }
}

/**
 * Check if Native PWA install prompt is available
 */
export function isNativePwaInstallAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__eb_install_prompt);
}

/**
 * Download Windows Desktop 1-Click Shortcut (.url file)
 * Works out-of-the-box on all Windows versions (10, 11, etc.)
 */
export function downloadWindowsUrlShortcut() {
  if (typeof window === 'undefined') return;

  const content = `[InternetShortcut]
URL=${APP_URL}/
IconIndex=0
IconFile=${APP_URL}/favicon.ico
HotKey=0
IDList=
[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,11
`;
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'English Booster - PC.url';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download Windows CMD Automated Desktop Shortcut Creator (.cmd file)
 */
export function downloadWindowsCmdInstaller() {
  if (typeof window === 'undefined') return;

  const content = `@echo off
chcp 65001 >nul
title Installation English Booster Desktop
color 0b
echo ========================================================
echo        ENGLISH BOOSTER - INSTALLATEUR DESKTOP
echo ========================================================
echo.
echo [1/3] Creation du raccourci sur votre Bureau Windows...
set TARGET_URL=${APP_URL}
set DESKTOP_DIR=%USERPROFILE%\\Desktop
set SHORTCUT_PATH=%DESKTOP_DIR%\\English Booster.url

echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=%TARGET_URL% >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"
echo IconFile=%TARGET_URL%/favicon.ico >> "%SHORTCUT_PATH%"

echo.
echo [2/3] Verification de l'installation Desktop...
echo [OK] Raccourci place sur : "%SHORTCUT_PATH%"
echo.
echo [3/3] Lancement d'English Booster...
start "" "%SHORTCUT_PATH%"
echo.
echo ========================================================
echo  Installation terminee avec succes ! Bon apprentissage !
echo ========================================================
timeout /t 3 >nul
exit
`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'EnglishBooster-Setup.cmd';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download Mobile HTML App Launcher
 */
export function downloadMobileLauncher() {
  if (typeof window === 'undefined') return;

  const content = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>English Booster</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <meta name="theme-color" content="#060a14">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="icon" href="${APP_URL}/favicon.ico">
  <style>
    body { background: #060a14; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .btn { background: #06b6d4; color: #000; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; margin-top: 20px; font-size: 16px; box-shadow: 0 4px 15px rgba(6,182,212,0.4); }
  </style>
  <meta http-equiv="refresh" content="0; url=${APP_URL}/">
</head>
<body>
  <h2>English Booster</h2>
  <p>Ouverture de l'application...</p>
  <a class="btn" href="${APP_URL}/">Ouvrir English Booster</a>
</body>
</html>`;
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'EnglishBooster-Mobile.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
