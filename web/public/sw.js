// Minimal offline support: navigations go network-first (fresh deploys win,
// cached shell when offline); other same-origin GETs are cache-first and
// filled on first use, so a played-once app works without a connection.
const CACHE = 'jass-v2';

// The 36 card faces and the back have stable names under public/, so they are
// precached on install and the first game works offline. Failures are ignored
// (a missing image must not block the worker from installing).
const SUITS = ['eicheln', 'rosen', 'schellen', 'schilten'];
const RANKS = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
const CARD_URLS = ['back']
  .concat(SUITS.flatMap((s) => RANKS.map((r) => `${s}_${r}`)))
  .map((n) => new URL(`assets/cards/${n}.webp`, self.registration.scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(CARD_URLS.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (new URL(req.url).pathname.includes('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('shell', copy));
          return res;
        })
        .catch(() => caches.match('shell')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
