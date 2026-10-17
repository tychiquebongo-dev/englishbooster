'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __eb_install_prompt?: any;
    __eb_is_installed?: boolean;
  }
}

/**
 * PwaManager:
 * 1. Registers the Service Worker (/sw.js) which is required for PWA installation on Android (Chrome).
 * 2. Intercepts and preserves the 'beforeinstallprompt' event for 1-click install.
 * 3. Handles 'appinstalled' confirmation.
 */
export default function PwaManager() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker (strictly required by Chrome on Android to enable PWA install)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[PWA] Service Worker registered successfully:', registration.scope);
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration failed:', error);
          });
      });
    }

    // 2. Capture 'beforeinstallprompt' event on Android & Desktop
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent automatic mini-infobar so our custom install buttons can trigger it on demand
      event.preventDefault();
      window.__eb_install_prompt = event;
      window.dispatchEvent(new CustomEvent('eb_install_prompt_ready'));
      console.log('[PWA] Native Install Prompt captured and ready for 1-Click install!');
    };

    // 3. Detect when app has been installed
    const handleAppInstalled = () => {
      window.__eb_install_prompt = null;
      window.__eb_is_installed = true;
      window.dispatchEvent(new CustomEvent('eb_app_installed'));
      console.log('[PWA] English Booster successfully installed on device!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null;
}
