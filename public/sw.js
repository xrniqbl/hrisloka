const CACHE_NAME = 'HRIS Loka-v5';
// Separate cache for face AI models — these are large (7MB) and never change
const FACE_MODEL_CACHE = 'face-models-v1';
// Background sync queue name
const SYNC_QUEUE = 'attendance-sync';
// Max cached entries to prevent unbounded growth
const MAX_CACHE_ENTRIES = 200;
// Max retry attempts for background sync
const MAX_SYNC_RETRIES = 5;
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

// Activate — clean old caches AND evict stale entries within current cache
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Delete old versioned caches
            caches.keys().then((keys) =>
                Promise.all(
                    keys
                      .filter((key) => key !== CACHE_NAME && key !== FACE_MODEL_CACHE)
                      .map((key) => caches.delete(key))
                )
            ),
            // Evict stale entries within the current cache to prevent unbounded growth
            trimCache(CACHE_NAME, MAX_CACHE_ENTRIES),
        ])
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
            // Check retry count — remove items that exceed max retries
            const retries = item.retries || 0;
            if (retries >= MAX_SYNC_RETRIES) {
                console.warn(`[SW] Background sync: max retries (${MAX_SYNC_RETRIES}) reached for item ${item.id}, removing`);
                await deleteFromStore(db, item.id);
                continue;
            }

            try {
                const res = await fetch(item.url, {
                    method: item.method,
                    headers: item.headers,
                    body: item.body,
                });
                if (res.ok) {
                    // Remove from queue on success
                    await deleteFromStore(db, item.id);
                    console.log('[SW] Background sync: success for', item.id);
                } else {
                    // Increment retry count
                    await updateRetryCount(db, item.id, retries + 1);
                }
            } catch {
                // Increment retry count on failure
                await updateRetryCount(db, item.id, retries + 1);
                console.log(`[SW] Background sync: retry ${retries + 1}/${MAX_SYNC_RETRIES} failed for`, item.id);
            }
        }
    } catch (err) {
        console.error('[SW] Background sync error:', err);
    }
}

function deleteFromStore(db, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        tx.objectStore('sync_queue').delete(id);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

function updateRetryCount(db, id, retries) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const item = getReq.result;
            if (item) {
                item.retries = retries;
                store.put(item);
            }
        };
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
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

// ── Cache Eviction — trim cache to maxEntries (LRU: evict oldest) ─────────
async function trimCache(cacheName, maxEntries) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        if (keys.length <= maxEntries) return;
        // Delete oldest entries (first in cache = oldest)
        const toDelete = keys.length - maxEntries;
        for (let i = 0; i < toDelete; i++) {
            await cache.delete(keys[i]);
        }
        console.log(`[SW] Cache trimmed: removed ${toDelete} stale entries from ${cacheName}`);
    } catch (err) {
        console.warn('[SW] Cache trim error:', err);
    }
}

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
