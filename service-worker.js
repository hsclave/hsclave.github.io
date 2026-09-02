/**
 * APOLLON Service Worker — enables offline use after first load
 * v2: cache-first navigation, force fresh cache on update
 */
const CACHE = 'apollon-v2';
const PRECACHE = [
  '/',
  '/inspection_app.html',
  '/manifest.json',
  '/service-worker.js'
];

// Install: cache all core files immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches, take control immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin, network-only for sync API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Don't intercept data sync API calls (port 8765)
  if (url.port === '8765') return;

  // For navigation requests (page loads) — always serve from cache first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/inspection_app.html').then(cached => {
        if (cached) return cached;
        return fetch(e.request).catch(() =>
          new Response('<h2>오프라인 상태입니다. 사무실 WiFi에 연결 후 다시 시도하세요.</h2>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
        );
      })
    );
    return;
  }

  // For other same-origin requests: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // External resources (fonts, CDN): network with silent fallback
  e.respondWith(
    fetch(e.request).catch(() => new Response('', { status: 503 }))
  );
});
