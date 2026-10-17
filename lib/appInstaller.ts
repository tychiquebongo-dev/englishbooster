'use client';

/**
 * English Booster Cross-Platform App Installer Helper
 * Supports 1-Click Native PWA Install, Windows PC Desktop Shortcut, 
 * Windows CMD Setup, Mobile Web-App launcher, and QR Code generation.
 */

declare global {
  interface Window {
    __eb_install_prompt?: any;
    __eb_is_installed?: boolean;
  }
}

/**
 * Resolve active domain dynamically (supports localhost, vercel preview, production)
 */
export function getAppUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'https://englishbooster.vercel.app';
}

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
      window.__eb_is_installed = true;
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
    const currentUrl = window.location.href || getAppUrl();
    const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
    window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
  } catch (e) {
    window.open(window.location.href || getAppUrl(), '_blank');
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

  const appUrl = getAppUrl();
  const content = `[InternetShortcut]\r\nURL=${appUrl}/\r\nIconIndex=0\r\nIconFile=${appUrl}/favicon.ico\r\nHotKey=0\r\nIDList=\r\n[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,11\r\n`;
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

  const appUrl = getAppUrl();
  const content = `@echo off\r\nchcp 65001 >nul\r\ntitle Installation English Booster Desktop\r\ncolor 0b\r\necho ========================================================\r\necho        ENGLISH BOOSTER - INSTALLATEUR DESKTOP\r\necho ========================================================\r\necho.\r\necho [1/3] Creation du raccourci sur votre Bureau Windows...\r\nset TARGET_URL=${appUrl}\r\nset DESKTOP_DIR=%USERPROFILE%\\Desktop\r\nset SHORTCUT_PATH=%DESKTOP_DIR%\\English Booster.url\r\n\r\necho [InternetShortcut] > "%SHORTCUT_PATH%"\r\necho URL=%TARGET_URL% >> "%SHORTCUT_PATH%"\r\necho IconIndex=0 >> "%SHORTCUT_PATH%"\r\necho IconFile=%TARGET_URL%/favicon.ico >> "%SHORTCUT_PATH%"\r\n\r\necho.\r\necho [2/3] Verification de l'installation Desktop...\r\necho [OK] Raccourci place sur : "%SHORTCUT_PATH%"\r\necho.\r\necho [3/3] Lancement d'English Booster...\r\nstart "" "%SHORTCUT_PATH%"\r\necho.\r\necho ========================================================\r\necho  Installation terminee avec succes ! Bon apprentissage !\r\necho ========================================================\r\ntimeout /t 3 >nul\r\nexit\r\n`;
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

  const appUrl = getAppUrl();
  const content = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>English Booster</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <meta name="theme-color" content="#060a14">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="icon" href="${appUrl}/favicon.ico">
  <style>
    body { background: #060a14; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .btn { background: #06b6d4; color: #000; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; margin-top: 20px; font-size: 16px; box-shadow: 0 4px 15px rgba(6,182,212,0.4); }
  </style>
  <meta http-equiv="refresh" content="0; url=${appUrl}/">
</head>
<body>
  <h2>English Booster</h2>
  <p>Ouverture de l'application...</p>
  <a class="btn" href="${appUrl}/">Ouvrir English Booster</a>
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
