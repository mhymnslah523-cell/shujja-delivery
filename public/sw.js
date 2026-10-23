const CACHE_NAME = 'shujaa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. التثبيت
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 2. التفعيل
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => clients.claim())
  );
});

// 3. اعتراض الطلبات وتوفير تجربة Offline (متطلب أساسي لبناء الـ APK)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

// 4. Background Sync (محلول بـ Promise صالح لعدم رمي أخطاء)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-updates') {
    event.waitUntil(Promise.resolve());
  }
});

// 5. Periodic Background Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-shipments') {
    event.waitUntil(Promise.resolve());
  }
});

// 6. Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'منصة الشجاع', body: 'تنبيه جديد بخصوص الشحنات' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
