// Offline-first service worker: the résumé keeps working without a network.
const VERSION = 'rd-v2';
const CORE = [
    './',
    './index.html',
    './styles/main.css',
    './scripts/main.js',
    './assets/images/profile_pic.jpg',
    './aqua-tag-privacy-policy.html',
    './manifest.webmanifest',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.searchParams.has('online-check')) return; // always hit the real network

    // Same origin: network first so updates show up immediately, cache as the offline fallback.
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(request)
                .then(res => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(VERSION).then(cache => cache.put(request, copy));
                    }
                    return res;
                })
                .catch(async () =>
                    (await caches.match(request, { ignoreSearch: true })) ||
                    (request.mode === 'navigate' ? caches.match('./index.html') : Response.error())
                )
        );
        return;
    }

    // Google Fonts: serve from cache instantly, refresh in the background.
    if (FONT_HOSTS.includes(url.hostname)) {
        event.respondWith(
            caches.open(VERSION).then(async cache => {
                const cached = await cache.match(request);
                const fresh = fetch(request)
                    .then(res => {
                        if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
                        return res;
                    })
                    .catch(() => cached);
                return cached || fresh;
            })
        );
    }
});
