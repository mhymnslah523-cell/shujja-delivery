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

// 1. استقبال الإشعارات المنبثقة (Push Notifications)
self.addEventListener('push', (event) => {
  let data = { title: 'منصة الشجاع', body: 'تنبيه جديد بخصوص الشحنات' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// عند نقر الموظف على الإشعار، يفتح التطبيق مباشرة
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});

// 2. مزامنة العمليات المؤجلة عند عودة الإنترنت (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-updates') {
    event.waitUntil(
      console.log('عادت الشبكة: جاري إرسال التحديثات المؤجلة لقاعدة البيانات...')
    );
  }
});
