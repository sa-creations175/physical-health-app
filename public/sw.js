// Phase 1 service worker. Network-first for navigation requests so a fresh
// deploy is picked up on next visit, cache-first for hashed static assets so
// repeat loads are instant and the app shell still works offline once it's
// been visited at least once. The cache key is versioned — bumping
// CACHE_NAME on a deploy invalidates everything.
//
// All app data is in IndexedDB (Dexie); the service worker doesn't touch it.
// Phase 6 cloud sync may want a smarter strategy (background sync of writes,
// runtime cache of Supabase responses) — revisit then.

// Bumped v1 → v2 with the v2.1 light-theme deploy: cache-first static assets
// under a static cache name were serving returning visitors the old dark
// shell. A new name makes the `activate` handler purge the stale cache.
const CACHE_NAME = 'physical-health-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation = HTML page load. Network-first so deploys land immediately;
  // fall back to cached index.html for offline boot.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Static assets — cache-first. On a cache miss, fetch and store.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
