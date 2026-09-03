/**
 * F7141 설치완료보고서 Service Worker
 *
 *  페이지(HTML)   : network-first  → 온라인이면 항상 최신본, 오프라인이면 캐시
 *  그 외 정적파일 : cache-first    → 빠르고 오프라인에서도 동작
 *  동기화 API(8767): 가로채지 않음 → 항상 실시간
 */
const CACHE = 'f7141-v1';
const CACHE_PREFIX = 'f7141-';
// 상대경로 — 데스크탑(포트 8768 루트)과 GitHub(/f7141/) 양쪽에서 모두 동작
const PRECACHE = ['./', './install_report.html', './manifest.json'];
const FALLBACK = new URL('install_report.html', self.location).href;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // 같은 도메인의 다른 앱(APOLLON) 캐시는 건드리지 않고 f7141- 것만 정리
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  if (!url.protocol.startsWith('http')) return;
  if (url.port === '8767') return;   // 동기화 API는 절대 캐시하지 않음

  const isPage =
    req.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  e.respondWith(isPage ? networkFirst(req) : cacheFirst(req));
});

async function networkFirst(req) {
  try {
    const resp = await fetch(req, { cache: 'no-store' });
    if (resp && resp.ok) {
      const c = await caches.open(CACHE);
      c.put(req, resp.clone());
    }
    return resp;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fallback = await caches.match(FALLBACK);
    if (fallback) return fallback;
    return offlineResponse();
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) {
      const c = await caches.open(CACHE);
      c.put(req, resp.clone());
    }
    return resp;
  } catch (err) {
    return offlineResponse();
  }
}

function offlineResponse() {
  return new Response('오프라인 상태입니다 / Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
