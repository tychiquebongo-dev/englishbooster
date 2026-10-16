// English Booster Production Service Worker for Background Call & Message Notifications
// Handles Push events even when the application is completely closed (Hors Application)

const EB_CACHE_NAME = 'eb-pwa-v1';

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
        body: event.data.text() || 'Nouvelle notification',
      };
    }
  }

  const isCall = data.type === 'call' || data.tag === 'eb-incoming-call';
  const title = data.title || (isCall ? '📞 Appel entrant sur English Booster' : '💬 Nouveau message sur English Booster');
  const body = data.body || (isCall ? 'Un membre vous appelle en direct. Touchez pour décrocher.' : 'Vous avez reçu un nouveau message.');
  const icon = data.icon || '/assets/images/logo.svg';
  const targetUrl = data.url || (isCall ? '/call' : '/chat');

  const options = {
    body,
    icon,
    badge: '/assets/images/logo.svg',
    tag: data.tag || (isCall ? 'eb-incoming-call' : `eb-msg-${Date.now()}`),
    renotify: true,
    requireInteraction: isCall,
    silent: false,
    vibrate: isCall 
      ? [500, 250, 500, 250, 1000, 500, 1000] 
      : [200, 100, 200],
    data: {
      url: targetUrl,
      type: data.type || (isCall ? 'call' : 'message'),
      callerId: data.callerId,
      roomId: data.roomId,
    },
    actions: isCall ? [
      { action: 'answer', title: '📞 Décrocher / Answer' },
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

  // If user tapped "Decline" button on call notification, dismiss
  if (action === 'decline') {
    return;
  }

  // If user tapped "Answer" button on call notification
  if (action === 'answer' && notifData.roomId) {
    targetUrl = notifData.url || `/call?roomId=${notifData.roomId}&autoAnswer=true`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url && client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window open (app was closed), launch new window directly
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
