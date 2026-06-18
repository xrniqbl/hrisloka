const CACHE_NAME = 'HRIS Loka-v4';
// Separate cache for face AI models — these are large (7MB) and never change
const FACE_MODEL_CACHE = 'face-models-v1';
// Background sync queue name
const SYNC_QUEUE = 'attendance-sync';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches (but keep face model cache)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                  .filter((key) => key !== CACHE_NAME && key !== FACE_MODEL_CACHE)
                  .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();

    // Notify all clients that a new SW is active (for update prompt)
    self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
    });
});

// Fetch — network-first for navigations, cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip non-http/https schemes (e.g. chrome-extension://)
    if (!url.protocol.startsWith('http')) return;

    // Skip Vite internal requests and HMR
    if (url.pathname.includes('/@vite/') || url.pathname.includes('/@id/') || url.search.includes('token=')) return;

    // Skip ALL caching in development (localhost)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

    // Navigation requests — network first, fallback to cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Static assets — cache first, fallback to network
    if (
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'image' ||
        request.destination === 'font'
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Face AI models — aggressive cache-first (these are huge, CDN-served, immutable)
    if (url.pathname.startsWith('/models/')) {
        event.respondWith(
            caches.open(FACE_MODEL_CACHE).then((cache) =>
                cache.match(request).then((cached) => {
                    if (cached) return cached;
                    return fetch(request).then((response) => {
                        // Only cache successful responses
                        if (response.ok) cache.put(request, response.clone());
                        return response;
                    });
                })
            )
        );
        return;
    }

    // Everything else — network first
    event.respondWith(
        fetch(request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return response;
            })
            .catch(() => caches.match(request))
    );
});

// ── Background Sync — retry failed attendance clock-ins ──────────────────────
self.addEventListener('sync', (event) => {
    if (event.tag === SYNC_QUEUE) {
        event.waitUntil(replayAttendanceQueue());
    }
});

async function replayAttendanceQueue() {
    try {
        const db = await openSyncDB();
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const items = await getAllFromStore(store);

        for (const item of items) {
            try {
                const res = await fetch(item.url, {
                    method: item.method,
                    headers: item.headers,
                    body: item.body,
                });
                if (res.ok) {
                    // Remove from queue on success
                    const delTx = db.transaction('sync_queue', 'readwrite');
                    delTx.objectStore('sync_queue').delete(item.id);
                }
            } catch {
                // Will be retried on next sync
                console.log('[SW] Background sync: retry failed for', item.id);
            }
        }
    } catch (err) {
        console.error('[SW] Background sync error:', err);
    }
}

function openSyncDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('hrisloka_sync', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('sync_queue')) {
                db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function getAllFromStore(store) {
    return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'HRIS Loka';
    const options = {
        body: data.body || 'Ada notifikasi baru untuk Anda.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/app/home',
        },
        // Show notification badge on app icon (Badge API)
        tag: data.tag || 'hrisloka-notification',
        renotify: true,
    };
    event.waitUntil(
        self.registration.showNotification(title, options).then(() => {
            // Update badge count if supported
            if (navigator.setAppBadge) {
                navigator.setAppBadge().catch(() => {});
            }
        })
    );
});

// Notification Click — open the relevant page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/app/home';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes(url) && 'focus' in client) return client.focus();
            }
            return self.clients.openWindow(url);
        })
    );
});

// ── Message handler — for app update coordination ────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
