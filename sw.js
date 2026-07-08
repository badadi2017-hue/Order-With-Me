// ===== Order With Me® ERP - Service Worker =====
// Bump this version string whenever you deploy a new build,
// so old caches get cleared and users get the latest app shell.
const CACHE_VERSION = 'owm-erp-v1';
const CACHE_NAME = `order-with-me-${CACHE_VERSION}`;

// App shell files to pre-cache for offline use.
// Keep this list to files that actually exist next to index.html.
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-32.png',
    './icon-180.png',
    './icon-192.png',
    './icon-512.png'
];

// ---------- INSTALL: pre-cache app shell ----------
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

// ---------- ACTIVATE: clean up old caches ----------
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key.startsWith('order-with-me-') && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ---------- FETCH: network-first for the app shell, cache-first for everything else ----------
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Only handle GET requests; let POST/PUT/etc (Firebase writes) pass straight through
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Firebase/Firestore/Auth calls and any other cross-origin API calls:
    // always go to the network, never cache (this app is Firebase-backed).
    if (url.origin !== self.location.origin) {
        event.respondWith(
            fetch(req).catch(() => caches.match(req))
        );
        return;
    }

    // Same-origin navigation / app shell files: network-first, falling back to cache offline.
    // This means users online always get the latest index.html, and still get an app when offline.
    event.respondWith(
        fetch(req)
            .then((res) => {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                return res;
            })
            .catch(() =>
                caches.match(req).then((cached) => cached || caches.match('./index.html'))
            )
    );
});
