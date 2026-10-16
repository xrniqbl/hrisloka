/* KiniKerja service worker — app shell offline + user-accepted updates.
 *
 * Strategy:
 * - Navigations (HTML): network-first, fallback to cached shell, fallback to
 *   offline page. Never serves stale HTML after a deploy — fresh network wins
 *   when online, so updates are always visible.
 * - Hashed Vite assets (/assets/*.[hash].*): cache-first (immutable), populate
 *   in background.
 * - API / Supabase / Midtrans / auth: network-only, never cached.
 * - Everything else (icons, landing images, manifest): stale-while-revalidate.
 *
 * Updates are NEVER forced: a new worker stays in "waiting" until the user
 * clicks "Muat Ulang" in UpdatePrompt.jsx, which posts { type: 'SKIP_WAITING' }.
 * See public/register-sw.js for the registration / prompt wiring.
 */

const SHELL_CACHE = 'kinikerja-shell-v1';
const ASSET_CACHE = 'kinikerja-assets-v1';
const OFFLINE_URLS = ['/', '/app/splash', '/app/welcome'];

self.addEventListener('install', (event) => {
  // Do NOT skipWaiting here — wait for explicit user acceptance.
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Best-effort: failure (offline first install) must not break install.
      Promise.allSettled(
        OFFLINE_URLS.map((url) =>
          fetch(url, { credentials: 'same-origin' }).then((res) => {
            if (res && res.ok) return cache.put(url, res.clone());
            return null;
          }),
        ),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== SHELL_CACHE && k !== ASSET_CACHE) return caches.delete(k);
          return null;
        }),
      );
      await self.clients.claim();
      // Notify open pages that a new worker took over (post-update path).
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        try {
          client.postMessage({ type: 'SW_UPDATED' });
        } catch {
          /* ignore */
        }
      }
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isApiRequest(url) {
  return (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('midtrans') ||
    url.hostname.includes('fonnte') ||
    url.hostname.includes('brevo')
  );
}

function isHashedAsset(url) {
  return url.pathname.startsWith('/assets/') && /\.[0-9a-zA-Z_-]{8}\.(js|css)/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return; // network-only: never cache API/auth

  // Navigations: network-first → cached shell → cached '/' (offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request.url, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(request.url, { ignoreSearch: true });
          if (cached) return cached;
          const shell = await caches.match('/');
          if (shell) return shell;
          return new Response('Anda sedang offline. Sambungkan internet lalu coba lagi.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })(),
    );
    return;
  }

  // Hashed build assets: cache-first (content-addressed, immutable)
  if (isHashedAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) {
            const cache = await caches.open(ASSET_CACHE);
            cache.put(request, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Static files (icons, landing, manifest, models): stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const network = fetch(request)
        .then((fresh) => {
          if (fresh && fresh.ok) {
            const copy = fresh.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy).catch(() => {}));
          }
          return fresh;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })(),
  );
});

// ─── Background Sync: replay offline clock-in queue ─────────────────────────
// backgroundSync.js (page) stores failed clock-ins in IndexedDB
// 'kinikerja_sync'/'sync_queue' and registers the 'attendance-sync' tag.
// The worker replays each entry with a FRESH session token obtained via the
// REQUEST_SYNC_AUTH_TOKEN postMessage bridge (tokens can't be stored — they
// expire; backgroundSync.js attaches them at replay time).
self.addEventListener('sync', (event) => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(replayAttendanceQueue());
  }
});

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('kinikerja_sync', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function requestPageToken(clientId) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const target = clients.find((c) => c.id === clientId) || clients[0];
  if (!target) return null;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 8000);
    const onMessage = (event) => {
      if (event.data && event.data.type === 'SYNC_AUTH_TOKEN') {
        clearTimeout(timeout);
        self.removeEventListener('message', onMessage);
        resolve(event.data.token || null);
      }
    };
    self.addEventListener('message', onMessage);
    try {
      target.postMessage({ type: 'REQUEST_SYNC_AUTH_TOKEN' });
    } catch {
      clearTimeout(timeout);
      self.removeEventListener('message', onMessage);
      resolve(null);
    }
  });
}

async function replayAttendanceQueue() {
  let db;
  try {
    db = await openSyncDB();
  } catch {
    return;
  }
  let items = [];
  try {
    items = await new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const req = tx.objectStore('sync_queue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try { db.close(); } catch { /* ignore */ }
    return;
  }
  if (!items.length) {
    try { db.close(); } catch { /* ignore */ }
    return;
  }

  // Fresh token per replay run (one bridge round-trip, reused across items).
  const token = await requestPageToken();
  for (const item of items) {
    if ((item.retries || 0) >= 5) {
      try {
        const tx = db.transaction('sync_queue', 'readwrite');
        tx.objectStore('sync_queue').delete(item.id);
        await new Promise((resolve) => { tx.oncomplete = resolve; tx.onerror = resolve; });
      } catch { /* ignore */ }
      continue;
    }
    try {
      const headers = { ...(item.headers || {}) };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(item.url, {
        method: item.method || 'POST',
        headers,
        body: item.body,
      });
      if (res.ok) {
        const tx = db.transaction('sync_queue', 'readwrite');
        tx.objectStore('sync_queue').delete(item.id);
        await new Promise((resolve) => { tx.oncomplete = resolve; tx.onerror = resolve; });
      } else {
        await bumpRetries(db, item);
      }
    } catch {
      await bumpRetries(db, item);
    }
  }
  try { db.close(); } catch { /* ignore */ }
}

async function bumpRetries(db, item) {
  try {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const rec = await new Promise((resolve) => {
      const req = store.get(item.id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (rec) {
      rec.retries = (rec.retries || 0) + 1;
      store.put(rec);
    }
    await new Promise((resolve) => { tx.oncomplete = resolve; tx.onerror = resolve; });
  } catch { /* ignore */ }
}
