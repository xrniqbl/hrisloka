/**
 * backgroundSync.js — Offline queue for attendance clock-in.
 * When offline, stores clock-in data in IndexedDB and registers Background Sync.
 * When online, the Service Worker replays the queue.
 */

const DB_NAME = 'hrisloka_sync';
const STORE_NAME = 'sync_queue';
const SYNC_TAG = 'attendance-sync';

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
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });

    // Register background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register(SYNC_TAG);
      console.log('[BackgroundSync] Queued request and registered sync');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[BackgroundSync] Failed to queue:', err);
    return false;
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
