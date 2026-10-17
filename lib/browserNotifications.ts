'use client';

/**
 * Browser Bar Notifications Manager for English Booster
 * Controls dynamic flashing browser tab titles (document.title), 
 * tab favicon badge alerts, and native HTML5 desktop notifications.
 */

interface BrowserBarOptions {
  type: 'video_call' | 'voice_call' | 'message';
  senderName: string;
  textSnippet?: string;
  durationMs?: number;
  url?: string;
}

let originalTitle: string = '';
let titleInterval: NodeJS.Timeout | null = null;
let currentNotificationType: 'video_call' | 'voice_call' | 'message' | null = null;
let originalFaviconHref: string | null = null;
let focusListenerAttached = false;

/**
 * Get or store original document title safely
 */
function getOriginalTitle(): string {
  if (typeof document === 'undefined') return 'English Booster';
  if (!originalTitle || originalTitle.includes('APPEL') || originalTitle.includes('💬')) {
    originalTitle = 'English Booster — Global SaaS for Spoken English Fluency';
  }
  return originalTitle;
}

/**
 * Update the browser favicon dynamically to show an alert dot/icon
 */
function setFaviconAlert(isAlert: boolean, type?: 'video_call' | 'voice_call' | 'message') {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  try {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0]?.appendChild(link);
    }

    if (!originalFaviconHref) {
      originalFaviconHref = link.href || '/assets/images/logo.svg';
    }

    if (!isAlert) {
      if (originalFaviconHref) {
        link.href = originalFaviconHref;
      }
      return;
    }

    // Draw alert badge on a 32x32 canvas
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background circle
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, 2 * Math.PI, false);
    ctx.fillStyle = type === 'video_call' ? '#ef4444' : type === 'voice_call' ? '#10b981' : '#06b6d4';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw symbol or text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbol = type === 'video_call' ? '📹' : type === 'voice_call' ? '📞' : '💬';
    ctx.fillText(symbol, 16, 17);

    link.href = canvas.toDataURL('image/png');
  } catch {
    // Canvas or favicon manipulation might fail silently in restricted sandboxes
  }
}

/**
 * Stop active browser bar notification and restore original document title & favicon
 */
export function stopBrowserBarNotification() {
  if (typeof document === 'undefined') return;

  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }

  currentNotificationType = null;
  setFaviconAlert(false);

  if (originalTitle) {
    document.title = originalTitle;
  }
}

/**
 * Flash notification in the browser tab title & favicon (Barre de navigateur)
 * Alternates between alert message and English Booster so the user sees it in their tab bar/taskbar
 */
export function notifyBrowserBar({
  type,
  senderName,
  textSnippet = '',
  durationMs,
  url,
}: BrowserBarOptions): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // Ensure original title is cached
  if (!originalTitle || (!originalTitle.includes('APPEL') && !originalTitle.includes('💬'))) {
    originalTitle = document.title || 'English Booster';
  }

  // Clear any existing flashing interval
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }

  currentNotificationType = type;

  // Define frames for the flashing title
  let frameA = '';
  let frameB = '';

  const cleanName = senderName ? senderName.trim().slice(0, 22) : 'Partenaire';

  if (type === 'video_call') {
    frameA = `🔴 (1) 📹 APPEL VIDÉO : ${cleanName.toUpperCase()} !`;
    frameB = `⚡ DÉCROCHEZ ! — English Booster`;
  } else if (type === 'voice_call') {
    frameA = `🟢 (1) 📞 APPEL VOCAL : ${cleanName.toUpperCase()} !`;
    frameB = `⚡ DÉCROCHEZ ! — English Booster`;
  } else {
    const preview = textSnippet ? textSnippet.replace(/\s+/g, ' ').trim().slice(0, 24) : 'Nouveau message';
    frameA = `💬 (1) ${cleanName} : "${preview}"`;
    frameB = `💬 (1) Nouveau message — English Booster`;
  }

  let step = 0;
  document.title = frameA;
  setFaviconAlert(true, type);

  // Flash every 750ms
  titleInterval = setInterval(() => {
    step = (step + 1) % 2;
    document.title = step === 0 ? frameA : frameB;
  }, 750);

  // Auto-clear for messages when user returns to window
  if (!focusListenerAttached) {
    focusListenerAttached = true;
    window.addEventListener('focus', () => {
      if (currentNotificationType === 'message') {
        stopBrowserBarNotification();
      }
    });
  }

  // Auto stop timer if specified
  let autoTimer: NodeJS.Timeout | null = null;
  if (durationMs && durationMs > 0) {
    autoTimer = setTimeout(() => {
      stopBrowserBarNotification();
    }, durationMs);
  }

  return () => {
    if (autoTimer) clearTimeout(autoTimer);
    stopBrowserBarNotification();
  };
}

/**
 * Show a native HTML5 Desktop Notification (pops up outside the browser on desktop/phone)
 */
export async function showDesktopNotification({
  title,
  body,
  icon,
  tag,
  url,
  isCall = false,
  isVideo = false,
}: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  isCall?: boolean;
  isVideo?: boolean;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') return;

    const notifIcon = icon || '/assets/images/logo.svg';
    const notifTag = tag || (isCall ? 'eb-incoming-call' : `eb-msg-${Date.now()}`);

    // Try service worker first
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: notifIcon,
            badge: '/assets/images/logo.svg',
            tag: notifTag,
            data: { url: url || '/' },
            requireInteraction: isCall,
            vibrate: isCall ? [500, 250, 500, 250, 1000] : [200, 100, 200],
          } as any);
          return;
        }
      } catch {}
    }

    // Fallback to standard Notification
    const notif = new Notification(title, {
      body,
      icon: notifIcon,
      badge: '/assets/images/logo.svg',
      tag: notifTag,
      requireInteraction: isCall,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    };
  } catch (err) {
    console.warn('Desktop notification error:', err);
  }
}
