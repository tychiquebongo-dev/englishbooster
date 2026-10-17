// English Booster Production Service Worker for Background Call & Message Notifications
// Handles Web Push events even when the application is closed or phone is locked (Hors-Application / Background)

const EB_CACHE_NAME = 'eb-pwa-v6';

// Install event: Pre-cache PWA core assets for instant launch & background ringtones
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(EB_CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/assets/images/logo.svg',
        '/assets/images/icon-192.png',
        '/assets/images/icon-512.png',
        '/assets/sounds/phone-ring.wav',
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== EB_CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Strictly required by Chromium on Mobile & Desktop for PWA installability
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const resClone = response.clone();
          caches.open(EB_CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(EB_CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const fallback = await cache.match('/');
          if (fallback) return fallback;
        }
        return new Response('English Booster Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

// 1. Web Push event: Wakes service worker when user is outside application / phone locked
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'English Booster',
        body: event.data.text() || 'Nouvel appel / message reçu',
      };
    }
  }

  const isCall = data.type === 'call' || data.tag === 'eb-incoming-call' || Boolean(data.roomId);
  const isVideo = data.isVideo === true || (data.title && data.title.includes('Vidéo')) || (data.url && data.url.includes('video=true'));
  const callerName = data.callerName || 'Un partenaire';

  const defaultCallTitle = isVideo
    ? `📹 Appel Vidéo entrant : ${callerName}`
    : `📞 Appel Vocal entrant : ${callerName}`;

  const defaultCallBody = isVideo
    ? `${callerName} vous invite en appel vidéo HD. Touchez pour décrocher.`
    : `${callerName} vous appelle en direct sur English Booster. Touchez pour décrocher.`;

  const title = data.title || (isCall ? defaultCallTitle : '💬 Nouveau message sur English Booster');
  const body = data.body || (isCall ? defaultCallBody : 'Vous avez reçu un nouveau message.');
  const icon = data.icon || data.callerAvatar || '/assets/images/logo.svg';

  const relativeUrl = data.url || (isCall 
    ? `/call?roomId=${data.roomId || ''}&partnerId=${data.callerId || ''}&partnerName=${encodeURIComponent(callerName)}&video=${isVideo}&autoAnswer=true` 
    : '/chat');
  
  // Guarantee absolute URL so all browser APIs navigate reliably
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  const options = {
    body,
    icon,
    badge: '/assets/images/logo.svg',
    image: data.image || undefined,
    tag: isCall ? 'eb-incoming-call' : `eb-msg-${Date.now()}`,
    renotify: true,
    requireInteraction: isCall,
    silent: false,
    sound: isCall ? '/assets/sounds/phone-ring.wav' : undefined,
    // Realistic phone ringer physical vibration cadence lasting ~25s of continuous ringing
    vibrate: isCall 
      ? [1000, 400, 1000, 400, 1000, 400, 1000, 400, 1000, 400, 1000, 400, 1000, 400, 1000, 400, 1000, 400] 
      : [250, 150, 250],
    data: {
      url: targetUrl,
      type: data.type || (isCall ? 'call' : 'message'),
      callerId: data.callerId,
      callerName: callerName,
      callerAvatar: icon,
      roomId: data.roomId,
      isVideo: isVideo,
      timestamp: Date.now(),
    },
    actions: isCall ? [
      { action: 'answer', title: isVideo ? '📹 Décrocher / Answer' : '📞 Décrocher / Answer' },
      { action: 'decline', title: '❌ Refuser / Decline' }
    ] : [
      { action: 'open', title: '💬 Ouvrir / Reply' }
    ]
  };

  // Signal open background clients to trigger in-app ringtone immediately
  if (isCall) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        client.postMessage({
          type: 'eb_incoming_call_push',
          callData: {
            callerId: data.callerId,
            callerName,
            callerAvatar: icon,
            roomId: data.roomId,
            isVideo: isVideo,
          }
        });
      }
    }).catch(() => {});
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Notification click event: focuses or launches the app directly into the call screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  let targetUrl = notifData.url || '/';

  // If user tapped "Decline" button on call notification, dismiss cleanly and notify clients
  if (action === 'decline') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
        for (const client of clientsList) {
          client.postMessage({ type: 'eb_call_declined_from_sw', roomId: notifData.roomId });
        }
      })
    );
    return;
  }

  // If user tapped "Answer" button or clicked the notification body
  if (action === 'answer' || notifData.roomId || notifData.type === 'call') {
    const roomId = notifData.roomId || `room_${Date.now()}`;
    const callerId = notifData.callerId || '';
    const isVideo = Boolean(notifData.isVideo);
    const callerName = notifData.callerName || '';
    targetUrl = notifData.url || `/call?roomId=${roomId}&partnerId=${callerId}&partnerName=${encodeURIComponent(callerName)}&video=${isVideo}&autoAnswer=true`;
  }

  // Ensure targetUrl is ALWAYS an absolute URL so WindowClient.navigate() & clients.openWindow() never fail
  const fullTargetUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if ('focus' in client) {
          try {
            await client.focus();
            // Send direct message so the application immediately navigates and answers
            client.postMessage({
              type: 'eb_answer_call',
              url: fullTargetUrl,
              roomId: notifData.roomId,
              partnerId: notifData.callerId,
              isVideo: notifData.isVideo,
              autoAnswer: true,
            });
            if (client.navigate) {
              await client.navigate(fullTargetUrl);
            }
            return;
          } catch (navErr) {
            console.warn('Could not navigate focused client, falling back to openWindow:', navErr);
          }
        }
      }

      // If no window was open (app was closed or phone locked), launch new window directly into the call
      if (self.clients.openWindow) {
        return await self.clients.openWindow(fullTargetUrl);
      }
    })()
  );
});

// 3. Notification close event
self.addEventListener('notificationclose', (event) => {
  // Optional cleanup
});
