// Order With Me ERP - Service Worker
// Bump this version string whenever you deploy changes, so old caches get cleared.
const CACHE_NAME = 'owm-erp-cache-v1';

// Only the local "shell" files are pre-cached. CDN scripts (firebase, chart.js etc.)
// are left to the network/browser HTTP cache since they're large and externally hosted.
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation (so updates are picked up quickly),
// cache-first fallback for everything else (so it still works offline).
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests; let POST/PUT/etc. (e.g. Firebase calls) pass through untouched.
  if (req.method !== 'GET') return;

  // Don't try to cache cross-origin requests (CDNs, Firebase APIs) — just let the network handle them.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      });
    })
  );
});