/**
 * 루트(/) 정리용 Service Worker
 *
 * 예전에는 APOLLON 성적서가 루트(/)에 있어서
 * scope "/" 로 service worker 가 등록돼 있었습니다.
 * 이제 APOLLON 은 /apollon/ 으로 옮겼기 때문에,
 * 태블릿에 남아있는 그 옛 등록을 스스로 해제시켜 정리합니다.
 *
 * 이 파일은 한 번 실행되고 스스로 사라집니다.
 * 실행 후에는 루트에 service worker 가 없는 상태가 됩니다.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // 루트에 있던 옛 APOLLON 캐시만 정확히 지웁니다.
    // /apollon/ 과 /f7141/ 이 새로 만드는 캐시는 건드리지 않습니다.
    try {
      await caches.delete('apollon-v5');
      await caches.delete('apollon-v4');
      await caches.delete('apollon-v3');
      await caches.delete('apollon-v2');
      await caches.delete('apollon-v1');
    } catch (e) {}

    // 스스로 등록 해제
    try { await self.registration.unregister(); } catch (e) {}

    // 열려있는 창을 새로고침해서 정리된 상태로 다시 로드
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if ('navigate' in client) client.navigate(client.url);
      }
    } catch (e) {}
  })());
});

// 아무것도 가로채지 않습니다 — 항상 네트워크 그대로
