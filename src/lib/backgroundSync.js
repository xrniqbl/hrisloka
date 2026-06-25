/**
 * backgroundSync.js — Offline queue for attendance clock-in.
 * When offline, stores clock-in data in IndexedDB and registers Background Sync.
 * When online, the Service Worker replays the queue.
 * Falls back to manual replay on `online` event for browsers without SyncManager (Safari, Firefox).
 */

const DB_NAME = 'hrisloka_sync';
const STORE_NAME = 'sync_queue';
const SYNC_TAG = 'attendance-sync';
const MAX_RETRIES = 5;

/**
 * Open the sync IndexedDB.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Queue a failed request for later replay via Background Sync.
 * @param {string} url - The API URL
 * @param {string} method - HTTP method
 * @param {Object} headers - Request headers
 * @param {string} body - JSON stringified body
 */
export async function queueRequest(url, method, headers, body) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      retries: 0,
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register(SYNC_TAG);
      console.log('[BackgroundSync] Queued request and registered sync');
      return true;
    }

    // Fallback: register online listener for browsers without SyncManager
    console.log('[BackgroundSync] SyncManager not available, will replay on next online event');
    registerOnlineFallback();
    return false;
  } catch (err) {
    console.warn('[BackgroundSync] Failed to queue:', err);
    return false;
  }
}

// ── Fallback replay for browsers without SyncManager ──────────────────
let onlineListenerRegistered = false;

async function registerOnlineFallback() {
  if (onlineListenerRegistered) return;
  onlineListenerRegistered = true;

  window.addEventListener('online', async () => {
    console.log('[BackgroundSync] Back online — attempting fallback replay');
    await fallbackReplay();
  });

  // Also try replaying on page load if queue is not empty
  const count = await getPendingCount().catch(() => 0);
  if (count > 0) {
    setTimeout(() => fallbackReplay(), 2000); // Small delay to let page settle
  }
}

async function fallbackReplay() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const items = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = reject;
    });

    for (const item of items) {
      if ((item.retries || 0) >= MAX_RETRIES) {
        // Remove items that exceeded max retries
        const delTx = db.transaction(STORE_NAME, 'readwrite');
        delTx.objectStore(STORE_NAME).delete(item.id);
        continue;
      }

      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        if (res.ok) {
          const delTx = db.transaction(STORE_NAME, 'readwrite');
          delTx.objectStore(STORE_NAME).delete(item.id);
          console.log('[BackgroundSync] Fallback replay: success for', item.id);
        } else {
          // Increment retry count
          const updTx = db.transaction(STORE_NAME, 'readwrite');
          const updStore = updTx.objectStore(STORE_NAME);
          const getReq = updStore.get(item.id);
          getReq.onsuccess = () => {
            const rec = getReq.result;
            if (rec) { rec.retries = (rec.retries || 0) + 1; updStore.put(rec); }
          };
        }
      } catch {
        // Increment retry count
        const updTx = db.transaction(STORE_NAME, 'readwrite');
        const updStore = updTx.objectStore(STORE_NAME);
        const getReq = updStore.get(item.id);
        getReq.onsuccess = () => {
          const rec = getReq.result;
          if (rec) { rec.retries = (rec.retries || 0) + 1; updStore.put(rec); }
        };
      }
    }
  } catch (err) {
    console.warn('[BackgroundSync] Fallback replay error:', err);
  }
}

/**
 * Check if Background Sync is supported.
 */
export function isBackgroundSyncSupported() {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Get the number of pending items in the sync queue.
 */
export async function getPendingCount() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/**
 * Request persistent storage to prevent cache eviction.
 */
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    console.log(`[Storage] Persistent storage ${granted ? 'granted' : 'denied'}`);
    return granted;
  }
  return false;
}
