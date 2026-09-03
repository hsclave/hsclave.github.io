/**
 * APOLLON Service Worker
 *
 *  페이지(HTML)   : network-first  → 온라인이면 항상 최신본, 오프라인이면 캐시
 *  그 외 정적파일 : cache-first    → 빠르고 오프라인에서도 동작
 *  동기화 API(8765): 가로채지 않음 → 항상 실시간
 *
 *  ⚠ CACHE 버전은 파일 구조를 바꿀 때만 올리면 됩니다.
 *    HTML 내용 수정은 network-first라 버전을 안 올려도 자동 반영됩니다.
 */
const CACHE = 'apollon-v5';
const PRECACHE = ['/', '/inspection_app.html', '/manifest.json'];
 
// ── 설치: 필수 파일 미리 캐시 ────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // allSettled: 파일 하나가 없어도 설치가 통째로 실패하지 않음
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});
 
// ── 활성화: 이전 버전 캐시 정리 ──────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
 
// ── 요청 라우팅 ─────────────────────────────────────────
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
 
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
 
  if (!url.protocol.startsWith('http')) return;
  if (url.port === '8765') return;            // 동기화 API는 절대 캐시하지 않음
 
  const isPage =
    req.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');
 
  e.respondWith(isPage ? networkFirst(req) : cacheFirst(req));
});
 
// 페이지: 네트워크 먼저 → 실패하면 캐시
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
    const fallback = (await caches.match('/inspection_app.html')) || (await caches.match('/'));
    if (fallback) return fallback;
    return offlineResponse();
  }
}
 
// 정적 파일: 캐시 먼저 → 없으면 네트워크에서 받아 캐시
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
