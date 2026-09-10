/**
 * Safe localStorage wrappers — never throw.
 * Safari private mode / blocked storage / quota errors crash callers that
 * touch localStorage directly (notably module-top-level code in main.jsx,
 * which runs before React mounts and would blank the whole app).
 */

export function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
