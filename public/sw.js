const CACHE_NAME = 'shujaa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // تمرير الطلبات للشبكة مباشرة لضمان حداثة بيانات الشحنات
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
