const CACHE_NAME = 'pacsflow-v3';
const PRECACHE = []; // HTML აღარ pre-cache-დება — იხ. ახსნა ქვემოთ

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // GET-ის გარდა ყველაფერი — network only, Cache API მხოლოდ GET-ს უჭერს მხარს
  if (e.request.method !== 'GET') return;
  // API calls — network only, არასდროს ქეშირდება
  if (e.request.url.includes('/api/')) return;

  // HTML/navigation (index.html, /app, /login) — ყოველთვის network-only.
  // ეს გვერდი აკავშირებს hashed JS/CSS bundle-ებთან; მისი ქეშირება deploy-ის
  // შემდეგ ძველი, შესაძლოა უკვე წაშლილი, bundle-ის მისამართებზე მიგვიყვანდა.
  const isNavigation =
    e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(
          '<h1>კავშირი დროებით მიუწვდომელია</h1><p>გთხოვთ, სცადოთ თავიდან რამდენიმე წამში.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
        )
      )
    );
    return;
  }

  // hashed static assets (JS/CSS/images) — network-first, cache fallback.
  // Vite-ის build hash-ი თავისთავად უზრუნველყოფს, რომ ახალი deploy ახალ
  // URL-ს გამოიყენებს, ასე რომ staleness აქ პრობლემა არაა.
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push notifications
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'PacsFlow', body: 'ახალი შეტყობინება' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/app'));
});
