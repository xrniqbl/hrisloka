/**
 * wakeLock.js — Screen Wake Lock API helper.
 * Prevents the screen from turning off during face scanning / attendance.
 */

let wakeLock = null;

/**
 * Request a screen wake lock.
 * Returns true if acquired, false otherwise (unsupported or denied).
 */
export async function requestWakeLock() {
  if (!('wakeLock' in navigator)) {
    console.log('[WakeLock] API not supported in this browser');
    return false;
  }

  try {
    wakeLock = await navigator.wakeLock.request('screen');
    console.log('[WakeLock] Screen wake lock acquired');

    // Re-acquire if released due to visibility change
    wakeLock.addEventListener('release', () => {
      console.log('[WakeLock] Screen wake lock released');
      wakeLock = null;
    });

    // Auto re-acquire on page visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return true;
  } catch (err) {
    console.warn('[WakeLock] Failed to acquire:', err.message);
    return false;
  }
}

/**
 * Release the current wake lock.
 */
export async function releaseWakeLock() {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('[WakeLock] Released manually');
    } catch {
      // Already released
    }
  }
}

/**
 * Check if wake lock is currently active.
 */
export function isWakeLockActive() {
  return wakeLock !== null && !wakeLock.released;
}

async function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && !wakeLock) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('[WakeLock] Re-acquired on visibility change');
    } catch {
      // Silently fail
    }
  }
}
