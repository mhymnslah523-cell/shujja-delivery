const CACHE_NAME = 'shujaa-v2';
const DATA_CACHE_NAME = 'shujaa-data-v1';

// الملفات الأساسية لتشغيل التطبيق بدون إنترنت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// 1. التثبيت وحفظ الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. التفعيل وحذف النسخ القديمة للكاش
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// 3. اعتراض الطلبات وتوفير تجربة Offline سلسة
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // إذا كان طلب جلب بيانات من Supabase (REST API)
  if (url.origin.includes('supabase.co')) {
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(DATA_CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // في حال عدم وجود إنترنت، اعرض آخر بيانات محفوظة
            return caches.match(request);
          })
      );
      return;
    }
  }

  // لملفات الواجهة والموقع الثابتة (Network First with Cache Fallback)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // إذا كان تنقل صفحات ولم يُعثر على الصفحة، ارجع إلى index.html
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// 4. المزامنة الدورية في الخلفية (Periodic Background Sync)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-shipments') {
    event.waitUntil(
      (async () => {
        try {
          console.log('[Service Worker] جاري تحديث بيانات الشحنات دورياً في الخلفية...');
          // يمكن للمتصفح هنا تحديث الكاش تلقائياً في الخلفية
        } catch (err) {
          console.error('[Service Worker] فشلت المزامنة الدورية:', err);
        }
      })()
    );
  }
});
