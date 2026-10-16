/**
 * backgroundSync.js — Offline queue for attendance clock-in.
 * When offline, stores clock-in data in IndexedDB and registers Background Sync.
 * When online, the Service Worker replays the queue.
 * Falls back to manual replay on `online` event for browsers without SyncManager (Safari, Firefox).
 *
 * Auth: the queued request must carry a Supabase access token — the API verifies
 * the JWT fail-closed. The token is attached at REPLAY time (not enqueue time)
 * so long-offline sessions still send a fresh, valid session token.
 */

import { supabase } from './supabase';

const DB_NAME = 'kinikerja_sync';
const LEGACY_DB_NAME = 'hrisloka_sync';
const STORE_NAME = 'sync_queue';
const SYNC_TAG = 'attendance-sync';
const MAX_RETRIES = 5;

/**
 * One-time migration of the pre-rebrand ('hrisloka_sync') offline queue.
 * Copy pending items into the new DB, then delete the legacy database so
 * clock-ins queued offline before the KiniKerja rebrand are not lost.
 */
let migrationDone = false;
async function migrateLegacyQueue() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    const legacyItems = await new Promise((resolve) => {
      try {
        const req = indexedDB.open(LEGACY_DB_NAME, 1);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) { db.close(); resolve([]); return; }
          const tx = db.transaction(STORE_NAME, 'readonly');
          const getReq = tx.objectStore(STORE_NAME).getAll();
          getReq.onsuccess = () => { const items = getReq.result || []; db.close(); resolve(items); };
          getReq.onerror = () => { try { db.close(); } catch { /* ignore */ } resolve([]); };
        };
        req.onerror = () => resolve([]);
        req.onblocked = () => resolve([]);
      } catch { resolve([]); }
    });
    if (legacyItems.length) {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const { id: _dropped, ...rest } of legacyItems) store.add(rest);
      await new Promise((resolve) => { tx.oncomplete = resolve; tx.onerror = resolve; });
    }
    try {
      const delReq = indexedDB.deleteDatabase(LEGACY_DB_NAME);
      if (delReq) { delReq.onsuccess = () => {}; delReq.onerror = () => {}; delReq.onblocked = () => {}; }
    } catch { /* ignore */ }
  } catch { /* migration is best-effort */ }
}

/**
 * Attach the current session's access token to the stored headers.
 * Returns null when no session exists — replay then keeps the item for retry.
 */
async function withAuthHeaders(headers) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;
    return { ...headers, Authorization: `Bearer ${token}` };
  } catch {
    return null;
  }
}

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
    await migrateLegacyQueue();
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
      registerTokenBridge();
      return true;
    }

    // Fallback: register online listener for browsers without SyncManager
    console.log('[BackgroundSync] SyncManager not available, will replay on next online event');
    registerOnlineFallback();
    registerTokenBridge();
    return false;
  } catch (err) {
    console.warn('[BackgroundSync] Failed to queue:', err);
    return false;
  }
}

// ── Service-worker token bridge ─────────────────────────────────────────────
// The SW replays the sync queue but cannot read localStorage, so it asks this
// page for the current access token via postMessage.
let tokenBridgeRegistered = false;

function registerTokenBridge() {
  if (tokenBridgeRegistered || typeof window === 'undefined') return;
  tokenBridgeRegistered = true;
  window.addEventListener('message', async (event) => {
    if (event.data?.type !== 'REQUEST_SYNC_AUTH_TOKEN') return;
    // M3: only answer same-origin requests and reply with an explicit
    // targetOrigin — a rogue same-page iframe must not harvest the token.
    if (event.origin !== window.location.origin) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || null;
      event.source?.postMessage({ type: 'SYNC_AUTH_TOKEN', token }, event.origin);
    } catch {
      event.source?.postMessage({ type: 'SYNC_AUTH_TOKEN', token: null }, event.origin);
    }
  });
}

// Register the SW sync-token bridge at module load so it is ALWAYS listening
// — the SW may fire REQUEST_SYNC_AUTH_TOKEN when the app opens from a
// notification/sync event, long before any queueRequest() call happens.
// Waiting until queueRequest() would miss the token and stall the replay.
if (typeof window !== 'undefined') {
  registerTokenBridge();
  registerOnlineFallbackAtLoad();
}

/** Best-effort online-listener at load (no queue check here — queueRequest covers it). */
function registerOnlineFallbackAtLoad() {
  try {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || 'SyncManager' in window) return;
    registerOnlineFallback();
  } catch { /* ignore — queueRequest path still registers */ }
}

// ── Fallback replay for browsers without SyncManager ──────────────────────
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
        const headers = await withAuthHeaders(item.headers);
        if (!headers) {
          // No valid session — leave the item queued for the next attempt
          const updTx = db.transaction(STORE_NAME, 'readwrite');
          const updStore = updTx.objectStore(STORE_NAME);
          const getReq = updStore.get(item.id);
          getReq.onsuccess = () => {
            const rec = getReq.result;
            if (rec) { rec.retries = (rec.retries || 0) + 1; updStore.put(rec); }
          };
          continue;
        }
        const res = await fetch(item.url, {
          method: item.method,
          headers,
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
