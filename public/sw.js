// English Booster Production Service Worker for Background Call & Message Notifications
// Handles Web Push events even when the application is closed or phone is locked (Hors-Application / Background)

const EB_CACHE_NAME = 'eb-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
  const targetUrl = data.url || (isCall 
    ? `/call?roomId=${data.roomId || ''}&partnerId=${data.callerId || ''}&video=${isVideo}&autoAnswer=true` 
    : '/chat');

  const options = {
    body,
    icon,
    badge: '/assets/images/logo.svg',
    image: data.image || undefined,
    tag: data.tag || (isCall ? 'eb-incoming-call' : `eb-msg-${Date.now()}`),
    renotify: true,
    requireInteraction: isCall,
    silent: false,
    // Phone vibration rhythm simulates incoming phone ringtone
    vibrate: isCall 
      ? [500, 250, 500, 250, 1000, 500, 1000, 500, 1000] 
      : [200, 100, 200],
    data: {
      url: targetUrl,
      type: data.type || (isCall ? 'call' : 'message'),
      callerId: data.callerId,
      callerName: data.callerName,
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

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Notification click event: focuses or launches the app to call or chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  let targetUrl = notifData.url || '/';

  // If user tapped "Decline" button on call notification, dismiss cleanly
  if (action === 'decline') {
    return;
  }

  // If user tapped "Answer" button or clicked the notification body
  if (action === 'answer' || notifData.roomId) {
    targetUrl = notifData.url || `/call?roomId=${notifData.roomId}&partnerId=${notifData.callerId || ''}&video=${Boolean(notifData.isVideo)}&autoAnswer=true`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open in background, focus it and navigate to call
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.navigate) {
            return client.navigate(targetUrl).then(() => client.focus()).catch(() => client.focus());
          }
          return client.focus();
        }
      }
      // If no window open (app was completely closed), launch new window directly to call
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Notification close event
self.addEventListener('notificationclose', (event) => {
  // Optional cleanup
});
