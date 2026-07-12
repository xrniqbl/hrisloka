/**
 * Sanitize paths stored in localStorage / used with <Navigate>.
 * Prevents React Router crashes from absolute URLs, hashes, or junk.
 */

const BLOCKED_PREFIXES = ['/src/', '/node_modules/', '/@', '/@vite', '/@fs'];

/**
 * @param {string|null|undefined} raw
 * @param {string} fallback
 * @returns {string} safe relative path starting with /
 */
export function sanitizeAppPath(raw, fallback = '/dashboard') {
  if (raw == null || typeof raw !== 'string') return fallback;

  let path = raw.trim();
  if (!path) return fallback;

  // Strip origin if full URL was stored by mistake
  try {
    if (/^https?:\/\//i.test(path)) {
      const u = new URL(path);
      path = u.pathname || fallback;
    }
  } catch {
    return fallback;
  }

  // Drop query/hash fragments (# is common after bad links)
  path = path.split('#')[0].split('?')[0];

  // Must be relative app path
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;

  // Avoid colliding with Vite build asset URLs (/assets/xxx.js)
  // Legacy app route was "/assets" — migrate to /it-assets
  if (path === '/assets' || path.startsWith('/assets/')) {
    return path === '/assets' ? '/it-assets' : fallback;
  }
  for (const p of BLOCKED_PREFIXES) {
    if (path.startsWith(p)) return fallback;
  }

  // Reject encoded junk / control chars
  if (/[\u0000-\u001f]/.test(path)) return fallback;

  // Cap length
  if (path.length > 200) return fallback;

  return path || fallback;
}

/** Persist only safe pathnames */
export function rememberAppPath(pathname) {
  const safe = sanitizeAppPath(pathname, '');
  if (!safe || safe === '/' || safe === '/login') return;
  try {
    localStorage.setItem('hrisync_last_path', safe);
  } catch { /* quota / private mode */ }
}

export function getRememberedPath(fallback = '/dashboard') {
  try {
    return sanitizeAppPath(localStorage.getItem('hrisync_last_path'), fallback);
  } catch {
    return fallback;
  }
}

/** Clear hash from current URL without reload (e.g. /assets# → /assets or clean) */
export function stripUrlHash() {
  if (typeof window === 'undefined') return;
  try {
    const { pathname, search, hash } = window.location;
    if (!hash) return;
    // Never leave bare "/assets" hash mess; clean history
    window.history.replaceState(null, '', pathname + search);
  } catch { /* ignore */ }
}
